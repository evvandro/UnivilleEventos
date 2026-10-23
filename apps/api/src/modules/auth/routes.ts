import { loginSchema } from '@univille/shared';
import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { autenticar, gravarSessao, limparSessao } from '../../auth';
import { prisma } from '../../db';
import { AppError } from '../../erros';
import { configDoAmbiente, criarControleDeTentativas } from './tentativas';

/** Hash fixo para comparar quando a matrícula não existe: o tempo de resposta não revela contas. */
const HASH_FALSO = bcrypt.hashSync('senha-que-ninguem-usa', 10);

export async function authRoutes(app: FastifyInstance) {
  const tentativas = criarControleDeTentativas(configDoAmbiente());

  app.post('/auth/login', async (req, reply) => {
    const { matricula, senha } = loginSchema.parse(req.body);
    const espera = tentativas.bloqueioRestante(req.ip, matricula);
    if (espera > 0) {
      reply.header('Retry-After', Math.ceil(espera / 1000));
      throw new AppError(
        429,
        `Muitas tentativas de login sem sucesso. Tente novamente em ${Math.ceil(espera / 60000)} minuto(s).`,
      );
    }
    const u = await prisma.usuario.findUnique({ where: { matricula } });
    const senhaOk = await bcrypt.compare(senha, u?.senhaHash ?? HASH_FALSO);
    if (!u || !senhaOk) {
      tentativas.registrarErro(req.ip, matricula);
      throw new AppError(401, 'Matrícula ou senha incorretas.');
    }
    if (!u.ativo) throw new AppError(403, 'Usuário desativado. Procure o setor de Eventos.');
    tentativas.registrarSucesso(req.ip, matricula);
    const sessao = { id: u.id, matricula: u.matricula, nome: u.nome, email: u.email, perfil: u.perfil };
    gravarSessao(reply, app, sessao);
    return sessao;
  });

  app.post('/auth/logout', async (_req, reply) => {
    limparSessao(reply);
    return { ok: true };
  });

  app.get('/auth/me', { preHandler: autenticar }, async (req) => req.usuario);
}
