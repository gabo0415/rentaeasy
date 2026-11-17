import { Router } from 'express';
export const rutasAutenticacion = Router();
// Las sesiones se crean y validan exclusivamente con Supabase Auth.
rutasAutenticacion.use((_solicitud, respuesta) => respuesta.status(410).json({
  error: 'Esta ruta fue retirada. Utiliza Supabase Auth para registrar o iniciar sesión.',
}));
