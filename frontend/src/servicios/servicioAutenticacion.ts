import type { Session, User } from '@supabase/supabase-js';
import type { Rol } from '../tipos';
import { supabase } from './supabase';

export interface Usuario {
  id: string;
  nombre: string;
  apellidos: string;
  correo: string;
  telefono: string;
  rol: Rol;
  correoConfirmado: boolean;
  aceptaTerminos: boolean;
}

export interface DatosRegistro {
  nombre: string;
  apellidos: string;
  correo: string;
  telefono: string;
  contrasena: string;
  confirmacion?: string;
  aceptaTerminos: boolean;
}

export interface ResultadoRegistro {
  /** true cuando Supabase exige confirmar el correo antes de iniciar sesión. */
  requiereConfirmacion: boolean;
  usuario?: Usuario;
}

/** Perfil tal y como se guarda en public.perfiles (no incluye correo: vive en auth.users). */
interface Perfil {
  nombres: string;
  apellidos: string;
  telefono: string | null;
  rol: string;
}

const CAMPOS_PERFIL = 'nombres, apellidos, telefono, rol';
const ROLES_VALIDOS: Rol[] = ['cliente', 'empleado', 'administrador'];

export const MENSAJE_CONTRASENA =
  'La contraseña debe tener al menos 8 caracteres e incluir una mayúscula, una minúscula y un número.';

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const esCorreoValido = (correo: string) => CORREO_VALIDO.test(correo.trim());

export const esContrasenaSegura = (contrasena: string) =>
  contrasena.length >= 8 && /[a-z]/.test(contrasena) && /[A-Z]/.test(contrasena) && /\d/.test(contrasena);

/** Traduce los errores técnicos de Supabase/Auth a mensajes comprensibles en español. */
const traducirError = (error: unknown, respaldo = 'No ha sido posible completar la operación.'): string => {
  const detalle = typeof error === 'string' ? error : '';
  const objeto = (error ?? {}) as { message?: string; code?: string; status?: number };
  const texto = `${objeto.code ?? ''} ${objeto.message ?? detalle}`.toLowerCase();

  if (texto.includes('invalid login credentials')) return 'El correo electrónico o la contraseña no son correctos.';
  if (texto.includes('email not confirmed'))
    return 'Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada y la carpeta de spam.';
  if (texto.includes('already registered') || texto.includes('already been registered'))
    return 'Ya existe una cuenta con ese correo electrónico.';
  if (texto.includes('password should be') || texto.includes('weak password') || texto.includes('password is too short'))
    return MENSAJE_CONTRASENA;
  if (
    texto.includes('rate limit') ||
    texto.includes('too many requests') ||
    texto.includes('security purposes') ||
    objeto.status === 429
  )
    return 'Has realizado demasiados intentos. Espera unos minutos antes de volver a intentarlo.';
  if (texto.includes('otp_expired') || texto.includes('token has expired') || texto.includes('invalid token'))
    return 'El enlace ha caducado o no es válido. Solicita uno nuevo.';
  if (texto.includes('failed to fetch') || texto.includes('networkerror') || texto.includes('fetch failed'))
    return 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';
  if (texto.includes('row-level security') || texto.includes('permission denied'))
    return 'Tu cuenta no tiene permisos para realizar esta acción.';
  return respaldo;
};

const esTablaAusente = (error: { code?: string; message?: string } | null) =>
  Boolean(
    error &&
      (error.code === '42P01' ||
        error.code === 'PGRST205' ||
        /does not exist|schema cache|no existe/i.test(error.message ?? '')),
  );

/** Metadatos introducidos en el registro. Nunca contienen el rol. */
const leerMetadatos = (usuario: User) => {
  const meta = (usuario.user_metadata ?? {}) as Record<string, unknown>;
  const texto = (valor: unknown) => (typeof valor === 'string' ? valor.trim() : '');
  return {
    nombres: texto(meta.nombres),
    apellidos: texto(meta.apellidos),
    telefono: texto(meta.telefono),
  };
};

