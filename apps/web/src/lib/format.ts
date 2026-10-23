const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** 'YYYY-MM-DD' → '06/11/2026' */
export const dataBR = (d: string | null | undefined) => (d ? d.split('-').reverse().join('/') : '—');

/** 'YYYY-MM-DD' → '06/11' */
export const diaMes = (d: string) => d.slice(8, 10) + '/' + d.slice(5, 7);

/** '19:00' → '19h00' */
export const horaBR = (h: string | null | undefined) => (h ? h.replace(':', 'h') : '—');

export const faixaHorario = (i: string | null, f: string | null) =>
  i && f ? `${horaBR(i)} às ${horaBR(f)}` : '—';

/** '2026-11' → 'Novembro 2026' */
export function nomeMes(mes: string, comAno = true) {
  const [a, m] = mes.split('-').map(Number);
  const n = MESES[m - 1];
  return (n[0].toUpperCase() + n.slice(1)) + (comAno ? ` ${a}` : '');
}

export const diaSemana = (d: string) => DIAS[new Date(`${d}T12:00:00Z`).getUTCDay()];

export const DIAS_SEMANA = DIAS;

/** Hoje no fuso da Univille, 'YYYY-MM-DD'. */
export const hojeLocal = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

export const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-Z]/.test(p))
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';
