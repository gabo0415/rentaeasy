import type { EstadoReserva, ModalidadAlquiler, ModalidadEntrega } from '../tipos';
import { supabase } from './supabase';

interface ErrorSupabase {
  code?: string;
  message?: string;
  details?: string;
}

interface RespuestaSupabase<T> {
  data: T[] | null;
  error: ErrorSupabase | null;
}

interface ProductoDb {
  id: string;
  categoria: string;
  nombre: string;
  precio_fin_de_semana: number | string;
  precio_mensual: number | string;
  precio_dia_adicional: number | string;
  stock_total: number;
  stock_disponible: number;
  estado: string;
  fecha_creacion: string;
}

interface CategoriaDb {
  id: string;
  nombre: string;
}

interface PerfilDb {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  rol: string;
  fecha_creacion: string;
}

interface ReservaDb {
  id: string;
  cliente: string;
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

interface MovimientoDb {
  id: string;
  producto: string;
  reserva: string | null;
  tipo_movimiento: string;
  cantidad: number;
  fecha: string;
  observaciones: string | null;
}

export type EstadoProducto = 'activo' | 'inactivo' | 'mantenimiento';

export interface ProductoAdministracion {
  id: string;
  nombre: string;
  categoriaId: string;
  categoria: string;
  precioFinDeSemana: number;
  precioMensual: number;
  precioDiaAdicional: number;
  stockTotal: number;
  stockDisponible: number;
  estado: EstadoProducto;
  fechaCreacion: string;
}

export interface ClienteAdministracion {
  id: string;
  nombre: string;
  telefono: string | null;
  rol: string;
  fechaCreacion: string;
  reservas: number;
  totalReservado: number;
}

export interface DetalleReservaAdministracion {
  productoId: string;
  producto: string;
  cantidad: number;
  precioAplicado: number;
  subtotal: number;
}

export interface ReservaAdministracion {
  id: string;
  codigo: string;
  clienteId: string;
  cliente: string;
  telefono: string | null;
  fechaSolicitud: string;
  inicio: string;
  fin: string;
  modalidad: ModalidadAlquiler;
  entrega: ModalidadEntrega;
  direccion: string | null;
  importe: number;
  estado: EstadoReserva;
  productos: DetalleReservaAdministracion[];
}

export type TipoMovimiento = 'entrada' | 'salida' | 'devolucion' | 'mantenimiento' | 'ajuste';

export interface MovimientoAdministracion {
  id: string;
  productoId: string;
  producto: string;
  reservaId: string | null;
  codigoReserva: string | null;
  tipo: TipoMovimiento;
  cantidad: number;
  fecha: string;
  observaciones: string | null;
}

export interface DatosAdministracion {
  productos: ProductoAdministracion[];
  clientes: ClienteAdministracion[];
  reservas: ReservaAdministracion[];
  movimientos: MovimientoAdministracion[];
  cargadoEn: string;
}

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

const ESTADO_A_DB: Record<EstadoReserva, string> = {
  Pendiente: 'pendiente',
  Confirmada: 'confirmada',
  'En preparación': 'en_preparacion',
  'En alquiler': 'en_alquiler',
  Finalizada: 'finalizada',
  Cancelada: 'cancelada',
};

const aNumero = (valor: number | string | null) =>
  typeof valor === 'number' ? valor : Number(valor ?? 0);

const traducirError = (error: ErrorSupabase | null): string => {
  const texto = `${error?.code ?? ''} ${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase();
  if (texto.includes('permission denied') || texto.includes('row-level security')) {
    return 'Tu cuenta no tiene permisos para consultar estos datos. Inicia sesión con una cuenta de administrador.';
  }
  if (texto.includes('jwt') || texto.includes('token')) {
    return 'La sesión ha caducado. Vuelve a iniciar sesión.';
  }
  if (texto.includes('failed to fetch') || texto.includes('networkerror')) {
    return 'No se pudo conectar con Supabase. Comprueba tu conexión e inténtalo de nuevo.';
  }
  if (texto.includes('no hay stock suficiente') || texto.includes('supera el stock')) {
    return 'No hay stock suficiente para confirmar esta reserva en las fechas indicadas.';
  }
  if (texto.includes('transición de estado no permitida')) {
    return 'Ese cambio de estado no está permitido.';
  }
  if (texto.includes('no puede cambiar de estado')) {
    return 'La reserva ya está finalizada o cancelada y no puede cambiar de estado.';
  }
  return error?.message || 'No se pudieron cargar los datos del panel.';
};

const TAMANO_PAGINA = 1000;

/**
 * PostgREST limita las respuestas a un máximo de filas. Se recorren las páginas
 * para que los indicadores y las tablas no se queden con datos parciales.
 */
const cargarPorPaginas = async <T,>(
  consulta: (desde: number, hasta: number) => PromiseLike<RespuestaSupabase<T>>,
): Promise<T[]> => {
  const filas: T[] = [];
  let desde = 0;

  for (;;) {
    const { data, error } = await consulta(desde, desde + TAMANO_PAGINA - 1);
    if (error) throw new Error(traducirError(error));
    const pagina = data ?? [];
    filas.push(...pagina);
    if (pagina.length < TAMANO_PAGINA) break;
    desde += TAMANO_PAGINA;
  }

  return filas;
};

export const servicioAdministracion = {
  /**
   * Lee todas las tablas que alimentan el panel con la sesión del
   * administrador. No usa claves de servicio ni datos locales. Las políticas
   * RLS existentes permiten al administrador leer perfiles, reservas,
   * detalles, productos, categorías y movimientos.
   */
  obtenerDatos: async (): Promise<DatosAdministracion> => {
    const [productosDb, categoriasDb, perfilesDb, reservasDb, detallesDb, movimientosDb] =
      await Promise.all([
        cargarPorPaginas<ProductoDb>((desde, hasta) =>
          supabase
            .from('productos')
            .select(
              'id, categoria, nombre, precio_fin_de_semana, precio_mensual, precio_dia_adicional, stock_total, stock_disponible, estado, fecha_creacion',
            )
            .order('nombre')
            .order('id')
            .range(desde, hasta),
        ),
        cargarPorPaginas<CategoriaDb>((desde, hasta) =>
          supabase
            .from('categorias')
            .select('id, nombre')
            .order('nombre')
            .order('id')
            .range(desde, hasta),
        ),
        cargarPorPaginas<PerfilDb>((desde, hasta) =>
          supabase
            .from('perfiles')
            .select('id, nombres, apellidos, telefono, rol, fecha_creacion')
            .order('nombres')
            .order('id')
            .range(desde, hasta),
        ),
        cargarPorPaginas<ReservaDb>((desde, hasta) =>
          supabase
            .from('reservas')
            .select(
              'id, cliente, codigo_reserva, fecha_solicitud, fecha_inicio, fecha_devolucion, modalidad_alquiler, modalidad_entrega, direccion_entrega, importe_total, estado',
            )
            .order('fecha_solicitud', { ascending: false })
            .order('id', { ascending: false })
            .range(desde, hasta),
        ),
        cargarPorPaginas<DetalleDb>((desde, hasta) =>
          supabase
            .from('detalles_reserva')
            .select('reserva, producto, cantidad, precio_aplicado, subtotal')
            .order('reserva')
            .order('producto')
            .range(desde, hasta),
        ),
        cargarPorPaginas<MovimientoDb>((desde, hasta) =>
          supabase
            .from('movimientos_inventario')
            .select('id, producto, reserva, tipo_movimiento, cantidad, fecha, observaciones')
            .order('fecha', { ascending: false })
            .order('id')
            .range(desde, hasta),
        ),
      ]);

    const mapaCategorias = new Map(categoriasDb.map((categoria) => [categoria.id, categoria.nombre]));
    const mapaPerfiles = new Map(perfilesDb.map((perfil) => [perfil.id, perfil]));
    const mapaProductos = new Map(productosDb.map((producto) => [producto.id, producto]));
    const mapaCodigosReserva = new Map(reservasDb.map((reserva) => [reserva.id, reserva.codigo_reserva]));

    const productos: ProductoAdministracion[] = productosDb.map((producto) => ({
      id: producto.id,
      nombre: producto.nombre,
      categoriaId: producto.categoria,
      categoria: mapaCategorias.get(producto.categoria) ?? 'Sin categoría',
      precioFinDeSemana: aNumero(producto.precio_fin_de_semana),
      precioMensual: aNumero(producto.precio_mensual),
      precioDiaAdicional: aNumero(producto.precio_dia_adicional),
      stockTotal: producto.stock_total,
      stockDisponible: producto.stock_disponible,
      estado: producto.estado as EstadoProducto,
      fechaCreacion: producto.fecha_creacion,
    }));

    const detallesPorReserva = new Map<string, DetalleReservaAdministracion[]>();
    detallesDb.forEach((detalle) => {
      const lista = detallesPorReserva.get(detalle.reserva) ?? [];
      lista.push({
        productoId: detalle.producto,
        producto: mapaProductos.get(detalle.producto)?.nombre ?? 'Producto',
        cantidad: detalle.cantidad,
        precioAplicado: aNumero(detalle.precio_aplicado),
        subtotal: aNumero(detalle.subtotal),
      });
      detallesPorReserva.set(detalle.reserva, lista);
    });

    const reservas: ReservaAdministracion[] = reservasDb.map((reserva) => {
      const perfil = mapaPerfiles.get(reserva.cliente);
      return {
        id: reserva.id,
        codigo: reserva.codigo_reserva,
        clienteId: reserva.cliente,
        cliente: perfil ? `${perfil.nombres} ${perfil.apellidos}`.trim() : 'Cliente',
        telefono: perfil?.telefono ?? null,
        fechaSolicitud: reserva.fecha_solicitud,
        inicio: reserva.fecha_inicio,
        fin: reserva.fecha_devolucion,
        modalidad: MODALIDAD_DESDE_DB[reserva.modalidad_alquiler] ?? 'fin de semana',
        entrega: reserva.modalidad_entrega === 'domicilio' ? 'domicilio' : 'tienda',
        direccion: reserva.direccion_entrega,
        importe: aNumero(reserva.importe_total),
        estado: ESTADO_DESDE_DB[reserva.estado] ?? 'Pendiente',
        productos: detallesPorReserva.get(reserva.id) ?? [],
      };
    });

    const resumenPorCliente = new Map<string, { reservas: number; total: number }>();
    reservas.forEach((reserva) => {
      if (reserva.estado === 'Cancelada') return;
      const resumen = resumenPorCliente.get(reserva.clienteId) ?? { reservas: 0, total: 0 };
      resumen.reservas += 1;
      resumen.total += reserva.importe;
      resumenPorCliente.set(reserva.clienteId, resumen);
    });

    const clientes: ClienteAdministracion[] = perfilesDb
      .filter((perfil) => perfil.rol === 'cliente')
      .map((perfil) => {
        const resumen = resumenPorCliente.get(perfil.id) ?? { reservas: 0, total: 0 };
        return {
          id: perfil.id,
          nombre: `${perfil.nombres} ${perfil.apellidos}`.trim(),
          telefono: perfil.telefono,
          rol: perfil.rol,
          fechaCreacion: perfil.fecha_creacion,
          reservas: resumen.reservas,
          totalReservado: resumen.total,
        };
      });

    const movimientos: MovimientoAdministracion[] = movimientosDb.map((movimiento) => ({
      id: movimiento.id,
      productoId: movimiento.producto,
      producto: mapaProductos.get(movimiento.producto)?.nombre ?? 'Producto',
      reservaId: movimiento.reserva,
      codigoReserva: movimiento.reserva
        ? mapaCodigosReserva.get(movimiento.reserva) ?? null
        : null,
      tipo: movimiento.tipo_movimiento as TipoMovimiento,
      cantidad: movimiento.cantidad,
      fecha: movimiento.fecha,
      observaciones: movimiento.observaciones,
    }));

    return {
      productos,
      clientes,
      reservas,
      movimientos,
      cargadoEn: new Date().toISOString(),
    };
  },

  /**
   * Cambia el estado usando la columna existente `reservas.estado`. El trigger
   * `validar_estado_reserva` sigue siendo la autoridad: rechaza transiciones no
   * permitidas y valida stock al confirmar. No se modifica ninguna política.
   */
  actualizarEstadoReserva: async (id: string, estado: EstadoReserva): Promise<void> => {
    const { data, error } = await supabase
      .from('reservas')
      .update({ estado: ESTADO_A_DB[estado] })
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) throw new Error(traducirError(error));
    if (!data) {
      throw new Error(
        'No se pudo actualizar la reserva. Comprueba que sigues teniendo permisos de administrador.',
      );
    }
  },

  /**
   * Suscripción opcional a Supabase Realtime.
   *
   * Solo llegan eventos si las tablas están añadidas a la publicación
   * `supabase_realtime` del proyecto. Si no lo están, la suscripción no emite
   * nada y el panel sigue refrescándose al entrar en una sección, al recuperar
   * el foco o con el botón Actualizar. Nunca se usa polling.
   */
  suscribirCambios: (alCambiar: () => void): (() => void) => {
    const canal = supabase
      .channel('administracion-cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, alCambiar)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'detalles_reserva' },
        alCambiar,
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, alCambiar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perfiles' }, alCambiar)
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  },
};
