import type { Prisma } from '@prisma/client';
import { dataDe, horaDe } from '../../tempo';

export type Intervalo = { inicio: Date; fim: Date };

/** Intervalos semiabertos [inicio, fim): 19h–20h e 20h–21h não se sobrepõem. */
export function sobrepoe(a: Intervalo, b: Intervalo): boolean {
  return a.inicio < b.fim && b.inicio < a.fim;
}

type Cliente = Prisma.TransactionClient;

/** Evento APROVADO que ocupa o mesmo ambiente em horário sobreposto, se existir. */
export function buscarConflito(
  db: Cliente,
  p: { ambienteId: number; inicio: Date; fim: Date; ignorarId?: number },
) {
  return db.solicitacao.findFirst({
    where: {
      status: 'APROVADO',
      ambienteId: p.ambienteId,
      inicio: { lt: p.fim },
      fim: { gt: p.inicio },
      ...(p.ignorarId ? { NOT: { id: p.ignorarId } } : {}),
    },
    include: { ambiente: true },
    orderBy: { inicio: 'asc' },
  });
}

const hora = (d: Date) => horaDe(d).replace(':', 'h');
const dia = (d: Date) => dataDe(d).split('-').reverse().slice(0, 2).join('/');

export function mensagemConflito(c: {
  nome: string | null;
  inicio: Date | null;
  fim: Date | null;
  ambiente: { nome: string } | null;
}) {
  if (!c.inicio || !c.fim) return 'Conflito de agenda com um evento aprovado.';
  return (
    `Conflito de agenda: ${c.ambiente?.nome ?? 'o local'} já tem “${c.nome}” aprovado em ` +
    `${dia(c.inicio)}, das ${hora(c.inicio)} às ${hora(c.fim)}. Escolha outro horário ou local.`
  );
}
