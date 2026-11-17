import { NextFunction, Request, Response } from 'express';
import { obtenerRolPerfil, verificarTokenSupabase } from '../servicios/supabaseAdmin.js';

export const requiereSesionSupabase = async (solicitud: Request, respuesta: Response, siguiente: NextFunction) => {
  const token = solicitud.header('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return respuesta.status(401).json({ error: 'Debes iniciar sesión.' });
  try {
    const usuario = await verificarTokenSupabase(token);
    if (!usuario) return respuesta.status(401).json({ error: 'La sesión no es válida.' });
    const rol = await obtenerRolPerfil(usuario.id);
    if (rol !== 'cliente' && rol !== 'empleado' && rol !== 'administrador') return respuesta.status(403).json({ error: 'Perfil no autorizado.' });
    solicitud.rol = rol;
    solicitud.tokenSupabase = token;
    return siguiente();
  } catch {
    return respuesta.status(503).json({ error: 'No se pudo verificar la sesión.' });
  }
};

export const requiereEquipoSupabase = (solicitud: Request, respuesta: Response, siguiente: NextFunction) => {
  if (solicitud.rol !== 'empleado' && solicitud.rol !== 'administrador') return respuesta.status(403).json({ error: 'Solo el equipo de operaciones puede acceder.' });
  return siguiente();
};

/**
 * Protege las rutas de administración con un access_token real de Supabase y
 * comprueba el rol en public.perfiles. Nunca confía en un rol del cliente.
 */
export const requiereAdministradorSupabase = async (
  solicitud: Request,
  respuesta: Response,
  siguiente: NextFunction,
) => {
  const autorizacion = solicitud.header('authorization');
  if (!autorizacion?.startsWith('Bearer ')) {
    return respuesta.status(401).json({ error: 'Debes iniciar sesión para realizar esta acción.' });
  }

  const token = autorizacion.slice(7).trim();
  if (!token) {
    return respuesta.status(401).json({ error: 'Debes iniciar sesión para realizar esta acción.' });
  }

  try {
    const usuario = await verificarTokenSupabase(token);
    if (!usuario) {
      return respuesta.status(401).json({ error: 'La sesión no es válida o ha caducado.' });
    }

    const rol = await obtenerRolPerfil(usuario.id);
    if (rol !== 'administrador') {
      return respuesta.status(403).json({ error: 'No tienes permisos para realizar esta acción.' });
    }

    solicitud.tokenSupabase = token;
    return siguiente();
  } catch (error) {
    console.error('[admin] No se pudo verificar la sesión de Supabase.', error);
    return respuesta.status(503).json({
      error: 'La gestión de cuentas internas no está configurada en el servidor.',
    });
  }
};
