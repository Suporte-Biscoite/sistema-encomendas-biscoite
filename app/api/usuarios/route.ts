import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { exigirSessao } from '@/lib/auth-guard';

export async function GET() {
  const guard = await exigirSessao();
  if ('erro' in guard) return guard.erro;

  const { data, error } = await supabaseAdmin
    .from('usuarios_sistema')
    .select('id, nome, usuario') // nunca retornar senha_hash
    .order('nome', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const guard = await exigirSessao();
  if ('erro' in guard) return guard.erro;

  const { nome, usuario, senha } = await request.json();

  if (!nome || !usuario || !senha) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
  }
  if (senha.length < 4) {
    return NextResponse.json({ error: 'A senha deve ter ao menos 4 caracteres.' }, { status: 400 });
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  const { data, error } = await supabaseAdmin
    .from('usuarios_sistema')
    .insert({ nome, usuario, senha_hash: senhaHash })
    .select('id, nome, usuario')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Já existe um usuário com esse login.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
