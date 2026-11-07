export function PantallaCargaSesion() {
  return (
    <main className="grid min-h-screen place-items-center bg-neblina px-5 py-16">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-suave">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-electrico to-violeta text-xl font-black text-white shadow-lg shadow-blue-200">
          r
        </span>
        <div
          role="status"
          aria-live="polite"
          className="mx-auto mt-7 h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-electrico"
        />
        <h1 className="mt-6 text-xl font-black text-tinta">Comprobando tu sesión</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Estamos verificando tus permisos antes de mostrar contenido privado.
        </p>
      </div>
    </main>
  );
}
