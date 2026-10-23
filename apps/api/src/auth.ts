import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import type { Perfil, UsuarioSessao } from '@univille/shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from './db';
import { AppError } from './erros';

export const COOKIE = 'univille_token';
const OITO_HORAS = 60 * 60 * 8;

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: number; perfil: Perfil };
    user: { sub: number; perfil: Perfil };
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    usuario: UsuarioSessao;
  }
}

export async function registrarAuth(app: FastifyInstance) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('Defina JWT_SECRET (mínimo de 16 caracteres) no ambiente.');
  }
  await app.register(cookie);
  await app.register(jwt, { secret, cookie: { cookieName: COOKIE, signed: false } });
}

export function gravarSessao(reply: FastifyReply, app: FastifyInstance, u: UsuarioSessao) {
  const token = app.jwt.sign({ sub: u.id, perfil: u.perfil }, { expiresIn: OITO_HORAS });
  reply.setCookie(COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
    maxAge: OITO_HORAS,
  });
}

export function limparSessao(reply: FastifyReply) {
  reply.clearCookie(COOKIE, { path: '/' });
}

/** preHandler: exige sessão válida de um usuário ativo e preenche req.usuario. */
export async function autenticar(req: FastifyRequest) {
  try {
    await req.jwtVerify();
  } catch {
    throw new AppError(401, 'Sua sessão expirou. Entre novamente.');
  }
  const u = await prisma.usuario.findUnique({ where: { id: req.user.sub } });
  if (!u || !u.ativo) throw new AppError(401, 'Sua sessão expirou. Entre novamente.');
  req.usuario = { id: u.id, matricula: u.matricula, nome: u.nome, email: u.email, perfil: u.perfil };
}

/** preHandler: exige perfil administrador (usar depois de autenticar). */
export async function exigirAdmin(req: FastifyRequest) {
  if (req.usuario?.perfil !== 'ADMIN') {
    throw new AppError(403, 'Área restrita a administradores.');
  }
}
