import type { AgendaDTO, AgendaEventoDTO } from '@univille/shared';
import { useMemo, useState } from 'react';
import { Alerta, Carregando, Vazio } from '../components/Ui';
import { useApi } from '../lib/useApi';
import { DIAS_SEMANA, diaSemana, hojeLocal, horaBR, nomeMes } from '../lib/format';

// ----------------------------------------------------------------------

const PALETA = [
  { cor: '#347bb7', fundo: '#e3eef8' },
  { cor: '#00562b', fundo: '#e1efe6' },
  { cor: '#b8740a', fundo: '#fbefd9' },
  { cor: '#6a4c93', fundo: '#eee7f6' },
  { cor: '#b03a48', fundo: '#f8e4e7' },
  { cor: '#2b7a78', fundo: '#e0f1f0' },
];
const corTema = (id: number) => PALETA[(id - 1) % PALETA.length];

/** Agenda pública: calendário do mês escolhido + lista cronológica de todo o período. */
export default function Agenda() {
  const { dados, carregando, erro } = useApi<AgendaDTO>('/agenda');
  const [mesSel, setMesSel] = useState<string | null>(null);
  const [diaSel, setDiaSel] = useState<string | null>(null);
  const hoje = hojeLocal();

  const meses = dados?.meses ?? [];
  const mes = mesSel ?? meses[0];
  const porDia = useMemo(() => agruparPorDia(dados?.eventos ?? []), [dados]);
  const temas = useMemo(() => temasUsados(dados?.eventos ?? []), [dados]);
  const idx = meses.indexOf(mes);

  const trocarMes = (m: string) => {
    setMesSel(m);
    setDiaSel(null);
  };

  return (
    <>
      <section className="bg-[#4a3218] bg-[url(/bg.png)] bg-cover bg-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-[1120px] text-white [text-shadow:0_1px_12px_rgba(20,10,0,.5)]">
          <p className="text-[12px] tracking-[.12em] uppercase opacity-85">Setor de Eventos · Univille</p>
          <h1 className="mt-2 text-[clamp(28px,4.5vw,42px)] leading-[1.08] font-bold tracking-tight text-balance">
            Agenda de eventos institucionais
          </h1>
          <p className="mt-3 max-w-[52ch] text-[16px] opacity-95">
            Palestras, oficinas, congressos e solenidades. 
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1120px] gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {erro && <Alerta>{erro}</Alerta>}
        {carregando && !dados ? (
          <div className="cartao lg:col-span-2">
            <Carregando texto="Carregando a agenda…" />
          </div>
        ) : (
          dados && (
            <>
              <section className="cartao min-w-0" aria-label="Calendário">
                <div className="flex flex-wrap items-center gap-3 border-b border-linha bg-[#f5f5f5] px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <SetaMes
                      direcao="anterior"
                      disabled={idx <= 0}
                      onClick={() => trocarMes(meses[idx - 1])}
                    />
                    <div role="tablist" aria-label="Meses" className="flex overflow-hidden rounded-[3px] border border-[#ccc] bg-white">
                      {meses.map((m) => (
                        <button
                          key={m}
                          role="tab"
                          type="button"
                          aria-selected={m === mes}
                          onClick={() => trocarMes(m)}
                          className={`border-l border-[#ccc] px-3 py-1 text-[13px] first:border-l-0 ${
                            m === mes ? 'bg-uni font-bold text-white' : 'text-link hover:bg-[#f0f0f0]'
                          }`}
                        >
                          {nomeMes(m, false)}
                        </button>
                      ))}
                    </div>
                    <SetaMes
                      direcao="proximo"
                      disabled={idx >= meses.length - 1}
                      onClick={() => trocarMes(meses[idx + 1])}
                    />
                  </div>
                  <h2 className="text-[16px] font-bold">{nomeMes(mes)}</h2>
                  <div className="ml-auto flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[#666]">
                    {temas.map((t) => (
                      <span key={t.id} className="inline-flex items-center gap-1">
                        <i className="size-2.5 rounded-[2px]" style={{ background: corTema(t.id).cor }} />
                        {t.nome}
                      </span>
                    ))}
                  </div>
                </div>
                <Calendario
                  mes={mes}
                  hoje={hoje}
                  porDia={porDia}
                  diaSel={diaSel}
                  onDia={(d) => setDiaSel((atual) => (atual === d ? null : d))}
                />
              </section>

              <ListaEventos eventos={dados.eventos} meses={meses} diaSel={diaSel} limpar={() => setDiaSel(null)} />
            </>
          )
        )}
      </div>
    </>
  );
}

