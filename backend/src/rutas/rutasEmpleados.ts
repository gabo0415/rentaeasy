import { Router } from 'express';
import { z } from 'zod';
import { requiereSesionSupabase, requiereEquipoSupabase } from '../middleware/autenticacionSupabase.js';
import { consultarDatos } from '../servicios/datosSupabase.js';
export const rutasEmpleados = Router();
rutasEmpleados.use(requiereSesionSupabase, requiereEquipoSupabase);
rutasEmpleados.get('/pedidos', async (solicitud, respuesta) => {
  try {
    const resultado = await consultarDatos('reservas?select=*,detalles_reserva(*)&order=fecha_solicitud.desc', solicitud.tokenSupabase);
    return respuesta.status(resultado.estado).json({ datos: resultado.datos });
  } catch { return respuesta.status(503).json({ error: 'No se pudieron cargar las reservas.' }); }
});
rutasEmpleados.patch('/pedidos/:id/estado', async (solicitud, respuesta) => {
  const id = z.string().uuid().safeParse(solicitud.params.id);
  const cuerpo = z.object({ estado: z.enum(['pendiente','confirmada','en_preparacion','en_alquiler','finalizada','cancelada']) }).safeParse(solicitud.body);
  if (!id.success || !cuerpo.success) return respuesta.status(400).json({ error: 'Identificador o estado no válido.' });
  try {
    const resultado = await consultarDatos(`reservas?id=eq.${id.data}&select=id,estado`, solicitud.tokenSupabase, 'PATCH', cuerpo.data);
    if (Array.isArray(resultado.datos) && resultado.datos.length === 0) return respuesta.status(404).json({ error: 'Reserva no encontrada.' });
    return respuesta.status(resultado.estado).json({ datos: resultado.datos });
  } catch { return respuesta.status(503).json({ error: 'No se pudo actualizar la reserva.' }); }
});
rutasEmpleados.get('/inventario', async (solicitud, respuesta) => {
  try {
    const resultado = await consultarDatos('productos?select=id,nombre,stock_total,stock_disponible,estado&order=nombre', solicitud.tokenSupabase);
    return respuesta.status(resultado.estado).json({ datos: resultado.datos });
  } catch { return respuesta.status(503).json({ error: 'No se pudo cargar el inventario.' }); }
});
