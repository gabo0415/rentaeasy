import { createClient } from '@supabase/supabase-js';

const urlSupabase = import.meta.env.VITE_SUPABASE_URL;
const clavePublicaSupabase = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!urlSupabase || !clavePublicaSupabase) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en el archivo .env.');
}

/**
 * Cliente público de Supabase. Nunca incluir aquí una clave service_role.
 *
 * - persistSession: mantiene la sesión al recargar la página.
 * - autoRefreshToken: renueva el token antes de que caduque.
 * - detectSessionInUrl: procesa los enlaces de confirmación y recuperación.
 */
export const supabase = createClient(urlSupabase, clavePublicaSupabase, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'rentaeasy-auth',
  },
});
