import { STATUS } from '@univille/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { autenticar, exigirAdmin } from '../../auth';
import { prisma } from '../../db';
import { criarSolicitacoesService } from './service';

const idParam = z.object({ id: z.coerce.number().int().positive() });
const filtroAdmin = z.object({ status: z.enum(STATUS).optional() });

export async function solicitacoesRoutes(app: FastifyInstance) {
  const service = criarSolicitacoesService(prisma);

  app.register(async (r) => {
    r.addHook('preHandler', autenticar);

    r.get('/solicitacoes', (req) => service.listarMinhas(req.usuario));
    r.post('/solicitacoes', async (req, reply) =>
      reply.status(201).send(await service.criar(req.usuario, req.body)),
    );
    r.get('/solicitacoes/:id', (req) => service.obter(req.usuario, idParam.parse(req.params).id));
    r.put('/solicitacoes/:id', (req) =>
      service.atualizar(req.usuario, idParam.parse(req.params).id, req.body),
    );
    r.delete('/solicitacoes/:id', async (req, reply) => {
      await service.excluir(req.usuario, idParam.parse(req.params).id);
      return reply.status(204).send();
    });
    r.post('/solicitacoes/:id/enviar', (req) =>
      service.enviar(req.usuario, idParam.parse(req.params).id),
    );
    r.post('/solicitacoes/:id/cancelar', (req) =>
      service.cancelar(req.usuario, idParam.parse(req.params).id),
    );
  });

  app.register(async (r) => {
    r.addHook('preHandler', autenticar);
    r.addHook('preHandler', exigirAdmin);

    r.get('/admin/solicitacoes', (req) =>
      service.listarParaAdmin(req.usuario, filtroAdmin.parse(req.query).status),
    );
    r.get('/admin/solicitacoes/contagem', () => service.contagem());
    r.post('/admin/solicitacoes/:id/aprovar', (req) =>
      service.aprovar(req.usuario, idParam.parse(req.params).id),
    );
    r.post('/admin/solicitacoes/:id/rejeitar', (req) =>
      service.rejeitar(req.usuario, idParam.parse(req.params).id, req.body),
    );
  });
}
