import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  DatosRegistro,
  esContrasenaSegura,
  MENSAJE_CONTRASENA,
  servicioAutenticacion,
  Usuario,
} from '../servicios/servicioAutenticacion';

type Modo = 'inicio' | 'registro' | 'recuperar';

interface PropiedadesPaginaAutenticacion {
  modoInicial: 'inicio' | 'registro';
  alAutenticar: (usuario: Usuario) => void;
  volver: () => void;
  cambiarModo: (modo: 'inicio' | 'registro') => void;
}

const DATOS_INICIALES: DatosRegistro = {
  nombre: '',
  apellidos: '',
  correo: '',
  telefono: '',
  contrasena: '',
  confirmacion: '',
  aceptaTerminos: false,
};

export function PaginaAutenticacion({
  modoInicial,
  alAutenticar,
  volver,
  cambiarModo,
}: PropiedadesPaginaAutenticacion) {
  const [modo, setModo] = useState<Modo>(modoInicial);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [datos, setDatos] = useState<DatosRegistro>(DATOS_INICIALES);
  const [contrasena, setContrasena] = useState('');
  const [necesitaConfirmacion, setNecesitaConfirmacion] = useState(false);

  useEffect(() => setModo(modoInicial), [modoInicial]);

  const cambiar = (nuevoModo: 'inicio' | 'registro') => {
    setModo(nuevoModo);
    cambiarModo(nuevoModo);
    setError('');
    setMensaje('');
  };

  const irARecuperar = () => {
    setModo('recuperar');
    cambiarModo('inicio');
    setError('');
    setMensaje('');
  };

  const volverAInicio = () => {
    setModo('inicio');
    setError('');
    setMensaje('');
  };

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError('');
    setMensaje('');
    setNecesitaConfirmacion(false);
    setCargando(true);

    try {
      if (modo === 'registro') {
        if (datos.contrasena !== datos.confirmacion) throw new Error('Las contraseñas no coinciden.');
        const resultado = await servicioAutenticacion.registrarCliente(datos);
        setDatos({ ...DATOS_INICIALES, correo: datos.correo });

        if (resultado.requiereConfirmacion || !resultado.usuario) {
          setModo('inicio');
          cambiarModo('inicio');
          setMensaje(
            'Te hemos enviado un correo para confirmar tu cuenta. Ábrelo y pulsa el enlace antes de iniciar sesión. Revisa también la carpeta de spam.',
          );
          return;
        }

        setMensaje('Cuenta creada correctamente. Entrando en tu cuenta...');
        const usuario = resultado.usuario;
        window.setTimeout(() => alAutenticar(usuario), 350);
        return;
      }

      if (modo === 'recuperar') {
        await servicioAutenticacion.solicitarRecuperacion(datos.correo);
        setMensaje(
          'Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.',
        );
        return;
      }

      const usuario = await servicioAutenticacion.iniciarSesion(datos.correo, contrasena);
      setMensaje('Sesión iniciada correctamente.');
      window.setTimeout(() => alAutenticar(usuario), 250);
    } catch (problema) {
      const texto = problema instanceof Error ? problema.message : 'No ha sido posible completar la operación.';
      setError(texto);
      setNecesitaConfirmacion(texto.includes('confirmar tu correo'));
    } finally {
      setCargando(false);
    }
  };

  const reenviarConfirmacion = async () => {
    setError('');
    setMensaje('');
    setCargando(true);
    try {
      await servicioAutenticacion.reenviarConfirmacion(datos.correo);
      setMensaje(
        'Te hemos reenviado el correo de confirmación. Revisa tu bandeja de entrada y la carpeta de spam.',
      );
      setNecesitaConfirmacion(false);
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudo reenviar el correo.');
    } finally {
      setCargando(false);
    }
  };

  const esRegistro = modo === 'registro';
  const esRecuperacion = modo === 'recuperar';
  const contrasenaInvalida = esRegistro && datos.contrasena.length > 0 && !esContrasenaSegura(datos.contrasena);
  const confirmacionDistinta = esRegistro && Boolean(datos.confirmacion) && datos.contrasena !== datos.confirmacion;

  return (
    <main className="min-h-[calc(100vh-76px)] bg-neblina px-5 py-10 sm:py-16">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-suave lg:grid-cols-[0.85fr_1.15fr]">
        <div className="relative hidden overflow-hidden bg-tinta p-10 text-white lg:block">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violeta/40 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-cian/20 blur-3xl" />
          <div className="relative">
            <button
              onClick={volver}
              className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white"
            >
              <ArrowLeft size={16} /> Volver a la tienda
            </button>
            <div className="mt-24">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-electrico to-violeta text-xl font-black">
                r
              </span>
              <h1 className="mt-7 text-4xl font-black leading-tight">
                Tu experiencia
                <br />
                <span className="text-cian">Rentaeasy</span>, más fácil.
              </h1>
              <p className="mt-5 max-w-xs text-sm leading-7 text-slate-300">
                Gestiona tus alquileres, sigue tus pedidos y disfruta de tecnología sin permanencias.
              </p>
              <div className="mt-10 space-y-4 text-sm text-slate-300">
                <p className="flex items-center gap-3">
                  <ShieldCheck size={18} className="text-cian" /> Datos protegidos
                </p>
                <p className="flex items-center gap-3">
                  <LockKeyhole size={18} className="text-cian" /> Acceso seguro por roles
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <button
            onClick={volver}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-electrico lg:hidden"
          >
            <ArrowLeft size={16} /> Volver a la tienda
          </button>

          <div className="mx-auto max-w-md">
            <div className="mt-8 flex rounded-xl bg-neblina p-1 lg:mt-0">
              <button
                onClick={() => cambiar('inicio')}
                className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                  !esRegistro ? 'bg-white text-tinta shadow-sm' : 'text-slate-400'
                }`}
              >
                Iniciar sesión
              </button>
              <button
                onClick={() => cambiar('registro')}
                className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                  esRegistro ? 'bg-white text-tinta shadow-sm' : 'text-slate-400'
                }`}
              >
                Crear cuenta
              </button>
            </div>

            <div className="mt-8">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-electrico">
                {esRecuperacion ? 'Recuperar acceso' : esRegistro ? 'Únete a Rentaeasy' : 'Bienvenido de nuevo'}
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-tinta">
                {esRecuperacion ? 'Recupera tu contraseña' : esRegistro ? 'Crea tu cuenta' : 'Entra en tu cuenta'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {esRecuperacion
                  ? 'Escribe el correo con el que te registraste y te enviaremos un enlace seguro.'
                  : esRegistro
                    ? 'Regístrate gratis y empieza a alquilar tecnología.'
                    : 'Accede a tus reservas y alquileres activos.'}
              </p>
            </div>

            {error && (
              <>
                <div role="alert" className="mt-6 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
                {necesitaConfirmacion && (
                  <button
                    type="button"
                    onClick={reenviarConfirmacion}
                    disabled={cargando}
                    className="mt-2 text-xs font-bold text-electrico hover:text-violeta disabled:text-slate-400"
                  >
                    Reenviar correo de confirmación
                  </button>
                )}
              </>
            )}
            {mensaje && (
              <div role="status" className="mt-6 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                {mensaje}
              </div>
            )}

            <form onSubmit={enviar} className="mt-7 space-y-4">
              {esRegistro && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo
                    id="nombre"
                    etiqueta="Nombre"
                    requerido
                    value={datos.nombre}
                    alCambiar={(valor) => setDatos({ ...datos, nombre: valor })}
                    placeholder="Tu nombre"
                    icono={UserRound}
                    autocompletar="given-name"
                  />
                  <Campo
                    id="apellidos"
                    etiqueta="Apellidos"
                    requerido
                    value={datos.apellidos}
                    alCambiar={(valor) => setDatos({ ...datos, apellidos: valor })}
                    placeholder="Tus apellidos"
                    autocompletar="family-name"
                  />
                </div>
              )}

              <Campo
                id="correo"
                etiqueta="Correo electrónico"
                tipo="email"
                requerido
                value={datos.correo}
                alCambiar={(valor) => setDatos({ ...datos, correo: valor })}
                placeholder="tu@email.com"
                icono={Mail}
              />

              {esRegistro && (
                <Campo
                  id="telefono"
                  etiqueta="Teléfono"
                  tipo="tel"
                  requerido
                  value={datos.telefono}
                  alCambiar={(valor) => setDatos({ ...datos, telefono: valor })}
                  placeholder="+34 600 000 000"
                  autocompletar="tel"
                />
              )}

              {!esRecuperacion && (
                <Campo
                  id="contrasena"
                  etiqueta="Contraseña"
                  tipo={mostrarContrasena ? 'text' : 'password'}
                  requerido
                  value={esRegistro ? datos.contrasena : contrasena}
                  alCambiar={(valor) =>
                    esRegistro ? setDatos({ ...datos, contrasena: valor }) : setContrasena(valor)
                  }
                  placeholder="Mínimo 8 caracteres"
                  icono={LockKeyhole}
                  autocompletar={esRegistro ? 'new-password' : 'current-password'}
                  sufijo={
                    <button
                      type="button"
                      onClick={() => setMostrarContrasena(!mostrarContrasena)}
                      aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="text-slate-400 hover:text-electrico"
                    >
                      {mostrarContrasena ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  }
                />
              )}

              {esRegistro && (
                <>
                  {contrasenaInvalida && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-700">
                      {MENSAJE_CONTRASENA}
                    </p>
                  )}

                  <Campo
                    id="confirmacion"
                    etiqueta="Confirmación de contraseña"
                    tipo={mostrarContrasena ? 'text' : 'password'}
                    requerido
                    value={datos.confirmacion || ''}
                    alCambiar={(valor) => setDatos({ ...datos, confirmacion: valor } as DatosRegistro)}
                    placeholder="Repite tu contraseña"
                    autocompletar="new-password"
                  />
                  {confirmacionDistinta && (
                    <p className="text-xs font-semibold text-red-600">Las contraseñas no coinciden.</p>
                  )}

                  <label className="flex items-start gap-2 text-xs leading-5 text-slate-500">
                    <input
                      type="checkbox"
                      checked={datos.aceptaTerminos}
                      onChange={(evento) => setDatos({ ...datos, aceptaTerminos: evento.target.checked })}
                      className="mt-1 h-4 w-4 accent-electrico"
                      required
                    />{' '}
                    He leído la <a href="/informacion/condiciones" target="_blank" rel="noopener noreferrer" className="underline">información del alquiler</a> y la <a href="/informacion/privacidad" target="_blank" rel="noopener noreferrer" className="underline">información sobre mis datos</a>.
                  </label>
                </>
              )}

              {modo === 'inicio' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={irARecuperar}
                    className="text-xs font-bold text-electrico hover:text-violeta"
                  >
                    ¿Has olvidado tu contraseña?
                  </button>
                </div>
              )}

              {esRecuperacion && (
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={volverAInicio}
                    className="text-xs font-bold text-electrico hover:text-violeta"
                  >
                    Volver a iniciar sesión
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={cargando || confirmacionDistinta}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-electrico px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-violeta disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {cargando
                  ? 'Procesando...'
                  : esRecuperacion
                    ? 'Enviar enlace de recuperación'
                    : esRegistro
                      ? 'Crear mi cuenta'
                      : 'Iniciar sesión'}{' '}
                <ArrowLeft size={16} className="rotate-180" />
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              {esRegistro ? (
                <>
                  ¿Ya tienes cuenta?{' '}
                  <button onClick={() => cambiar('inicio')} className="font-bold text-electrico hover:text-violeta">
                    Iniciar sesión
                  </button>
                </>
              ) : (
                <>
                  ¿Todavía no tienes cuenta?{' '}
                  <button onClick={() => cambiar('registro')} className="font-bold text-electrico hover:text-violeta">
                    Crear cuenta
                  </button>
                </>
              )}
            </p>

            {!esRegistro && !esRecuperacion && (
              <p className="mt-3 text-center text-xs text-slate-400">
                Las cuentas de empleado y administrador son autorizadas internamente.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Campo({
  id,
  etiqueta,
  tipo = 'text',
  requerido,
  value,
  alCambiar,
  placeholder,
  icono: Icono,
  sufijo,
  autocompletar,
}: {
  id: string;
  etiqueta: string;
  tipo?: string;
  requerido?: boolean;
  value: string;
  alCambiar: (valor: string) => void;
  placeholder: string;
  icono?: typeof Mail;
  sufijo?: ReactNode;
  autocompletar?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-bold text-tinta">
        {etiqueta}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={tipo}
          required={requerido}
          value={value}
          onChange={(evento) => alCambiar(evento.target.value)}
          placeholder={placeholder}
          autoComplete={autocompletar ?? (id === 'correo' ? 'email' : 'off')}
          className={`w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-electrico ${
            Icono ? 'pl-10' : ''
          } ${sufijo ? 'pr-10' : ''}`}
        />
        {Icono && <Icono size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />}
        {sufijo && <span className="absolute right-3 top-1/2 -translate-y-1/2">{sufijo}</span>}
      </div>
    </div>
  );
}
