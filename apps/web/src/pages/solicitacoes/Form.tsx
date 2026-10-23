import {
  errosPorCampo,
  solicitacaoEnvioSchema,
  STATUS_LABEL,
  type OpcoesDTO,
  type SolicitacaoDTO,
  type SolicitacaoPayload,
} from '@univille/shared';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, LinkBotao } from '../../components/Button';
import { classeCampo, Field } from '../../components/Field';
import { SimNao } from '../../components/SimNao';
import { StatusBadge } from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import { Alerta, Carregando, PageHeader } from '../../components/Ui';
import { api, ApiError, mensagemDe } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { dataBR, faixaHorario, hojeLocal } from '../../lib/format';
import { useApi } from '../../lib/useApi';
import { useAcoes } from './useAcoes';

// ----------------------------------------------------------------------

type Valores = {
  nome: string;
  temaId: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  ambienteId: string;
  cursoId: string;
  solicitanteNome: string;
  palestrante: string;
  publicoAlvo: string;
  justificativa: string;
  objetivo: string;
  cerimonial: boolean | null;
  haveraInscricoes: boolean | null;
  necessitaDeclaracoes: boolean | null;
  recursoIds: number[];
  observacoes: string;
};

const VAZIO: Valores = {
  nome: '', temaId: '', data: '', horaInicio: '', horaFim: '', ambienteId: '', cursoId: '',
  solicitanteNome: '', palestrante: '', publicoAlvo: '', justificativa: '', objetivo: '',
  cerimonial: null, haveraInscricoes: null, necessitaDeclaracoes: null, recursoIds: [], observacoes: '',
};

/** Nova solicitação, edição (rascunho, pendente, rejeitada, aprovada pelo admin) e visualização. */
export default function FormSolicitacao() {
  const { id } = useParams();
  const ehNova = !id;
  const opcoes = useApi<OpcoesDTO>('/opcoes');
  const sol = useApi<SolicitacaoDTO>(ehNova ? null : `/solicitacoes/${id}`);

  if (opcoes.erro || sol.erro) return <Alerta>{opcoes.erro ?? sol.erro}</Alerta>;
  if (!opcoes.dados || (!ehNova && !sol.dados)) return <Carregando />;

  const s = sol.dados;
  if (s && !s.acoes.includes('editar')) return <Detalhe s={s} recarregar={sol.recarregar} />;
  return <Editor key={s?.atualizadoEm ?? 'nova'} opcoes={opcoes.dados} s={s ?? null} />;
}

