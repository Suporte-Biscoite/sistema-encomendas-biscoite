import { NextResponse } from 'next/server';
import { obterSessao } from './session';

type ResultadoGuard = { sessao: { id: string } } | { erro: NextResponse };

export async function exigirSessao(): Promise<ResultadoGuard> {
  const sessao = await obterSessao();
  if (!sessao) {
    return { erro: NextResponse.json({ error: 'Não autenticado. Faça login novamente.' }, { status: 401 }) };
  }
  return { sessao };
}
