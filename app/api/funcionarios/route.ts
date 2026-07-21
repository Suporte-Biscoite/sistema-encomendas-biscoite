import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { exigirSessao } from '@/lib/auth-guard';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('funcionarios')
    .select('id, nome, setor, email, whatsapp')
    .order('nome', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const guard = await exigirSessao();
  if ('erro' in guard) return guard.erro;

  const { nome, setor, email, whatsapp } = await request.json();

  if (!nome || !setor || !email) {
    return NextResponse.json({ error: 'Preencha nome, setor e e-mail.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('funcionarios')
    .insert({ nome, setor, email, whatsapp: whatsapp || null })
    .select('id, nome, setor, email, whatsapp')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