function SetaMes({ direcao, disabled, onClick }: { direcao: 'anterior' | 'proximo'; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direcao === 'anterior' ? 'Mês anterior' : 'Próximo mês'}
      className="grid size-7 place-items-center rounded-[3px] border border-[#ccc] bg-white text-link disabled:bg-[#f6f6f6] disabled:text-[#c4c4c4]"
    >
      {direcao === 'anterior' ? '‹' : '›'}
    </button>
  );
}

function Calendario({
  mes,
  hoje,
  porDia,
  diaSel,
  onDia,
}: {
  mes: string;
  hoje: string;
  porDia: Map<string, AgendaEventoDTO[]>;
  diaSel: string | null;
  onDia: (d: string) => void;
}) {
  const dias = diasDoCalendario(mes);
  return (
    <div className="grid grid-cols-7">
      {DIAS_SEMANA.map((d) => (
        <div key={d} className="border-b border-linha bg-[#fafafa] px-1.5 py-1.5 text-center text-[11px] font-bold tracking-wide text-[#777] uppercase sm:text-left">
          {d}
        </div>
      ))}
      {dias.map((d) => {
        const doMes = d.startsWith(mes);
        const eventos = doMes ? porDia.get(d) ?? [] : [];
        const passado = d < hoje;
        const ehHoje = d === hoje;
        const sel = d === diaSel;
        return (
          <button
            key={d}
            type="button"
            disabled={!doMes || eventos.length === 0}
            onClick={() => onDia(d)}
            aria-label={`${Number(d.slice(8))} de ${nomeMes(mes, false)}: ${eventos.length} evento(s)`}
            aria-pressed={sel}
            className={`flex min-h-[52px] min-w-0 flex-col items-stretch gap-0.5 border-r border-b border-[#ebebeb] p-1 text-left align-top nth-[7n]:border-r-0 sm:min-h-[92px] ${
              passado || !doMes ? 'bg-[#fafafa]' : 'bg-white'
            } ${ehHoje ? 'shadow-[inset_0_0_0_2px_var(--color-uni)]' : ''} ${
              sel ? 'bg-uni-claro' : eventos.length ? 'hover:bg-[#f5f8f6]' : ''
            } disabled:cursor-default`}
          >
            <span
              className={`w-max rounded-[2px] px-1 text-[12px] tabular-nums ${
                ehHoje ? 'bg-uni font-bold text-white' : !doMes ? 'text-[#c4c4c4]' : passado ? 'text-[#999]' : ''
              }`}
            >
              {Number(d.slice(8))}
            </span>
            {ehHoje && <span className="px-1 text-[9.5px] font-bold tracking-wider text-uni uppercase">hoje</span>}
            <span className="flex flex-wrap gap-0.5 sm:flex-col sm:flex-nowrap">
              {eventos.map((e) => {
                const c = corTema(e.tema.id);
                return (
                  <span key={e.id} title={`${horaBR(e.horaInicio)} · ${e.nome} · ${e.local}`} className="contents">
                    <span
                      className="hidden truncate rounded-[1px] border-l-[3px] px-1 py-0.5 text-[11px] leading-tight text-texto sm:block"
                      style={{ background: c.fundo, borderColor: c.cor }}
                    >
                      <b style={{ color: c.cor }}>{horaBR(e.horaInicio).replace('h00', 'h')}</b> {e.nome}
                    </span>
                    <span className="size-2 rounded-[2px] sm:hidden" style={{ background: c.cor }} />
                  </span>
                );
              })}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ListaEventos({
  eventos,
  meses,
  diaSel,
  limpar,
}: {
  eventos: AgendaEventoDTO[];
  meses: string[];
  diaSel: string | null;
  limpar: () => void;
}) {
  const visiveis = diaSel ? eventos.filter((e) => e.data === diaSel) : eventos;
  return (
    <section className="cartao min-w-0 self-start" aria-labelledby="titulo-lista">
      <div className="flex items-center gap-2 border-b border-linha bg-[#f5f5f5] px-4 py-2.5">
        <h2 id="titulo-lista" className="text-[16px] font-bold">
          {diaSel ? `Eventos em ${diaSel.split('-').reverse().slice(0, 2).join('/')}` : 'Próximos eventos'}
        </h2>
        {diaSel && (
          <button type="button" onClick={limpar} className="ml-auto text-[13px] text-link hover:underline">
            ver todos
          </button>
        )}
      </div>
      {visiveis.length === 0 ? (
        <Vazio titulo="Nenhum evento aprovado no período">Novos eventos aparecem aqui assim que são aprovados.</Vazio>
      ) : (
        <ol className="max-h-[720px] overflow-y-auto">
          {meses.map((m) => {
            const doMes = visiveis.filter((e) => e.data.startsWith(m));
            if (!doMes.length) return null;
            return (
              <li key={m}>
                {!diaSel && (
                  <p className="sticky top-0 border-y border-[#cfe1d6] bg-uni-claro px-4 py-1 text-[11px] font-bold tracking-[.08em] text-uni uppercase">
                    {nomeMes(m)}
                  </p>
                )}
                <ol>
                  {doMes.map((e) => (
                    <li key={e.id} className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 border-t border-[#ebebeb] px-4 py-3 first:border-t-0">
                      <div className="self-start border border-linha bg-white py-1 text-center">
                        <b className="block text-[18px] leading-none text-uni tabular-nums">{e.data.slice(8)}</b>
                        <span className="text-[10px] tracking-wide text-[#777] uppercase">{diaSemana(e.data)}</span>
                      </div>
                      <div className="grid min-w-0 gap-0.5 text-[13px] text-[#555]">
                        <b className="text-[14.5px] text-[#222]">{e.nome}</b>
                        <span className="flex items-center gap-1.5">
                          <i className="size-2 shrink-0 rounded-[2px]" style={{ background: corTema(e.tema.id).cor }} />
                          {e.tema.nome} · {horaBR(e.horaInicio)} às {horaBR(e.horaFim)}
                        </span>
                        <span>Local: {e.local}</span>
                        <span>Palestrante: {e.palestrante}</span>
                        <span>Realização: {e.realizacao}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

// ----------------------------------------------------------------------

function agruparPorDia(eventos: AgendaEventoDTO[]) {
  const mapa = new Map<string, AgendaEventoDTO[]>();
  for (const e of eventos) mapa.set(e.data, [...(mapa.get(e.data) ?? []), e]);
  return mapa;
}

function temasUsados(eventos: AgendaEventoDTO[]) {
  const vistos = new Map<number, string>();
  for (const e of eventos) vistos.set(e.tema.id, e.tema.nome);
  return Array.from(vistos, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
}

/** Semanas completas (domingo a sábado) que cobrem o mês. */
function diasDoCalendario(mes: string) {
  const [a, m] = mes.split('-').map(Number);
  const primeiro = new Date(Date.UTC(a, m - 1, 1));
  const inicio = new Date(primeiro);
  inicio.setUTCDate(1 - primeiro.getUTCDay());
  const ultimo = new Date(Date.UTC(a, m, 0));
  const fim = new Date(ultimo);
  fim.setUTCDate(ultimo.getUTCDate() + (6 - ultimo.getUTCDay()));
  const dias: string[] = [];
  for (const d = new Date(inicio); d <= fim; d.setUTCDate(d.getUTCDate() + 1)) {
    dias.push(d.toISOString().slice(0, 10));
  }
  return dias;
}
