import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { exigirSessao } from '@/lib/auth-guard';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await exigirSessao();
  if ('erro' in guard) return guard.erro;

  const { id } = await params;
  const { quem_retirou } = await request.json();

  const { data: encomendaAtual, error: erroBusca } = await supabaseAdmin
    .from('encomendas')
    .select('id, status, funcionarios ( nome )')
    .eq('id', id)
    .maybeSingle();

  if (erroBusca || !encomendaAtual) {
    return NextResponse.json({ error: 'Encomenda não encontrada.' }, { status: 404 });
  }

  const funcionario = encomendaAtual.funcionarios as unknown as { nome: string } | null;
  const nomeRetirante = (quem_retirou?.trim?.() || funcionario?.nome || 'Destinatário') as string;

  const { data, error } = await supabaseAdmin
    .from('encomendas')
    .update({ status: 'retirado', quem_retirou: nomeRetirante, retirado_em: new Date().toISOString() })
    .eq('id', id)
    .select('id, created_at, quem_recebeu, status, numero_nota, foto_url, quem_retirou, funcionarios ( nome, whatsapp, setor )')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    created_at: data.created_at,
    quem_recebeu: data.quem_recebeu,
    status: data.status,
    numero_nota: data.numero_nota ?? undefined,
    foto_preview: data.foto_url ?? undefined,
    quem_retirou: data.quem_retirou ?? undefined,
    funcionarios: data.funcionarios,
  });
}
