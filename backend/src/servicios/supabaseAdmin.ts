/**
 * Utilidades de administración de Supabase para el backend.
 *
 * IMPORTANTE: la clave service_role solo se lee en el servidor. Nunca debe
 * copiarse al frontend ni enviarse al navegador.
 */

export type RolInterno = 'empleado' | 'administrador';

export interface DatosCuentaInterna {
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  contrasena: string;
  rol: RolInterno;
}

interface UsuarioSupabase {
  id: string;
  email?: string;
}

const obtenerConfiguracion = () => {
  const url = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
  const claveServicio = process.env.SUPABASE_CLAVE_SERVICIO ?? '';
  if (!url || !claveServicio) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_CLAVE_SERVICIO en el servidor.');
  }
  return { url, claveServicio };
};

const leerCuerpo = async (respuesta: Response): Promise<Record<string, unknown>> => {
  const cuerpo = await leerJson(respuesta);
  return cuerpo && typeof cuerpo === 'object' && !Array.isArray(cuerpo)
    ? (cuerpo as Record<string, unknown>)
    : {};
};

const leerJson = async (respuesta: Response): Promise<unknown> => {
  try {
    return await respuesta.json();
  } catch {
    return null;
  }
};

const mensajeDeError = (cuerpo: Record<string, unknown>, respaldo: string): string => {
  for (const candidato of [cuerpo.msg, cuerpo.message, cuerpo.error_description, cuerpo.error]) {
    if (typeof candidato === 'string' && candidato.trim()) return candidato;
  }
  return respaldo;
};

const cabecerasServicio = (claveServicio: string) => ({
  apikey: claveServicio,
  Authorization: `Bearer ${claveServicio}`,
  'Content-Type': 'application/json',
});

/** Verifica un access_token de Supabase y devuelve el usuario asociado. */
export const verificarTokenSupabase = async (token: string): Promise<UsuarioSupabase | null> => {
  const { url, claveServicio } = obtenerConfiguracion();
  const respuesta = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: claveServicio, Authorization: `Bearer ${token}` },
  });
  if (!respuesta.ok) return null;
  const cuerpo = await leerCuerpo(respuesta);
  return typeof cuerpo.id === 'string' ? { id: cuerpo.id, email: typeof cuerpo.email === 'string' ? cuerpo.email : undefined } : null;
};

const leerCuerpoArray = async (respuesta: Response): Promise<unknown[]> => {
  try {
    const cuerpo = await respuesta.json();
    return Array.isArray(cuerpo) ? cuerpo : [];
  } catch {
    return [];
  }
};

/** Lee el rol real desde public.perfiles usando la clave de servidor. */
export const obtenerRolPerfil = async (id: string): Promise<string | null> => {
  const { url, claveServicio } = obtenerConfiguracion();
  const respuesta = await fetch(
    `${url}/rest/v1/perfiles?select=rol&id=eq.${encodeURIComponent(id)}&limit=1`,
    { headers: cabecerasServicio(claveServicio) },
  );
  if (!respuesta.ok) return null;
  const filas = (await leerCuerpoArray(respuesta)) as Array<{ rol?: string }>;
  return filas[0]?.rol ?? null;
};

/**
 * Crea una cuenta interna (empleado o administrador) de forma segura:
 * 1. Crea el usuario de Auth con la clave de servidor (correo ya confirmado).
 * 2. Asigna el rol usando el token del administrador que hace la petición, de
 *    modo que RLS y el trigger proteger_rol_perfil validen el cambio.
 */
