import { CheckCircle2, Mail, MapPin, Phone, Send } from 'lucide-react';
import { useState } from 'react';
import { servicioContacto } from '../servicios/servicioContacto';
import type { FormEvent, ReactNode } from 'react';

export function SeccionContacto() {
  const [enviado, setEnviado] = useState(false);
  const [nombre, setNombre] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const enviarFormulario = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (enviando) return;
    const formulario = evento.currentTarget;
    const datos = new FormData(formulario);
    if (nombre.trim().length < 2) { setError('Indica un nombre de al menos dos caracteres.'); return; }
    setEnviando(true);
    setError('');
    try {
      await servicioContacto.enviar({ nombre: nombre.trim(), correo: String(datos.get('correo')).trim(), asunto: String(datos.get('asunto')), mensaje: String(datos.get('mensaje')).trim() });
      setEnviado(true);
    } catch (problema) { setError(problema instanceof Error ? problema.message : 'No se pudo registrar la consulta.'); }
    finally { setEnviando(false); }
  };

  return <section id="contacto" className="bg-neblina"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[0.85fr_1.15fr] lg:px-8"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-electrico">Estamos para ayudarte</p><h2 className="mt-3 text-3xl font-black tracking-tight text-tinta sm:text-4xl">Hablemos de tu próximo alquiler.</h2><p className="mt-5 max-w-md leading-7 text-slate-500">¿Tienes dudas sobre un producto, una entrega o una reserva? Nuestro equipo te responderá lo antes posible.</p><div className="mt-8 space-y-5"><DatoContacto icono={MapPin} titulo="Visítanos" texto={<>Bellas Vistas, distrito de Tetuán<br />Madrid, España</>} /><DatoContacto icono={Mail} titulo="Escríbenos" texto="hola@rentaeasy.es" /><DatoContacto icono={Phone} titulo="Llámanos" texto="+34 910 000 000" /></div></div><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-suave sm:p-8"><div className="flex items-center justify-between"><div><h3 className="text-xl font-black text-tinta">Envíanos un mensaje</h3><p className="mt-1 text-sm text-slate-500">Tu consulta quedará registrada para que el equipo pueda responderte.</p></div><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-electrico"><Send size={19} /></span></div>{enviado ? <div className="mt-8 rounded-2xl bg-emerald-50 p-6 text-center"><CheckCircle2 className="mx-auto text-emerald-500" size={32} /><h4 className="mt-3 font-extrabold text-emerald-800">Consulta registrada correctamente</h4><p className="mt-2 text-sm leading-6 text-emerald-700">Gracias, {nombre || 'por escribirnos'}. Nuestro equipo se pondrá en contacto contigo pronto.</p><button onClick={() => setEnviado(false)} className="mt-4 text-sm font-bold text-emerald-700 underline">Enviar otro mensaje</button></div> : <form onSubmit={enviarFormulario} className="mt-7 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Campo id="nombre-contacto" etiqueta="Nombre" requerido value={nombre} alCambiar={setNombre} placeholder="Tu nombre" /><Campo id="email-contacto" etiqueta="Correo electrónico" tipo="email" requerido placeholder="tu@email.com" /></div><div><label htmlFor="asunto-contacto" className="text-xs font-bold text-tinta">¿En qué podemos ayudarte?</label><select id="asunto-contacto" name="asunto" required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-600 outline-none focus:border-electrico"><option value="">Selecciona una opción</option><option>Consulta sobre un producto</option><option>Ayuda con una reserva</option><option>Entrega o devolución</option><option>Otra consulta</option></select></div><div><label htmlFor="mensaje-contacto" className="text-xs font-bold text-tinta">Mensaje</label><textarea id="mensaje-contacto" name="mensaje" minLength={10} maxLength={5000} required rows={4} placeholder="Cuéntanos cómo podemos ayudarte..." className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-electrico" /></div>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={enviando} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-electrico px-4 py-3.5 text-sm font-bold text-white transition hover:bg-violeta"><Send size={16} /> {enviando ? 'Registrando…' : 'Enviar mensaje'}</button></form>}</div></div></section>;
}

function DatoContacto({ icono: Icono, titulo, texto }: { icono: typeof MapPin; titulo: string; texto: ReactNode }) { return <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-electrico shadow-sm"><Icono size={18} /></span><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{titulo}</p><p className="mt-1 text-sm font-semibold leading-6 text-tinta">{texto}</p></div></div>; }
function Campo({ id, etiqueta, tipo = 'text', requerido = false, value, alCambiar, placeholder }: { id: string; etiqueta: string; tipo?: string; requerido?: boolean; value?: string; alCambiar?: (valor: string) => void; placeholder: string }) { return <div><label htmlFor={id} className="text-xs font-bold text-tinta">{etiqueta}</label><input id={id} name={tipo === 'email' ? 'correo' : 'nombre'} maxLength={tipo === 'email' ? 254 : 120} type={tipo} required={requerido} value={value} onChange={(evento) => alCambiar?.(evento.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-electrico" /></div>; }
