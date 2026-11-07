import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronRight,
  CircleUserRound,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  Settings,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ReservaUsuario, servicioReservas } from '../servicios/servicioReservas';
import { servicioAutenticacion, Usuario } from '../servicios/servicioAutenticacion';
import { EstadoReserva } from '../tipos';
import { formatearEuros, formatearFecha } from '../utilidades/formato';

interface PropiedadesPaginaCuenta {
  usuario: Usuario;
  cerrar: () => void;
  alActualizar: (usuario: Usuario) => void;
  irAlCatalogo: () => void;
}

const CLASES_ESTADO: Record<EstadoReserva, string> = {
  Pendiente: 'bg-amber-50 text-amber-700',
  Confirmada: 'bg-blue-50 text-electrico',
  'En preparación': 'bg-violet-50 text-violeta',
  'En alquiler': 'bg-blue-50 text-electrico',
  Finalizada: 'bg-emerald-50 text-emerald-700',
  Cancelada: 'bg-red-50 text-red-600',
};

const nombreProductos = (reserva: ReservaUsuario) =>
  reserva.productos
    .map((producto) =>
      producto.cantidad > 1 ? `${producto.nombre} × ${producto.cantidad}` : producto.nombre,
    )
    .join(' · ') || 'Producto';

export function PaginaCuenta({
  usuario,
  cerrar,
  alActualizar,
  irAlCatalogo,
}: PropiedadesPaginaCuenta) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(usuario.nombre);
  const [apellidos, setApellidos] = useState(usuario.apellidos);
  const [telefono, setTelefono] = useState(usuario.telefono);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [errorPerfil, setErrorPerfil] = useState('');
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [guardandoContrasena, setGuardandoContrasena] = useState(false);
  const [reservas, setReservas] = useState<ReservaUsuario[]>([]);
  const [cargandoReservas, setCargandoReservas] = useState(true);
  const [errorReservas, setErrorReservas] = useState('');
  const [recargaReservas, setRecargaReservas] = useState(0);

  useEffect(() => {
    let activo = true;
    setCargandoReservas(true);
    setErrorReservas('');
    void servicioReservas
      .obtenerDelUsuario(usuario.id)
      .then((datos) => {
        if (activo) setReservas(datos);
      })
      .catch((problema: unknown) => {
        if (!activo) return;
        setErrorReservas(
          problema instanceof Error
            ? problema.message
            : 'No se pudieron cargar tus alquileres. Inténtalo de nuevo.',
        );
      })
      .finally(() => {
        if (activo) setCargandoReservas(false);
      });
    return () => {
      activo = false;
    };
  }, [usuario.id, recargaReservas]);

  // Sin polling: al volver a la pestaña se recuperan los estados reales de las
  // reservas, por si el administrador las ha confirmado, cancelado o finalizado.
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === 'visible') {
        setRecargaReservas((valor) => valor + 1);
      }
    };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    return () => {
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
    };
  }, []);

  const guardarPerfil = async () => {
    setErrorPerfil('');
    setMensaje('');
    setGuardandoPerfil(true);
    try {
      const actualizado = await servicioAutenticacion.actualizarPerfil({ nombre, apellidos, telefono });
      alActualizar(actualizado);
      setEditando(false);
      setMensaje('Datos personales actualizados.');
    } catch (problema) {
      setErrorPerfil(problema instanceof Error ? problema.message : 'No se pudieron guardar los cambios.');
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const guardarContrasena = async () => {
    setError('');
    setMensaje('');
    setGuardandoContrasena(true);
    try {
      await servicioAutenticacion.cambiarContrasena(actual, nueva);
      setActual('');
      setNueva('');
      setMensaje('Contraseña actualizada correctamente.');
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudo actualizar la contraseña.');
    } finally {
      setGuardandoContrasena(false);
    }
  };

  const reservasActivas = reservas.filter(
    (reserva) =>
      reserva.estado === 'Confirmada' ||
      reserva.estado === 'En preparación' ||
      reserva.estado === 'En alquiler',
  );
  const ahora = new Date();
  const hoyIso = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(
    ahora.getDate(),
  ).padStart(2, '0')}`;
  const proximaDevolucion = [...reservasActivas]
    .filter((reserva) => reserva.fin >= hoyIso)
    .sort((a, b) => a.fin.localeCompare(b.fin))[0];
  const totalReservado = reservas
    .filter((reserva) => reserva.estado !== 'Cancelada')
    .reduce((total, reserva) => total + reserva.importe, 0);

  return (
    <main className="min-h-screen bg-neblina">
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-electrico">Área personal</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-tinta">
              Hola, {usuario.nombre} <span className="inline-block">👋</span>
            </h1>
            <p className="mt-2 text-slate-500">Gestiona tus datos, reservas y preferencias.</p>
          </div>
          <button
            onClick={cerrar}
            className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-tinta hover:border-blue-300"
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>

        {mensaje && (
          <div role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
            {mensaje}
          </div>
        )}

        <div className="mt-10 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-3 border-b border-slate-100 p-3">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-blue-100 font-black text-electrico">
                {usuario.nombre.slice(0, 1)}
                {usuario.apellidos.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold text-tinta">
                  {usuario.nombre} {usuario.apellidos}
                </p>
                <p className="text-xs capitalize text-slate-400">{usuario.rol}</p>
              </div>
            </div>
            <nav className="mt-3 space-y-1">
              <button className="flex w-full items-center gap-3 rounded-xl bg-blue-50 px-3 py-3 text-left text-sm font-bold text-electrico">
                <CalendarDays size={17} /> Mis alquileres
              </button>
              <button
                onClick={() => setEditando(true)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-500 hover:bg-slate-50"
              >
                <CircleUserRound size={17} /> Mis datos
              </button>
              <button
                onClick={() => document.getElementById('seguridad-cuenta')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-500 hover:bg-slate-50"
              >
                <Settings size={17} /> Seguridad
              </button>
            </nav>
          </aside>

          <section>
            <div className="grid gap-4 sm:grid-cols-3">
              <Resumen
                titulo="Alquileres activos"
                valor={String(reservasActivas.length)}
                detalle={reservasActivas.length ? 'Confirmados o en curso' : 'Sin alquileres activos'}
              />
              <Resumen
                titulo="Próxima devolución"
                valor={proximaDevolucion ? formatearFecha(proximaDevolucion.fin) : '—'}
                detalle={
                  proximaDevolucion ? nombreProductos(proximaDevolucion) : 'No hay devoluciones pendientes'
                }
              />
              <Resumen
                titulo="Total reservado"
                valor={formatearEuros(totalReservado)}
                detalle={`${reservas.length} ${reservas.length === 1 ? 'reserva' : 'reservas'}`}
              />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <h2 className="font-extrabold text-tinta">Mis alquileres</h2>
                <span className="text-xs font-bold text-slate-400">Historial</span>
              </div>

              {cargandoReservas ? (
                <div className="flex items-center justify-center gap-2 p-10 text-sm font-semibold text-slate-500">
                  <Loader2 size={18} className="animate-spin" /> Cargando tus alquileres...
                </div>
              ) : errorReservas ? (
                <div className="p-8 text-center">
                  <p
                    role="alert"
                    className="mx-auto flex max-w-md items-start justify-center gap-2 text-sm font-semibold text-red-700"
                  >
                    <AlertCircle size={16} className="mt-0.5 shrink-0" /> {errorReservas}
                  </p>
                  <button
                    onClick={() => setRecargaReservas((valor) => valor + 1)}
                    className="mt-4 rounded-xl bg-tinta px-4 py-2.5 text-sm font-bold text-white hover:bg-electrico"
                  >
                    Reintentar
                  </button>
                </div>
              ) : reservas.length === 0 ? (
                <div className="p-10 text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-neblina text-electrico">
                    <CalendarDays size={24} />
                  </span>
                  <h3 className="mt-4 text-lg font-black text-tinta">Todavía no tienes alquileres</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Cuando solicites tu primer alquiler aparecerá aquí con su estado y su importe.
                  </p>
                  <button
                    onClick={irAlCatalogo}
                    className="mt-5 rounded-xl bg-electrico px-5 py-3 text-sm font-bold text-white transition hover:bg-violeta"
                  >
                    Explorar catálogo
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {reservas.map((reserva) => (
                    <div
                      key={reserva.id}
                      className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neblina text-electrico">
                          <CalendarDays size={19} />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-tinta">{nombreProductos(reserva)}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatearFecha(reserva.inicio)} · {formatearFecha(reserva.fin)}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {reserva.codigo} · {reserva.modalidad} ·{' '}
                            {reserva.entrega === 'domicilio'
                              ? 'Entrega a domicilio'
                              : 'Recogida en tienda'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-5 sm:justify-end">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${CLASES_ESTADO[reserva.estado]}`}
                        >
                          {reserva.estado}
                        </span>
                        <span className="text-sm font-black text-tinta">
                          {formatearEuros(reserva.importe)}
                        </span>
                        <ChevronRight size={17} className="text-slate-300" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-extrabold text-tinta">Datos personales</h2>
                  <p className="mt-1 text-xs text-slate-400">Información de tu cuenta Rentaeasy</p>
                </div>
                <button
                  onClick={() => setEditando(!editando)}
                  className="flex items-center gap-1 text-xs font-bold text-electrico"
                >
                  <Pencil size={13} /> {editando ? 'Cancelar' : 'Editar'}
                </button>
              </div>

              {errorPerfil && (
                <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                  {errorPerfil}
                </p>
              )}

              {editando ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Campo etiqueta="Nombre" valor={nombre} cambiar={setNombre} />
                  <Campo etiqueta="Apellidos" valor={apellidos} cambiar={setApellidos} />
                  <Campo etiqueta="Teléfono" valor={telefono} cambiar={setTelefono} />
                  <div className="flex items-end">
                    <button
                      onClick={guardarPerfil}
                      disabled={guardandoPerfil}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-electrico px-4 py-3 text-sm font-bold text-white hover:bg-violeta disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <Save size={16} /> {guardandoPerfil ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                  <Dato icono={Mail} texto={usuario.correo} />
                  <Dato icono={Phone} texto={usuario.telefono || 'Teléfono no configurado'} />
                  <Dato icono={MapPin} texto="Madrid, España" />
                  <Dato
                    icono={Check}
                    texto={usuario.correoConfirmado ? 'Correo verificado' : 'Correo pendiente de verificar'}
                  />
                </div>
              )}
            </div>

            <div id="seguridad-cuenta" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violeta">
                  <KeyRound size={18} />
                </span>
                <div>
                  <h2 className="font-extrabold text-tinta">Cambiar contraseña</h2>
                  <p className="mt-1 text-xs text-slate-400">Nunca compartas tu contraseña con nadie.</p>
                </div>
              </div>

              {error && (
                <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                  {error}
                </p>
              )}

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Contraseña actual" tipo="password" valor={actual} cambiar={setActual} />
                <Campo etiqueta="Nueva contraseña" tipo="password" valor={nueva} cambiar={setNueva} />
                <button
                  onClick={guardarContrasena}
                  disabled={guardandoContrasena}
                  className="rounded-xl bg-tinta px-4 py-3 text-sm font-bold text-white hover:bg-electrico disabled:cursor-not-allowed disabled:bg-slate-400 sm:col-span-2"
                >
                  {guardandoContrasena ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Resumen({ titulo, valor, detalle }: { titulo: string; valor: string; detalle: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold text-slate-400">{titulo}</p>
      <p className="mt-3 text-2xl font-black text-tinta">{valor}</p>
      <p className="mt-1 text-xs text-slate-500">{detalle}</p>
    </div>
  );
}

function Dato({ icono: Icono, texto }: { icono: typeof Mail; texto: string }) {
  return (
    <p className="flex items-center gap-2 text-slate-600">
      <Icono size={16} className="text-electrico" /> {texto}
    </p>
  );
}

function Campo({
  etiqueta,
  valor,
  cambiar,
  tipo = 'text',
}: {
  etiqueta: string;
  valor: string;
  cambiar: (valor: string) => void;
  tipo?: string;
}) {
  return (
    <label className="text-xs font-bold text-tinta">
      {etiqueta}
      <input
        type={tipo}
        value={valor}
        onChange={(evento) => cambiar(evento.target.value)}
        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none focus:border-electrico"
      />
    </label>
  );
}
