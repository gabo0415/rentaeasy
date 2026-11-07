import { Router } from 'express';
import { z } from 'zod';
import { servicioAutenticacion } from '../servicios/servicioAutenticacion.js';

const datosRegistro = z.object({ nombre: z.string().min(2), apellidos: z.string().min(2), correo: z.string().email(), telefono: z.string().min(6), contrasena: z.string().min(8), aceptaTerminos: z.literal(true) });
const datosInicio = z.object({ correo: z.string().email(), contrasena: z.string().min(1) });

export const rutasAutenticacion = Router();
rutasAutenticacion.post('/registro', (solicitud, respuesta) => {
  const resultado = datosRegistro.safeParse(solicitud.body);
  if (!resultado.success) return respuesta.status(400).json({ error: 'Revisa los datos del registro.' });
  try { return respuesta.status(201).json({ usuario: servicioAutenticacion.registrarCliente(resultado.data), mensaje: 'Cuenta creada correctamente.' }); } catch (error) { return respuesta.status(409).json({ error: error instanceof Error ? error.message : 'No se pudo crear la cuenta.' }); }
});
rutasAutenticacion.post('/iniciar-sesion', (solicitud, respuesta) => {
  const resultado = datosInicio.safeParse(solicitud.body);
  if (!resultado.success) return respuesta.status(400).json({ error: 'Correo o contraseña no válidos.' });
  try { return respuesta.json(servicioAutenticacion.iniciarSesion(resultado.data.correo, resultado.data.contrasena)); } catch (error) { return respuesta.status(401).json({ error: error instanceof Error ? error.message : 'No autorizado.' }); }
});
