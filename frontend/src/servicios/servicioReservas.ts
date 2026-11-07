import type { EstadoReserva, ModalidadAlquiler, ModalidadEntrega, Producto } from '../tipos';
import { supabase } from './supabase';

interface ReservaDb {
  id: string;
  codigo_reserva: string;
  fecha_solicitud: string;
  fecha_inicio: string;
  fecha_devolucion: string;
  modalidad_alquiler: string;
  modalidad_entrega: string;
  direccion_entrega: string | null;
  importe_total: number | string;
  estado: string;
}

interface DetalleDb {
  reserva: string;
  producto: string;
  cantidad: number;
  precio_aplicado: number | string;
  subtotal: number | string;
}

interface ProductoDb {
  id: string;
  nombre: string;
}

export interface ProductoReserva {
  nombre: string;
  cantidad: number;
  precioAplicado: number;
  subtotal: number;
}

export interface ReservaUsuario {
  id: string;
  codigo: string;
  fechaSolicitud: string;
  inicio: string;
  fin: string;
  modalidad: ModalidadAlquiler;
  entrega: ModalidadEntrega;
  direccion?: string;
  importe: number;
  estado: EstadoReserva;
  productos: ProductoReserva[];
}

export interface ReservaCreada {
  id: string;
  codigo: string;
  importe: number;
  estado: EstadoReserva;
}

export interface DatosCrearReserva {
  producto: Producto;
  modalidad: ModalidadAlquiler;
  inicio: string;
  fin: string;
  entrega: ModalidadEntrega;
  direccion: string;
}

const MODALIDAD_A_DB: Record<ModalidadAlquiler, string> = {
  'fin de semana': 'fin_de_semana',
  mensual: 'mensual',
  'varios meses': 'varios_meses',
};

const MODALIDAD_DESDE_DB: Record<string, ModalidadAlquiler> = {
  fin_de_semana: 'fin de semana',
  mensual: 'mensual',
  varios_meses: 'varios meses',
};

const ESTADO_DESDE_DB: Record<string, EstadoReserva> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  en_preparacion: 'En preparación',
  en_alquiler: 'En alquiler',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};

const aNumero = (valor: number | string) => (typeof valor === 'number' ? valor : Number(valor));

