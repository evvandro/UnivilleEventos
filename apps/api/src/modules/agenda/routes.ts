import type { AgendaDTO } from '@univille/shared';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../../db';
import { dataDe, fimDoPeriodo, horaDe, mesesDoPeriodo } from '../../tempo';
import { mesesAgendaPublica } from '../configuracoes/service';

/** Agenda pública: só APROVADOS, do mês atual até o fim do período configurado. */
export async function agendaRoutes(app: FastifyInstance) {
  app.get('/agenda', async (): Promise<AgendaDTO> => {
    const meses = mesesDoPeriodo(await mesesAgendaPublica());
    const eventos = await prisma.solicitacao.findMany({
      where: {
        status: 'APROVADO',
        inicio: { gte: new Date(`${meses[0]}-01T00:00:00.000Z`), lt: fimDoPeriodo(meses) },
      },
      include: { tema: true, ambiente: true, curso: true },
      orderBy: [{ inicio: 'asc' }, { nome: 'asc' }],
    });
    return {
      meses,
      eventos: eventos.map((e) => ({
        id: e.id,
        nome: e.nome!,
        tema: { id: e.tema!.id, nome: e.tema!.nome },
        data: dataDe(e.inicio!),
        horaInicio: horaDe(e.inicio!),
        horaFim: horaDe(e.fim!),
        local: e.ambiente!.nome,
        palestrante: e.palestrante!,
        publicoAlvo: e.publicoAlvo!,
        realizacao: e.curso!.nome,
      })),
    };
  });
}
