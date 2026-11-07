import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import {
  esContrasenaSegura,
  MENSAJE_CONTRASENA,
  servicioAutenticacion,
} from '../servicios/servicioAutenticacion';

interface PropiedadesPaginaRestablecerContrasena {
  alTerminar: () => void;
  volver: () => void;
}

type Estado = 'comprobando' | 'listo' | 'invalido' | 'completado';

const leerErrorDeUrl = (): string => {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const busqueda = new URLSearchParams(window.location.search);
  const codigo = hash.get('error_code') || busqueda.get('error_code') || '';
  const descripcion = hash.get('error_description') || busqueda.get('error_description') || '';
  if (!codigo && !descripcion) return '';
  return /expired|invalid/i.test(`${codigo} ${descripcion}`)
    ? 'El enlace ha caducado o no es válido. Solicita uno nuevo desde la página de inicio de sesión.'
    : 'No se pudo verificar el enlace de recuperación. Solicita uno nuevo.';
};

export function PaginaRestablecerContrasena({ alTerminar, volver }: PropiedadesPaginaRestablecerContrasena) {
  const [estado, setEstado] = useState<Estado>('comprobando');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    let temporizador: number | undefined;
    const marcarListo = () => {
      if (activo) setEstado((actual) => (actual === 'comprobando' ? 'listo' : actual));
    };

    const errorUrl = leerErrorDeUrl();
    if (errorUrl) {
      setError(errorUrl);
      setEstado('invalido');
      return;
    }

    const urlConTokens = /access_token=|refresh_token=|code=/.test(
      `${window.location.hash} ${window.location.search}`,
    );

    void servicioAutenticacion
      .obtenerSesion()
      .then((sesion) => {
        if (!activo) return;
        if (sesion) {
          marcarListo();
          return;
        }
        if (!urlConTokens) {
          setEstado('invalido');
          return;
        }
        // Supabase puede tardar unos instantes en procesar el token del enlace.
        temporizador = window.setTimeout(() => {
          if (activo) setEstado((actual) => (actual === 'comprobando' ? 'invalido' : actual));
        }, 6000);
      })
      .catch(() => {
        if (activo) setEstado('invalido');
      });

    const cancelar = servicioAutenticacion.suscribirSesion((usuario) => {
      if (usuario) marcarListo();
    });

    return () => {
      activo = false;
      cancelar();
      if (temporizador) window.clearTimeout(temporizador);
    };
  }, []);

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError('');
    setCargando(true);
    try {
      if (nueva !== confirmacion) throw new Error('Las contraseñas no coinciden.');
      if (!esContrasenaSegura(nueva)) throw new Error(MENSAJE_CONTRASENA);
      await servicioAutenticacion.actualizarContrasenaRecuperacion(nueva);
      await servicioAutenticacion.cerrarSesion();
      setEstado('completado');
      setNueva('');
      setConfirmacion('');
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudo actualizar la contraseña.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="grid min-h-[calc(100vh-76px)] place-items-center bg-neblina px-5 py-12">
      <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-7 shadow-suave sm:p-10">
        <button
          onClick={volver}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-electrico"
        >
          <ArrowLeft size={16} /> Volver a la tienda
        </button>

        {estado === 'comprobando' && (
          <div className="py-10 text-center">
            <div
              role="status"
              aria-live="polite"
              className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-electrico"
            />
            <h1 className="mt-6 text-2xl font-black text-tinta">Verificando el enlace</h1>
            <p className="mt-2 text-sm text-slate-500">Estamos comprobando tu enlace de recuperación.</p>
          </div>
        )}

        {estado === 'invalido' && (
          <div className="mt-8 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-50 text-amber-600">
              <KeyRound size={29} />
            </span>
            <h1 className="mt-6 text-2xl font-black text-tinta">Enlace no válido</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {error || 'El enlace de recuperación no es válido o ha caducado.'}
            </p>
            <button
              onClick={alTerminar}
              className="mt-7 w-full rounded-xl bg-electrico px-4 py-3.5 text-sm font-bold text-white transition hover:bg-violeta"
            >
              Solicitar un enlace nuevo
            </button>
          </div>
        )}

        {estado === 'completado' && (
          <div className="mt-8 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={29} />
            </span>
            <h1 className="mt-6 text-2xl font-black text-tinta">Contraseña actualizada</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Tu nueva contraseña ya está activa. Inicia sesión para continuar con tu cuenta.
            </p>
            <button
              onClick={alTerminar}
              className="mt-7 w-full rounded-xl bg-electrico px-4 py-3.5 text-sm font-bold text-white transition hover:bg-violeta"
            >
              Iniciar sesión
            </button>
          </div>
        )}

        {estado === 'listo' && (
          <>
            <div className="mt-8">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-electrico">Seguridad</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-tinta">Nueva contraseña</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Elige una contraseña segura. No la compartas con nadie.
              </p>
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-electrico">
                <LockKeyhole size={15} /> {MENSAJE_CONTRASENA}
              </p>
            </div>

            {error && (
              <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>
            )}

            <form onSubmit={enviar} className="mt-6 space-y-4">
              <Campo
                id="nueva-contrasena"
                etiqueta="Nueva contraseña"
                value={nueva}
                alCambiar={setNueva}
                mostrar={mostrarContrasena}
                alternarMostrar={() => setMostrarContrasena(!mostrarContrasena)}
              />
              <Campo
                id="confirmar-contrasena"
                etiqueta="Confirmación de contraseña"
                value={confirmacion}
                alCambiar={setConfirmacion}
                mostrar={mostrarContrasena}
                alternarMostrar={() => setMostrarContrasena(!mostrarContrasena)}
              />
              {confirmacion && nueva !== confirmacion && (
                <p className="text-xs font-semibold text-red-600">Las contraseñas no coinciden.</p>
              )}
              <button
                type="submit"
                disabled={cargando || (Boolean(confirmacion) && nueva !== confirmacion)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-electrico px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-violeta disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {cargando ? 'Guardando...' : 'Guardar nueva contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

function Campo({
  id,
  etiqueta,
  value,
  alCambiar,
  mostrar,
  alternarMostrar,
}: {
  id: string;
  etiqueta: string;
  value: string;
  alCambiar: (valor: string) => void;
  mostrar: boolean;
  alternarMostrar: () => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-bold text-tinta">
        {etiqueta}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={mostrar ? 'text' : 'password'}
          required
          minLength={8}
          value={value}
          onChange={(evento) => alCambiar(evento.target.value)}
          placeholder="Mínimo 8 caracteres"
          className="w-full rounded-xl border border-slate-200 px-3 py-3 pr-10 text-sm outline-none transition focus:border-electrico"
        />
        <button
          type="button"
          onClick={alternarMostrar}
          aria-label={mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-electrico"
        >
          {mostrar ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}
