import { configuracaoSchema } from '@univille/shared';
import type { FastifyInstance } from 'fastify';
import { autenticar, exigirAdmin } from '../../auth';
import { definirMesesAgendaPublica, mesesAgendaPublica } from './service';

export async function configuracoesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', autenticar);
  app.addHook('preHandler', exigirAdmin);

  app.get('/admin/configuracoes', async () => ({ mesesAgendaPublica: await mesesAgendaPublica() }));

  app.put('/admin/configuracoes', async (req) => {
    const { mesesAgendaPublica: meses } = configuracaoSchema.parse(req.body);
    await definirMesesAgendaPublica(meses);
    return { mesesAgendaPublica: meses };
  });
}
