import { STATUS, STATUS_LABEL, type OpcoesDTO, type RelatorioLinhaDTO } from '@univille/shared';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button, classesBotao } from '../../components/Button';
import { Field } from '../../components/Field';
import { Icon } from '../../components/Icon';
import { StatusBadge } from '../../components/StatusBadge';
import { Alerta, Carregando, PageHeader, Vazio } from '../../components/Ui';
import { dataBR, horaBR } from '../../lib/format';
import { useApi } from '../../lib/useApi';

const CHAVES = ['de', 'ate', 'cursoId', 'temaId', 'status'] as const;

/** Relatório com filtros individuais ou combinados; o CSV usa exatamente a mesma consulta. */
export default function Relatorios() {
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState(() => Object.fromEntries(CHAVES.map((k) => [k, params.get(k) ?? ''])) as Record<(typeof CHAVES)[number], string>);
  const opcoes = useApi<OpcoesDTO>('/opcoes');
  const qs = new URLSearchParams(Object.entries(Object.fromEntries(params)).filter(([, v]) => v)).toString();
  const { dados, carregando, erro } = useApi<RelatorioLinhaDTO[]>(`/admin/relatorios${qs ? `?${qs}` : ''}`);

  const filtrar = (e: FormEvent) => {
    e.preventDefault();
    setParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v)));
  };
  const limpar = () => {
    setForm({ de: '', ate: '', cursoId: '', temaId: '', status: '' });
    setParams({});
  };

  return (
    <>
      <PageHeader
        titulo="Relatórios"
        migalhas={[{ rotulo: 'Administração' }, { rotulo: 'Relatórios' }]}
        subtitulo="Eventos enviados ao setor. Os filtros funcionam sozinhos ou combinados."
      />
      <form onSubmit={filtrar} className="cartao mb-4 flex flex-wrap items-end gap-3 p-4">
        <Field id="f-de" rotulo="De" className="w-[150px]">
          <input id="f-de" type="date" className="campo" value={form.de} onChange={(e) => setForm({ ...form, de: e.target.value })} />
        </Field>
        <Field id="f-ate" rotulo="Até" className="w-[150px]">
          <input id="f-ate" type="date" className="campo" value={form.ate} onChange={(e) => setForm({ ...form, ate: e.target.value })} />
        </Field>
        <Field id="f-curso" rotulo="Curso/coordenação" className="w-[220px]">
          <select id="f-curso" className="campo" value={form.cursoId} onChange={(e) => setForm({ ...form, cursoId: e.target.value })}>
            <option value="">Todos</option>
            {opcoes.dados?.cursos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Field>
        <Field id="f-tema" rotulo="Tema" className="w-[170px]">
          <select id="f-tema" className="campo" value={form.temaId} onChange={(e) => setForm({ ...form, temaId: e.target.value })}>
            <option value="">Todos</option>
            {opcoes.dados?.temas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </Field>
        <Field id="f-status" rotulo="Situação" className="w-[190px]">
          <select id="f-status" className="campo" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="">Todas (exceto rascunho)</option>
            {STATUS.filter((s) => s !== 'RASCUNHO').map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </Field>
        <div className="flex gap-2">
          <Button type="submit" variante="primario">Filtrar</Button>
          <Button onClick={limpar}>Limpar</Button>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <a href={`/api/admin/relatorios/csv${qs ? `?${qs}` : ''}`} className={`${classesBotao('padrao')} no-underline`} download>
            <Icon nome="download" className="size-4" /> Exportar CSV {dados ? `(${dados.length})` : ''}
          </a>
          <Link
            to={`/admin/relatorios/agenda${qs ? `?${qs}` : ''}`}
            className={`${classesBotao('primario')} no-underline`}
            title="Modelo do setor de Eventos, pronto para imprimir ou salvar em PDF"
          >
            <Icon nome="relatorio" className="size-4" /> Agenda para impressão (PDF)
          </Link>
        </div>
      </form>

      <section className="cartao">
        {erro && <div className="p-4"><Alerta>{erro}</Alerta></div>}
        {carregando && !dados ? (
          <Carregando />
        ) : !dados?.length ? (
          <Vazio titulo="Nenhum evento encontrado">Ajuste os filtros e tente de novo.</Vazio>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela min-w-[980px]">
              <thead>
                <tr>
                  <th>Evento</th><th>Data</th><th>Horário</th><th>Tema</th><th>Curso/coordenação</th>
                  <th>Centro de custo</th><th>Local</th><th>Solicitante</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dados.map((l) => (
                  <tr key={l.id}>
                    <td className="font-bold">{l.nome}</td>
                    <td className="tabular-nums whitespace-nowrap">{dataBR(l.data)}</td>
                    <td className="tabular-nums whitespace-nowrap">{horaBR(l.horaInicio)}–{horaBR(l.horaFim)}</td>
                    <td>{l.tema}</td>
                    <td>{l.curso}</td>
                    <td className="whitespace-nowrap">{l.centroCusto.split(' - ')[0]}</td>
                    <td>{l.local}</td>
                    <td>{l.solicitante}</td>
                    <td><StatusBadge status={l.status} curto /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
