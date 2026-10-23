import type { Prisma, StatusSolicitacao } from '@prisma/client';
import {
  relatorioFiltroSchema,
  STATUS_LABEL,
  type RelatorioFiltro,
  type RelatorioLinhaDTO,
} from '@univille/shared';
import type { FastifyInstance } from 'fastify';
import { autenticar, exigirAdmin } from '../../auth';
import { prisma } from '../../db';
import { dataDe, horaDe, paraDate } from '../../tempo';

/** Consulta única usada pela tela e pelo CSV: os dois sempre trazem os mesmos registros. */
async function consultar(f: RelatorioFiltro): Promise<RelatorioLinhaDTO[]> {
  const where: Prisma.SolicitacaoWhereInput = {
    status: f.status ? (f.status as StatusSolicitacao) : { not: 'RASCUNHO' },
    data: {
      ...(f.de ? { gte: paraDate(f.de, '00:00') } : {}),
      ...(f.ate ? { lte: paraDate(f.ate, '00:00') } : {}),
    },
    ...(f.cursoId ? { cursoId: f.cursoId } : {}),
    ...(f.temaId ? { temaId: f.temaId } : {}),
  };
  const itens = await prisma.solicitacao.findMany({
    where,
    include: { tema: true, ambiente: true, curso: { include: { centroCusto: true } } },
    orderBy: [{ inicio: 'asc' }, { id: 'asc' }],
  });
  return itens.map((s) => ({
    id: s.id,
    nome: s.nome ?? '',
    data: s.data ? dataDe(s.data) : '',
    horaInicio: s.inicio ? horaDe(s.inicio) : '',
    horaFim: s.fim ? horaDe(s.fim) : '',
    tema: s.tema?.nome ?? '',
    curso: s.curso?.nome ?? '',
    centroCusto: s.curso ? `${s.curso.centroCusto.codigo} - ${s.curso.centroCusto.descricao}` : '',
    local: s.ambiente?.nome ?? '',
    solicitante: s.solicitanteNome ?? '',
    palestrante: s.palestrante ?? '',
    publicoAlvo: s.publicoAlvo ?? '',
    status: s.status,
  }));
}

const COLUNAS: [keyof RelatorioLinhaDTO, string][] = [
  ['nome', 'Evento'],
  ['data', 'Data'],
  ['horaInicio', 'Horário inicial'],
  ['horaFim', 'Horário final'],
  ['tema', 'Tema'],
  ['curso', 'Curso/Coordenação'],
  ['centroCusto', 'Centro de custo'],
  ['local', 'Local'],
  ['solicitante', 'Solicitante'],
  ['status', 'Status'],
];

/** Escapa ';', aspas e quebras de linha e neutraliza fórmulas de planilha (CSV injection). */
function celula(valor: string) {
  const v = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return /[";\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
const dataBR = (d: string) => (d ? d.split('-').reverse().join('/') : '');

export async function relatoriosRoutes(app: FastifyInstance) {
  app.addHook('preHandler', autenticar);
  app.addHook('preHandler', exigirAdmin);

  app.get('/admin/relatorios', async (req) => consultar(relatorioFiltroSchema.parse(req.query)));

  /** CSV com ';' e BOM UTF-8 para abrir direto no Excel em pt-BR. */
  app.get('/admin/relatorios/csv', async (req, reply) => {
    const linhas = await consultar(relatorioFiltroSchema.parse(req.query));
    const corpo = [
      COLUNAS.map(([, t]) => t).join(';'),
      ...linhas.map((l) =>
        COLUNAS.map(([k]) => {
          const v = String(l[k]);
          if (k === 'data') return celula(dataBR(v));
          if (k === 'status') return celula(STATUS_LABEL[l.status]);
          return celula(v);
        }).join(';'),
      ),
    ].join('\r\n');
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="relatorio-eventos.csv"')
      .send('﻿' + corpo);
  });
}
