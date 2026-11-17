import { MapPin } from 'lucide-react';
import type { RutaNavegacion } from './BarraNavegacion';

export function PiePagina({ alNavegar }: { alNavegar: (ruta: RutaNavegacion) => void }) {
  return <footer id="pie-contacto" className="bg-tinta text-white">
    <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:px-8">
      <div><div className="flex items-center gap-2.5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-electrico to-violeta text-lg font-black">r</span><span className="text-xl font-black">renta<span className="text-cian">easy</span></span></div><p className="mt-5 max-w-xs text-sm leading-7 text-slate-300">Alquila al instante, en cualquier parte. Tecnología premium para vivirla, no para almacenarla.</p></div>
      <div><h3 className="font-bold">Explora</h3><ul className="mt-5 space-y-3 text-sm text-slate-300"><li><button onClick={() => alNavegar('catalogo')} className="hover:text-white">Catálogo completo</button></li><li><button onClick={() => alNavegar('catalogo')} className="hover:text-white">Categorías</button></li><li><button onClick={() => alNavegar('como-funciona')} className="hover:text-white">Cómo funciona</button></li><li><button onClick={() => alNavegar('preguntas')} className="hover:text-white">Preguntas frecuentes</button></li></ul></div>
      <div><h3 className="font-bold">Ayuda</h3><ul className="mt-5 space-y-3 text-sm text-slate-300"><li><button onClick={() => alNavegar('contacto')} className="hover:text-white">Centro de ayuda</button></li><li><button onClick={() => alNavegar('condiciones')} className="hover:text-white">Condiciones de alquiler</button></li><li><button onClick={() => alNavegar('privacidad')} className="hover:text-white">Política de privacidad</button></li><li><button onClick={() => alNavegar('cookies')} className="hover:text-white">Política de cookies</button></li></ul></div>
      <div><h3 className="font-bold">Ven a visitarnos</h3><p className="mt-5 flex gap-2 text-sm leading-6 text-slate-300"><MapPin size={17} className="mt-0.5 shrink-0 text-cian" /> Bellas Vistas,<br />distrito de Tetuán<br />Madrid, España</p><p className="mt-4 text-sm text-slate-300">hola@rentaeasy.es<br />+34 910 000 000</p></div>
    </div>
    <div className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>© {new Date().getFullYear()} Rentaeasy. Todos los derechos reservados.</span><span>Tarifas en euros (€) · Reserva sujeta a confirmación</span></div></div>
  </footer>;
}
