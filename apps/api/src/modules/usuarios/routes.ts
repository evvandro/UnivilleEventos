import type { Usuario } from '@prisma/client';
import { usuarioAtualizarSchema, usuarioCriarSchema, type UsuarioDTO } from '@univille/shared';
import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { autenticar, exigirAdmin } from '../../auth';
import { prisma } from '../../db';
import { AppError } from '../../erros';

const idParam = z.object({ id: z.coerce.number().int().positive() });

const paraDTO = (u: Usuario): UsuarioDTO => ({
  id: u.id,
  matricula: u.matricula,
  nome: u.nome,
  email: u.email,
  perfil: u.perfil,
  ativo: u.ativo,
  criadoEm: u.criadoEm.toISOString(),
});

/** Usuários são desativados, nunca excluídos: o histórico das solicitações continua íntegro. */
export async function usuariosRoutes(app: FastifyInstance) {
  app.addHook('preHandler', autenticar);
  app.addHook('preHandler', exigirAdmin);

  app.get('/admin/usuarios', async () =>
    (await prisma.usuario.findMany({ orderBy: { nome: 'asc' } })).map(paraDTO),
  );

  app.post('/admin/usuarios', async (req, reply) => {
    const { senha, ...d } = usuarioCriarSchema.parse(req.body);
    const u = await prisma.usuario.create({
      data: { ...d, senhaHash: await bcrypt.hash(senha, 10) },
    });
    return reply.status(201).send(paraDTO(u));
  });

  app.put('/admin/usuarios/:id', async (req) => {
    const { id } = idParam.parse(req.params);
    const { senha, ...d } = usuarioAtualizarSchema.parse(req.body);
    if (id === req.usuario.id && (!d.ativo || d.perfil !== 'ADMIN')) {
      throw new AppError(
        409,
        'Você não pode desativar nem remover o perfil de administrador da sua própria conta.',
      );
    }
    const u = await prisma.usuario.update({
      where: { id },
      data: { ...d, ...(senha ? { senhaHash: await bcrypt.hash(senha, 10) } : {}) },
    });
    return paraDTO(u);
  });
}
