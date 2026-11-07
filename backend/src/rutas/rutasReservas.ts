import { Router } from 'express';
import { z } from 'zod';
import { servicioDisponibilidad } from '../servicios/servicioDisponibilidad.js';

const esquemaReserva = z.object({
  productoId: z.string().min(1), fechaInicio: z.string(), fechaFin: z.string(),
  modalidad: z.enum(['fin de semana', 'mensual', 'varios meses']),
  entrega: z.enum(['tienda', 'domicilio']), direccion: z.string().optional(),
});

export const rutasReservas = Router();
rutasReservas.post('/validar', (solicitud, respuesta) => {
  const resultado = esquemaReserva.safeParse(solicitud.body);
  if (!resultado.success) return respuesta.status(400).json({ error: 'Los datos de la reserva no son válidos.', detalles: resultado.error.flatten() });
  return respuesta.json(servicioDisponibilidad.validarReserva(resultado.data));
});

rutasReservas.post('/', (solicitud, respuesta) => {
  const resultado = esquemaReserva.safeParse(solicitud.body);
  if (!resultado.success) return respuesta.status(400).json({ error: 'Revisa los datos de la reserva.' });
  const disponibilidad = servicioDisponibilidad.validarReserva(resultado.data);
  if (!disponibilidad.disponible) return respuesta.status(409).json({ error: disponibilidad.mensaje });
  return respuesta.status(201).json({ mensaje: 'Solicitud de reserva recibida.', reserva: { ...resultado.data, estado: 'Pendiente' } });
});
