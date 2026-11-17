import { useCallback, useEffect, useRef, useState } from 'react';
import { servicioAdministracion, type DatosAdministracion, type EstadoProducto } from '../servicios/servicioAdministracion';
import { formatearEuros, formatearFecha } from '../utilidades/formato';
import { SIGUIENTES_ESTADOS } from '../utilidades/estadosReserva';
import { BandejaContacto } from '../componentes/BandejaContacto';

export type SeccionEmpleado = 'Resumen' | 'Pedidos' | 'Inventario' | 'Reportes' | 'Consultas';
interface Propiedades { salir: () => void; seccionInicial?: SeccionEmpleado; navegar: (seccion: SeccionEmpleado) => void; }
const SECCIONES: SeccionEmpleado[] = ['Resumen', 'Pedidos', 'Inventario', 'Reportes', 'Consultas'];

export function PanelEmpleados({ salir, seccionInicial = 'Resumen', navegar }: Propiedades) {
  const [datos, setDatos] = useState<DatosAdministracion | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [mutando, setMutando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('Todos');
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const solicitud = useRef(0);
  const bloqueo = useRef(false);
  const cargar = useCallback(async () => {
    const id = ++solicitud.current;
    setCargando(true);
    try {
      const resultado = await servicioAdministracion.obtenerDatos();
      if (id === solicitud.current) { setDatos(resultado); setError(''); }
    } catch (problema) {
      if (id === solicitud.current) setError(problema instanceof Error ? problema.message : 'No se pudieron cargar las operaciones.');
    } finally { if (id === solicitud.current) setCargando(false); }
  }, []);
  useEffect(() => {
    void cargar();
    const foco = () => { if (document.visibilityState === 'visible') void cargar(); };
    window.addEventListener('focus', foco);
    document.addEventListener('visibilitychange', foco);
    const cancelar = servicioAdministracion.suscribirCambios(foco);
    return () => { solicitud.current++; cancelar(); window.removeEventListener('focus', foco); document.removeEventListener('visibilitychange', foco); };
  }, [cargar]);
  const ejecutar = async (accion: () => Promise<void>) => {
    if (bloqueo.current) return;
    bloqueo.current = true;
    setMutando(true);
    setError('');
    try { await accion(); await cargar(); }
    catch (problema) { setError(problema instanceof Error ? problema.message : 'No se pudo guardar el cambio.'); }
    finally { bloqueo.current = false; setMutando(false); }
  };
  const reservas = datos?.reservas ?? [];
  const productos = datos?.productos ?? [];
  const pedido = reservas.find(reserva => reserva.id === seleccion);
  const visibles = reservas.filter(reserva => (filtro === 'Todos' || reserva.estado === filtro) &&
    `${reserva.codigo} ${reserva.cliente} ${reserva.productos.map(item => item.producto).join(' ')}`.toLowerCase().includes(busqueda.toLowerCase()));
  const total = reservas.filter(reserva => !['Cancelada', 'Pendiente'].includes(reserva.estado)).reduce((suma, reserva) => suma + reserva.importe, 0);
  return <main className="min-h-screen bg-neblina text-tinta">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-white p-5 lg:px-10">
      <div><p className="text-sm text-slate-500">Rentaeasy · Operaciones · {new Date().toLocaleDateString('es-ES')}</p><h1 className="text-2xl font-black">{seccionInicial}</h1></div>
      <div className="flex gap-3"><button disabled={cargando || mutando} onClick={() => void cargar()} className="rounded-xl border px-4 py-2 disabled:opacity-50">{cargando ? 'Actualizando…' : 'Actualizar'}</button><button onClick={salir} className="rounded-xl bg-electrico px-4 py-2 font-bold text-white">Volver a la tienda</button></div>
    </header>
    <div className="mx-auto max-w-7xl p-5 lg:p-10">
      <nav aria-label="Operaciones" className="mb-6 flex flex-wrap gap-2">{SECCIONES.map(seccion => <button key={seccion} onClick={() => navegar(seccion)} aria-current={seccionInicial === seccion ? 'page' : undefined} className={`rounded-xl px-4 py-3 font-bold ${seccionInicial === seccion ? 'bg-tinta text-white' : 'bg-white'}`}>{seccion}</button>)}</nav>
      {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{error} <button className="underline" onClick={() => void cargar()}>Reintentar</button></p>}
      {cargando && !datos && <p role="status">Cargando operaciones…</p>}
      {seccionInicial === 'Consultas' ? <BandejaContacto /> : datos && <>
        {(seccionInicial === 'Resumen' || seccionInicial === 'Reportes') && <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
            ['Reservas pendientes', reservas.filter(reserva => reserva.estado === 'Pendiente').length],
            ['Entregas por preparar', reservas.filter(reserva => ['Confirmada', 'En preparación'].includes(reserva.estado)).length],
            ['Alquileres activos', reservas.filter(reserva => reserva.estado === 'En alquiler').length],
            ['Importe confirmado', formatearEuros(total)],
          ].map(([titulo, valor]) => <div key={titulo} className="rounded-2xl border bg-white p-6"><p className="text-sm text-slate-500">{titulo}</p><p className="mt-3 text-3xl font-black">{valor}</p></div>)}</div>
          <p className="my-5 text-sm text-slate-500">Importes confirmados; no representan pagos cobrados.</p>
          <h2 className="my-4 text-xl font-bold">Movimientos de inventario</h2>
          <div className="space-y-2">{datos.movimientos.slice(0, 30).map(movimiento => <p key={movimiento.id} className="rounded-xl bg-white p-4">{formatearFecha(movimiento.fecha)} · {movimiento.producto} · {movimiento.tipo} · {movimiento.cantidad} unidades {movimiento.codigoReserva && `· ${movimiento.codigoReserva}`}</p>)}{!datos.movimientos.length && <p>No hay movimientos registrados.</p>}</div>
        </>}
        {seccionInicial === 'Pedidos' && <>
          <div className="mb-5 flex flex-wrap gap-3"><input aria-label="Buscar pedidos" className="min-w-0 flex-1 rounded-xl border p-3" placeholder="Buscar por reserva, cliente o producto" value={busqueda} onChange={evento => setBusqueda(evento.target.value)} /><select aria-label="Filtrar estado" value={filtro} onChange={evento => setFiltro(evento.target.value)} className="rounded-xl border p-3"><option>Todos</option>{Object.keys(SIGUIENTES_ESTADOS).map(estado => <option key={estado}>{estado}</option>)}</select></div>
          <div className="space-y-3">{visibles.map(reserva => <button key={reserva.id} onClick={() => setSeleccion(reserva.id)} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-5 text-left"><span><strong>{reserva.codigo} · {reserva.cliente}</strong><span className="mt-1 block text-sm text-slate-500">{reserva.productos.map(item => `${item.producto} × ${item.cantidad}`).join(' · ')}<br />{formatearFecha(reserva.inicio)} → {formatearFecha(reserva.fin)}</span></span><span>{reserva.estado} · {formatearEuros(reserva.importe)}</span></button>)}{!visibles.length && <p>No hay reservas que coincidan.</p>}</div>
        </>}
        {seccionInicial === 'Inventario' && <>
          <p className="mb-5 text-sm text-slate-500">Existencias por producto y disponibilidad de hoy. Las reservas se validan para sus fechas en el servidor. Mantenimiento afecta al producto completo.</p>
          <div className="space-y-3">{productos.map(producto => <article key={producto.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5"><div><h2 className="font-bold">{producto.nombre}</h2><p className="text-sm text-slate-500">{producto.stockDisponible} disponibles / {producto.stockTotal} totales</p></div><select aria-label={`Estado de ${producto.nombre}`} disabled={mutando || cargando} value={producto.estado} onChange={evento => { const estado = evento.target.value as EstadoProducto; void ejecutar(() => servicioAdministracion.actualizarEstadoProducto(producto.id, estado, producto.estado)); }} className="rounded-xl border p-3"><option value="activo">Activo</option><option value="mantenimiento">Mantenimiento</option><option value="inactivo">Inactivo</option></select></article>)}</div>
        </>}
      </>}
    </div>
    {pedido && <div className="fixed inset-0 z-50 overflow-y-auto bg-tinta/60 p-5"><section role="dialog" aria-modal="true" aria-labelledby="titulo-pedido" className="mx-auto max-w-2xl rounded-2xl bg-white p-6">
      <div className="flex items-center justify-between gap-3"><h2 id="titulo-pedido" className="text-xl font-black">{pedido.codigo}</h2><button autoFocus onClick={() => setSeleccion(null)} className="rounded-lg border px-3 py-2">Cerrar</button></div>
      <p className="mt-5 font-bold">{pedido.cliente} · {pedido.telefono ?? 'Sin teléfono'}</p><p className="my-3">{formatearFecha(pedido.inicio)} → {formatearFecha(pedido.fin)} · {pedido.estado}</p>
      <p>{pedido.entrega === 'domicilio' ? `Domicilio: ${pedido.direccion}` : 'Recogida en tienda'}</p>
      <ul className="my-5 space-y-2">{pedido.productos.map(item => <li key={item.productoId}>{item.producto} × {item.cantidad} · {formatearEuros(item.subtotal)}</li>)}</ul>
      <p className="font-bold">Total: {formatearEuros(pedido.importe)}</p>
      <div className="mt-5 flex flex-wrap gap-3">{SIGUIENTES_ESTADOS[pedido.estado].map(estado => <button key={estado} disabled={mutando || cargando} onClick={() => void ejecutar(() => servicioAdministracion.actualizarEstadoReserva(pedido.id, estado, pedido.estado))} className="rounded-xl bg-electrico px-4 py-3 font-bold text-white disabled:opacity-50">{estado === 'Finalizada' ? 'Registrar devolución' : estado === 'En alquiler' ? 'Registrar entrega' : estado}</button>)}</div>
      {!SIGUIENTES_ESTADOS[pedido.estado].length && <p className="mt-4">Esta reserva está cerrada.</p>}
      {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
    </section></div>}
  </main>;
}
export const LayoutEmpleados = PanelEmpleados;
