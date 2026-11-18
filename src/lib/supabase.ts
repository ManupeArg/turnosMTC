import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** null cuando faltan las variables de entorno: la app corre en modo demo local. */
export const supabase: SupabaseClient | null = url && clave ? createClient(url, clave) : null;
