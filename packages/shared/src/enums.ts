export const STATUS = ['RASCUNHO', 'AGUARDANDO', 'APROVADO', 'REJEITADO', 'CANCELADO'] as const;
export type Status = (typeof STATUS)[number];

export const STATUS_LABEL: Record<Status, string> = {
  RASCUNHO: 'Rascunho',
  AGUARDANDO: 'Aguardando aprovação',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
  CANCELADO: 'Cancelado',
};

export const PERFIS = ['SOLICITANTE', 'ADMIN'] as const;
export type Perfil = (typeof PERFIS)[number];

export const PERFIL_LABEL: Record<Perfil, string> = {
  SOLICITANTE: 'Solicitante',
  ADMIN: 'Administrador',
};

/** Ações sobre uma solicitação. A API decide quais estão disponíveis em cada estado. */
export const ACOES = ['editar', 'enviar', 'cancelar', 'excluir', 'aprovar', 'rejeitar'] as const;
export type Acao = (typeof ACOES)[number];

/** Mínimo exigido pelo caderno: mês atual + 2. */
export const MESES_AGENDA_MINIMO = 3;
export const MESES_AGENDA_MAXIMO = 12;
