import { ArrowLeft, LockKeyhole, ShieldCheck } from 'lucide-react';
import type { Rol } from '../tipos';

interface PropiedadesAccesoProtegido {
  modulo: string;
  rolActual: Rol;
  irIniciarSesion: () => void;
  cambiarCuenta?: () => void;
  volver: () => void;
}

export function AccesoProtegido({
  modulo,
  rolActual,
  irIniciarSesion,
  cambiarCuenta,
  volver,
}: PropiedadesAccesoProtegido) {
  return (
    <main className="grid min-h-[calc(100vh-76px)] place-items-center bg-neblina px-5 py-16">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-suave">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-50 text-amber-600">
          <LockKeyhole size={29} />
        </span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-electrico">
          Permiso insuficiente
        </p>
        <h1 className="mt-3 text-2xl font-black text-tinta">No tienes permisos para {modulo}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Tu sesión actual tiene el rol <strong>{rolActual}</strong>. Los permisos se comprueban también en el
          servidor.
        </p>
        <div className="mt-7 rounded-2xl bg-blue-50 p-4 text-left">
          <p className="flex items-center gap-2 text-xs font-bold text-electrico">
            <ShieldCheck size={15} /> Acceso interno autorizado
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            Inicia sesión con una cuenta de empleado o administrador autorizada por la empresa.
          </p>
          <button
            onClick={cambiarCuenta ?? irIniciarSesion}
            className="mt-4 w-full rounded-xl bg-electrico px-3 py-3 text-xs font-bold text-white hover:bg-violeta"
          >
            Cambiar de cuenta
          </button>
        </div>
        <button
          onClick={volver}
          className="mt-6 flex w-full items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-electrico"
        >
          <ArrowLeft size={16} /> Volver a la tienda
        </button>
      </div>
    </main>
  );
}
