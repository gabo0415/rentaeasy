import { NextFunction, Request, Response } from 'express';
import { servicioAutenticacion } from '../servicios/servicioAutenticacion.js';

export type Rol = 'cliente' | 'empleado' | 'administrador';

/** Adaptador temporal. En producción el token será un JWT verificado por Supabase Auth. */
export const obtenerUsuarioAutenticado = (solicitud: Request) => {
  const autorizacion = solicitud.header('authorization');
  if (!autorizacion?.startsWith('Bearer ')) return undefined;
  return servicioAutenticacion.obtenerUsuarioPorToken(autorizacion.slice(7));
};

export const requiereRol = (...rolesPermitidos: Rol[]) => (solicitud: Request, respuesta: Response, siguiente: NextFunction) => {
  const usuario = obtenerUsuarioAutenticado(solicitud);
  if (!usuario) return respuesta.status(401).json({ error: 'Debes iniciar sesión para realizar esta acción.' });
  if (!rolesPermitidos.includes(usuario.rol)) return respuesta.status(403).json({ error: 'No tienes permisos para realizar esta acción.' });
  solicitud.rol = usuario.rol;
  return siguiente();
};
