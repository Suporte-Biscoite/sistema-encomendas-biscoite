import { createClient } from '@supabase/supabase-js';

// ATENÇÃO: este client usa a SERVICE ROLE KEY, que ignora RLS.
// Só pode ser importado em código que roda no servidor
// (Route Handlers em app/api/**). NUNCA importar isso em
// componentes com 'use client'.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente (.env.local ou Vercel).'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});
