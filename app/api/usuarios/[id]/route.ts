import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { exigirSessao } from '@/lib/auth-guard';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await exigirSessao();
  if ('erro' in guard) return guard.erro;

  const { id } = await params;

  const { count } = await supabaseAdmin
    .from('usuarios_sistema')
    .select('id', { count: 'exact', head: true });

  if ((count ?? 0) <= 1) {
    return NextResponse.json(
      { error: 'O sistema precisa ter pelo menos 1 operador!' },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from('usuarios_sistema').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