const mapearUsuario = (perfil: Perfil, usuario: User): Usuario => {
  const rol = ROLES_VALIDOS.includes(perfil.rol as Rol) ? (perfil.rol as Rol) : 'cliente';
  return {
    id: usuario.id,
    nombre: perfil.nombres || 'Cliente',
    apellidos: perfil.apellidos || 'Rentaeasy',
    correo: usuario.email ?? '',
    telefono: perfil.telefono ?? '',
    rol,
    correoConfirmado: Boolean(usuario.email_confirmed_at || usuario.confirmed_at),
    aceptaTerminos: true,
  };
};

const normalizarPerfil = (datos: Partial<Perfil>): Perfil => ({
  nombres: typeof datos.nombres === 'string' ? datos.nombres : '',
  apellidos: typeof datos.apellidos === 'string' ? datos.apellidos : '',
  telefono: typeof datos.telefono === 'string' && datos.telefono.length > 0 ? datos.telefono : null,
  rol: typeof datos.rol === 'string' ? datos.rol : 'cliente',
});

const obtenerPerfil = async (id: string): Promise<Perfil | null> => {
  const { data, error } = await supabase
    .from('perfiles')
    .select(CAMPOS_PERFIL)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    if (esTablaAusente(error)) {
      console.warn('[auth] La tabla public.perfiles no está disponible. Revisa la migración de Supabase.');
      return null;
    }
    throw new Error(traducirError(error, 'No se pudo cargar tu perfil.'));
  }

  return data ? normalizarPerfil(data as Partial<Perfil>) : null;
};

/**
 * El rol SIEMPRE se lee de public.perfiles. Si el perfil todavía no existe se
 * crea con rol "cliente" (mínimo privilegio) y, si la tabla no estuviera
 * desplegada, se aplica también "cliente" por defecto. Nunca se acepta un rol
 * enviado por el navegador ni guardado en localStorage.
 */
const asegurarPerfil = async (usuario: User): Promise<Usuario> => {
  const metadatos = leerMetadatos(usuario);
  const perfil = await obtenerPerfil(usuario.id);

  if (!perfil) {
    const nuevo: Perfil & { id: string } = {
      id: usuario.id,
      nombres: metadatos.nombres || 'Cliente',
      apellidos: metadatos.apellidos || 'Rentaeasy',
      telefono: metadatos.telefono || null,
      rol: 'cliente',
    };

    const { data, error } = await supabase
      .from('perfiles')
      .insert(nuevo)
      .select(CAMPOS_PERFIL)
      .maybeSingle();

    if (error) {
      if (esTablaAusente(error)) return mapearUsuario(nuevo, usuario);
      // El trigger de auth.users puede haber creado el perfil mientras tanto.
      const reintento = await obtenerPerfil(usuario.id).catch(() => null);
      if (reintento) return mapearUsuario(reintento, usuario);
      throw new Error(traducirError(error, 'No se pudo crear tu perfil de Rentaeasy.'));
    }

    return mapearUsuario(data ? normalizarPerfil(data as Partial<Perfil>) : nuevo, usuario);
  }

  const cambios: Partial<Perfil> = {};
  if ((!perfil.nombres || perfil.nombres === 'Cliente') && metadatos.nombres) cambios.nombres = metadatos.nombres;
  if ((!perfil.apellidos || perfil.apellidos === 'Rentaeasy') && metadatos.apellidos) cambios.apellidos = metadatos.apellidos;
  if (!perfil.telefono && metadatos.telefono) cambios.telefono = metadatos.telefono;

  if (Object.keys(cambios).length === 0) return mapearUsuario(perfil, usuario);

  const { data, error } = await supabase
    .from('perfiles')
    .update(cambios)
    .eq('id', usuario.id)
    .select(CAMPOS_PERFIL)
    .maybeSingle();

  if (error) {
    console.warn('[auth] No se pudieron completar los datos del perfil.', error.message);
    return mapearUsuario(perfil, usuario);
  }

  return mapearUsuario(data ? normalizarPerfil(data as Partial<Perfil>) : { ...perfil, ...cambios }, usuario);
};

/**
 * Evita resolver dos veces el mismo token cuando signInWithPassword dispara
 * onAuthStateChange. No se cachea ningún rol: el rol cacheado proviene de la
 * fila de perfiles ya verificada en el servidor.
 */
let cacheSesion: { token: string; usuario: Usuario } | null = null;

