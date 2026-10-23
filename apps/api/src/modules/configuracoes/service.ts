import { MESES_AGENDA_MINIMO } from '@univille/shared';
import { prisma } from '../../db';

const CHAVE_MESES = 'meses_agenda_publica';

/** Meses exibidos na agenda pública (padrão do caderno: mês atual + 2 = 3). */
export async function mesesAgendaPublica(): Promise<number> {
  const c = await prisma.configuracao.findUnique({ where: { chave: CHAVE_MESES } });
  const n = Number(c?.valor);
  return Number.isInteger(n) && n >= MESES_AGENDA_MINIMO ? n : MESES_AGENDA_MINIMO;
}

export async function definirMesesAgendaPublica(n: number) {
  await prisma.configuracao.upsert({
    where: { chave: CHAVE_MESES },
    create: { chave: CHAVE_MESES, valor: String(n) },
    update: { valor: String(n) },
  });
}
