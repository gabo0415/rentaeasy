import { BandejaContacto } from '../componentes/BandejaContacto';
import { SIGUIENTES_ESTADOS } from '../utilidades/estadosReserva';
import {
  AlertCircle,
  BarChart3,
  Box,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  Loader2,
  PackageOpen,
  PackageSearch,
  RefreshCw,
  Settings,
  Users,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Usuario } from '../servicios/servicioAutenticacion';
import {
  servicioAdministracion,
  type ClienteAdministracion,
  type DatosAdministracion,
  type EstadoProducto,
  type MovimientoAdministracion,
  type ProductoAdministracion,
  type ReservaAdministracion,
  type TipoMovimiento,
} from '../servicios/servicioAdministracion';
import type { EstadoReserva } from '../tipos';
import { formatearEuros, formatearFecha, formatearFechaHora } from '../utilidades/formato';

export type SeccionAdministracionNombre =
  | 'Resumen'
  | 'Productos'
  | 'Pedidos'
  | 'Clientes'
  | 'Inventario'
  | 'Mantenimiento'
  | 'Reportes'
  | 'Configuración'
  | 'Consultas';

interface PropiedadesPanelAdministracion {
  salir: () => void;
  seccionInicial?: SeccionAdministracionNombre;
  navegar: (seccion: SeccionAdministracionNombre) => void;
  usuario?: Usuario;
}

interface MesIngreso {
  clave: string;
  etiqueta: string;
  ingresos: number;
  reservas: number;
}

const MENU: { nombre: SeccionAdministracionNombre; icono: LucideIcon }[] = [
  { nombre: 'Resumen', icono: LayoutDashboard },
  { nombre: 'Productos', icono: Box },
  { nombre: 'Pedidos', icono: CalendarCheck },
  { nombre: 'Clientes', icono: Users },
  { nombre: 'Inventario', icono: PackageSearch },
  { nombre: 'Mantenimiento', icono: Wrench },
  { nombre: 'Reportes', icono: BarChart3 },
  { nombre: 'Consultas', icono: Inbox },
];

const CLASES_ESTADO_RESERVA: Record<EstadoReserva, string> = {
  Pendiente: 'bg-amber-50 text-amber-700',
  Confirmada: 'bg-blue-50 text-electrico',
  'En preparación': 'bg-violet-50 text-violeta',
  'En alquiler': 'bg-cyan-50 text-cyan-700',
  Finalizada: 'bg-emerald-50 text-emerald-700',
  Cancelada: 'bg-red-50 text-red-600',
};

const CLASES_ESTADO_PRODUCTO: Record<EstadoProducto, string> = {
  activo: 'bg-emerald-50 text-emerald-700',
  inactivo: 'bg-slate-100 text-slate-500',
  mantenimiento: 'bg-amber-50 text-amber-700',
};

const ETIQUETAS_ESTADO_PRODUCTO: Record<EstadoProducto, string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  mantenimiento: 'Mantenimiento',
};

const CLASES_MOVIMIENTO: Record<TipoMovimiento, string> = {
  entrada: 'bg-emerald-50 text-emerald-700',
  salida: 'bg-red-50 text-red-600',
  devolucion: 'bg-blue-50 text-electrico',
  mantenimiento: 'bg-amber-50 text-amber-700',
  ajuste: 'bg-slate-100 text-slate-600',
};

const ETIQUETAS_MOVIMIENTO: Record<TipoMovimiento, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  devolucion: 'Devolución',
  mantenimiento: 'Mantenimiento',
  ajuste: 'Ajuste',
};

const ESTADOS_CON_INGRESOS: EstadoReserva[] = [
  'Confirmada',
  'En preparación',
  'En alquiler',
  'Finalizada',
];

const FILTROS_ESTADO: { valor: 'todas' | EstadoReserva; etiqueta: string }[] = [
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: 'Pendiente', etiqueta: 'Pendientes' },
  { valor: 'Confirmada', etiqueta: 'Confirmadas' },
  { valor: 'En preparación', etiqueta: 'En preparación' },
  { valor: 'En alquiler', etiqueta: 'En alquiler' },
  { valor: 'Finalizada', etiqueta: 'Finalizadas' },
  { valor: 'Cancelada', etiqueta: 'Canceladas' },
];

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

const fechaHoyIso = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(
    hoy.getDate(),
  ).padStart(2, '0')}`;
};

/** Fecha local (no UTC) de un timestamptz, para comparar con el día de hoy. */
const fechaLocalIso = (fecha: string) => {
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return '';
  return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(
    valor.getDate(),
  ).padStart(2, '0')}`;
};

const normalizarTexto = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const crearUltimosMeses = (cantidad = 6): MesIngreso[] => {
  const hoy = new Date();
  return Array.from({ length: cantidad }, (_, indice) => {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - (cantidad - 1 - indice), 1);
    return {
      clave: `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`,
      etiqueta: new Intl.DateTimeFormat('es-ES', { month: 'short' })
        .format(fecha)
        .replace('.', ''),
      ingresos: 0,
      reservas: 0,
    };
  });
};

