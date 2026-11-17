import type { ModalidadAlquiler, Producto } from '../tipos';

/** Misma regla por bloques de 30 días que calcular_importe_alquiler en PostgreSQL. */
export function calcularPrecioReserva(producto: Producto, dias: number, modalidad: ModalidadAlquiler): number {
  if (dias <= 0) return modalidad === 'fin de semana' ? producto.precioFinDeSemana : producto.precioMensual;
  if (modalidad === 'fin de semana') return producto.precioFinDeSemana;
  const bloques = Math.max(1, Math.floor(dias / 30));
  const adicionales = Math.max(0, dias - bloques * 30);
  return Math.round((producto.precioMensual * bloques + (producto.precioDiaAdicional ?? 0) * adicionales) * 100) / 100;
}
