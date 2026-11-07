import { AlertCircle, CheckCircle2, Loader2, MapPin, Truck, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ModalidadAlquiler, ModalidadEntrega, Producto } from '../tipos';
import { formatearEuros, obtenerDias } from '../utilidades/formato';
import { disponibilidadConocida, productoDisponible, textoDisponibilidad } from '../utilidades/disponibilidad';

export interface DatosReservaConfirmada {
  producto: Producto;
  modalidad: ModalidadAlquiler;
  inicio: string;
  fin: string;
  entrega: ModalidadEntrega;
  direccion: string;
}

export interface ResultadoReserva {
  codigo: string;
  importe: number;
}

interface PropiedadesModalReserva {
  producto: Producto | null;
  modalidadInicial?: ModalidadAlquiler;
  cerrar: () => void;
  confirmar: (datos: DatosReservaConfirmada) => Promise<ResultadoReserva>;
  alTerminar?: () => void;
  comoPagina?: boolean;
}

const fechaLocal = (fecha: Date) => {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

export function ModalReserva({
  producto,
  modalidadInicial = 'fin de semana',
  cerrar,
  confirmar,
  alTerminar,
  comoPagina = false,
}: PropiedadesModalReserva) {
  const [modalidad, setModalidad] = useState<ModalidadAlquiler>(modalidadInicial);
  const [entrega, setEntrega] = useState<ModalidadEntrega>('domicilio');
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [direccion, setDireccion] = useState('');
  const [confirmacion, setConfirmacion] = useState<ResultadoReserva | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorReserva, setErrorReserva] = useState('');

  const precio = producto
    ? {
        'fin de semana': producto.precioFinDeSemana,
        mensual: producto.precioMensual,
        'varios meses': producto.precioVariosMeses,
      }[modalidad]
    : 0;
  const gastosEntrega = entrega === 'domicilio' ? 4.99 : 0;
  const total = precio + gastosEntrega;
  const hayStock = Boolean(producto && productoDisponible(producto));
  const hoy = fechaLocal(new Date());

  const errorFechas = useMemo(() => {
    if (!inicio || !fin) return '';
    if (fin < inicio) return 'La fecha de devolución debe ser igual o posterior a la fecha de inicio.';
    if (modalidad === 'fin de semana' && obtenerDias(inicio, fin) > 3) {
      return 'La modalidad de fin de semana permite como máximo tres días.';
    }
    return '';
  }, [inicio, fin, modalidad]);

  const formularioValido = Boolean(
    hayStock &&
      inicio &&
      fin &&
      !errorFechas &&
      (entrega === 'tienda' || direccion.trim().length > 8),
  );

  if (!producto) return null;

  const enviarSolicitud = async () => {
    if (!formularioValido || enviando) return;
    setErrorReserva('');
    setEnviando(true);
    try {
      const resultado = await confirmar({ producto, modalidad, inicio, fin, entrega, direccion });
      setConfirmacion(resultado);
    } catch (problema) {
      setErrorReserva(
        problema instanceof Error
          ? problema.message
          : 'No se pudo completar la reserva. Inténtalo de nuevo.',
      );
    } finally {
      setEnviando(false);
    }
  };

  const claseContenedorConfirmacion = comoPagina
    ? 'min-h-[calc(100vh-76px)] grid place-items-center bg-neblina p-5 sm:p-10'
    : 'fixed inset-0 z-50 grid place-items-center bg-tinta/60 p-5 backdrop-blur-sm';
  const claseContenedor = comoPagina
    ? 'min-h-[calc(100vh-76px)] bg-neblina px-5 py-10 sm:py-14'
    : 'fixed inset-0 z-50 overflow-y-auto bg-tinta/60 p-4 backdrop-blur-sm sm:p-8';
  const claseTarjeta = comoPagina
    ? 'mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-suave'
    : 'mx-auto max-w-2xl rounded-3xl bg-white shadow-2xl';

  if (confirmacion) {
    return (
      <div className={claseContenedorConfirmacion}>
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-500">
            <CheckCircle2 size={32} />
          </span>
          <h2 className="mt-5 text-2xl font-black text-tinta">¡Reserva solicitada!</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Hemos registrado tu reserva para <strong>{producto.nombre}</strong>. Te contactaremos
            para confirmar la disponibilidad.
          </p>
          <dl className="mt-5 space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Código</dt>
              <dd className="font-black text-tinta">{confirmacion.codigo}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Total</dt>
              <dd className="font-black text-tinta">{formatearEuros(confirmacion.importe)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Estado</dt>
              <dd className="font-bold text-amber-600">Pendiente</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] leading-5 text-slate-400">
            El importe lo ha calculado el servidor según las fechas y la modalidad elegidas.
            {entrega === 'domicilio' &&
              ' Los gastos de entrega a domicilio se confirman por separado.'}
          </p>
          <button
            onClick={() => (alTerminar ? alTerminar() : cerrar())}
            className="mt-6 w-full rounded-xl bg-tinta px-4 py-3.5 text-sm font-bold text-white hover:bg-electrico"
          >
            Ver mis alquileres
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={claseContenedor}>
      <div className={claseTarjeta}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 sm:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-electrico">
              Nueva reserva
            </p>
            <h2 className="mt-1 text-xl font-black text-tinta">
              Reserva tu {producto.nombre.toLowerCase()}
            </h2>
          </div>
          <button
            onClick={cerrar}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[1fr_230px]">
          <div>
            <div className="flex gap-4 rounded-2xl bg-neblina p-3">
              <img
                src={producto.imagen}
                alt={producto.nombre}
                className="h-20 w-20 rounded-xl bg-white object-contain p-1"
              />
              <div>
                <p className="text-xs text-slate-400">Producto seleccionado</p>
                <p className="mt-1 text-sm font-extrabold text-tinta">{producto.nombre}</p>
                <p className={`mt-1 text-xs font-semibold ${hayStock ? 'text-emerald-600' : 'text-red-600'}`}>{textoDisponibilidad(producto)}</p>
              </div>
            </div>

            {!hayStock && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                {disponibilidadConocida(producto)
                  ? 'Este producto no tiene unidades disponibles ahora mismo.'
                  : 'Comprobando la disponibilidad real en el catálogo...'}
              </p>
            )}

            <div className="mt-7">
              <label className="text-sm font-extrabold text-tinta">1. Selecciona el periodo</label>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(['fin de semana', 'mensual', 'varios meses'] as ModalidadAlquiler[]).map(
                  (opcion) => (
                    <button
                      key={opcion}
                      onClick={() => setModalidad(opcion)}
                      className={`rounded-xl border px-2 py-3 text-xs font-bold capitalize ${
                        modalidad === opcion
                          ? 'border-electrico bg-blue-50 text-electrico'
                          : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      {opcion}
                      <br />
                      <span className="mt-1 inline-block text-sm">
                        {formatearEuros(
                          {
                            'fin de semana': producto.precioFinDeSemana,
                            mensual: producto.precioMensual,
                            'varios meses': producto.precioVariosMeses,
                          }[opcion],
                        )}
                      </span>
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="mt-7">
              <label className="text-sm font-extrabold text-tinta">2. Indica las fechas</label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="fecha-inicio" className="text-xs font-semibold text-slate-500">
                    Fecha de inicio
                  </label>
                  <input
                    id="fecha-inicio"
                    type="date"
                    value={inicio}
                    onChange={(evento) => setInicio(evento.target.value)}
                    min={hoy}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-electrico"
                  />
                </div>
                <div>
                  <label htmlFor="fecha-fin" className="text-xs font-semibold text-slate-500">
                    Fecha de finalización
                  </label>
                  <input
                    id="fecha-fin"
                    type="date"
                    value={fin}
                    onChange={(evento) => setFin(evento.target.value)}
                    min={inicio || hoy}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-electrico"
                  />
                </div>
              </div>
            </div>

            <div className="mt-7">
              <label className="text-sm font-extrabold text-tinta">3. ¿Cómo quieres recibirlo?</label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => setEntrega('domicilio')}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left ${
                    entrega === 'domicilio' ? 'border-electrico bg-blue-50' : 'border-slate-200'
                  }`}
                >
                  <Truck size={19} className="mt-0.5 text-electrico" />
                  <span>
                    <strong className="block text-sm text-tinta">Entrega a domicilio</strong>
                    <small className="text-xs text-slate-500">
                      {formatearEuros(gastosEntrega)} · En 24/48 h
                    </small>
                  </span>
                </button>
                <button
                  onClick={() => setEntrega('tienda')}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left ${
                    entrega === 'tienda' ? 'border-electrico bg-blue-50' : 'border-slate-200'
                  }`}
                >
                  <MapPin size={19} className="mt-0.5 text-electrico" />
                  <span>
                    <strong className="block text-sm text-tinta">Recogida en tienda</strong>
                    <small className="text-xs text-slate-500">Gratis · Bellas Vistas</small>
                  </span>
                </button>
              </div>
              {entrega === 'domicilio' && (
                <input
                  value={direccion}
                  onChange={(evento) => setDireccion(evento.target.value)}
                  placeholder="Dirección completa de entrega"
                  className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-electrico"
                />
              )}
            </div>

            {errorFechas && (
              <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-red-600">
                <AlertCircle size={14} /> {errorFechas}
              </p>
            )}
            {!formularioValido && hayStock && !errorFechas && (inicio || fin || direccion) && (
              <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-amber-600">
                <AlertCircle size={14} /> Completa las fechas y la dirección para continuar.
              </p>
            )}
          </div>

          <aside className="h-fit rounded-2xl bg-neblina p-5">
            <h3 className="font-extrabold text-tinta">Resumen</h3>
            <div className="mt-5 space-y-3 border-b border-slate-200 pb-5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Alquiler ({modalidad})</span>
                <span className="font-bold text-tinta">{formatearEuros(precio)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Entrega</span>
                <span className="font-bold text-tinta">
                  {gastosEntrega ? formatearEuros(gastosEntrega) : 'Gratis'}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Fianza</span>
                <span className="font-bold text-emerald-600">No configurada</span>
              </div>
            </div>
            <div className="mt-5 flex justify-between">
              <span className="font-bold text-tinta">Total estimado</span>
              <span className="text-xl font-black text-tinta">{formatearEuros(total)}</span>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-slate-400">
              Precio orientativo. La disponibilidad y el importe final se calculan en el servidor.
            </p>

            {errorReserva && (
              <p
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700"
              >
                <AlertCircle size={15} className="mt-0.5 shrink-0" /> {errorReserva}
              </p>
            )}

            <button
              disabled={!formularioValido || enviando}
              onClick={enviarSolicitud}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-electrico px-4 py-3.5 text-sm font-bold text-white transition hover:bg-violeta disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {enviando ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Enviando...
                </>
              ) : hayStock ? (
                'Solicitar reserva'
              ) : (
                'No disponible'
              )}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
