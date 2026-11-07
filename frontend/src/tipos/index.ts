export type Categoria =
  | 'Conservación, cocina y pequeño electrodoméstico'
  | 'Lavado y cuidado de la ropa'
  | 'Limpieza avanzada y climatización estacional';

export type ModalidadAlquiler = 'fin de semana' | 'mensual' | 'varios meses';
export type ModalidadEntrega = 'tienda' | 'domicilio';
export type Rol = 'cliente' | 'empleado' | 'administrador';
export type EstadoReserva = 'Pendiente' | 'Confirmada' | 'En preparación' | 'En alquiler' | 'Finalizada' | 'Cancelada';

export interface Producto {
  id: string;
  nombre: string;
  categoria: Categoria;
  descripcion: string;
  imagen: string;
  etiquetas: string[];
  caracteristicas: string[];
  precioFinDeSemana: number;
  precioMensual: number;
  precioVariosMeses: number;
  /** Unidades disponibles ahora mismo. `undefined` mientras se consulta Supabase. */
  disponibles?: number;
  /** Unidades físicas totales del producto según Supabase. */
  totalUnidades?: number;
  destacado?: boolean;
}

export interface Reserva {
  id: string;
  producto: string;
  cliente: string;
  inicio: string;
  fin: string;
  importe: number;
  estado: EstadoReserva;
}

export interface Pedido {
  id: string;
  numero: string;
  cliente: { nombre: string; correo: string; telefono: string };
  productoId: string;
  producto: string;
  solicitud: string;
  inicio: string;
  fin: string;
  importe: number;
  entrega: ModalidadEntrega;
  direccion?: string;
  observaciones: string;
  estado: EstadoReserva;
  unidadId?: string;
}

export interface UnidadInventario {
  id: string;
  productoId: string;
  producto: string;
  estado: 'Disponible' | 'Alquilada' | 'Mantenimiento';
  pedido?: string;
  ultimaRevision: string;
}
