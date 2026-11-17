import { Bell, ChevronDown, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import type { Categoria } from '../tipos';

export type RutaNavegacion = 'inicio' | 'catalogo' | 'categorias' | 'como-funciona' | 'contacto' | 'preguntas' | 'condiciones' | 'privacidad' | 'cookies';

interface PropiedadesBarraNavegacion {
  vista: string;
  irA: (ruta: RutaNavegacion, categoria?: Categoria) => void;
  alBuscar: (texto: string) => void;
  reservas: number;
  abrirCuenta: () => void;
  abrirReserva: () => void;
  nombreUsuario?: string;
  alCerrarSesion?: () => void;
}

export function BarraNavegacion({ vista, irA, alBuscar, reservas, abrirCuenta, abrirReserva, nombreUsuario, alCerrarSesion }: PropiedadesBarraNavegacion) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [categoriasAbiertas, setCategoriasAbiertas] = useState(false);
  const navegar = (destino: RutaNavegacion, categoria?: Categoria) => { irA(destino, categoria); setMenuAbierto(false); setCategoriasAbiertas(false); };
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
        <button onClick={() => navegar('inicio')} className="flex items-center gap-2.5" aria-label="Ir al inicio">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-electrico to-violeta text-lg font-black text-white shadow-lg shadow-blue-200">r</span>
          <span className="text-xl font-black tracking-tight text-tinta">renta<span className="text-electrico">easy</span></span>
        </button>
        <nav className={`${menuAbierto ? 'absolute left-0 right-0 top-[76px] flex border-b border-slate-200 bg-white p-5 shadow-xl' : 'hidden'} flex-col gap-4 lg:static lg:flex lg:flex-row lg:items-center lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}>
          <button onClick={() => navegar('inicio')} className={`text-sm font-semibold transition ${vista === 'inicio' ? 'text-electrico' : 'text-slate-500 hover:text-tinta'}`}>Inicio</button>
          <button onClick={() => navegar('catalogo')} className={`text-sm font-semibold transition ${vista === 'catalogo' ? 'text-electrico' : 'text-slate-500 hover:text-tinta'}`}>Catálogo</button>
          <div className="relative"><button onClick={() => setCategoriasAbiertas(!categoriasAbiertas)} aria-expanded={categoriasAbiertas} className="flex items-center gap-1 text-left text-sm font-semibold text-slate-500 transition hover:text-tinta">Categorías <ChevronDown size={14} className={`transition ${categoriasAbiertas ? 'rotate-180' : ''}`} /></button>{categoriasAbiertas && <div className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl lg:absolute lg:left-1/2 lg:top-8 lg:z-50 lg:mt-0 lg:w-64 lg:-translate-x-1/2">{(['Conservación, cocina y pequeño electrodoméstico', 'Lavado y cuidado de la ropa', 'Limpieza avanzada y climatización estacional'] as Categoria[]).map((categoria) => <button key={categoria} onClick={() => navegar('categorias', categoria)} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold leading-5 text-slate-500 transition hover:bg-blue-50 hover:text-electrico">{categoria}</button>)}</div>}</div>
          <button onClick={() => navegar('como-funciona')} className="text-left text-sm font-semibold text-slate-500 transition hover:text-tinta">Cómo funciona</button>
          <button onClick={() => navegar('contacto')} className="text-left text-sm font-semibold text-slate-500 transition hover:text-tinta">Contacto</button>
          <button onClick={() => { setMenuAbierto(false); abrirCuenta(); }} className="text-left text-sm font-bold text-electrico lg:hidden">{nombreUsuario ? 'Mi cuenta' : 'Iniciar sesión'}</button>
          {nombreUsuario && <button onClick={() => { setMenuAbierto(false); alCerrarSesion?.(); }} className="text-left text-sm font-semibold text-slate-500 lg:hidden">Cerrar sesión</button>}
        </nav>
        <div className="flex items-center gap-2">
          {buscadorAbierto && <input autoFocus onChange={(evento) => alBuscar(evento.target.value)} placeholder="Buscar productos" aria-label="Buscar productos" className="absolute left-5 right-5 top-[80px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg outline-none focus:border-electrico sm:static sm:w-44 sm:shadow-none" />}
          <button onClick={() => setBuscadorAbierto(!buscadorAbierto)} aria-label="Buscar" className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-tinta"><Search size={18} /></button>
          <button onClick={abrirCuenta} aria-label="Mi cuenta" className="hidden h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-tinta transition hover:bg-slate-100 sm:flex"><UserRound size={17} /> <span className="hidden xl:block">{nombreUsuario || 'Mi cuenta'}</span></button>
          {nombreUsuario ? <button onClick={alCerrarSesion} className="hidden text-sm font-bold text-slate-500 transition hover:text-electrico md:block">Cerrar sesión</button> : <button onClick={abrirCuenta} className="hidden text-sm font-bold text-electrico transition hover:text-violeta md:block">Iniciar sesión</button>}
          <button onClick={abrirReserva} aria-label="Ver reserva" className="relative grid h-10 w-10 place-items-center rounded-xl bg-tinta text-white transition hover:bg-electrico"><ShoppingBag size={17} />{reservas > 0 && <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-cian text-[10px] font-black text-tinta">{reservas}</span>}</button>
          <button onClick={() => setMenuAbierto(!menuAbierto)} aria-label="Abrir menú" className="grid h-10 w-10 place-items-center rounded-xl text-slate-600 lg:hidden">{menuAbierto ? <X size={21} /> : <Menu size={21} />}</button>
        </div>
      </div>
      <div className="hidden items-center justify-center gap-2 border-t border-slate-100 bg-slate-50 py-2 text-xs font-medium text-slate-500 md:flex"><Bell size={13} className="text-electrico" /> Recogida en tienda o entrega coordinada en Madrid</div>
    </header>
  );
}
