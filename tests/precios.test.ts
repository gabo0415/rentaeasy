import test from 'node:test';
import assert from 'node:assert/strict';
import type { Producto } from '../frontend/src/tipos/index';
import { calcularPrecioReserva } from '../frontend/src/utilidades/precioReserva';
import { obtenerDias } from '../frontend/src/utilidades/formato';
import { SIGUIENTES_ESTADOS } from '../frontend/src/utilidades/estadosReserva';
import { productoAdmiteReservas } from '../frontend/src/utilidades/disponibilidad';

const producto = { precioFinDeSemana: 29, precioMensual: 59, precioDiaAdicional: 3 } as Producto;
test('fin de semana mantiene una tarifa por hasta tres días', () => {
  for (const dias of [1, 2, 3]) assert.equal(calcularPrecioReserva(producto, dias, 'fin de semana'), 29);
});
test('tarifas mensuales coinciden con los bloques de PostgreSQL', () => {
  for (const modalidad of ['mensual', 'varios meses'] as const) {
    for (const [dias, esperado] of [[1, 59], [30, 59], [31, 62], [59, 146], [60, 118], [61, 121], [90, 177]]) {
      assert.equal(calcularPrecioReserva(producto, dias, modalidad), esperado, `${modalidad}, ${dias} días`);
    }
  }
});
test('precio estimado redondea a céntimos y las fechas incluyen ambos extremos', () => {
  assert.equal(calcularPrecioReserva({ ...producto, precioMensual: 59.99, precioDiaAdicional: 1.23 }, 32, 'mensual'), 62.45);
  assert.equal(obtenerDias('2026-11-20', '2026-11-22'), 3);
  assert.equal(obtenerDias('2026-11-20', '2026-12-19'), 30);
});
test('reservas cerradas no ofrecen acciones y la entrega precede a devolución', () => {
  assert.deepEqual(SIGUIENTES_ESTADOS.Finalizada, []);
  assert.deepEqual(SIGUIENTES_ESTADOS.Cancelada, []);
  assert.deepEqual(SIGUIENTES_ESTADOS['En alquiler'], ['Finalizada']);
  assert.deepEqual(SIGUIENTES_ESTADOS['En preparación'], ['En alquiler', 'Cancelada']);
});
test('un producto ocupado hoy permite consultar fechas futuras, pero uno sin stock no', () => {
  assert.equal(productoAdmiteReservas({ ...producto, idBaseDatos: 'uuid', disponibles: 0, totalUnidades: 1 }), true);
  assert.equal(productoAdmiteReservas({ ...producto, idBaseDatos: 'uuid', disponibles: 0, totalUnidades: 0 }), false);
  assert.equal(productoAdmiteReservas(producto), false);
});