const traducirError = (error: { code?: string; message?: string; details?: string } | null): string => {
  const texto = `${error?.code ?? ''} ${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase();
  if (texto.includes('solo un cliente')) return 'Solo las cuentas de cliente pueden solicitar alquileres.';
  if (texto.includes('fecha de inicio no puede')) return 'La fecha de inicio no puede ser anterior a hoy.';
  if (texto.includes('fecha de devolución debe'))
    return 'La fecha de devolución debe ser igual o posterior a la fecha de inicio.';
  if (texto.includes('fin de semana permite como máximo'))
    return 'La modalidad de fin de semana permite como máximo tres días.';
  if (texto.includes('dirección es obligatoria'))
    return 'Indica una dirección completa para la entrega a domicilio.';
  if (texto.includes('stock') || texto.includes('no está disponible'))
    return 'El producto no tiene disponibilidad para esas fechas.';
  if (texto.includes('row-level security') || texto.includes('permission denied'))
    return 'Tu cuenta no tiene permisos para realizar esta operación.';
  if (texto.includes('failed to fetch') || texto.includes('networkerror'))
    return 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';
  return error?.message || 'No se pudo completar la reserva. Inténtalo de nuevo.';
};

export const servicioReservas = {
  /**
   * Crea la reserva con la RPC transaccional existente. El precio y el stock
   * los calcula PostgreSQL a partir de public.productos; el navegador solo
   * envía el producto, las fechas y la modalidad.
   */
  crear: async (datos: DatosCrearReserva): Promise<ReservaCreada> => {
    const { data: productoDb, error: errorProducto } = await supabase
      .from('productos')
      .select('id')
      .eq('nombre', datos.producto.nombre)
      .eq('estado', 'activo')
      .limit(1)
      .maybeSingle();

    if (errorProducto) throw new Error(traducirError(errorProducto));
    if (!productoDb?.id) {
      throw new Error('El producto no está disponible en el catálogo de reservas.');
    }

    const { data, error } = await supabase.rpc('crear_reserva', {
      p_items: [{ producto: productoDb.id, cantidad: 1 }],
      p_fecha_inicio: datos.inicio,
      p_fecha_devolucion: datos.fin,
      p_modalidad_alquiler: MODALIDAD_A_DB[datos.modalidad],
      p_modalidad_entrega: datos.entrega,
      p_direccion_entrega: datos.entrega === 'domicilio' ? datos.direccion.trim() : null,
    });

    if (error) throw new Error(traducirError(error));

    const reserva = (Array.isArray(data) ? data[0] : data) as ReservaDb | null;
    if (!reserva) throw new Error('La reserva se creó, pero no se pudo leer la confirmación.');

    return {
      id: reserva.id,
      codigo: reserva.codigo_reserva,
      importe: aNumero(reserva.importe_total),
      estado: ESTADO_DESDE_DB[reserva.estado] ?? 'Pendiente',
    };
  },

  /** Devuelve únicamente las reservas del usuario autenticado. RLS ya filtra por cliente. */
  obtenerDelUsuario: async (usuarioId: string): Promise<ReservaUsuario[]> => {
    const { data: reservas, error } = await supabase
      .from('reservas')
      .select(
        'id, codigo_reserva, fecha_solicitud, fecha_inicio, fecha_devolucion, modalidad_alquiler, modalidad_entrega, direccion_entrega, importe_total, estado',
      )
      .eq('cliente', usuarioId)
      .order('fecha_solicitud', { ascending: false });

    if (error) throw new Error(traducirError(error));

    const filas = (reservas ?? []) as ReservaDb[];
    if (filas.length === 0) return [];

    const idsReserva = filas.map((reserva) => reserva.id);
    const { data: detalles, error: errorDetalles } = await supabase
      .from('detalles_reserva')
      .select('reserva, producto, cantidad, precio_aplicado, subtotal')
      .in('reserva', idsReserva);

    if (errorDetalles) throw new Error(traducirError(errorDetalles));

    const filasDetalle = (detalles ?? []) as DetalleDb[];
    const idsProducto = [...new Set(filasDetalle.map((detalle) => detalle.producto))];
    const nombresProducto = new Map<string, string>();

    if (idsProducto.length > 0) {
      const { data: productos, error: errorProductos } = await supabase
        .from('productos')
        .select('id, nombre')
        .in('id', idsProducto);

      if (errorProductos) throw new Error(traducirError(errorProductos));
      ((productos ?? []) as ProductoDb[]).forEach((producto) => {
        nombresProducto.set(producto.id, producto.nombre);
      });
    }

    return filas.map((reserva) => ({
      id: reserva.id,
      codigo: reserva.codigo_reserva,
      fechaSolicitud: reserva.fecha_solicitud,
      inicio: reserva.fecha_inicio,
      fin: reserva.fecha_devolucion,
      modalidad: MODALIDAD_DESDE_DB[reserva.modalidad_alquiler] ?? 'fin de semana',
      entrega: reserva.modalidad_entrega === 'domicilio' ? 'domicilio' : 'tienda',
      direccion: reserva.direccion_entrega ?? undefined,
      importe: aNumero(reserva.importe_total),
      estado: ESTADO_DESDE_DB[reserva.estado] ?? 'Pendiente',
      productos: filasDetalle
        .filter((detalle) => detalle.reserva === reserva.id)
        .map((detalle) => ({
          nombre: nombresProducto.get(detalle.producto) ?? 'Producto',
          cantidad: detalle.cantidad,
          precioAplicado: aNumero(detalle.precio_aplicado),
          subtotal: aNumero(detalle.subtotal),
        })),
    }));
  },
};
