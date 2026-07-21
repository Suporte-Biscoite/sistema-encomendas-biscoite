import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { exigirSessao } from '@/lib/auth-guard';

const BUCKET = 'encomendas-fotos';
const TAMANHO_MAXIMO_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(request: NextRequest) {
  const guard = await exigirSessao();
  if ('erro' in guard) return guard.erro;

  const formData = await request.formData();
  const arquivo = formData.get('arquivo');

  if (!(arquivo instanceof File)) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return NextResponse.json({ error: 'Arquivo maior que 8MB.' }, { status: 400 });
  }
  if (!arquivo.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Envie apenas arquivos de imagem.' }, { status: 400 });
  }

  const extensao = arquivo.name.split('.').pop() || 'jpg';
  const nomeArquivo = `${randomUUID()}.${extensao}`;
  const bytes = Buffer.from(await arquivo.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(nomeArquivo, bytes, { contentType: arquivo.type, upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(nomeArquivo);
  return NextResponse.json({ url: data.publicUrl });
}
