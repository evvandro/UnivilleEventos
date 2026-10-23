import { STATUS, type SolicitacaoDTO, type Status } from '@univille/shared';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button, LinkBotao } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { StatusBadge } from '../../components/StatusBadge';
import { Abas, Alerta, Carregando, PageHeader, Vazio } from '../../components/Ui';
import { dataBR, faixaHorario } from '../../lib/format';
import { useApi } from '../../lib/useApi';
import { useAcoes } from './useAcoes';

// ----------------------------------------------------------------------

type Filtro = 'TODAS' | Status;

const ROTULO_ABA: Record<Filtro, string> = {
  TODAS: 'Todas',
  RASCUNHO: 'Rascunhos',
  AGUARDANDO: 'Aguardando',
  REJEITADO: 'Rejeitadas',
  APROVADO: 'Aprovadas',
  CANCELADO: 'Canceladas',
};

export default function MinhasSolicitacoes() {
  const { dados, carregando, erro, recarregar } = useApi<SolicitacaoDTO[]>('/solicitacoes');
  const [filtro, setFiltro] = useState<Filtro>('TODAS');
  const { pedir, modal, errosEnvio } = useAcoes(() => recarregar());

  const lista = dados ?? [];
  const contagem = (f: Filtro) =>
    f === 'TODAS' ? lista.length : lista.filter((s) => s.status === f).length;
  const visiveis = filtro === 'TODAS' ? lista : lista.filter((s) => s.status === filtro);
  const rejeitadas = lista.filter((s) => s.status === 'REJEITADO');

  return (
    <>
      <PageHeader
        titulo="Minhas solicitações"
        migalhas={[{ rotulo: 'Minhas solicitações' }]}
        subtitulo="Acompanhe o andamento dos eventos que você pediu ao setor de Eventos."
        acoes={
          <LinkBotao to="/solicitacoes/nova" variante="primario">
            <Icon nome="mais" className="size-4" /> Nova solicitação
          </LinkBotao>
        }
      />

      {errosEnvio && (
        <div className="mb-4">
          <Alerta>
            {errosEnvio.message} Abra a solicitação para completar os campos que faltam.
          </Alerta>
        </div>
      )}

      {rejeitadas.length > 0 && (
        <div className="mb-4">
          <Alerta tipo="aviso">
            <b>
              {rejeitadas.length === 1
                ? '1 solicitação foi rejeitada'
                : `${rejeitadas.length} solicitações foram rejeitadas`}
              .
            </b>{' '}
            Veja o motivo, corrija e reenvie.
          </Alerta>
        </div>
      )}

      <div className="border-b border-linha">
        <Abas
          rotuloAcessivel="Filtrar por status"
          ativo={filtro}
          onChange={setFiltro}
          itens={(['TODAS', ...STATUS] as Filtro[]).map((f) => ({
            valor: f,
            rotulo: ROTULO_ABA[f],
            contagem: contagem(f),
            cor: f === 'REJEITADO' ? 'bg-perigo' : undefined,
          }))}
        />
      </div>

      <section className="cartao border-t-0">
        {erro && (
          <div className="p-4">
            <Alerta>{erro}</Alerta>
          </div>
        )}
        {carregando && !dados ? (
          <Carregando />
        ) : visiveis.length === 0 ? (
          <Vazio
            titulo={
              filtro === 'TODAS'
                ? 'Você ainda não fez nenhuma solicitação'
                : `Nenhuma solicitação em “${ROTULO_ABA[filtro]}”`
            }
          >
            {filtro === 'TODAS' && (
              <Link to="/solicitacoes/nova">Criar a primeira solicitação</Link>
            )}
          </Vazio>
        ) : (
          <ul>
            {visiveis.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#ebebeb] px-4 py-3 first:border-t-0"
              >
                <div className="grid min-w-[220px] flex-1 gap-0.5">
                  <Link
                    to={`/solicitacoes/${s.id}`}
                    className="truncate text-[15px] font-bold uppercase"
                  >
                    {s.nome ?? 'Solicitação sem nome'}
                  </Link>
                  <span className="text-[13px] text-suave">
                    {dataBR(s.data)} · {faixaHorario(s.horaInicio, s.horaFim)} ·{' '}
                    {s.ambiente?.nome ?? 'sem local'}
                  </span>
                  {s.status === 'REJEITADO' && s.motivoRejeicao && (
                    <span className="text-[13px] text-[#a94442]">Motivo: {s.motivoRejeicao}</span>
                  )}
                </div>
                <StatusBadge status={s.status} />
                <div className="flex flex-wrap gap-1.5">
                  {s.acoes.includes('editar') ? (
                    <LinkBotao to={`/solicitacoes/${s.id}`} tamanho="sm">
                      {s.status === 'REJEITADO' ? 'Corrigir' : 'Editar'}
                    </LinkBotao>
                  ) : (
                    <LinkBotao to={`/solicitacoes/${s.id}`} tamanho="sm">
                      Ver
                    </LinkBotao>
                  )}
                  {s.acoes.includes('enviar') && (
                    <Button tamanho="sm" variante="primario" onClick={() => pedir('enviar', s)}>
                      {s.status === 'REJEITADO' ? 'Reenviar' : 'Enviar'}
                    </Button>
                  )}
                  {s.acoes.includes('cancelar') && (
                    <Button
                      tamanho="sm"
                      variante="fantasma"
                      className="text-[#a94442]"
                      onClick={() => pedir('cancelar', s)}
                    >
                      Cancelar
                    </Button>
                  )}
                  {s.acoes.includes('excluir') && (
                    <Button
                      tamanho="sm"
                      variante="fantasma"
                      className="text-[#a94442]"
                      onClick={() => pedir('excluir', s)}
                    >
                      Excluir
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {modal}
    </>
  );
}
