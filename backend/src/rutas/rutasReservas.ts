import { Router } from 'express';
import { z } from 'zod';
import { requiereSesionSupabase } from '../middleware/autenticacionSupabase.js';
import { consultarDatos } from '../servicios/datosSupabase.js';

const esquema = z.object({
  productoId: z.string().uuid(), fechaInicio: z.string().date(), fechaFin: z.string().date(),
  modalidad: z.enum(['fin de semana', 'mensual', 'varios meses']),
  entrega: z.enum(['tienda', 'domicilio']), direccion: z.string().trim().max(1000).optional(),
}).refine(datos => datos.fechaFin >= datos.fechaInicio, 'Revisa las fechas.')
  .refine(datos => datos.entrega !== 'domicilio' || (datos.direccion?.length ?? 0) >= 9, 'Indica una dirección completa.');
export const rutasReservas = Router();
rutasReservas.use(requiereSesionSupabase);
rutasReservas.post('/validar', async (solicitud, respuesta) => {
  const validado = esquema.safeParse(solicitud.body);
  if (!validado.success) return respuesta.status(400).json({ error: 'Revisa los datos de la reserva.' });
  try {
    const datos = validado.data;
    const resultado = await consultarDatos('rpc/obtener_disponibilidad_producto', solicitud.tokenSupabase, 'POST', {
      p_producto: datos.productoId, p_fecha_inicio: datos.fechaInicio, p_fecha_devolucion: datos.fechaFin,
    });
    return respuesta.status(resultado.estado).json(resultado.datos);
  } catch { return respuesta.status(503).json({ error: 'No se pudo consultar la disponibilidad.' }); }
});
rutasReservas.post('/', async (solicitud, respuesta) => {
  const validado = esquema.safeParse(solicitud.body);
  if (!validado.success) return respuesta.status(400).json({ error: 'Revisa los datos de la reserva.' });
  try {
    const datos = validado.data;
    const resultado = await consultarDatos('rpc/crear_reserva', solicitud.tokenSupabase, 'POST', {
      p_items: [{ producto: datos.productoId, cantidad: 1 }], p_fecha_inicio: datos.fechaInicio,
      p_fecha_devolucion: datos.fechaFin, p_modalidad_alquiler: datos.modalidad.replaceAll(' ', '_'),
      p_modalidad_entrega: datos.entrega, p_direccion_entrega: datos.entrega === 'domicilio' ? datos.direccion : null,
    });
    return respuesta.status(resultado.estado >= 400 ? resultado.estado : 201).json(resultado.datos);
  } catch { return respuesta.status(503).json({ error: 'No se pudo guardar la reserva.' }); }
});