export const crearCuentaInterna = async (
  datos: DatosCuentaInterna,
  tokenAdministrador: string,
): Promise<{ id: string; correo: string; rol: RolInterno }> => {
  const { url, claveServicio } = obtenerConfiguracion();
  const correo = datos.correo.trim().toLowerCase();

  const creacion = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: cabecerasServicio(claveServicio),
    body: JSON.stringify({
      email: correo,
      password: datos.contrasena,
      email_confirm: true,
      user_metadata: {
        nombres: datos.nombres.trim(),
        apellidos: datos.apellidos.trim(),
        telefono: datos.telefono.trim(),
      },
    }),
  });

  const cuerpoCreacion = await leerCuerpo(creacion);
  if (!creacion.ok) {
    const detalle = mensajeDeError(cuerpoCreacion, 'No se pudo crear la cuenta interna.');
    if (/already|registered|exists/i.test(detalle)) {
      throw new Error('Ya existe una cuenta con ese correo electrónico.');
    }
    if (/password/i.test(detalle)) {
      throw new Error('La contraseña no cumple los requisitos mínimos de seguridad.');
    }
    throw new Error(detalle);
  }

  const id = typeof cuerpoCreacion.id === 'string' ? cuerpoCreacion.id : '';
  if (!id) throw new Error('Supabase no devolvió el identificador de la cuenta creada.');

  // El trigger de auth.users ya creó el perfil como cliente. Se actualiza el rol
  // con el token del administrador para que el trigger lo autorice.
  const actualizacion = await fetch(`${url}/rest/v1/perfiles?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      apikey: claveServicio,
      Authorization: `Bearer ${tokenAdministrador}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      nombres: datos.nombres.trim(),
      apellidos: datos.apellidos.trim(),
      telefono: datos.telefono.trim() || null,
      rol: datos.rol,
    }),
  });

  const cuerpoActualizacion = await leerJson(actualizacion);
  const filasActualizadas = Array.isArray(cuerpoActualizacion) ? cuerpoActualizacion : [];

  if (!actualizacion.ok) {
    const detalle =
      cuerpoActualizacion && typeof cuerpoActualizacion === 'object'
        ? mensajeDeError(
            cuerpoActualizacion as Record<string, unknown>,
            `La cuenta se creó (${id}), pero no se pudo asignar el rol interno. Revisa la migración y los permisos de public.perfiles.`,
          )
        : `La cuenta se creó (${id}), pero no se pudo asignar el rol interno. Revisa la migración y los permisos de public.perfiles.`;
    throw new Error(detalle);
  }

  if (filasActualizadas.length === 0) {
    // Sin trigger de perfiles: se inserta el perfil con el token del admin.
    const insercion = await fetch(`${url}/rest/v1/perfiles`, {
      method: 'POST',
      headers: {
        apikey: claveServicio,
        Authorization: `Bearer ${tokenAdministrador}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        id,
        nombres: datos.nombres.trim(),
        apellidos: datos.apellidos.trim(),
        telefono: datos.telefono.trim() || null,
        rol: datos.rol,
      }),
    });

    if (!insercion.ok) {
      throw new Error(
        `La cuenta se creó (${id}), pero no se pudo crear su perfil. Aplica la migración de Supabase y asigna el rol manualmente.`,
      );
    }
  }

  return { id, correo, rol: datos.rol };
};

/**
 * Asigna o cambia el rol de un perfil existente usando el token del
 * administrador solicitante. RLS y el trigger proteger_rol_perfil validan el
 * cambio; la service_role nunca se usa para escribir roles.
 */
export const asignarRolPerfil = async (
  id: string,
  rol: 'cliente' | 'empleado' | 'administrador',
  tokenAdministrador: string,
): Promise<{ id: string; rol: string }> => {
  const { url, claveServicio } = obtenerConfiguracion();

  const respuesta = await fetch(`${url}/rest/v1/perfiles?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      apikey: claveServicio,
      Authorization: `Bearer ${tokenAdministrador}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ rol }),
  });

  const cuerpo = await leerJson(respuesta);
  if (!respuesta.ok) {
    const detalle =
      cuerpo && typeof cuerpo === 'object'
        ? mensajeDeError(cuerpo as Record<string, unknown>, 'No se pudo actualizar el rol.')
        : 'No se pudo actualizar el rol.';
    throw new Error(detalle);
  }

  if (!Array.isArray(cuerpo) || cuerpo.length === 0) {
    throw new Error('No existe ningún perfil con ese identificador.');
  }

  return { id, rol };
};
