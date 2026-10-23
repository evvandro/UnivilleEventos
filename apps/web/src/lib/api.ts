import type { ApiErro } from '@univille/shared';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public campos: Record<string, string> = {},
  ) {
    super(message);
  }
}

/** Chama a API (mesma origem; o cookie httpOnly da sessão vai junto). */
export async function api<T = unknown>(
  caminho: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  let resp: Response;
  try {
    resp = await fetch(`/api${caminho}`, {
      method: opts.method ?? 'GET',
      credentials: 'include',
      headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique sua conexão.');
  }
  if (resp.status === 204) return undefined as T;
  const dados = (await resp.json().catch(() => ({}))) as T & ApiErro;
  if (!resp.ok) {
    if (resp.status === 401 && caminho !== '/auth/me' && caminho !== '/auth/login') {
      window.dispatchEvent(new Event('sessao-expirada'));
    }
    throw new ApiError(resp.status, dados.message ?? 'Algo deu errado. Tente novamente.', dados.campos);
  }
  return dados;
}

export const mensagemDe = (e: unknown) =>
  e instanceof Error ? e.message : 'Algo deu errado. Tente novamente.';
