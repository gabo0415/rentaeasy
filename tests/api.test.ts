import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://test.supabase.invalid';
process.env.SUPABASE_CLAVE_SERVICIO = 'test-server-key';

test('API: autenticación real, validación y persistencia con el JWT del solicitante', async t => {
  const { aplicacion } = await import('../backend/src/servidor');
  const servidor = aplicacion.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => servidor.once('listening', resolve));
  const origen = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  const fetchReal = globalThis.fetch;
  const llamadas: { url: string; opciones?: RequestInit }[] = [];
  let rol = 'cliente';
  globalThis.fetch = async (input, opciones) => {
    const url = String(input);
    if (!url.startsWith('https://test.supabase.invalid')) return fetchReal(input, opciones);
    llamadas.push({ url, opciones });
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: '11111111-1111-4111-8111-111111111111' });
    if (url.includes('/perfiles?')) return Response.json([{ rol }]);
    if (url.endsWith('/rpc/crear_reserva')) return Response.json({ id: 'reserva-persistida', estado: 'pendiente' });
    return Response.json([]);
  };
  t.after(async () => { globalThis.fetch = fetchReal; await new Promise<void>((resolve, reject) => servidor.close(error => error ? reject(error) : resolve())); });
  const reserva = { productoId: '22222222-2222-4222-8222-222222222222', fechaInicio: '2030-01-01', fechaFin: '2030-01-03', modalidad: 'fin de semana', entrega: 'tienda' };
  await t.test('sin sesión no se crean reservas ni se lee inventario', async () => {
    assert.equal((await fetch(`${origen}/api/reservas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reserva) })).status, 401);
    assert.equal((await fetch(`${origen}/api/empleados/inventario`)).status, 401);
  });
  await t.test('el registro antiguo no crea cuentas de demostración', async () => {
    assert.equal((await fetch(`${origen}/api/autenticacion/registro`, { method: 'POST' })).status, 410);
  });
  await t.test('la reserva se escribe mediante RPC usando JWT y sin precio del navegador', async () => {
    const respuesta = await fetch(`${origen}/api/reservas`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer client-jwt' }, body: JSON.stringify({ ...reserva, importe: 0 }) });
    assert.equal(respuesta.status, 201);
    assert.equal((await respuesta.json()).id, 'reserva-persistida');
    const llamada = llamadas.find(llamada => llamada.url.endsWith('/rpc/crear_reserva'))!;
    assert.equal((llamada.opciones!.headers as Record<string, string>).Authorization, 'Bearer client-jwt');
    const cuerpo = JSON.parse(llamada.opciones!.body as string);
    assert.equal(cuerpo.p_modalidad_alquiler, 'fin_de_semana');
    assert.equal('importe' in cuerpo, false);
  });
  await t.test('un cliente no puede usar rutas de empleados', async () => {
    assert.equal((await fetch(`${origen}/api/empleados/pedidos`, { headers: { Authorization: 'Bearer client-jwt' } })).status, 403);
  });
  await t.test('un empleado recibe datos reales y se rechazan parámetros inválidos', async () => {
    rol = 'empleado';
    assert.equal((await fetch(`${origen}/api/empleados/inventario`, { headers: { Authorization: 'Bearer employee-jwt' } })).status, 200);
    assert.equal((await fetch(`${origen}/api/empleados/pedidos/no-es-uuid/estado`, { method: 'PATCH', headers: { Authorization: 'Bearer employee-jwt', 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'finalizada' }) })).status, 400);
  });
  await t.test('fechas invertidas y JSON mal formado no causan éxitos falsos', async () => {
    assert.equal((await fetch(`${origen}/api/reservas`, { method: 'POST', headers: { Authorization: 'Bearer client-jwt', 'Content-Type': 'application/json' }, body: JSON.stringify({ ...reserva, fechaFin: '2029-01-01' }) })).status, 400);
    const respuesta = await fetch(`${origen}/api/reservas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(respuesta.status, 400);
    assert.match((await respuesta.json()).error, /JSON/);
  });
});
