import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { criarSessao } from '@/lib/session';

export async function POST(request: NextRequest) {
  const { usuario, senha } = await request.json();

  if (!usuario || !senha) {
    return NextResponse.json({ error: 'Informe usuário e senha.' }, { status: 400 });
  }

  const { data: conta } = await supabaseAdmin
    .from('usuarios_sistema')
    .select('id, nome, usuario, senha_hash')
    .eq('usuario', usuario)
    .maybeSingle();

  // Mensagem genérica de propósito: não revelar se o erro foi no usuário ou na senha
  const credenciaisInvalidas = () =>
    NextResponse.json({ error: 'Usuário ou senha incorretos.' }, { status: 401 });

  if (!conta) return credenciaisInvalidas();

  const senhaConfere = await bcrypt.compare(senha, conta.senha_hash);
  if (!senhaConfere) return credenciaisInvalidas();

  await criarSessao(conta.id);

  return NextResponse.json({ id: conta.id, nome: conta.nome, usuario: conta.usuario });
}
