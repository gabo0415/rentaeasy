import type { Producto } from '../tipos';

/** `false` mientras la disponibilidad real aún no ha llegado de Supabase. */
export const disponibilidadConocida = (producto: Producto): boolean =>
  typeof producto.disponibles === 'number';

/** Solo se puede iniciar una reserva cuando hay al menos una unidad real. */
export const productoDisponible = (producto: Producto): boolean =>
  disponibilidadConocida(producto) && (producto.disponibles as number) > 0;

/** Permite consultar fechas futuras aunque todas las unidades estén ocupadas hoy. */
export const productoAdmiteReservas = (producto: Producto): boolean =>
  Boolean(producto.idBaseDatos && (producto.totalUnidades ?? 0) > 0);

/** Texto corto para tarjetas y resúmenes. */
export const textoDisponibilidad = (producto: Producto): string => {
  if (!disponibilidadConocida(producto)) return 'Comprobando disponibilidad';
  const unidades = producto.disponibles as number;
  if (unidades <= 0) return 'No disponible';
  return unidades === 1 ? '1 disponible' : `${unidades} disponibles`;
};

/** Texto largo para la ficha del producto. */
export const textoUnidadesDisponibles = (producto: Producto): string => {
  if (!disponibilidadConocida(producto)) return 'Comprobando disponibilidad';
  const unidades = producto.disponibles as number;
  if (unidades <= 0) return 'Sin unidades disponibles';
  return unidades === 1 ? '1 unidad disponible' : `${unidades} unidades disponibles`;
};
