import type { ContagemStatus, SolicitacaoDTO, Status } from '@univille/shared';
import { useEffect, useState } from 'react';
import { Button, LinkBotao } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Abas, Alerta, Carregando, PageHeader, Vazio } from '../../components/Ui';
import { dataBR, diaSemana, faixaHorario } from '../../lib/format';
import { useApi } from '../../lib/useApi';
import { DetalheCampos, Historico, linhasDetalhe } from '../solicitacoes/Form';
import { useAcoes } from '../solicitacoes/useAcoes';

// ----------------------------------------------------------------------

const ABAS: { valor: Exclude<Status, 'RASCUNHO'>; rotulo: string }[] = [
  { valor: 'AGUARDANDO', rotulo: 'Aguardando' },
  { valor: 'APROVADO', rotulo: 'Aprovados' },
  { valor: 'REJEITADO', rotulo: 'Rejeitados' },
  { valor: 'CANCELADO', rotulo: 'Cancelados' },
];

/** Fila do administrador: lista por status à esquerda, detalhe e ações à direita. */
export default function Fila() {
  const [status, setStatus] = useState<Exclude<Status, 'RASCUNHO'>>('AGUARDANDO');
  const lista = useApi<{ itens: SolicitacaoDTO[]; contagem: ContagemStatus }>(
    `/admin/solicitacoes?status=${status}`,
  );
  const [selId, setSelId] = useState<number | null>(null);
  const itens = lista.dados?.itens ?? [];
  const sel = itens.find((i) => i.id === selId) ?? itens[0];
  const detalhe = useApi<SolicitacaoDTO>(sel ? `/solicitacoes/${sel.id}` : null);
  const { pedir, modal } = useAcoes(() => {
    lista.recarregar();
    setSelId(null);
  });

  useEffect(() => setSelId(null), [status]);

  return (
    <>
      <PageHeader
        titulo="Fila de aprovação"
        migalhas={[{ rotulo: 'Administração' }, { rotulo: 'Fila de aprovação' }]}
        subtitulo="Aprovar publica o evento na agenda."
      />
      <div className="border-b border-linha">
        <Abas
          rotuloAcessivel="Status"
          ativo={status}
          onChange={setStatus}
          itens={ABAS.map((a) => ({
            ...a,
            contagem: lista.dados?.contagem[a.valor],
            destaque: a.valor === 'AGUARDANDO',
          }))}
        />
      </div>
      {lista.erro && <Alerta>{lista.erro}</Alerta>}

      <div className="grid gap-4 border border-t-0 border-linha bg-white p-3 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="min-w-0">
          {lista.carregando && !lista.dados ? (
            <Carregando />
          ) : itens.length === 0 ? (
            <Vazio titulo="Nada por aqui">
              {status === 'AGUARDANDO'
                ? 'Nenhuma solicitação aguardando análise.'
                : 'Nenhuma solicitação neste status.'}
            </Vazio>
          ) : (
            <ul className="grid gap-[3px] rounded-[3px] border border-[#357ebd] bg-[#428bca] p-1">
              {itens.map((s) => {
                const ativo = s.id === sel?.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelId(s.id)}
                      aria-current={ativo}
                      className={`grid w-full gap-0.5 px-3 py-2.5 text-left ${ativo ? 'bg-[#eaf2fb] shadow-[inset_3px_0_0_#005f36]' : 'bg-white hover:bg-[#f7fafd]'}`}
                    >
                      <span className="truncate text-[14px] font-bold text-link uppercase">
                        {s.nome}
                      </span>
                      <span className="text-[12.5px] text-suave">
                        {s.data && `${diaSemana(s.data)} ${dataBR(s.data)}`} ·{' '}
                        {faixaHorario(s.horaInicio, s.horaFim)}
                      </span>
                      <span className="text-[12.5px] text-suave">
                        {s.ambiente?.nome} · {s.solicitanteNome}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="min-w-0">
          {sel && (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="mr-auto text-[18px] font-bold">{sel.nome}</h2>
                <StatusBadge status={sel.status} />
              </div>
              <div className="flex flex-wrap gap-2">
                {sel.acoes.includes('aprovar') && (
                  <Button variante="sucesso" onClick={() => pedir('aprovar', sel)}>
                    Aprovar e publicar
                  </Button>
                )}
                {sel.acoes.includes('rejeitar') && (
                  <Button variante="perigo" onClick={() => pedir('rejeitar', sel)}>
                    Rejeitar
                  </Button>
                )}
                {sel.acoes.includes('editar') && (
                  <LinkBotao to={`/solicitacoes/${sel.id}`}>Editar evento</LinkBotao>
                )}
                {sel.acoes.includes('cancelar') && (
                  <Button
                    variante="fantasma"
                    className="text-[#a94442]"
                    onClick={() => pedir('cancelar', sel)}
                  >
                    {sel.status === 'APROVADO' ? 'Cancelar evento' : 'Cancelar solicitação'}
                  </Button>
                )}
              </div>
              <DetalheCampos
                linhas={linhasDetalhe(detalhe.dados?.id === sel.id ? detalhe.dados : sel)}
              />
              {detalhe.dados?.id === sel.id && <Historico s={detalhe.dados} />}
            </div>
          )}
        </div>
      </div>
      {modal}
    </>
  );
}
