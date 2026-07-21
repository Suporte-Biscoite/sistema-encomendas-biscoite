import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { exigirSessao } from '@/lib/auth-guard';

export async function POST(request: NextRequest) {
  const guard = await exigirSessao();
  if ('erro' in guard) return guard.erro;

  const { itens } = await request.json();

  if (!Array.isArray(itens) || itens.length === 0) {
    return NextResponse.json({ error: 'Nenhum item para importar.' }, { status: 400 });
  }

  const registros = itens
    .filter((item) => item?.nome && item?.setor && item?.email)
    .map((item) => ({
      nome: String(item.nome).trim(),
      setor: String(item.setor).trim(),
      email: String(item.email).trim(),
      whatsapp: item.whatsapp ? String(item.whatsapp).trim() : null,
    }));

  if (registros.length === 0) {
    return NextResponse.json({ error: 'Nenhum registro válido encontrado.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from('funcionarios').insert(registros).select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ importados: data.length, itens: data }, { status: 201 });
}
