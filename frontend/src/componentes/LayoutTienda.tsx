import { ReactNode } from 'react';
import { BarraNavegacion, RutaNavegacion } from './BarraNavegacion';
import { PiePagina } from './PiePagina';

interface PropiedadesLayoutTienda {
  vista: string;
  navegar: (ruta: RutaNavegacion, categoria?: import('../tipos').Categoria) => void;
  buscar: (texto: string) => void;
  reservas: number;
  abrirCuenta: () => void;
  abrirReserva: () => void;
  children: ReactNode;
  mostrarPie?: boolean;
  nombreUsuario?: string;
  alCerrarSesion?: () => void;
}

/** Layout exclusivo de la tienda pública. Los paneles internos no lo utilizan. */
export function LayoutTienda({ vista, navegar, buscar, reservas, abrirCuenta, abrirReserva, children, mostrarPie = true, nombreUsuario, alCerrarSesion }: PropiedadesLayoutTienda) {
  return <div className="min-h-screen bg-white font-sans text-tinta"><BarraNavegacion vista={vista} irA={navegar} alBuscar={buscar} reservas={reservas} abrirCuenta={abrirCuenta} abrirReserva={abrirReserva} nombreUsuario={nombreUsuario} alCerrarSesion={alCerrarSesion} />{children}{mostrarPie && <PiePagina alNavegar={navegar} />}</div>;
}
