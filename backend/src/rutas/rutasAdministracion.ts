import { Router } from 'express';
import { z } from 'zod';
import { requiereAdministradorSupabase } from '../middleware/autenticacionSupabase.js';
import { crearCuentaInterna, asignarRolPerfil } from '../servicios/supabaseAdmin.js';

const esquemaCuentaInterna = z.object({
  nombres: z.string().trim().min(2),
  apellidos: z.string().trim().min(2),
  correo: z.string().trim().email(),
  telefono: z.string().trim().min(6),
  contrasena: z.string().min(8),
  rol: z.enum(['empleado', 'administrador']),
});

const contrasenaSegura = (contrasena: string) =>
  contrasena.length >= 8 && /[a-z]/.test(contrasena) && /[A-Z]/.test(contrasena) && /\d/.test(contrasena);

export const rutasAdministracion = Router();

/**
 * Creación segura de cuentas internas con Supabase Auth.
 *
 * - La sesión del solicitante se verifica contra Supabase.
 * - Se exige rol "administrador" leído de public.perfiles.
 * - La service_role permanece exclusivamente en el servidor.
 */
rutasAdministracion.post('/cuentas-internas', requiereAdministradorSupabase, async (solicitud, respuesta) => {
  const resultado = esquemaCuentaInterna.safeParse(solicitud.body);
  if (!resultado.success) {
    return respuesta.status(400).json({ error: 'Revisa los datos de la cuenta interna.' });
  }
  if (!contrasenaSegura(resultado.data.contrasena)) {
    return respuesta.status(400).json({
      error:
        'La contraseña debe tener al menos 8 caracteres e incluir una mayúscula, una minúscula y un número.',
    });
  }
  if (!solicitud.tokenSupabase) {
    return respuesta.status(401).json({ error: 'Debes iniciar sesión para realizar esta acción.' });
  }

  try {
    const cuenta = await crearCuentaInterna(resultado.data, solicitud.tokenSupabase);
    return respuesta.status(201).json({ cuenta, mensaje: 'Cuenta interna creada correctamente.' });
  } catch (error) {
    console.error('[admin] No se pudo crear la cuenta interna.', error);
    return respuesta
      .status(409)
      .json({ error: error instanceof Error ? error.message : 'No se pudo crear la cuenta interna.' });
  }
});

/**
 * Asigna o cambia el rol de un perfil existente. Solo un administrador
 * autenticado puede hacerlo; el trigger de base de datos lo vuelve a validar.
 */
rutasAdministracion.patch('/cuentas-internas/:id', requiereAdministradorSupabase, async (solicitud, respuesta) => {
  const parametros = z.object({ id: z.string().uuid() }).safeParse(solicitud.params);
  const cuerpo = z
    .object({ rol: z.enum(['cliente', 'empleado', 'administrador']) })
    .safeParse(solicitud.body);

  if (!parametros.success || !cuerpo.success) {
    return respuesta.status(400).json({ error: 'Revisa el identificador y el rol indicados.' });
  }
  if (!solicitud.tokenSupabase) {
    return respuesta.status(401).json({ error: 'Debes iniciar sesión para realizar esta acción.' });
  }

  try {
    const perfil = await asignarRolPerfil(parametros.data.id, cuerpo.data.rol, solicitud.tokenSupabase);
    return respuesta.json({ perfil, mensaje: 'Rol actualizado correctamente.' });
  } catch (error) {
    console.error('[admin] No se pudo actualizar el rol.', error);
    return respuesta
      .status(409)
      .json({ error: error instanceof Error ? error.message : 'No se pudo actualizar el rol.' });
  }
});

rutasAdministracion.get('/salud', requiereAdministradorSupabase, (_solicitud, respuesta) => respuesta.json({ protegido: true }));
