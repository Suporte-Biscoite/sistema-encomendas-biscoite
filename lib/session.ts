import { cookies } from 'next/headers';
import crypto from 'crypto';

const COOKIE_NAME = 'biscoite_sessao';
const DURACAO_SEGUNDOS = 60 * 60 * 12; // 12 horas

function obterSegredo(): string {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo) {
    throw new Error('Configure SESSION_SECRET nas variáveis de ambiente (.env.local ou Vercel).');
  }
  return segredo;
}

function assinar(valor: string): string {
  const hmac = crypto.createHmac('sha256', obterSegredo()).update(valor).digest('hex');
  return `${valor}.${hmac}`;
}

function verificarAssinatura(valorAssinado: string): string | null {
  const posicao = valorAssinado.lastIndexOf('.');
  if (posicao === -1) return null;

  const valor = valorAssinado.slice(0, posicao);
  const assinaturaRecebida = valorAssinado.slice(posicao + 1);
  const assinaturaEsperada = crypto.createHmac('sha256', obterSegredo()).update(valor).digest('hex');

  const bufferRecebido = Buffer.from(assinaturaRecebida);
  const bufferEsperado = Buffer.from(assinaturaEsperada);
  if (bufferRecebido.length !== bufferEsperado.length) return null;
  if (!crypto.timingSafeEqual(bufferRecebido, bufferEsperado)) return null;

  return valor;
}

export async function criarSessao(usuarioId: string): Promise<void> {
  const payload = JSON.stringify({ id: usuarioId, exp: Date.now() + DURACAO_SEGUNDOS * 1000 });
  const valorCodificado = Buffer.from(payload, 'utf8').toString('base64url');

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, assinar(valorCodificado), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DURACAO_SEGUNDOS,
  });
}

export async function destruirSessao(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function obterSessao(): Promise<{ id: string } | null> {
  const cookieStore = await cookies();
  const bruto = cookieStore.get(COOKIE_NAME)?.value;
  if (!bruto) return null;

  const valorCodificado = verificarAssinatura(bruto);
  if (!valorCodificado) return null;

  try {
    const payload = JSON.parse(Buffer.from(valorCodificado, 'base64url').toString('utf8')) as {
      id: string;
      exp: number;
    };
    if (payload.exp < Date.now()) return null;
    return { id: payload.id };
  } catch {
    return null;
  }
}