function Editor({ opcoes, s }: { opcoes: OpcoesDTO; s: SolicitacaoDTO | null }) {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [v, setV] = useState<Valores>(() => (s ? paraValores(s) : { ...VAZIO, solicitanteNome: usuario?.nome ?? '' }));
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<'rascunho' | 'enviar' | null>(null);
  const topo = useRef<HTMLDivElement>(null);
  /** Id do rascunho criado nesta tela: se o envio falhar, as tentativas seguintes editam o mesmo registro. */
  const criadoId = useRef<number | null>(null);
  const { pedir, modal } = useAcoes(() => navigate(s?.status === 'APROVADO' ? '/admin/solicitacoes' : '/solicitacoes'));

  const status = s?.status ?? 'RASCUNHO';
  const exigeCompleto = status === 'AGUARDANDO' || status === 'APROVADO';
  const podeEnviar = ehNovaOuEstado(s, ['RASCUNHO', 'REJEITADO']);
  const ambiente = opcoes.ambientes.find((a) => String(a.id) === v.ambienteId);
  const curso = opcoes.cursos.find((c) => String(c.id) === v.cursoId);

  const set = <K extends keyof Valores>(k: K, valor: Valores[K]) => {
    setV((atual) => ({ ...atual, [k]: valor }));
    if (erros[k]) setErros(({ [k]: _, ...resto }) => resto);
  };

  // Recursos dependem do local: ao trocar de ambiente, mantém só os disponíveis nele.
  useEffect(() => {
    const disponiveis = new Set(ambiente?.recursos.map((r) => r.id) ?? []);
    setV((atual) => {
      const filtrados = atual.recursoIds.filter((r) => disponiveis.has(r));
      return filtrados.length === atual.recursoIds.length ? atual : { ...atual, recursoIds: filtrados };
    });
  }, [ambiente]);

  const mostrarErros = (campos: Record<string, string>, mensagem: string) => {
    setErros(campos);
    setErroGeral(mensagem);
    requestAnimationFrame(() => {
      const primeiro = Object.keys(campos)[0];
      const el = primeiro && document.getElementById(primeiro);
      if (el) el.focus();
      else topo.current?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  /** Valida no navegador as mesmas regras do servidor antes de mandar. */
  const validarCompleto = (p: SolicitacaoPayload) => {
    const r = solicitacaoEnvioSchema.safeParse(p);
    const campos = r.success ? {} : errosPorCampo(r.error);
    if (p.data && p.data < hojeLocal()) campos.data ??= 'A data precisa ser hoje ou uma data futura';
    if (Object.keys(campos).length) {
      mostrarErros(campos, 'Preencha os campos obrigatórios destacados.');
      return false;
    }
    return true;
  };

  const salvarNoServidor = async (): Promise<SolicitacaoDTO> => {
    const p = paraPayload(v);
    const id = s?.id ?? criadoId.current;
    if (id) return api<SolicitacaoDTO>(`/solicitacoes/${id}`, { method: 'PUT', body: p });
    const criado = await api<SolicitacaoDTO>('/solicitacoes', { method: 'POST', body: p });
    criadoId.current = criado.id;
    return criado;
  };

  const tratarErro = (e: unknown) => {
    if (e instanceof ApiError && Object.keys(e.campos).length) mostrarErros(e.campos, e.message);
    else {
      setErroGeral(mensagemDe(e));
      topo.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const salvar = async () => {
    setErroGeral(null);
    if (exigeCompleto && !validarCompleto(paraPayload(v))) return;
    setSalvando('rascunho');
    try {
      const r = await salvarNoServidor();
      setErros({});
      toast.sucesso(exigeCompleto ? 'Alterações salvas.' : 'Rascunho salvo. Você pode continuar depois.');
      if (exigeCompleto) navigate(status === 'APROVADO' ? '/admin/solicitacoes' : '/solicitacoes');
      else if (!s) navigate(`/solicitacoes/${r.id}`, { replace: true });
    } catch (e) {
      tratarErro(e);
    } finally {
      setSalvando(null);
    }
  };

  const enviar = async () => {
    setErroGeral(null);
    if (!validarCompleto(paraPayload(v))) return;
    setSalvando('enviar');
    try {
      const r = await salvarNoServidor();
      await api(`/solicitacoes/${r.id}/enviar`, { method: 'POST' });
      toast.sucesso('Solicitação enviada para aprovação.');
      navigate('/solicitacoes');
    } catch (e) {
      tratarErro(e);
    } finally {
      setSalvando(null);
    }
  };

  const titulo = !s ? 'Nova solicitação' : status === 'APROVADO' ? 'Editar evento aprovado' : s.nome ?? 'Solicitação sem nome';
  const voltarPara = status === 'APROVADO' ? '/admin/solicitacoes' : '/solicitacoes';

  return (
    <div ref={topo}>
      <PageHeader
        titulo={titulo}
        migalhas={[
          status === 'APROVADO'
            ? { rotulo: 'Fila de aprovação', para: '/admin/solicitacoes' }
            : { rotulo: 'Minhas solicitações', para: '/solicitacoes' },
          { rotulo: s ? 'Editar' : 'Nova' },
        ]}
        subtitulo={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {exigeCompleto
              ? 'Todos os campos obrigatórios precisam continuar preenchidos.'
              : 'Você pode salvar um rascunho incompleto e terminar depois.'}
          </span>
        }
      />

      <div className="grid gap-4">
        {s?.status === 'REJEITADO' && s.motivoRejeicao && (
          <Alerta tipo="aviso">
            <b>Motivo da rejeição:</b> {s.motivoRejeicao}
            <br />
            Corrija o que for preciso e clique em “Reenviar para aprovação”.
          </Alerta>
        )}
        {status === 'APROVADO' && (
          <Alerta tipo="info">Este evento já está publicado. Ao salvar, o sistema verifica de novo se há conflito de local e horário.</Alerta>
        )}
        {erroGeral && <Alerta>{erroGeral}</Alerta>}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="grid content-start gap-4">
            <Secao titulo="Sobre o evento">
              <Field id="nome" rotulo="Nome do evento" obrigatorio erro={erros.nome}>
                <input id="nome" className={classeCampo(erros.nome)} value={v.nome} onChange={(e) => set('nome', e.target.value)} maxLength={200} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="temaId" rotulo="Tema" obrigatorio erro={erros.temaId}>
                  <select id="temaId" className={classeCampo(erros.temaId)} value={v.temaId} onChange={(e) => set('temaId', e.target.value)}>
                    <option value="">Selecione…</option>
                    {opcoes.temas.map((t) => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                </Field>
                <Field id="palestrante" rotulo="Palestrante" obrigatorio erro={erros.palestrante}>
                  <input id="palestrante" className={classeCampo(erros.palestrante)} value={v.palestrante} onChange={(e) => set('palestrante', e.target.value)} />
                </Field>
              </div>
              <Field id="publicoAlvo" rotulo="Público-alvo" obrigatorio erro={erros.publicoAlvo}>
                <input id="publicoAlvo" className={classeCampo(erros.publicoAlvo)} value={v.publicoAlvo} onChange={(e) => set('publicoAlvo', e.target.value)} placeholder="Ex.: Alunos do 1º ao 4º semestre" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="justificativa" rotulo="Justificativa" obrigatorio erro={erros.justificativa}>
                  <textarea id="justificativa" className={classeCampo(erros.justificativa)} value={v.justificativa} onChange={(e) => set('justificativa', e.target.value)} />
                </Field>
                <Field id="objetivo" rotulo="Objetivo" obrigatorio erro={erros.objetivo}>
                  <textarea id="objetivo" className={classeCampo(erros.objetivo)} value={v.objetivo} onChange={(e) => set('objetivo', e.target.value)} />
                </Field>
              </div>
            </Secao>

            <Secao titulo="Organização">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="cursoId" rotulo="Curso / coordenação" obrigatorio erro={erros.cursoId}>
                  <select id="cursoId" className={classeCampo(erros.cursoId)} value={v.cursoId} onChange={(e) => set('cursoId', e.target.value)}>
                    <option value="">Selecione…</option>
                    {opcoes.cursos.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </Field>
                <Field id="centroCusto" rotulo="Centro de custo" dica="Preenchido a partir do curso/coordenação.">
                  <input id="centroCusto" className="campo border-dashed bg-[#eee] text-[#666]" readOnly tabIndex={-1} value={curso ? `${curso.centroCusto.codigo} · ${curso.centroCusto.descricao}` : ''} placeholder="Automático" />
                </Field>
              </div>
              <Field id="solicitanteNome" rotulo="Solicitante" obrigatorio erro={erros.solicitanteNome} dica="Nome livre de quem pede o evento. Seu usuário também fica registrado como autor.">
                <input id="solicitanteNome" className={classeCampo(erros.solicitanteNome)} value={v.solicitanteNome} onChange={(e) => set('solicitanteNome', e.target.value)} />
              </Field>
            </Secao>
          </div>

          <div className="grid content-start gap-4">
            <Secao titulo="Quando e onde">
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
                <Field id="data" rotulo="Data" obrigatorio erro={erros.data}>
                  <input id="data" type="date" min={hojeLocal()} className={classeCampo(erros.data)} value={v.data} onChange={(e) => set('data', e.target.value)} />
                </Field>
                <Field id="horaInicio" rotulo="Início" obrigatorio erro={erros.horaInicio}>
                  <input id="horaInicio" type="time" className={classeCampo(erros.horaInicio)} value={v.horaInicio} onChange={(e) => set('horaInicio', e.target.value)} />
                </Field>
                <Field id="horaFim" rotulo="Término" obrigatorio erro={erros.horaFim}>
                  <input id="horaFim" type="time" className={classeCampo(erros.horaFim)} value={v.horaFim} onChange={(e) => set('horaFim', e.target.value)} />
                </Field>
              </div>
              <Field id="ambienteId" rotulo="Local (ambiente)" obrigatorio erro={erros.ambienteId}>
                <select id="ambienteId" className={classeCampo(erros.ambienteId)} value={v.ambienteId} onChange={(e) => set('ambienteId', e.target.value)}>
                  <option value="">Selecione…</option>
                  {opcoes.ambientes.map((a) => (
                    <option key={a.id} value={a.id}>{a.nome}{a.capacidade ? ` (${a.capacidade} lugares)` : ''}</option>
                  ))}
                </select>
              </Field>
              <fieldset className="grid gap-1.5">
                <legend className="mb-1 text-[13px] font-bold text-[#444]">
                  Marque os recursos necessários {ambiente ? `em ${ambiente.nome}` : ''}
                </legend>
                {!ambiente ? (
                  <p className="text-[13px] text-suave">Escolha o local para ver os recursos disponíveis.</p>
                ) : ambiente.recursos.length === 0 ? (
                  <p className="text-[13px] text-suave">Este local não tem recursos cadastrados.</p>
                ) : (
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {ambiente.recursos.map((r) => (
                      <label key={r.id} className="inline-flex items-center gap-1.5 text-[14px]">
                        <input
                          type="checkbox"
                          className="size-4 accent-azul"
                          checked={v.recursoIds.includes(r.id)}
                          onChange={(e) =>
                            set('recursoIds', e.target.checked ? [...v.recursoIds, r.id] : v.recursoIds.filter((x) => x !== r.id))
                          }
                        />
                        {r.nome}
                      </label>
                    ))}
                  </div>
                )}
                {erros.recursoIds && <p className="text-[12.5px] text-perigo">{erros.recursoIds}</p>}
              </fieldset>
            </Secao>

            <Secao titulo="Para o setor de Eventos">
              <div>
                <SimNao id="cerimonial" rotulo="Haverá cerimonial?" obrigatorio valor={v.cerimonial} onChange={(x) => set('cerimonial', x)} erro={erros.cerimonial && 'obrigatório'} />
                <SimNao id="haveraInscricoes" rotulo="Haverá inscrições?" obrigatorio valor={v.haveraInscricoes} onChange={(x) => set('haveraInscricoes', x)} erro={erros.haveraInscricoes && 'obrigatório'} />
                <SimNao id="necessitaDeclaracoes" rotulo="Precisa de declarações?" obrigatorio valor={v.necessitaDeclaracoes} onChange={(x) => set('necessitaDeclaracoes', x)} erro={erros.necessitaDeclaracoes && 'obrigatório'} />
              </div>
              <Field id="observacoes" rotulo="Observações" erro={erros.observacoes}>
                <textarea id="observacoes" className={classeCampo(erros.observacoes)} value={v.observacoes} onChange={(e) => set('observacoes', e.target.value)} placeholder="Opcional" />
              </Field>
            </Secao>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-t border-linha bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:border sm:shadow-[0_-2px_8px_rgba(0,0,0,.06)]">
          <LinkBotao to={voltarPara} variante="fantasma">Voltar</LinkBotao>
          {s?.acoes.includes('excluir') && (
            <Button variante="fantasma" className="text-[#a94442]" onClick={() => pedir('excluir', s)}>Excluir rascunho</Button>
          )}
          {s?.acoes.includes('cancelar') && (
            <Button variante="fantasma" className="text-[#a94442]" onClick={() => pedir('cancelar', s)}>
              {status === 'APROVADO' ? 'Cancelar evento' : 'Cancelar solicitação'}
            </Button>
          )}
          <span className="flex-1" />
          <Button onClick={salvar} carregando={salvando === 'rascunho'} disabled={!!salvando}>
            {exigeCompleto || status === 'REJEITADO' ? 'Salvar alterações' : 'Salvar rascunho'}
          </Button>
          {podeEnviar && (
            <Button variante="primario" onClick={enviar} carregando={salvando === 'enviar'} disabled={!!salvando}>
              {status === 'REJEITADO' ? 'Reenviar para aprovação' : 'Enviar para aprovação'}
            </Button>
          )}
        </div>
      </div>
      {modal}
    </div>
  );
}

/** Visualização só leitura (aprovado para o solicitante, cancelado, etc.). */
function Detalhe({ s, recarregar }: { s: SolicitacaoDTO; recarregar: () => void }) {
  const { usuario } = useAuth();
  const { pedir, modal } = useAcoes(() => recarregar());
  const ehAdmin = usuario?.perfil === 'ADMIN';
  const linhas = useMemo(() => linhasDetalhe(s), [s]);

  return (
    <>
      <PageHeader
        titulo={s.nome ?? 'Solicitação'}
        migalhas={[
          ehAdmin ? { rotulo: 'Fila de aprovação', para: '/admin/solicitacoes' } : { rotulo: 'Minhas solicitações', para: '/solicitacoes' },
          { rotulo: 'Detalhes' },
        ]}
        subtitulo={<StatusBadge status={s.status} />}
        acoes={
          <>
            {s.acoes.includes('aprovar') && <Button variante="sucesso" onClick={() => pedir('aprovar', s)}>Aprovar</Button>}
            {s.acoes.includes('rejeitar') && <Button variante="perigo" onClick={() => pedir('rejeitar', s)}>Rejeitar</Button>}
            {s.acoes.includes('cancelar') && <Button onClick={() => pedir('cancelar', s)}>Cancelar</Button>}
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <DetalheCampos linhas={linhas} />
        <Historico s={s} />
      </div>
      {modal}
    </>
  );
}

export function DetalheCampos({ linhas }: { linhas: [string, ReactNode][] }) {
  return (
    <section className="cartao">
      <dl className="grid text-[14px] sm:grid-cols-[180px_1fr]">
        {linhas.map(([k, val]) => (
          <div key={k} className="contents">
            <dt className="border-t border-[#ebebeb] px-4 pt-2.5 font-bold text-[#555] first:border-t-0 sm:pb-2.5">{k}</dt>
            <dd className="border-[#ebebeb] px-4 pb-2.5 break-words whitespace-pre-line sm:border-t sm:pt-2.5">{val ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function Historico({ s }: { s: SolicitacaoDTO }) {
  if (!s.historico?.length) return null;
  return (
    <section className="cartao self-start">
      <h2 className="border-b border-linha bg-[#f5f5f5] px-4 py-2.5 text-[15px] font-bold">Histórico</h2>
      <ol className="grid gap-3 px-4 py-3">
        {s.historico.map((h, i) => (
          <li key={i} className="grid gap-0.5 border-l-2 border-uni pl-3 text-[13px]">
            <span>
              <b>{STATUS_LABEL[h.para]}</b> · {h.usuario}
            </span>
            <span className="text-suave">{new Date(h.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
            {h.motivo && <span className="text-[#a94442]">“{h.motivo}”</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="cartao">
      <h2 className="border-b border-linha bg-[#f5f5f5] px-4 py-2.5 text-[15px] font-bold">{titulo}</h2>
      <div className="grid gap-3 p-4">{children}</div>
    </section>
  );
}

// ----------------------------------------------------------------------

const simNao = (b: boolean | null) => (b === null ? '—' : b ? 'Sim' : 'Não');

export function linhasDetalhe(s: SolicitacaoDTO): [string, ReactNode][] {
  return [
    ['Tema', s.tema?.nome],
    ['Data', dataBR(s.data)],
    ['Horário', faixaHorario(s.horaInicio, s.horaFim)],
    ['Local', s.ambiente?.nome],
    ['Recursos', s.recursos.map((r) => r.nome).join(', ') || 'Nenhum'],
    ['Curso/coordenação', s.curso?.nome],
    ['Centro de custo', s.curso && `${s.curso.centroCusto.codigo} · ${s.curso.centroCusto.descricao}`],
    ['Solicitante', s.solicitanteNome],
    ['Registrado por', s.autor.nome],
    ['Palestrante', s.palestrante],
    ['Público-alvo', s.publicoAlvo],
    ['Justificativa', s.justificativa],
    ['Objetivo', s.objetivo],
    ['Cerimonial', simNao(s.cerimonial)],
    ['Haverá inscrições', simNao(s.haveraInscricoes)],
    ['Declarações', simNao(s.necessitaDeclaracoes)],
    ['Observações', s.observacoes],
    ...(s.motivoRejeicao ? ([['Motivo da rejeição', s.motivoRejeicao]] as [string, ReactNode][]) : []),
  ];
}

function ehNovaOuEstado(s: SolicitacaoDTO | null, estados: SolicitacaoDTO['status'][]) {
  return !s || (estados.includes(s.status) && s.acoes.includes('enviar'));
}

function paraValores(s: SolicitacaoDTO): Valores {
  return {
    nome: s.nome ?? '',
    temaId: s.tema ? String(s.tema.id) : '',
    data: s.data ?? '',
    horaInicio: s.horaInicio ?? '',
    horaFim: s.horaFim ?? '',
    ambienteId: s.ambiente ? String(s.ambiente.id) : '',
    cursoId: s.curso ? String(s.curso.id) : '',
    solicitanteNome: s.solicitanteNome ?? '',
    palestrante: s.palestrante ?? '',
    publicoAlvo: s.publicoAlvo ?? '',
    justificativa: s.justificativa ?? '',
    objetivo: s.objetivo ?? '',
    cerimonial: s.cerimonial,
    haveraInscricoes: s.haveraInscricoes,
    necessitaDeclaracoes: s.necessitaDeclaracoes,
    recursoIds: s.recursos.map((r) => r.id),
    observacoes: s.observacoes ?? '',
  };
}

function paraPayload(v: Valores): SolicitacaoPayload {
  const t = (x: string) => (x.trim() ? x.trim() : null);
  const n = (x: string) => (x ? Number(x) : null);
  return {
    nome: t(v.nome),
    temaId: n(v.temaId),
    data: t(v.data),
    horaInicio: t(v.horaInicio),
    horaFim: t(v.horaFim),
    ambienteId: n(v.ambienteId),
    cursoId: n(v.cursoId),
    solicitanteNome: t(v.solicitanteNome),
    palestrante: t(v.palestrante),
    publicoAlvo: t(v.publicoAlvo),
    justificativa: t(v.justificativa),
    objetivo: t(v.objetivo),
    cerimonial: v.cerimonial,
    haveraInscricoes: v.haveraInscricoes,
    necessitaDeclaracoes: v.necessitaDeclaracoes,
    recursoIds: v.recursoIds,
    observacoes: t(v.observacoes),
  };
}
