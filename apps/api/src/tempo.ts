/**
 * Horários são "de parede" (hora local da Univille, sem fuso). Guardamos no Postgres
 * em `timestamp` sem fuso e trafegamos como texto: data 'YYYY-MM-DD' e hora 'HH:mm'.
 * Internamente a Date é montada em UTC só como contêiner, sem nenhuma conversão.
 */
export const FUSO_UNIVILLE = 'America/Sao_Paulo';

export function paraDate(data: string, hora: string): Date {
  return new Date(`${data}T${hora}:00.000Z`);
}

export function dataDe(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function horaDe(d: Date): string {
  return d.toISOString().slice(11, 16);
}

/** Data de hoje em Joinville/São Bento do Sul, 'YYYY-MM-DD'. */
export function hojeLocal(agora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_UNIVILLE }).format(agora);
}

/** Meses do período da agenda pública a partir do mês atual: ['2026-10', '2026-11', ...]. */
export function mesesDoPeriodo(quantidade: number, hoje = hojeLocal()): string[] {
  const [ano, mes] = hoje.split('-').map(Number);
  return Array.from({ length: quantidade }, (_, i) => {
    const d = new Date(Date.UTC(ano, mes - 1 + i, 1));
    return d.toISOString().slice(0, 7);
  });
}

/** Primeiro instante do mês seguinte ao último mês da lista. */
export function fimDoPeriodo(meses: string[]): Date {
  const [ano, mes] = meses[meses.length - 1].split('-').map(Number);
  return new Date(Date.UTC(ano, mes, 1));
}
