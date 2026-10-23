import { ACOES, STATUS_LABEL, type Acao, type Status } from '@univille/shared';

/** Quem está agindo em relação à solicitação. */
export type Contexto = { status: Status; ehAutor: boolean; ehAdmin: boolean };

type Regra = { de: Status[]; quem: (c: Contexto) => boolean; para: Status | null };

/**
 * Única fonte de verdade do ciclo de vida (caderno, seção 5).
 * Rotas e telas nunca decidem sozinhas; perguntam aqui.
 */
const REGRAS: Record<Acao, Regra[]> = {
  editar: [
    { de: ['RASCUNHO', 'AGUARDANDO', 'REJEITADO'], quem: (c) => c.ehAutor, para: null },
    { de: ['APROVADO'], quem: (c) => c.ehAdmin, para: null },
  ],
  enviar: [{ de: ['RASCUNHO', 'REJEITADO'], quem: (c) => c.ehAutor, para: 'AGUARDANDO' }],
  cancelar: [
    { de: ['AGUARDANDO'], quem: (c) => c.ehAutor || c.ehAdmin, para: 'CANCELADO' },
    { de: ['APROVADO'], quem: (c) => c.ehAdmin, para: 'CANCELADO' },
  ],
  excluir: [{ de: ['RASCUNHO'], quem: (c) => c.ehAutor, para: null }],
  aprovar: [{ de: ['AGUARDANDO'], quem: (c) => c.ehAdmin, para: 'APROVADO' }],
  rejeitar: [{ de: ['AGUARDANDO'], quem: (c) => c.ehAdmin, para: 'REJEITADO' }],
};

const VERBO: Record<Acao, string> = {
  editar: 'editar',
  enviar: 'enviar',
  cancelar: 'cancelar',
  excluir: 'excluir',
  aprovar: 'aprovar',
  rejeitar: 'rejeitar',
};

export type Veredito =
  | { permitido: true; para: Status | null }
  | { permitido: false; motivo: string; causa: 'estado' | 'permissao' };

export function verificar(acao: Acao, c: Contexto): Veredito {
  const regras = REGRAS[acao];
  const doEstado = regras.filter((r) => r.de.includes(c.status));
  if (doEstado.length === 0) {
    return {
      permitido: false,
      motivo: `Não é possível ${VERBO[acao]} uma solicitação com status “${STATUS_LABEL[c.status]}”.`,
      causa: 'estado',
    };
  }
  const regra = doEstado.find((r) => r.quem(c));
  if (!regra) {
    return {
      permitido: false,
      motivo: `Você não tem permissão para ${VERBO[acao]} esta solicitação.`,
      causa: 'permissao',
    };
  }
  return { permitido: true, para: regra.para };
}

export function acoesDisponiveis(c: Contexto): Acao[] {
  return ACOES.filter((a) => verificar(a, c).permitido);
}
