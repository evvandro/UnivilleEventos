/**
 * Proteção contra força bruta no login: conta só as tentativas ERRADAS.
 * - `maxPorConta` erros na janela, para o mesmo IP + matrícula, bloqueiam aquela conta naquele IP.
 * - `maxPorIp` erros na janela, do mesmo IP, bloqueiam o IP (tentativa em várias contas).
 *   Use 0 para desligar: numa rede com NAT (Wi-Fi da faculdade) todos saem pelo mesmo IP.
 * Login certo zera o contador da conta. Em memória: suficiente para uma instância única.
 */
export type ConfigTentativas = { maxPorConta: number; maxPorIp: number; janelaMs: number };

export const PADRAO: ConfigTentativas = { maxPorConta: 5, maxPorIp: 20, janelaMs: 15 * 60 * 1000 };

/** Lê LOGIN_MAX_POR_CONTA, LOGIN_MAX_POR_IP e LOGIN_JANELA_MIN do ambiente. */
export function configDoAmbiente(env = process.env): ConfigTentativas {
  const n = (v: string | undefined, padrao: number) =>
    v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : padrao;
  return {
    maxPorConta: n(env.LOGIN_MAX_POR_CONTA, PADRAO.maxPorConta),
    maxPorIp: n(env.LOGIN_MAX_POR_IP, PADRAO.maxPorIp),
    janelaMs: n(env.LOGIN_JANELA_MIN, PADRAO.janelaMs / 60000) * 60000,
  };
}

type Registro = { erros: number; desde: number };

export function criarControleDeTentativas(
  cfg: ConfigTentativas = PADRAO,
  agora: () => number = Date.now,
) {
  const registros = new Map<string, Registro>();

  const vigente = (chave: string) => {
    const r = registros.get(chave);
    if (r && agora() - r.desde > cfg.janelaMs) {
      registros.delete(chave);
      return undefined;
    }
    return r;
  };

  const chaves = (ip: string, conta: string) => [`conta:${ip}:${conta}`, `ip:${ip}`] as const;

  return {
    /** Milissegundos até liberar, ou 0 se pode tentar. */
    bloqueioRestante(ip: string, conta: string): number {
      const [porConta, porIp] = chaves(ip, conta);
      const limites: [string, number][] = [
        [porConta, cfg.maxPorConta],
        [porIp, cfg.maxPorIp],
      ];
      let restante = 0;
      for (const [chave, max] of limites) {
        if (max <= 0) continue; // limite desligado
        const r = vigente(chave);
        if (r && r.erros >= max) restante = Math.max(restante, cfg.janelaMs - (agora() - r.desde));
      }
      return restante;
    },
    registrarErro(ip: string, conta: string) {
      for (const chave of chaves(ip, conta)) {
        const r = vigente(chave);
        if (r) r.erros += 1;
        else registros.set(chave, { erros: 1, desde: agora() });
      }
    },
    registrarSucesso(ip: string, conta: string) {
      registros.delete(chaves(ip, conta)[0]);
    },
  };
}
