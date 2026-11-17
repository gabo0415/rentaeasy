import { useCallback, useEffect, useState } from 'react';
import { servicioContacto, type ConsultaContacto } from '../servicios/servicioContacto';
import { formatearFechaHora } from '../utilidades/formato';

export function BandejaContacto() {
  const [mensajes, setMensajes] = useState<ConsultaContacto[]>([]);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const cargar = useCallback(async () => {
    setOcupado(true);
    setError('');
    try { setMensajes(await servicioContacto.obtener()); }
    catch (problema) { setError(problema instanceof Error ? problema.message : 'No se pudieron cargar las consultas.'); }
    finally { setOcupado(false); }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);
  const atender = async (id: string) => {
    setOcupado(true);
    try { await servicioContacto.atender(id); await cargar(); }
    catch (problema) { setError(problema instanceof Error ? problema.message : 'No se pudo actualizar la consulta.'); }
    finally { setOcupado(false); }
  };
  return <section className="space-y-4">
    <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">Consultas de contacto</h2><button disabled={ocupado} onClick={() => void cargar()} className="rounded-xl border bg-white px-4 py-2 disabled:opacity-50">{ocupado ? 'Cargando…' : 'Actualizar'}</button></div>
    <p className="text-sm text-slate-500">Las últimas 200 consultas. Responde por correo y marca cada consulta como atendida.</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {!ocupado && !error && mensajes.length === 0 && <p>No hay consultas recibidas.</p>}
    {mensajes.map(mensaje => <article key={mensaje.id} className="rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap justify-between gap-3"><h3 className="font-bold">{mensaje.asunto} · {mensaje.nombre}</h3><span className="text-xs">{mensaje.atendido ? 'Atendida' : 'Pendiente'}</span></div>
      <p className="mt-2 text-sm text-slate-500">{mensaje.correo} · {formatearFechaHora(mensaje.fecha_creacion)}</p>
      <p className="my-4 whitespace-pre-wrap break-words">{mensaje.mensaje}</p>
      <a className="mr-4 font-bold text-electrico" href={`mailto:${encodeURIComponent(mensaje.correo)}?subject=${encodeURIComponent(`Re: ${mensaje.asunto}`)}`}>Responder por correo</a>
      {!mensaje.atendido && <button disabled={ocupado} className="rounded-lg border px-3 py-2 disabled:opacity-50" onClick={() => void atender(mensaje.id)}>Marcar atendida</button>}
    </article>)}
  </section>;
}
