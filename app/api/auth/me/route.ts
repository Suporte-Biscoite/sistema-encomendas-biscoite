import { NextResponse } from 'next/server';
import { obterSessao } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) {
    return NextResponse.json({ usuario: null });
  }

  const { data: conta } = await supabaseAdmin
    .from('usuarios_sistema')
    .select('id, nome, usuario')
    .eq('id', sessao.id)
    .maybeSingle();

  return NextResponse.json({ usuario: conta ?? null });
}
