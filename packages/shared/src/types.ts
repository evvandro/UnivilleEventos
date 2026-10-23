import type { Acao, Perfil, Status } from './enums';

export type Ref = { id: number; nome: string };

export type UsuarioSessao = { id: number; matricula: string; nome: string; email: string; perfil: Perfil };

export type UsuarioDTO = UsuarioSessao & { ativo: boolean; criadoEm: string };

export type CentroCustoDTO = { id: number; codigo: string; descricao: string };
export type CursoDTO = { id: number; nome: string; centroCustoId: number; centroCusto: CentroCustoDTO };
export type AmbienteDTO = { id: number; nome: string; capacidade: number | null; recursos: Ref[] };

export type HistoricoDTO = {
  de: Status | null;
  para: Status;
  usuario: string;
  motivo: string | null;
  criadoEm: string;
};

export type SolicitacaoDTO = {
  id: number;
  status: Status;
  nome: string | null;
  tema: Ref | null;
  data: string | null;
  horaInicio: string | null;
  horaFim: string | null;
  ambiente: Ref | null;
  curso: (Ref & { centroCusto: CentroCustoDTO }) | null;
  solicitanteNome: string | null;
  palestrante: string | null;
  publicoAlvo: string | null;
  justificativa: string | null;
  objetivo: string | null;
  cerimonial: boolean | null;
  haveraInscricoes: boolean | null;
  necessitaDeclaracoes: boolean | null;
  recursos: Ref[];
  observacoes: string | null;
  motivoRejeicao: string | null;
  autor: Ref;
  enviadoEm: string | null;
  atualizadoEm: string;
  /** Ações que o usuário logado pode executar agora (calculado no servidor). */
  acoes: Acao[];
  historico?: HistoricoDTO[];
};

export type ContagemStatus = Record<Status, number>;

export type AgendaEventoDTO = {
  id: number;
  nome: string;
  tema: Ref;
  data: string;
  horaInicio: string;
  horaFim: string;
  local: string;
  palestrante: string;
  publicoAlvo: string;
  realizacao: string;
};

export type AgendaDTO = { meses: string[]; eventos: AgendaEventoDTO[] };

export type OpcoesDTO = {
  temas: Ref[];
  cursos: CursoDTO[];
  ambientes: AmbienteDTO[];
};

export type RelatorioLinhaDTO = {
  id: number;
  nome: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  tema: string;
  curso: string;
  centroCusto: string;
  local: string;
  solicitante: string;
  palestrante: string;
  publicoAlvo: string;
  status: Status;
};

export type ApiErro = { message: string; campos?: Record<string, string> };
