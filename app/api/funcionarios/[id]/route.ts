import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { exigirSessao } from '@/lib/auth-guard';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await exigirSessao();
  if ('erro' in guard) return guard.erro;

  const { id } = await params;
  const { nome, setor, email, whatsapp } = await request.json();

  if (!nome || !setor || !email) {
    return NextResponse.json({ error: 'Preencha nome, setor e e-mail.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('funcionarios')
    .update({ nome, setor, email, whatsapp: whatsapp || null })
    .eq('id', id)
    .select('id, nome, setor, email, whatsapp')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await exigirSessao();
  if ('erro' in guard) return guard.erro;

  const { id } = await params;
  const { error } = await supabaseAdmin.from('funcionarios').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
