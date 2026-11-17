/** Reenvía el JWT del usuario: las políticas RLS y triggers siguen siendo la autoridad. */
export async function consultarDatos(ruta: string, token?: string, metodo = 'GET', cuerpo?: unknown) {
  const url = process.env.SUPABASE_URL;
  const clave = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_CLAVE_SERVICIO;
  if (!url || !clave) throw new Error('La conexión con Supabase no está configurada.');
  const respuesta = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${ruta}`, {
    method: metodo,
    headers: { apikey: clave, ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(15000),
  });
  const datos: unknown = await respuesta.json();
  return { estado: respuesta.status, datos };
}
