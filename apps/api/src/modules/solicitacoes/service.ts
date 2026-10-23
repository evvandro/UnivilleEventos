import type { Prisma } from '@prisma/client';
import {
  errosPorCampo,
  rejeitarSchema,
  solicitacaoEnvioSchema,
  solicitacaoRascunhoSchema,
  STATUS,
  type Acao,
  type ContagemStatus,
  type SolicitacaoDTO,
  type SolicitacaoPayload,
  type Status,
  type UsuarioSessao,
} from '@univille/shared';
import type { Db } from '../../db';
import { AppError, ehViolacaoDeConflito, naoEncontrado } from '../../erros';
import { dataDe, hojeLocal, horaDe, paraDate } from '../../tempo';
import { buscarConflito, mensagemConflito } from './conflito';
import { acoesDisponiveis, verificar, type Contexto } from './transicoes';

const INCLUDE = {
  tema: true,
  ambiente: true,
  curso: { include: { centroCusto: true } },
  recursos: { include: { recurso: true }, orderBy: { recurso: { nome: 'asc' } } },
  autor: true,
} satisfies Prisma.SolicitacaoInclude;

type Registro = Prisma.SolicitacaoGetPayload<{ include: typeof INCLUDE }>;

/** Namespace da trava consultiva por ambiente (pg_advisory_xact_lock(namespace, ambienteId)). */
const TRAVA_AMBIENTE = 4201;
type Tx = Prisma.TransactionClient;

/**
 * Módulo de solicitações: toda regra de estado, validação e conflito mora aqui.
 * As rotas só traduzem HTTP para estas chamadas.
 */