const resolverSesion = async (sesion: Session | null): Promise<Usuario | null> => {
  if (!sesion?.user) {
    cacheSesion = null;
    return null;
  }
  if (cacheSesion?.token === sesion.access_token) return cacheSesion.usuario;

  const usuario = await asegurarPerfil(sesion.user);
  cacheSesion = { token: sesion.access_token, usuario };
  return usuario;
};

const validarRegistro = (datos: DatosRegistro) => {
  if (datos.nombre.trim().length < 2) throw new Error('El nombre debe tener al menos 2 caracteres.');
  if (datos.apellidos.trim().length < 2) throw new Error('Los apellidos deben tener al menos 2 caracteres.');
  if (!esCorreoValido(datos.correo)) throw new Error('Introduce un correo electrónico válido.');
  if (datos.telefono.trim().length < 6) throw new Error('Introduce un número de teléfono válido.');
  if (!esContrasenaSegura(datos.contrasena)) throw new Error(MENSAJE_CONTRASENA);
  if (datos.confirmacion !== undefined && datos.contrasena !== datos.confirmacion)
    throw new Error('Las contraseñas no coinciden.');
  if (!datos.aceptaTerminos) throw new Error('Debes aceptar los términos y condiciones.');
};

export const servicioAutenticacion = {
  /** Restaura la sesión persistida y devuelve el usuario con su rol real. */
  obtenerUsuarioActual: async (): Promise<Usuario | null> => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[auth] No se pudo recuperar la sesión.', error.message);
      return null;
    }
    return resolverSesion(data.session);
  },

  /** Devuelve la sesión activa (necesaria para el enlace de recuperación). */
  obtenerSesion: async (): Promise<Session | null> => {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session;
  },

  /**
   * Escucha los cambios de sesión (login, logout, renovación de token, enlaces
   * de correo). El perfil y el rol se vuelven a leer de public.perfiles.
   */
  suscribirSesion: (manejador: (usuario: Usuario | null) => void): (() => void) => {
    const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      // Se difiere para no bloquear el lock interno de Supabase Auth.
      window.setTimeout(() => {
        resolverSesion(sesion)
          .then(manejador)
          .catch((error: unknown) => {
            console.error('[auth] No se pudo resolver la sesión.', error);
            manejador(null);
          });
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  },

  registrarCliente: async (datos: DatosRegistro): Promise<ResultadoRegistro> => {
    validarRegistro(datos);

    const correo = datos.correo.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: correo,
      password: datos.contrasena,
      options: {
        data: {
          nombres: datos.nombre.trim(),
          apellidos: datos.apellidos.trim(),
          telefono: datos.telefono.trim(),
        },
        emailRedirectTo: `${window.location.origin}/cuenta`,
      },
    });

    if (error) throw new Error(traducirError(error, 'No se pudo crear la cuenta.'));
    if (!data.user) throw new Error('No se pudo crear la cuenta. Inténtalo de nuevo.');

    // Con la confirmación de correo activa, Supabase devuelve un usuario sin
    // identidades cuando el correo ya estaba registrado. Se responde igual para
    // no revelar qué correos tienen cuenta.
    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { requiereConfirmacion: true };
    }

    if (!data.session) return { requiereConfirmacion: true };

    const usuario = await asegurarPerfil(data.user);
    cacheSesion = { token: data.session.access_token, usuario };
    return { requiereConfirmacion: false, usuario };
  },

  iniciarSesion: async (correo: string, contrasena: string): Promise<Usuario> => {
    if (!esCorreoValido(correo)) throw new Error('Introduce un correo electrónico válido.');
    if (!contrasena) throw new Error('Introduce tu contraseña.');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: correo.trim().toLowerCase(),
      password: contrasena,
    });

    if (error) throw new Error(traducirError(error, 'No se pudo iniciar sesión.'));
    if (!data.user) throw new Error('No se pudo iniciar sesión. Inténtalo de nuevo.');

    const usuario = await asegurarPerfil(data.user);
    if (data.session) cacheSesion = { token: data.session.access_token, usuario };
    return usuario;
  },

  actualizarPerfil: async (datos: Pick<Usuario, 'nombre' | 'apellidos' | 'telefono'>): Promise<Usuario> => {
    if (datos.nombre.trim().length < 2) throw new Error('El nombre debe tener al menos 2 caracteres.');
    if (datos.apellidos.trim().length < 2) throw new Error('Los apellidos deben tener al menos 2 caracteres.');

    const { data: sesionActual, error: errorSesion } = await supabase.auth.getUser();
    if (errorSesion || !sesionActual.user) throw new Error('Tu sesión ha caducado. Vuelve a iniciar sesión.');

    const { data, error } = await supabase
      .from('perfiles')
      .update({
        nombres: datos.nombre.trim(),
        apellidos: datos.apellidos.trim(),
        telefono: datos.telefono.trim() || null,
      })
      .eq('id', sesionActual.user.id)
      .select(CAMPOS_PERFIL)
      .single();

    if (error) throw new Error(traducirError(error, 'No se pudieron guardar los cambios.'));

    cacheSesion = null;
    return mapearUsuario(normalizarPerfil(data as Partial<Perfil>), sesionActual.user);
  },

  cambiarContrasena: async (actual: string, nueva: string): Promise<void> => {
    if (!actual) throw new Error('Introduce tu contraseña actual.');
    if (!esContrasenaSegura(nueva)) throw new Error(MENSAJE_CONTRASENA);

    const { data: sesionActual, error: errorSesion } = await supabase.auth.getUser();
    if (errorSesion || !sesionActual.user?.email)
      throw new Error('Tu sesión ha caducado. Vuelve a iniciar sesión.');

    // Supabase no pide la contraseña actual para updateUser: se reautentica para
    // comprobarla antes de cambiarla.
    const { error: errorAcceso } = await supabase.auth.signInWithPassword({
      email: sesionActual.user.email,
      password: actual,
    });
    if (errorAcceso) throw new Error('La contraseña actual no es correcta.');

    const { error } = await supabase.auth.updateUser({ password: nueva });
    if (error) throw new Error(traducirError(error, 'No se pudo actualizar la contraseña.'));

    cacheSesion = null;
  },

  reenviarConfirmacion: async (correo: string): Promise<void> => {
    if (!esCorreoValido(correo)) throw new Error('Introduce un correo electrónico válido.');

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: correo.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/cuenta` },
    });

    if (!error) return;

    const texto = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
    if (error.status === 429 || /rate limit|security purposes|too many/.test(texto)) {
      throw new Error('Has solicitado demasiados correos. Espera unos minutos antes de volver a intentarlo.');
    }
    if (/failed to fetch|networkerror|fetch failed/.test(texto)) {
      throw new Error('No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.');
    }
    throw new Error(traducirError(error, 'No se pudo reenviar el correo de confirmación.'));
  },

  solicitarRecuperacion: async (correo: string): Promise<void> => {    if (!esCorreoValido(correo)) throw new Error('Introduce un correo electrónico válido.');

    const { error } = await supabase.auth.resetPasswordForEmail(correo.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/restablecer-contrasena`,
    });

    if (!error) return;

    const texto = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
    if (error.status === 429 || /rate limit|security purposes|too many/.test(texto)) {
      throw new Error('Has solicitado demasiados enlaces. Espera unos minutos antes de volver a intentarlo.');
    }
    if (/failed to fetch|networkerror|fetch failed/.test(texto) || (error.status ?? 0) >= 500) {
      throw new Error('No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.');
    }
    // El resto de errores se ignoran para no revelar si el correo existe.
  },

  actualizarContrasenaRecuperacion: async (nueva: string): Promise<void> => {
    if (!esContrasenaSegura(nueva)) throw new Error(MENSAJE_CONTRASENA);

    const { data, error: errorSesion } = await supabase.auth.getSession();
    if (errorSesion || !data.session)
      throw new Error('El enlace de recuperación no es válido o ha caducado. Solicita uno nuevo.');

    const { error } = await supabase.auth.updateUser({ password: nueva });
    if (error) throw new Error(traducirError(error, 'No se pudo actualizar la contraseña.'));

    cacheSesion = null;
  },

  cerrarSesion: async (): Promise<void> => {
    cacheSesion = null;
    const { error } = await supabase.auth.signOut();
    if (error) console.warn('[auth] No se pudo cerrar la sesión en el servidor.', error.message);
  },
};
