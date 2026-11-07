import { Router } from 'express';
import { requiereRol } from '../middleware/autenticacion.js';

const pedidosDemostracion = [
  { id: 'pedido-1048', numero: 'RE-1048', estado: 'En alquiler', importe: 59 },
  { id: 'pedido-1047', numero: 'RE-1047', estado: 'Pendiente', importe: 45 },
  { id: 'pedido-1046', numero: 'RE-1046', estado: 'Confirmada', importe: 49 },
];

export const rutasEmpleados = Router();
rutasEmpleados.use(requiereRol('empleado', 'administrador'));
rutasEmpleados.get('/pedidos', (_solicitud, respuesta) => respuesta.json({ datos: pedidosDemostracion }));
rutasEmpleados.patch('/pedidos/:id/estado', (solicitud, respuesta) => {
  const pedido = pedidosDemostracion.find((elemento) => elemento.id === solicitud.params.id);
  if (!pedido) return respuesta.status(404).json({ error: 'Pedido no encontrado.' });
  const estado = typeof solicitud.body?.estado === 'string' ? solicitud.body.estado : '';
  if (!['Pendiente', 'Confirmada', 'En preparación', 'En alquiler', 'Finalizada', 'Cancelada'].includes(estado)) return respuesta.status(400).json({ error: 'Estado de pedido no válido.' });
  pedido.estado = estado;
  return respuesta.json({ datos: pedido });
});
rutasEmpleados.get('/inventario', (_solicitud, respuesta) => respuesta.json({ datos: [], mensaje: 'Inventario preparado para conectarse a Supabase.' }));