const calcularIngresos = (reservas: ReservaAdministracion[]) => {
  const meses = crearUltimosMeses();
  const indiceMeses = new Map(meses.map((mes) => [mes.clave, mes]));

  reservas.forEach((reserva) => {
    if (!ESTADOS_CON_INGRESOS.includes(reserva.estado)) return;
    const mes = indiceMeses.get(reserva.inicio.slice(0, 7));
    if (!mes) return;
    mes.ingresos += reserva.importe;
    mes.reservas += 1;
  });

  return {
    meses,
    total: meses.reduce((total, mes) => total + mes.ingresos, 0),
    totalReservas: meses.reduce((total, mes) => total + mes.reservas, 0),
  };
};

const nombreProductos = (reserva: ReservaAdministracion) =>
  reserva.productos
    .map((detalle) =>
      detalle.cantidad > 1 ? `${detalle.producto} × ${detalle.cantidad}` : detalle.producto,
    )
    .join(' · ') || 'Sin productos';

export function PanelAdministracion({
  salir,
  seccionInicial = 'Resumen',
  navegar,
  usuario,
}: PropiedadesPanelAdministracion) {
  const [seccion, setSeccion] = useState<SeccionAdministracionNombre>(seccionInicial);
  const [datos, setDatos] = useState<DatosAdministracion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [recargando, setRecargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');
  const [errorAccion, setErrorAccion] = useState('');
  const [aviso, setAviso] = useState('');
  const [actualizandoReserva, setActualizandoReserva] = useState<string | null>(null);

  const idSolicitud = useRef(0);
  const primeraSeccion = useRef(true);

  useEffect(() => setSeccion(seccionInicial), [seccionInicial]);

  const cargar = useCallback(async (silencioso = false) => {
    const id = ++idSolicitud.current;
    if (silencioso) setRecargando(true);
    else setCargando(true);
    setErrorCarga('');

    try {
      const resultado = await servicioAdministracion.obtenerDatos();
      if (id === idSolicitud.current) setDatos(resultado);
    } catch (problema) {
      if (id === idSolicitud.current) {
        setErrorCarga(
          problema instanceof Error
            ? problema.message
            : 'No se pudieron cargar los datos del panel.',
        );
      }
    } finally {
      if (id === idSolicitud.current) {
        setCargando(false);
        setRecargando(false);
      }
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (primeraSeccion.current) {
      primeraSeccion.current = false;
      return;
    }
    void cargar(true);
  }, [seccion, cargar]);

  // Sin polling: se refresca al volver a la pestaña o a la ventana.
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === 'visible') void cargar(true);
    };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    return () => {
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
    };
  }, [cargar]);

  // Realtime opcional: si las tablas están en la publicación supabase_realtime,
  // el cambio llega al instante. Si no, no se recibe nada y se mantiene el
  // refresco por foco/visibilidad y el botón Actualizar.
  useEffect(() => {
    let temporizador: number | undefined;
    const alCambiar = () => {
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(() => void cargar(true), 400);
    };
    const cancelar = servicioAdministracion.suscribirCambios(alCambiar);
    return () => {
      window.clearTimeout(temporizador);
      cancelar();
    };
  }, [cargar]);

  const seleccionarSeccion = (nombre: SeccionAdministracionNombre) => {
    setAviso('');
    setErrorAccion('');
    setSeccion(nombre);
    navegar(nombre);
  };

  const recargar = () => {
    setAviso('');
    setErrorAccion('');
    void cargar(Boolean(datos));
  };

  const cambiarEstado = async (reserva: ReservaAdministracion, estado: EstadoReserva) => {
    setActualizandoReserva(reserva.id);
    setAviso('');
    setErrorAccion('');
    try {
      await servicioAdministracion.actualizarEstadoReserva(reserva.id, estado, reserva.estado);
      setAviso(`Reserva ${reserva.codigo} actualizada a “${estado}”.`);
      await cargar(true);
    } catch (problema) {
      setErrorAccion(
        problema instanceof Error ? problema.message : 'No se pudo actualizar la reserva.',
      );
    } finally {
      setActualizandoReserva(null);
    }
  };

  const fechaActual = useMemo(
    () =>
      capitalizar(
        new Intl.DateTimeFormat('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(new Date()),
      ),
    [],
  );

  const iniciales = `${usuario?.nombre?.slice(0, 1) ?? 'A'}${
    usuario?.apellidos?.slice(0, 1) ?? 'D'
  }`.toUpperCase();

  const contenido = () => {
    if (!datos) return null;

    switch (seccion) {
      case 'Consultas':
        return <BandejaContacto />;
      case 'Resumen':
        return (
          <ResumenAdministracion
            datos={datos}
            alVerPedidos={() => seleccionarSeccion('Pedidos')}
            alVerInventario={() => seleccionarSeccion('Inventario')}
            alVerReportes={() => seleccionarSeccion('Reportes')}
          />
        );
      case 'Pedidos':
        return (
          <PedidosAdministracion
            datos={datos}
            actualizando={actualizandoReserva}
            cambiarEstado={cambiarEstado}
          />
        );
      case 'Productos':
        return <ProductosAdministracion datos={datos} />;
      case 'Clientes':
        return <ClientesAdministracion datos={datos} />;
      case 'Inventario':
        return <InventarioAdministracion datos={datos} />;
      case 'Mantenimiento':
        return <MantenimientoAdministracion datos={datos} />;
      case 'Reportes':
        return <ReportesAdministracion datos={datos} />;
      case 'Configuración':
        return <ConfiguracionAdministracion datos={datos} usuario={usuario} />;
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f6fb]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 bg-tinta p-5 text-white lg:block">
          <div className="flex items-center gap-2.5 px-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-electrico to-violeta font-black">
              r
            </span>
            <span className="font-black">
              renta<span className="text-cian">easy</span>
            </span>
          </div>

          <div className="mt-8 px-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Panel de control
            </p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Datos reales
            </span>
            <p className="mt-2 text-[10px] leading-4 text-slate-500">
              {datos ? `Actualizado ${formatearFechaHora(datos.cargadoEn)}` : 'Conectando con Supabase...'}
            </p>
          </div>

          <nav className="mt-3 space-y-1">
            {MENU.map(({ nombre, icono: Icono }) => (
              <button
                key={nombre}
                onClick={() => seleccionarSeccion(nombre)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                  seccion === nombre
                    ? 'bg-electrico text-white'
                    : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                <Icono size={17} />
                {nombre}
              </button>
            ))}
          </nav>

          <div className="mt-10 border-t border-white/10 pt-5">
            <button
              onClick={() => seleccionarSeccion('Configuración')}
              className={`flex w-full items-center gap-3 px-3 py-3 text-sm font-semibold ${
                seccion === 'Configuración'
                  ? 'bg-electrico text-white'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <Settings size={17} /> Configuración
            </button>
            <button
              onClick={salir}
              className="mt-1 flex w-full items-center gap-3 px-3 py-3 text-sm font-semibold text-slate-300 hover:text-white"
            >
              ← Volver a la tienda
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3 lg:px-8">
            <div>
              <p className="text-xs font-semibold text-slate-400">{fechaActual}</p>
              <h1 className="mt-1 text-xl font-black text-tinta">{seccion}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={recargar}
                disabled={recargando}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-tinta hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={15} className={recargando ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Actualizar</span>
              </button>
              <a href="/empleados" className="hidden rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-tinta sm:block">Abrir operaciones</a>
              <span className="hidden text-sm font-bold text-tinta md:block">
                {usuario ? `${usuario.nombre} ${usuario.apellidos}` : 'Administrador'}
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-xs font-black text-electrico">
                {iniciales}
              </span>
            </div>
          </header>

          <div className="p-5 lg:p-8">
            {aviso && (
              <div
                role="status"
                className="mb-5 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700"
              >
                <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> {aviso}
              </div>
            )}
            {errorAccion && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
              >
                <XCircle size={17} className="mt-0.5 shrink-0" /> {errorAccion}
              </div>
            )}

            {cargando && !datos ? (
              <CargandoPanel />
            ) : errorCarga && !datos ? (
              <ErrorPanel mensaje={errorCarga} reintentar={recargar} />
            ) : (
              <>
                {errorCarga && datos && (
                  <div
                    role="alert"
                    className="mb-5 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-700"
                  >
                    <AlertCircle size={17} className="mt-0.5 shrink-0" /> {errorCarga}
                  </div>
                )}
                {contenido()}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

// El panel ya contiene el layout administrativo completo y aislado de la tienda.
export const LayoutAdministracion = PanelAdministracion;

function ResumenAdministracion({
  datos,
  alVerPedidos,
  alVerInventario,
  alVerReportes,
}: {
  datos: DatosAdministracion;
  alVerPedidos: () => void;
  alVerInventario: () => void;
  alVerReportes: () => void;
}) {
  const hoy = fechaHoyIso();
  const productosActivos = datos.productos.filter((producto) => producto.estado === 'activo').length;
  const reservasPendientes = datos.reservas.filter((reserva) => reserva.estado === 'Pendiente');
  const pendientesHoy = reservasPendientes.filter(
    (reserva) => fechaLocalIso(reserva.fechaSolicitud) === hoy,
  ).length;
  const alquileresActivos = datos.reservas.filter(
    (reserva) =>
      reserva.estado === 'En alquiler' && reserva.inicio <= hoy && reserva.fin >= hoy,
  );
  const enPreparacion = datos.reservas.filter(
    (reserva) => reserva.estado === 'En preparación',
  ).length;
  const { meses } = calcularIngresos(datos.reservas);
  const mesActual = meses[meses.length - 1];
  const recientes = datos.reservas.slice(0, 5);

  const demanda = useMemo(() => {
    const mapa = new Map<string, number>();
    datos.reservas
      .filter((reserva) => reserva.estado !== 'Cancelada')
      .forEach((reserva) => {
        reserva.productos.forEach((detalle) => {
          mapa.set(detalle.productoId, (mapa.get(detalle.productoId) ?? 0) + detalle.cantidad);
        });
      });
    return mapa;
  }, [datos.reservas]);

  const hayDemanda = Array.from(demanda.values()).some((cantidad) => cantidad > 0);

  const inventarioDestacado = useMemo(
    () =>
      [...datos.productos]
        .sort((a, b) => {
          const demandaA = demanda.get(a.id) ?? 0;
          const demandaB = demanda.get(b.id) ?? 0;
          if (demandaB !== demandaA) return demandaB - demandaA;
          if (a.stockDisponible !== b.stockDisponible) return a.stockDisponible - b.stockDisponible;
          return a.nombre.localeCompare(b.nombre);
        })
        .slice(0, 4),
    [datos.productos, demanda],
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          icono={Box}
          titulo="Productos activos"
          valor={String(productosActivos)}
          detalle={`${datos.productos.length} productos en catálogo`}
          color="blue"
        />
        <Indicador
          icono={ClipboardList}
          titulo="Reservas pendientes"
          valor={String(reservasPendientes.length)}
          detalle={pendientesHoy ? `${pendientesHoy} creadas hoy` : 'Sin nuevas hoy'}
          color="violeta"
        />
        <Indicador
          icono={CalendarCheck}
          titulo="Alquileres activos"
          valor={String(alquileresActivos.length)}
          detalle={enPreparacion ? `${enPreparacion} en preparación` : 'En curso hoy'}
          color="cian"
        />
        <Indicador
          icono={CircleDollarSign}
          titulo="Ingresos del mes"
          valor={formatearEuros(mesActual.ingresos)}
          detalle={`${mesActual.reservas} ${
            mesActual.reservas === 1 ? 'reserva con ingreso' : 'reservas con ingreso'
          }`}
          color="verde"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-extrabold text-tinta">Actividad de alquileres</h2>
              <p className="mt-1 text-xs text-slate-400">
                Ingresos por fecha de inicio · últimos 6 meses
              </p>
            </div>
            <button onClick={alVerReportes} className="shrink-0 text-xs font-bold text-electrico">
              Ver reportes
            </button>
          </div>
          <GraficaMensual meses={meses} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-tinta">Reservas recientes</h2>
            <button onClick={alVerPedidos} className="text-xs font-bold text-electrico">
              Ver todas
            </button>
          </div>

          {recientes.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-6 text-center">
              <ClipboardList className="mx-auto text-slate-300" size={28} />
              <p className="mt-2 text-sm font-bold text-tinta">Todavía no hay reservas</p>
              <p className="mt-1 text-xs text-slate-400">
                Las reservas creadas desde la tienda aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {recientes.map((reserva) => (
                <button
                  key={reserva.id}
                  onClick={alVerPedidos}
                  className="flex w-full items-center gap-3 rounded-xl p-1 text-left hover:bg-slate-50"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-electrico">
                    <CalendarCheck size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-tinta">{reserva.cliente}</p>
                    <p className="truncate text-[11px] text-slate-400">
                      {nombreProductos(reserva)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {formatearFechaHora(reserva.fechaSolicitud)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-black text-tinta">
                      {formatearEuros(reserva.importe)}
                    </p>
                    <EstadoReservaBadge estado={reserva.estado} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-tinta">Inventario destacado</h2>
            <p className="mt-1 text-xs text-slate-400">
              {hayDemanda
                ? 'Productos reales con más reservas y menos disponibilidad'
                : 'Estado actual del inventario real'}
            </p>
          </div>
          <button onClick={alVerInventario} className="text-xs font-bold text-electrico">
            Gestionar inventario
          </button>
        </div>

        {inventarioDestacado.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-6 text-center">
            <PackageOpen className="mx-auto text-slate-300" size={28} />
            <p className="mt-2 text-sm font-bold text-tinta">No hay productos en el catálogo</p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-slate-100 text-xs text-slate-400">
                <tr>
                  <th className="pb-3 font-semibold">Producto</th>
                  <th className="pb-3 font-semibold">Categoría</th>
                  <th className="pb-3 font-semibold">Disponibles</th>
                  <th className="pb-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {inventarioDestacado.map((producto) => (
                  <tr key={producto.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-4 pr-4 font-bold text-tinta">{producto.nombre}</td>
                    <td className="py-4 pr-4 text-slate-500">{producto.categoria}</td>
                    <td className="py-4 pr-4 text-slate-500">
                      {producto.stockDisponible} de {producto.stockTotal}
                    </td>
                    <td className="py-4">
                      <EstadoProductoBadge estado={producto.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function PedidosAdministracion({
  datos,
  actualizando,
  cambiarEstado,
}: {
  datos: DatosAdministracion;
  actualizando: string | null;
  cambiarEstado: (reserva: ReservaAdministracion, estado: EstadoReserva) => void;
}) {
  const [filtro, setFiltro] = useState<'todas' | EstadoReserva>('todas');
  const [busqueda, setBusqueda] = useState('');

  const reservas = useMemo(() => {
    const texto = normalizarTexto(busqueda.trim());
    return datos.reservas.filter((reserva) => {
      if (filtro !== 'todas' && reserva.estado !== filtro) return false;
      if (!texto) return true;
      return normalizarTexto(
        `${reserva.codigo} ${reserva.cliente} ${reserva.productos
          .map((producto) => producto.producto)
          .join(' ')}`,
      ).includes(texto);
    });
  }, [datos.reservas, filtro, busqueda]);

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-electrico">Pedidos</p>
          <h2 className="mt-1 text-2xl font-black text-tinta">Reservas de clientes</h2>
          <p className="mt-1 text-sm text-slate-500">
            {datos.reservas.length} reservas reales cargadas desde Supabase.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar cliente, producto o código"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-electrico"
          />
          <select
            value={filtro}
            onChange={(evento) => setFiltro(evento.target.value as 'todas' | EstadoReserva)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-tinta outline-none focus:border-electrico"
          >
            {FILTROS_ESTADO.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white">
        {datos.reservas.length === 0 ? (
          <EstadoVacio
            icono={ClipboardList}
            titulo="Todavía no hay reservas"
            descripcion="Cuando un cliente solicite un alquiler desde la tienda, aparecerá aquí automáticamente con sus datos reales."
          />
        ) : reservas.length === 0 ? (
          <EstadoVacio
            icono={Inbox}
            titulo="Sin resultados"
            descripcion="No hay reservas que coincidan con la búsqueda o el filtro seleccionado."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Pedido</th>
                  <th className="px-5 py-3 font-semibold">Cliente</th>
                  <th className="px-5 py-3 font-semibold">Productos</th>
                  <th className="px-5 py-3 font-semibold">Periodo</th>
                  <th className="px-5 py-3 text-right font-semibold">Importe</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">Cambiar estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservas.map((reserva) => (
                  <tr key={reserva.id} className="align-top hover:bg-slate-50/60">
                    <td className="px-5 py-4">
                      <p className="font-black text-tinta">{reserva.codigo}</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {formatearFechaHora(reserva.fechaSolicitud)}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-tinta">{reserva.cliente}</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {reserva.telefono || 'Teléfono no indicado'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="max-w-[240px] text-slate-600">{nombreProductos(reserva)}</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {reserva.entrega === 'domicilio' ? 'Entrega a domicilio' : 'Recogida en tienda'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-slate-600">{formatearFecha(reserva.inicio)}</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        hasta {formatearFecha(reserva.fin)}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right font-black text-tinta">
                      {formatearEuros(reserva.importe)}
                    </td>
                    <td className="px-5 py-4">
                      <EstadoReservaBadge estado={reserva.estado} />
                    </td>
                    <td className="px-5 py-4">
                      {SIGUIENTES_ESTADOS[reserva.estado].length > 0 ? (
                        <select
                          value=""
                          disabled={actualizando === reserva.id}
                          onChange={(evento) => {
                            const estado = evento.target.value as EstadoReserva;
                            if (estado) cambiarEstado(reserva, estado);
                          }}
                          aria-label={`Cambiar estado de la reserva ${reserva.codigo}`}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-tinta outline-none focus:border-electrico disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option value="">
                            {actualizando === reserva.id ? 'Actualizando...' : 'Seleccionar'}
                          </option>
                          {SIGUIENTES_ESTADOS[reserva.estado].map((estado) => (
                            <option key={estado} value={estado}>
                              {estado}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-slate-400">Sin cambios</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductosAdministracion({ datos }: { datos: DatosAdministracion }) {
  return (
    <div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-electrico">Catálogo</p>
        <h2 className="mt-1 text-2xl font-black text-tinta">Productos reales</h2>
        <p className="mt-1 text-sm text-slate-500">
          {datos.productos.length} productos cargados desde public.productos.
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white">
        {datos.productos.length === 0 ? (
          <EstadoVacio
            icono={PackageOpen}
            titulo="No hay productos"
            descripcion="El catálogo de Supabase todavía no contiene productos."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Producto</th>
                  <th className="px-5 py-3 font-semibold">Categoría</th>
                  <th className="px-5 py-3 text-right font-semibold">Fin de semana</th>
                  <th className="px-5 py-3 text-right font-semibold">Mensual</th>
                  <th className="px-5 py-3 text-right font-semibold">Día adicional</th>
                  <th className="px-5 py-3 font-semibold">Stock</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">Alta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datos.productos.map((producto) => (
                  <tr key={producto.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4 font-bold text-tinta">{producto.nombre}</td>
                    <td className="px-5 py-4 text-slate-500">{producto.categoria}</td>
                    <td className="px-5 py-4 text-right text-slate-600">
                      {formatearEuros(producto.precioFinDeSemana)}
                    </td>
                    <td className="px-5 py-4 text-right text-slate-600">
                      {formatearEuros(producto.precioMensual)}
                    </td>
                    <td className="px-5 py-4 text-right text-slate-600">
                      {formatearEuros(producto.precioDiaAdicional)}
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {producto.stockDisponible} / {producto.stockTotal}
                    </td>
                    <td className="px-5 py-4">
                      <EstadoProductoBadge estado={producto.estado} />
                    </td>
                    <td className="px-5 py-4 text-[11px] text-slate-400">
                      {formatearFecha(producto.fechaCreacion)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ClientesAdministracion({ datos }: { datos: DatosAdministracion }) {
  return (
    <div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-electrico">Usuarios</p>
        <h2 className="mt-1 text-2xl font-black text-tinta">Clientes reales</h2>
        <p className="mt-1 text-sm text-slate-500">
          {datos.clientes.length} clientes cargados desde public.perfiles.
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white">
        {datos.clientes.length === 0 ? (
          <EstadoVacio
            icono={Users}
            titulo="Todavía no hay clientes"
            descripcion="Los perfiles con rol cliente aparecerán aquí cuando se registren."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Cliente</th>
                  <th className="px-5 py-3 font-semibold">Teléfono</th>
                  <th className="px-5 py-3 font-semibold">Alta</th>
                  <th className="px-5 py-3 text-right font-semibold">Reservas</th>
                  <th className="px-5 py-3 text-right font-semibold">Total reservado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datos.clientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4">
                      <p className="font-bold text-tinta">{cliente.nombre}</p>
                      <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-electrico">
                        Cliente
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {cliente.telefono || 'No indicado'}
                    </td>
                    <td className="px-5 py-4 text-[11px] text-slate-400">
                      {formatearFecha(cliente.fechaCreacion)}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-tinta">
                      {cliente.reservas}
                    </td>
                    <td className="px-5 py-4 text-right font-black text-tinta">
                      {formatearEuros(cliente.totalReservado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function InventarioAdministracion({ datos }: { datos: DatosAdministracion }) {
  const hoy = fechaHoyIso();

  const comprometidasHoy = useMemo(() => {
    const mapa = new Map<string, number>();
    datos.reservas
      .filter(
        (reserva) =>
          (reserva.estado === 'Confirmada' ||
            reserva.estado === 'En preparación' ||
            reserva.estado === 'En alquiler') &&
          reserva.inicio <= hoy &&
          reserva.fin >= hoy,
      )
      .forEach((reserva) => {
        reserva.productos.forEach((detalle) => {
          mapa.set(
            detalle.productoId,
            (mapa.get(detalle.productoId) ?? 0) + detalle.cantidad,
          );
        });
      });
    return mapa;
  }, [datos.reservas, hoy]);

  return (
    <div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-electrico">Stock</p>
        <h2 className="mt-1 text-2xl font-black text-tinta">Inventario real</h2>
        <p className="mt-1 text-sm text-slate-500">
          Stock operativo de hoy. Para consultar una fecha futura se usa la función de
          disponibilidad del servidor.
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white">
        {datos.productos.length === 0 ? (
          <EstadoVacio
            icono={PackageSearch}
            titulo="No hay inventario"
            descripcion="No hay productos que mostrar en public.productos."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Producto</th>
                  <th className="px-5 py-3 font-semibold">Categoría</th>
                  <th className="px-5 py-3 text-right font-semibold">Stock total</th>
                  <th className="px-5 py-3 text-right font-semibold">Stock disponible</th>
                  <th className="px-5 py-3 text-right font-semibold">Comprometidas hoy</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datos.productos.map((producto) => (
                  <tr key={producto.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4 font-bold text-tinta">{producto.nombre}</td>
                    <td className="px-5 py-4 text-slate-500">{producto.categoria}</td>
                    <td className="px-5 py-4 text-right text-slate-600">{producto.stockTotal}</td>
                    <td className="px-5 py-4 text-right font-bold text-tinta">
                      {producto.stockDisponible}
                    </td>
                    <td className="px-5 py-4 text-right text-slate-600">
                      {comprometidasHoy.get(producto.id) ?? 0}
                    </td>
                    <td className="px-5 py-4">
                      <EstadoProductoBadge estado={producto.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-extrabold text-tinta">Movimientos de inventario</h2>
          <p className="mt-1 text-xs text-slate-400">
            Registros reales de public.movimientos_inventario.
          </p>
        </div>
        {datos.movimientos.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm font-semibold text-tinta">Sin movimientos registrados</p>
            <p className="mx-auto mt-2 max-w-2xl text-xs leading-5 text-slate-500">
              El flujo actual de reservas no inserta movimientos manuales: el stock se controla con
              los triggers de la base de datos y con las reservas confirmadas, en preparación o en
              alquiler.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Producto</th>
                  <th className="px-5 py-3 font-semibold">Tipo</th>
                  <th className="px-5 py-3 text-right font-semibold">Cantidad</th>
                  <th className="px-5 py-3 font-semibold">Reserva</th>
                  <th className="px-5 py-3 font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datos.movimientos.slice(0, 10).map((movimiento) => (
                  <MovimientoFila key={movimiento.id} movimiento={movimiento} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MovimientoFila({ movimiento }: { movimiento: MovimientoAdministracion }) {
  return (
    <tr className="hover:bg-slate-50/60">
      <td className="px-5 py-4 font-bold text-tinta">{movimiento.producto}</td>
      <td className="px-5 py-4">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
            CLASES_MOVIMIENTO[movimiento.tipo]
          }`}
        >
          {ETIQUETAS_MOVIMIENTO[movimiento.tipo]}
        </span>
      </td>
      <td className="px-5 py-4 text-right text-slate-600">{movimiento.cantidad}</td>
      <td className="px-5 py-4 text-[11px] text-slate-400">
        {movimiento.codigoReserva || 'Sin reserva'}
      </td>
      <td className="px-5 py-4 text-[11px] text-slate-400">
        {formatearFechaHora(movimiento.fecha)}
      </td>
    </tr>
  );
}

function MantenimientoAdministracion({ datos }: { datos: DatosAdministracion }) {
  const productos = datos.productos.filter(
    (producto) => producto.estado === 'mantenimiento',
  );

  return (
    <div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-electrico">
          Operaciones
        </p>
        <h2 className="mt-1 text-2xl font-black text-tinta">Productos en mantenimiento</h2>
        <p className="mt-1 text-sm text-slate-500">
          Filtrado real por el estado existente en public.productos.
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white">
        {productos.length === 0 ? (
          <EstadoVacio
            icono={Wrench}
            titulo="No hay productos en mantenimiento"
            descripcion="Todos los productos del catálogo están activos o inactivos."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Producto</th>
                  <th className="px-5 py-3 font-semibold">Categoría</th>
                  <th className="px-5 py-3 text-right font-semibold">Stock disponible</th>
                  <th className="px-5 py-3 text-right font-semibold">Stock total</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productos.map((producto) => (
                  <tr key={producto.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4 font-bold text-tinta">{producto.nombre}</td>
                    <td className="px-5 py-4 text-slate-500">{producto.categoria}</td>
                    <td className="px-5 py-4 text-right text-slate-600">
                      {producto.stockDisponible}
                    </td>
                    <td className="px-5 py-4 text-right text-slate-600">
                      {producto.stockTotal}
                    </td>
                    <td className="px-5 py-4">
                      <EstadoProductoBadge estado={producto.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportesAdministracion({ datos }: { datos: DatosAdministracion }) {
  const { meses, total, totalReservas } = calcularIngresos(datos.reservas);

  return (
    <div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-electrico">Analítica</p>
        <h2 className="mt-1 text-2xl font-black text-tinta">Reportes de ingresos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Calculado con importe_total y fecha_inicio de las reservas confirmadas, en preparación, en
          alquiler o finalizadas.
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-tinta">Últimos 6 meses</h3>
            <p className="mt-1 text-xs text-slate-400">Ingresos agrupados por mes de inicio</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-tinta">{formatearEuros(total)}</p>
            <p className="text-xs text-slate-400">
              {totalReservas} {totalReservas === 1 ? 'reserva con ingreso' : 'reservas con ingreso'}
            </p>
          </div>
        </div>
        <GraficaMensual meses={meses} />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5">
          <h3 className="font-extrabold text-tinta">Desglose mensual</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-xs text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Mes</th>
                <th className="px-5 py-3 text-right font-semibold">Reservas</th>
                <th className="px-5 py-3 text-right font-semibold">Ingresos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {meses.map((mes) => (
                <tr key={mes.clave} className="hover:bg-slate-50/60">
                  <td className="px-5 py-4 font-bold capitalize text-tinta">{mes.etiqueta}</td>
                  <td className="px-5 py-4 text-right text-slate-600">{mes.reservas}</td>
                  <td className="px-5 py-4 text-right font-black text-tinta">
                    {formatearEuros(mes.ingresos)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50/60">
              <tr>
                <td className="px-5 py-4 font-black text-tinta">Total</td>
                <td className="px-5 py-4 text-right font-bold text-tinta">{totalReservas}</td>
                <td className="px-5 py-4 text-right font-black text-tinta">
                  {formatearEuros(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function ConfiguracionAdministracion({
  datos,
  usuario,
}: {
  datos: DatosAdministracion;
  usuario?: Usuario;
}) {
  return (
    <div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-electrico">Sistema</p>
        <h2 className="mt-1 text-2xl font-black text-tinta">Configuración y estado</h2>
        <p className="mt-1 text-sm text-slate-500">
          Información real de la sesión y del origen de los datos del panel.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-extrabold text-tinta">Cuenta de administración</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Nombre</dt>
              <dd className="text-right font-bold text-tinta">
                {usuario ? `${usuario.nombre} ${usuario.apellidos}` : 'Administrador'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Correo</dt>
              <dd className="break-all text-right font-semibold text-tinta">
                {usuario?.correo || 'No disponible'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Rol</dt>
              <dd className="text-right font-bold capitalize text-tinta">
                {usuario?.rol || 'administrador'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-extrabold text-tinta">Origen y actualización</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Origen</dt>
              <dd className="text-right font-bold text-tinta">Supabase · public</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Última carga</dt>
              <dd className="text-right font-semibold text-tinta">
                {formatearFechaHora(datos.cargadoEn)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Actualización</dt>
              <dd className="max-w-[220px] text-right text-slate-500">
                Al entrar en cada sección, al volver a la pestaña o con el botón Actualizar.
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-extrabold text-tinta">Datos cargados</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DatoConfiguracion etiqueta="Productos" valor={String(datos.productos.length)} />
          <DatoConfiguracion etiqueta="Clientes" valor={String(datos.clientes.length)} />
          <DatoConfiguracion etiqueta="Reservas" valor={String(datos.reservas.length)} />
          <DatoConfiguracion etiqueta="Movimientos" valor={String(datos.movimientos.length)} />
        </div>
      </div>
    </div>
  );
}

function DatoConfiguracion({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-xl bg-neblina p-4">
      <p className="text-xs font-semibold text-slate-400">{etiqueta}</p>
      <p className="mt-2 text-xl font-black text-tinta">{valor}</p>
    </div>
  );
}

function GraficaMensual({ meses }: { meses: MesIngreso[] }) {
  const maximo = Math.max(...meses.map((mes) => mes.ingresos), 0);

  return (
    <div className="mt-6">
      <div className="flex h-52 items-end justify-between gap-3 border-b border-l border-slate-100 px-3 pt-4">
        {meses.map((mes) => {
          const porcentaje = maximo > 0 ? (mes.ingresos / maximo) * 100 : 0;
          return (
            <div
              key={mes.clave}
              className="flex h-full flex-1 items-end justify-center"
              title={`${mes.etiqueta}: ${formatearEuros(mes.ingresos)}`}
            >
              <div
                className={`w-full max-w-10 rounded-t-lg ${
                  mes.ingresos > 0
                    ? 'bg-gradient-to-t from-electrico to-cian transition hover:opacity-80'
                    : 'bg-slate-100'
                }`}
                style={{
                  height: mes.ingresos > 0 ? `${Math.max(porcentaje, 4)}%` : '3px',
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between gap-3">
        {meses.map((mes) => (
          <div key={mes.clave} className="flex-1 text-center">
            <p className="text-[11px] capitalize text-slate-400">{mes.etiqueta}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              {formatearEuros(mes.ingresos)}
            </p>
          </div>
        ))}
      </div>
      {maximo === 0 && (
        <p className="mt-4 text-center text-xs font-semibold text-slate-400">
          Aún no hay ingresos registrados en este periodo.
        </p>
      )}
    </div>
  );
}

function Indicador({
  icono: Icono,
  titulo,
  valor,
  detalle,
  color,
}: {
  icono: LucideIcon;
  titulo: string;
  valor: string;
  detalle: string;
  color: 'blue' | 'violeta' | 'cian' | 'verde';
}) {
  const fondos: Record<'blue' | 'violeta' | 'cian' | 'verde', string> = {
    blue: 'bg-blue-50 text-electrico',
    violeta: 'bg-violet-50 text-violeta',
    cian: 'bg-cyan-50 text-cyan-600',
    verde: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${fondos[color]}`}>
        <Icono size={19} />
      </span>
      <p className="mt-5 text-xs font-semibold text-slate-400">{titulo}</p>
      <p className="mt-1 text-2xl font-black text-tinta">{valor}</p>
      <p className="mt-1 text-[11px] font-medium text-slate-400">{detalle}</p>
    </div>
  );
}

function EstadoReservaBadge({ estado }: { estado: EstadoReserva }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${CLASES_ESTADO_RESERVA[estado]}`}
    >
      {estado}
    </span>
  );
}

function EstadoProductoBadge({ estado }: { estado: EstadoProducto }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${CLASES_ESTADO_PRODUCTO[estado]}`}
    >
      {ETIQUETAS_ESTADO_PRODUCTO[estado]}
    </span>
  );
}

function EstadoVacio({
  icono: Icono,
  titulo,
  descripcion,
  accion,
}: {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
  accion?: { texto: string; onClick: () => void };
}) {
  return (
    <div className="p-10 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-electrico">
        <Icono size={24} />
      </span>
      <h3 className="mt-4 text-lg font-black text-tinta">{titulo}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{descripcion}</p>
      {accion && (
        <button
          onClick={accion.onClick}
          className="mt-5 rounded-xl bg-electrico px-5 py-3 text-sm font-bold text-white transition hover:bg-violeta"
        >
          {accion.texto}
        </button>
      )}
    </div>
  );
}

function CargandoPanel() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white">
      <Loader2 className="animate-spin text-electrico" size={28} />
      <p className="text-sm font-semibold text-slate-500">
        Cargando datos reales de Supabase...
      </p>
    </div>
  );
}

function ErrorPanel({ mensaje, reintentar }: { mensaje: string; reintentar: () => void }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-red-100 bg-white p-8 text-center">
      <AlertCircle className="text-red-500" size={30} />
      <h2 className="mt-4 text-lg font-black text-tinta">No se pudo cargar el panel</h2>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">{mensaje}</p>
      <button
        onClick={reintentar}
        className="mt-5 rounded-xl bg-tinta px-5 py-3 text-sm font-bold text-white hover:bg-electrico"
      >
        Reintentar
      </button>
    </div>
  );
}
