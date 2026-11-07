import { ArrowUpRight, Heart, PackageCheck, ShoppingBag } from 'lucide-react';
import { Producto } from '../tipos';
import {
  disponibilidadConocida,
  productoDisponible,
  textoDisponibilidad,
} from '../utilidades/disponibilidad';
import { formatearEuros } from '../utilidades/formato';

interface PropiedadesTarjetaProducto {
  producto: Producto;
  alVer: (producto: Producto) => void;
  alAlquilar: (producto: Producto) => void;
}

export function TarjetaProducto({ producto, alVer, alAlquilar }: PropiedadesTarjetaProducto) {
  const disponible = productoDisponible(producto);
  const conocida = disponibilidadConocida(producto);

  return (
    <article className="grupo relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-suave">
      <div className="relative h-56 overflow-hidden bg-white">
        <img src={producto.imagen} alt={producto.nombre} className="h-full w-full object-contain p-3 transition duration-500 grupo-hover:scale-105" />
        <div className="absolute inset-x-4 top-4 flex items-start justify-between">
          <div className="flex flex-wrap gap-2">
            {producto.etiquetas.slice(0, 1).map((etiqueta) => <span key={etiqueta} className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold text-tinta shadow-sm backdrop-blur">{etiqueta}</span>)}
          </div>
          <button aria-label="Añadir a favoritos" className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-500 shadow-sm transition hover:text-violeta"><Heart size={16} /></button>
        </div>
        <div className={`absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${disponible ? 'bg-emerald-50 text-emerald-700' : conocida ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}><PackageCheck size={13} /> {textoDisponibilidad(producto)}</div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-electrico">{producto.categoria}</p>
        <h3 className="text-lg font-extrabold leading-snug text-tinta">{producto.nombre}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{producto.descripcion}</p>
        <div className="mt-5 flex items-end justify-between gap-3">
          <div><span className="text-xs text-slate-400">Desde</span><div className="text-xl font-black text-tinta">{formatearEuros(producto.precioFinDeSemana)}<span className="text-xs font-medium text-slate-400"> / fin de semana</span></div></div>
          <button onClick={() => alVer(producto)} className="flex items-center gap-1 text-sm font-bold text-electrico transition hover:text-violeta">Ver producto <ArrowUpRight size={16} /></button>
        </div>
        <button
          onClick={() => alAlquilar(producto)}
          disabled={!disponible}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-tinta px-4 py-3 text-sm font-bold text-white transition hover:bg-electrico disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          <ShoppingBag size={16} /> {disponible ? 'Alquilar ahora' : conocida ? 'No disponible' : 'Comprobando...'}
        </button>
      </div>
    </article>
  );
}
