import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { exigirSessao } from '@/lib/auth-guard';
import { obterSessao } from '@/lib/session';

// Formato do funcionário aninhado como o Supabase retorna em um select com join
type FuncionarioAninhado = { nome: string; whatsapp: string | null; setor: string } | null;

function mapearEncomenda(linha: {
  id: string;
  created_at: string;
  quem_recebeu: string;
  status: string;
  numero_nota: string | null;
  foto_url: string | null;
  quem_retirou: string | null;
  funcionarios: FuncionarioAninhado;
}) {
  // Mantém o nome de campo "foto_preview" para não exigir mudanças no front-end existente.
  return {
    id: linha.id,
    created_at: linha.created_at,
    quem_recebeu: linha.quem_recebeu,
    status: linha.status,
    numero_nota: linha.numero_nota ?? undefined,
    foto_preview: linha.foto_url ?? undefined,
    quem_retirou: linha.quem_retirou ?? undefined,
    funcionarios: linha.funcionarios,
  };
}

export async function GET() {
  const sessao = await obterSessao();

  // Visitante do mural público não precisa (e não deve) receber o WhatsApp do funcionário.
  const camposFuncionario = sessao ? 'nome, whatsapp, setor' : 'nome, setor';

  const { data, error } = await supabaseAdmin
    .from('encomendas')
    .select(
      `id, created_at, quem_recebeu, status, numero_nota, foto_url, quem_retirou,
       funcionarios ( ${camposFuncionario} )`
    )
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map((linha) => mapearEncomenda(linha as never)));
}

export async function POST(request: NextRequest) {
  const guard = await exigirSessao();
  if ('erro' in guard) return guard.erro;

  const { destinatario_id, quem_recebeu, numero_nota, foto_url } = await request.json();

  if (!destinatario_id || !quem_recebeu) {
    return NextResponse.json({ error: 'Preencha os campos obrigatórios!' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('encomendas')
    .insert({
      destinatario_id,
      quem_recebeu_id: guard.sessao.id,
      quem_recebeu,
      numero_nota: numero_nota || null,
      foto_url: foto_url || null,
      status: 'recebido',
    })
    .select('id, created_at, quem_recebeu, status, numero_nota, foto_url, quem_retirou, funcionarios ( nome, whatsapp, setor )')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapearEncomenda(data as never), { status: 201 });
}
