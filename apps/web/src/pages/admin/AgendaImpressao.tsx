import {
  STATUS_LABEL,
  type OpcoesDTO,
  type RelatorioLinhaDTO,
  type Status,
} from '@univille/shared';
import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button, classesBotao } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Alerta, Carregando } from '../../components/Ui';
import { dataBR } from '../../lib/format';
import { useApi } from '../../lib/useApi';

// ----------------------------------------------------------------------

/**
 * Relatório imprimível no modelo do setor de Eventos: faixa verde com título e período,
 * tabela em colunas e a marca Univille no rodapé. Sem status no filtro, imprime só os aprovados.
 */
export default function AgendaImpressao() {
  const [params] = useSearchParams();
  const filtros = new URLSearchParams(Array.from(params).filter(([, v]) => v));
  if (!filtros.get('status')) filtros.set('status', 'APROVADO');
  const { dados, carregando, erro } = useApi<RelatorioLinhaDTO[]>(`/admin/relatorios?${filtros}`);
  const opcoes = useApi<OpcoesDTO>('/opcoes');

  const de = params.get('de');
  const ate = params.get('ate');
  const status = filtros.get('status') as Status;
  const curso = opcoes.dados?.cursos.find((c) => String(c.id) === params.get('cursoId'))?.nome;
  const tema = opcoes.dados?.temas.find((t) => String(t.id) === params.get('temaId'))?.nome;

  useEffect(() => {
    document.title = `Agenda de eventos ${periodo(de, ate)} · Univille`;
    return () => {
      document.title = 'Univille Eventos';
    };
  }, [de, ate]);

  return (
    <div className="min-h-full bg-[#e9e9e7] px-3 py-4 print:bg-white print:p-0">
      <style>{'@page { size: A4 landscape; margin: 10mm; }'}</style>

      <div className="mx-auto mb-3 flex max-w-[1100px] flex-wrap items-center gap-2 print:hidden">
        <Link
          to={`/admin/relatorios?${params}`}
          className={`${classesBotao('padrao')} no-underline`}
        >
          <Icon nome="voltar" className="size-4" /> Voltar aos relatórios
        </Link>
        <span className="text-[13px] text-suave">
          Clique em Imprimir / Salvar PDF para salvar o arquivo
        </span>
        <Button
          variante="primario"
          className="ml-auto"
          onClick={() => window.print()}
          disabled={!dados}
        >
          Imprimir / salvar PDF
        </Button>
      </div>

      <article className="mx-auto max-w-[1100px] bg-white shadow-[0_1px_6px_rgba(0,0,0,.15)] print:max-w-none print:shadow-none">
        <header className="bg-[#2f6b3a] px-6 py-4 text-center text-white [print-color-adjust:exact]">
          <h1 className="text-[24px] leading-tight font-bold">Agenda de eventos</h1>
          <p className="text-[20px] leading-tight font-bold">Univille campus São Bento do Sul</p>
          <p className="mt-1 text-[14px] opacity-95">{periodo(de, ate)}</p>
        </header>

        <div className="px-6 pt-5 pb-2">
          {(curso || tema || status !== 'APROVADO') && (
            <p className="mb-2 text-[12.5px] text-[#555]">
              {[
                curso && `Realização: ${curso}`,
                tema && `Tema: ${tema}`,
                status !== 'APROVADO' && `Situação: ${STATUS_LABEL[status]}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          {erro && <Alerta>{erro}</Alerta>}
          {carregando && !dados ? (
            <Carregando texto="Montando o relatório…" />
          ) : dados && dados.length === 0 ? (
            <p className="py-10 text-center text-[15px] text-[#555]">
              Nenhum evento no período selecionado.
            </p>
          ) : (
            dados && (
              <table className="w-full border-collapse text-[12.5px] leading-snug [&_td]:border [&_td]:border-[#555] [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-middle [&_th]:border [&_th]:border-[#555] [&_th]:bg-[#f0f0f0] [&_th]:px-2 [&_th]:py-1.5 [&_th]:[print-color-adjust:exact]">
                <thead>
                  <tr>
                    <th className="w-[19%]">Evento</th>
                    <th className="w-[12%]">Tema</th>
                    <th className="w-[9%]">Data</th>
                    <th className="w-[7%]">Horário</th>
                    <th className="w-[11%]">Local</th>
                    <th className="w-[15%]">Público alvo</th>
                    <th className="w-[13%]">Palestrante</th>
                    <th className="w-[14%]">Realização</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map((e) => (
                    <tr key={e.id} className="break-inside-avoid">
                      <td>{e.nome}</td>
                      <td className="text-center">{e.tema || '-'}</td>
                      <td className="text-center whitespace-nowrap tabular-nums">
                        {dataBR(e.data)}
                      </td>
                      <td className="text-center whitespace-nowrap tabular-nums">
                        {horaCurta(e.horaInicio)}
                      </td>
                      <td className="text-center">{e.local}</td>
                      <td className="text-center">{e.publicoAlvo || '-'}</td>
                      <td className="text-center">{e.palestrante || '-'}</td>
                      <td className="text-center">{e.curso}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>

        <footer className="flex flex-col items-center gap-1 px-6 pt-4 pb-6">
          <span role="img" aria-label="Univille" className="logo-verde h-[42px] w-[188px]" />
          {dados && dados.length > 0 && (
            <span className="text-[11px] text-[#777]">
              {dados.length} evento(s) · emitido em {new Date().toLocaleDateString('pt-BR')}
            </span>
          )}
        </footer>
      </article>
    </div>
  );
}

// ----------------------------------------------------------------------

function periodo(de: string | null, ate: string | null) {
  if (de && ate) return `Período de ${dataBR(de)} a ${dataBR(ate)}`;
  if (de) return `A partir de ${dataBR(de)}`;
  if (ate) return `Até ${dataBR(ate)}`;
  return 'Todos os períodos';
}

/** '19:00' → '19h', '14:30' → '14h30' (como na agenda do setor). */
const horaCurta = (h: string) => (h ? h.replace(':00', 'h').replace(':', 'h') : '-');
