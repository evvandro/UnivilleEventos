import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { registrarAuth } from './auth';
import { registrarTratamentoDeErros } from './erros';
import { agendaRoutes } from './modules/agenda/routes';
import { authRoutes } from './modules/auth/routes';
import { cadastrosRoutes } from './modules/cadastros/routes';
import { configuracoesRoutes } from './modules/configuracoes/routes';
import { opcoesRoutes } from './modules/opcoes/routes';
import { relatoriosRoutes } from './modules/relatorios/routes';
import { solicitacoesRoutes } from './modules/solicitacoes/routes';
import { usuariosRoutes } from './modules/usuarios/routes';

/** Build do front servido pela própria API em produção (um processo, uma porta). */
const WEB_DIST = fileURLToPath(new URL('../../web/dist', import.meta.url));

export async function criarApp() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? 'info' },
    // Atrás de um proxy (Caddy/Nginx), usa o IP real do cliente (X-Forwarded-For).
    trustProxy: process.env.TRUST_PROXY === 'true',
    bodyLimit: 1024 * 1024, // 1 MB: sobra para qualquer formulário do sistema
  });

  registrarTratamentoDeErros(app);
  await app.register(helmet, {
    // Front e API na mesma origem; React usa atributos style inline.
    contentSecurityPolicy: {
      directives: { 'style-src': ["'self'", "'unsafe-inline'"], 'img-src': ["'self'", 'data:'] },
    },
  });
  // Teto geral por IP (configurável). O login tem um limite próprio, bem menor.
  await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX ?? 300),
    timeWindow: '1 minute',
    errorResponseBuilder: (_req, ctx) => ({
      statusCode: 429,
      message: `Muitas requisições. Aguarde ${Math.ceil(ctx.ttl / 1000)} segundos e tente novamente.`,
    }),
  });
  await registrarAuth(app);

  await app.register(
    async (api) => {
      api.get('/health', async () => ({ ok: true }));
      await api.register(authRoutes);
      await api.register(agendaRoutes);
      await api.register(opcoesRoutes);
      await api.register(solicitacoesRoutes);
      await api.register(cadastrosRoutes);
      await api.register(usuariosRoutes);
      await api.register(relatoriosRoutes);
      await api.register(configuracoesRoutes);
    },
    { prefix: '/api' },
  );

  if (existsSync(WEB_DIST)) {
    await app.register(fastifyStatic, { root: WEB_DIST, wildcard: false });
    app.setNotFoundHandler((req, reply) => {
      if (req.method !== 'GET' || req.url.startsWith('/api')) {
        return reply.status(404).send({ message: 'Rota não encontrada.' });
      }
      return reply.sendFile('index.html');
    });
  } else {
    app.setNotFoundHandler((_req, reply) =>
      reply.status(404).send({ message: 'Rota não encontrada.' }),
    );
  }

  return app;
}