export function criarSolicitacoesService(db: Db) {
  const contexto = (s: { status: Status; autorId: number }, ator: UsuarioSessao): Contexto => ({
    status: s.status,
    ehAutor: s.autorId === ator.id,
    ehAdmin: ator.perfil === 'ADMIN',
  });

  function exigir(acao: Acao, s: { status: Status; autorId: number }, ator: UsuarioSessao) {
    const c = contexto(s, ator);
    // Quem não é autor nem admin não descobre nem o status da solicitação alheia (como no GET).
    if (!c.ehAutor && !c.ehAdmin) throw naoEncontrado('Solicitação');
    // Admin não age sobre rascunho alheio (rascunho é privado do autor).
    if (!c.ehAutor && s.status === 'RASCUNHO') throw naoEncontrado('Solicitação');
    const v = verificar(acao, c);
    if (!v.permitido) throw new AppError(v.causa === 'permissao' ? 403 : 409, v.motivo);
    return v.para;
  }

  function paraDTO(s: Registro, ator: UsuarioSessao): SolicitacaoDTO {
    return {
      id: s.id,
      status: s.status,
      nome: s.nome,
      tema: s.tema && { id: s.tema.id, nome: s.tema.nome },
      data: s.data && dataDe(s.data),
      horaInicio: s.inicio && horaDe(s.inicio),
      horaFim: s.fim && horaDe(s.fim),
      ambiente: s.ambiente && { id: s.ambiente.id, nome: s.ambiente.nome },
      curso: s.curso && { id: s.curso.id, nome: s.curso.nome, centroCusto: s.curso.centroCusto },
      solicitanteNome: s.solicitanteNome,
      palestrante: s.palestrante,
      publicoAlvo: s.publicoAlvo,
      justificativa: s.justificativa,
      objetivo: s.objetivo,
      cerimonial: s.cerimonial,
      haveraInscricoes: s.haveraInscricoes,
      necessitaDeclaracoes: s.necessitaDeclaracoes,
      recursos: s.recursos.map((r) => ({ id: r.recurso.id, nome: r.recurso.nome })),
      observacoes: s.observacoes,
      motivoRejeicao: s.motivoRejeicao,
      autor: { id: s.autor.id, nome: s.autor.nome },
      enviadoEm: s.enviadoEm?.toISOString() ?? null,
      atualizadoEm: s.atualizadoEm.toISOString(),
      acoes: acoesDisponiveis(contexto(s, ator)),
    };
  }

  function paraPayload(s: Registro): SolicitacaoPayload {
    const dto = paraDTO(s, { id: 0, matricula: '', nome: '', email: '', perfil: 'SOLICITANTE' });
    return {
      nome: dto.nome,
      temaId: dto.tema?.id ?? null,
      data: dto.data,
      horaInicio: dto.horaInicio,
      horaFim: dto.horaFim,
      ambienteId: dto.ambiente?.id ?? null,
      cursoId: dto.curso?.id ?? null,
      solicitanteNome: dto.solicitanteNome,
      palestrante: dto.palestrante,
      publicoAlvo: dto.publicoAlvo,
      justificativa: dto.justificativa,
      objetivo: dto.objetivo,
      cerimonial: dto.cerimonial,
      haveraInscricoes: dto.haveraInscricoes,
      necessitaDeclaracoes: dto.necessitaDeclaracoes,
      recursoIds: dto.recursos.map((r) => r.id),
      observacoes: dto.observacoes,
    };
  }

  /** Valida o payload: parcial (rascunho) ou completo (envio). */
  function validar(body: unknown, completo: boolean): SolicitacaoPayload {
    const r = (completo ? solicitacaoEnvioSchema : solicitacaoRascunhoSchema).safeParse(body);
    if (!r.success) {
      throw new AppError(
        400,
        completo
          ? 'Preencha os campos obrigatórios destacados antes de enviar.'
          : 'Confira os campos destacados.',
        errosPorCampo(r.error),
      );
    }
    const p = r.data as SolicitacaoPayload;
    if ((p.horaInicio || p.horaFim) && !p.data) {
      throw new AppError(400, 'Confira os campos destacados.', {
        data: 'Informe a data para guardar os horários',
      });
    }
    if (p.horaInicio && p.horaFim && p.horaFim <= p.horaInicio) {
      throw new AppError(400, 'Confira os campos destacados.', {
        horaFim: 'O término deve ser depois do início',
      });
    }
    if (completo && p.data! < hojeLocal()) {
      throw new AppError(400, 'Confira os campos destacados.', {
        data: 'A data precisa ser hoje ou uma data futura',
      });
    }
    return p;
  }

  /** Recursos marcados precisam estar disponíveis no ambiente escolhido. */
  async function validarRecursos(tx: Tx, p: SolicitacaoPayload) {
    if (!p.recursoIds.length) return;
    if (!p.ambienteId) {
      throw new AppError(400, 'Confira os campos destacados.', {
        recursoIds: 'Selecione o local antes de marcar recursos',
      });
    }
    const disponiveis = await tx.ambienteRecurso.findMany({
      where: { ambienteId: p.ambienteId, recursoId: { in: p.recursoIds } },
    });
    if (disponiveis.length !== new Set(p.recursoIds).size) {
      throw new AppError(400, 'Confira os campos destacados.', {
        recursoIds: 'Há recursos que não estão disponíveis neste local',
      });
    }
  }

  /**
   * Serializa por ambiente quem checa conflito e grava: sem isso, duas aprovações simultâneas
   * no mesmo local esperam uma pela outra na constraint EXCLUDE e o Postgres aborta uma com deadlock.
   * Com a trava, a segunda espera a primeira terminar e enxerga o evento já aprovado (409 com mensagem).
   */
  async function travarAmbiente(tx: Tx, ambienteId: number) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${TRAVA_AMBIENTE}::int, ${ambienteId}::int)::text AS ok`;
  }

  async function garantirSemConflito(tx: Tx, p: SolicitacaoPayload, ignorarId?: number) {
    await travarAmbiente(tx, p.ambienteId!);
    const conflito = await buscarConflito(tx, {
      ambienteId: p.ambienteId!,
      inicio: paraDate(p.data!, p.horaInicio!),
      fim: paraDate(p.data!, p.horaFim!),
      ignorarId,
    });
    if (conflito) throw new AppError(409, mensagemConflito(conflito));
  }

  function paraDados(p: SolicitacaoPayload) {
    return {
      nome: p.nome,
      temaId: p.temaId,
      data: p.data ? paraDate(p.data, '00:00') : null,
      inicio: p.data && p.horaInicio ? paraDate(p.data, p.horaInicio) : null,
      fim: p.data && p.horaFim ? paraDate(p.data, p.horaFim) : null,
      ambienteId: p.ambienteId,
      cursoId: p.cursoId,
      solicitanteNome: p.solicitanteNome,
      palestrante: p.palestrante,
      publicoAlvo: p.publicoAlvo,
      justificativa: p.justificativa,
      objetivo: p.objetivo,
      cerimonial: p.cerimonial,
      haveraInscricoes: p.haveraInscricoes,
      necessitaDeclaracoes: p.necessitaDeclaracoes,
      observacoes: p.observacoes,
    };
  }

  async function carregar(tx: Tx, id: number) {
    const s = await tx.solicitacao.findUnique({ where: { id }, include: INCLUDE });
    if (!s) throw naoEncontrado('Solicitação');
    return s;
  }

  /**
   * Trava a linha até o fim da transação (SELECT ... FOR UPDATE) e só então lê o status.
   * Duas transições concorrentes (ex.: autor editando enquanto o admin aprova) ficam em fila,
   * e a segunda revalida as regras sobre o estado já atualizado.
   */
  async function travar(tx: Tx, id: number) {
    await tx.$queryRaw`SELECT id FROM solicitacao WHERE id = ${id} FOR UPDATE`;
    return carregar(tx, id);
  }

  async function registrarHistorico(
    tx: Tx,
    p: { id: number; de: Status | null; para: Status; ator: UsuarioSessao; motivo?: string },
  ) {
    await tx.historicoStatus.create({
      data: { solicitacaoId: p.id, de: p.de, para: p.para, usuarioId: p.ator.id, motivo: p.motivo },
    });
  }

  /**
   * Executa a transação traduzindo a violação da constraint de conflito (rede final do banco)
   * em mensagem com o evento conflitante. `fn` informa o payload validado via `usar`.
   */
  async function comGarantiaDeConflito<T>(
    id: number,
    fn: (tx: Tx, usar: (p: SolicitacaoPayload) => SolicitacaoPayload) => Promise<T>,
  ) {
    let payload: SolicitacaoPayload | null = null;
    try {
      return await db.$transaction((tx) => fn(tx, (p) => (payload = p)));
    } catch (e) {
      if (!ehViolacaoDeConflito(e)) throw e;
      const p = payload as SolicitacaoPayload | null;
      if (p?.ambienteId && p.data && p.horaInicio && p.horaFim) {
        await garantirSemConflito(db, p, id);
      }
      throw new AppError(
        409,
        'Conflito de agenda: já existe um evento aprovado neste local e horário.',
      );
    }
  }

  return {
    async listarMinhas(ator: UsuarioSessao) {
      const itens = await db.solicitacao.findMany({
        where: { autorId: ator.id },
        include: INCLUDE,
        orderBy: { atualizadoEm: 'desc' },
      });
      return itens.map((s) => paraDTO(s, ator));
    },

    async listarParaAdmin(ator: UsuarioSessao, status?: Status) {
      const [itens, grupos] = await Promise.all([
        db.solicitacao.findMany({
          where: status ? { status } : { status: { not: 'RASCUNHO' } },
          include: INCLUDE,
          orderBy: [{ inicio: 'asc' }, { id: 'asc' }],
        }),
        db.solicitacao.groupBy({ by: ['status'], _count: true }),
      ]);
      const contagem = Object.fromEntries(STATUS.map((s) => [s, 0])) as ContagemStatus;
      for (const g of grupos) contagem[g.status] = g._count;
      return { itens: itens.map((s) => paraDTO(s, ator)), contagem };
    },

    async obter(ator: UsuarioSessao, id: number) {
      const s = await db.solicitacao.findUnique({
        where: { id },
        include: {
          ...INCLUDE,
          historico: { include: { usuario: true }, orderBy: { criadoEm: 'asc' } },
        },
      });
      if (!s) throw naoEncontrado('Solicitação');
      const podeVer = s.autorId === ator.id || (ator.perfil === 'ADMIN' && s.status !== 'RASCUNHO');
      if (!podeVer) throw naoEncontrado('Solicitação');
      return {
        ...paraDTO(s, ator),
        historico: s.historico.map((h) => ({
          de: h.de,
          para: h.para,
          usuario: h.usuario.nome,
          motivo: h.motivo,
          criadoEm: h.criadoEm.toISOString(),
        })),
      };
    },

    async criar(ator: UsuarioSessao, body: unknown) {
      const p = validar(body, false);
      return db.$transaction(async (tx) => {
        await validarRecursos(tx, p);
        const s = await tx.solicitacao.create({
          data: {
            ...paraDados(p),
            autorId: ator.id,
            recursos: { create: p.recursoIds.map((recursoId) => ({ recursoId })) },
          },
        });
        await registrarHistorico(tx, { id: s.id, de: null, para: 'RASCUNHO', ator });
        return paraDTO(await carregar(tx, s.id), ator);
      });
    },

    /** Rascunho e rejeitado aceitam dados parciais; aguardando e aprovado exigem tudo válido. */
    async atualizar(ator: UsuarioSessao, id: number, body: unknown) {
      return comGarantiaDeConflito(id, async (tx, usar) => {
        const atual = await travar(tx, id);
        exigir('editar', atual, ator);
        // Controle de concorrência otimista: quem editou a partir de uma versão antiga
        // não sobrescreve, em silêncio, o que outra pessoa salvou nesse meio-tempo.
        const versao = (body as { versao?: unknown } | null)?.versao;
        if (typeof versao === 'string' && versao !== atual.atualizadoEm.toISOString()) {
          throw new AppError(
            409,
            'Esta solicitação foi alterada por outra pessoa enquanto você editava. Recarregue a página para ver a versão atual.',
          );
        }
        const completo = atual.status === 'AGUARDANDO' || atual.status === 'APROVADO';
        const p = usar(validar(body, completo));
        await validarRecursos(tx, p);
        if (completo) await garantirSemConflito(tx, p, id);
        await tx.solicitacaoRecurso.deleteMany({ where: { solicitacaoId: id } });
        await tx.solicitacao.update({
          where: { id },
          data: {
            ...paraDados(p),
            recursos: { create: p.recursoIds.map((recursoId) => ({ recursoId })) },
          },
        });
        return paraDTO(await carregar(tx, id), ator);
      });
    },

    async enviar(ator: UsuarioSessao, id: number) {
      return db.$transaction(async (tx) => {
        const atual = await travar(tx, id);
        const para = exigir('enviar', atual, ator)!;
        const p = validar(paraPayload(atual), true);
        await validarRecursos(tx, p);
        await garantirSemConflito(tx, p);
        await tx.solicitacao.update({
          where: { id },
          data: { status: para, enviadoEm: new Date(), motivoRejeicao: null },
        });
        await registrarHistorico(tx, { id, de: atual.status, para, ator });
        return paraDTO(await carregar(tx, id), ator);
      });
    },

    async cancelar(ator: UsuarioSessao, id: number) {
      return db.$transaction(async (tx) => {
        const atual = await travar(tx, id);
        const para = exigir('cancelar', atual, ator)!;
        await tx.solicitacao.update({ where: { id }, data: { status: para } });
        await registrarHistorico(tx, { id, de: atual.status, para, ator });
        return paraDTO(await carregar(tx, id), ator);
      });
    },

    async excluir(ator: UsuarioSessao, id: number) {
      await db.$transaction(async (tx) => {
        const atual = await travar(tx, id);
        exigir('excluir', atual, ator);
        await tx.solicitacao.delete({ where: { id } });
      });
    },

    /**
     * Revalida tudo no momento da aprovação: o conflito (outro evento pode ter sido aprovado
     * depois do envio), a data (pode ter passado) e os recursos (o local pode ter mudado).
     */
    async aprovar(ator: UsuarioSessao, id: number) {
      return comGarantiaDeConflito(id, async (tx, usar) => {
        const atual = await travar(tx, id);
        const para = exigir('aprovar', atual, ator)!;
        if (atual.data && dataDe(atual.data) < hojeLocal()) {
          throw new AppError(
            409,
            'A data deste evento já passou. Rejeite a solicitação ou ajuste a data antes de aprovar.',
          );
        }
        let p: SolicitacaoPayload;
        try {
          p = usar(validar(paraPayload(atual), true));
          await validarRecursos(tx, p);
        } catch (e) {
          // Na fila não há campos para destacar: explica o motivo ao admin.
          if (!(e instanceof AppError) || e.status !== 400) throw e;
          const motivo = Object.values(e.campos ?? {})[0] ?? e.message;
          throw new AppError(
            409,
            `Não é possível aprovar: ${motivo.toLowerCase()}. Rejeite e peça o ajuste ao solicitante.`,
          );
        }
        await garantirSemConflito(tx, p, id);
        await tx.solicitacao.update({ where: { id }, data: { status: para } });
        await registrarHistorico(tx, { id, de: atual.status, para, ator });
        return paraDTO(await carregar(tx, id), ator);
      });
    },

    async rejeitar(ator: UsuarioSessao, id: number, body: unknown) {
      const { motivo } = rejeitarSchema.parse(body);
      return db.$transaction(async (tx) => {
        const atual = await travar(tx, id);
        const para = exigir('rejeitar', atual, ator)!;
        await tx.solicitacao.update({
          where: { id },
          data: { status: para, motivoRejeicao: motivo },
        });
        await registrarHistorico(tx, { id, de: atual.status, para, ator, motivo });
        return paraDTO(await carregar(tx, id), ator);
      });
    },

    /** Só a contagem por status (para o contador do menu do admin). */
    async contagem(): Promise<ContagemStatus> {
      const grupos = await db.solicitacao.groupBy({ by: ['status'], _count: true });
      const contagem = Object.fromEntries(STATUS.map((st) => [st, 0])) as ContagemStatus;
      for (const g of grupos) contagem[g.status] = g._count;
      return contagem;
    },
  };
}
