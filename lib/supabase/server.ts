// ==============================================================================
// Cliente Supabase del Servidor - Ejecución Segura Backend
// ==============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedServerClient: SupabaseClient | null = null;

export function getServerSupabaseClient(): {
  client: SupabaseClient | null;
  isConfigured: boolean;
  hasServiceRole: boolean;
  error?: string;
} {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !serviceKey) {
    return {
      client: null,
      isConfigured: false,
      hasServiceRole: false,
      error: 'Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y/o credenciales de Supabase.',
    };
  }

  try {
    if (!cachedServerClient) {
      cachedServerClient = createClient(supabaseUrl, serviceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }

    return {
      client: cachedServerClient,
      isConfigured: true,
      hasServiceRole,
    };
  } catch (err: any) {
    return {
      client: null,
      isConfigured: false,
      hasServiceRole: false,
      error: `Error al inicializar cliente Supabase: ${err?.message || 'Error desconocido'}`,
    };
  }
}
