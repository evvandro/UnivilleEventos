import type { Acao, SolicitacaoDTO } from '@univille/shared';
import { useState } from 'react';
import { Button } from '../../components/Button';
import { classeCampo, Field } from '../../components/Field';
import { Modal } from '../../components/Overlay';
import { useToast } from '../../components/Toast';
import { Alerta } from '../../components/Ui';
import { api, ApiError, mensagemDe } from '../../lib/api';

type AcaoDeEstado = Exclude<Acao, 'editar'>;

const CONFIG: Record<
  AcaoDeEstado,
  { titulo: string; texto: string; botao: string; variante: 'primario' | 'perigo' | 'sucesso'; sucesso: string; caminho: (id: number) => string; metodo: string }
> = {
  enviar: {
    titulo: 'Enviar para aprovação',
    texto: 'A solicitação será analisada pelo setor de Eventos. Enquanto aguarda, você ainda pode editar ou cancelar.',
    botao: 'Enviar',
    variante: 'primario',
    sucesso: 'Solicitação enviada para aprovação.',
    caminho: (id) => `/solicitacoes/${id}/enviar`,
    metodo: 'POST',
  },
  cancelar: {
    titulo: 'Cancelar solicitação',
    texto: 'O evento não aparecerá na agenda pública. O registro é mantido no histórico. Esta ação não pode ser desfeita.',
    botao: 'Cancelar solicitação',
    variante: 'perigo',
    sucesso: 'Solicitação cancelada.',
    caminho: (id) => `/solicitacoes/${id}/cancelar`,
    metodo: 'POST',
  },
  excluir: {
    titulo: 'Excluir rascunho',
    texto: 'O rascunho será apagado definitivamente.',
    botao: 'Excluir rascunho',
    variante: 'perigo',
    sucesso: 'Rascunho excluído.',
    caminho: (id) => `/solicitacoes/${id}`,
    metodo: 'DELETE',
  },
  aprovar: {
    titulo: 'Aprovar e publicar',
    texto: 'O sistema verifica de novo se há conflito de local e horário. Se aprovado, o evento aparece na agenda pública.',
    botao: 'Aprovar e publicar',
    variante: 'sucesso',
    sucesso: 'Evento aprovado e publicado na agenda.',
    caminho: (id) => `/admin/solicitacoes/${id}/aprovar`,
    metodo: 'POST',
  },
  rejeitar: {
    titulo: 'Rejeitar solicitação',
    texto: 'O solicitante verá o motivo e poderá corrigir e reenviar.',
    botao: 'Rejeitar',
    variante: 'perigo',
    sucesso: 'Solicitação rejeitada. O solicitante verá o motivo.',
    caminho: (id) => `/admin/solicitacoes/${id}/rejeitar`,
    metodo: 'POST',
  },
};

/**
 * Confirmação + chamada à API para as ações de estado de uma solicitação.
 */
export function useAcoes(aoConcluir: (acao: AcaoDeEstado, s: SolicitacaoDTO | undefined) => void) {
  const toast = useToast();
  const [pendente, setPendente] = useState<{ acao: AcaoDeEstado; s: SolicitacaoDTO } | null>(null);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [erroMotivo, setErroMotivo] = useState<string | undefined>();
  const [executando, setExecutando] = useState(false);
  /** Erros de campo devolvidos ao enviar (o formulário destaca os campos). */
  const [errosEnvio, setErrosEnvio] = useState<ApiError | null>(null);

  const pedir = (acao: AcaoDeEstado, s: SolicitacaoDTO) => {
    setPendente({ acao, s });
    setErrosEnvio(null);
    setMotivo('');
    setErro(null);
    setErroMotivo(undefined);
  };
  const fechar = () => !executando && setPendente(null);

  const confirmar = async () => {
    if (!pendente) return;
    const { acao, s } = pendente;
    const cfg = CONFIG[acao];
    setExecutando(true);
    setErro(null);
    try {
      const r = await api<SolicitacaoDTO | undefined>(cfg.caminho(s.id), {
        method: cfg.metodo,
        body: acao === 'rejeitar' ? { motivo } : undefined,
      });
      toast.sucesso(cfg.sucesso);
      setPendente(null);
      aoConcluir(acao, r);
    } catch (e) {
      if (e instanceof ApiError && e.campos.motivo) setErroMotivo(e.campos.motivo);
      else if (e instanceof ApiError && Object.keys(e.campos).length && acao === 'enviar') {
        setPendente(null);
        setErrosEnvio(e);
      } else setErro(mensagemDe(e));
    } finally {
      setExecutando(false);
    }
  };

  const cfg = pendente && CONFIG[pendente.acao];
  const modal = (
    <Modal
      aberto={!!pendente}
      fechar={fechar}
      titulo={cfg?.titulo ?? ''}
      rodape={
        <>
          <Button onClick={fechar} disabled={executando}>
            Voltar
          </Button>
          <Button variante={cfg?.variante} onClick={confirmar} carregando={executando} data-autofoco={pendente?.acao !== 'rejeitar' || undefined}>
            {cfg?.botao}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        {pendente && <p className="text-[14px] font-bold">{pendente.s.nome ?? 'Solicitação sem nome'}</p>}
        <p className="text-[14px] text-[#555]">{cfg?.texto}</p>
        {pendente?.acao === 'rejeitar' && (
          <Field id="motivo" rotulo="Motivo da rejeição" obrigatorio erro={erroMotivo}>
            <textarea
              id="motivo"
              data-autofoco
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className={classeCampo(erroMotivo)}
              placeholder="Explique o que precisa ser corrigido"
            />
          </Field>
        )}
        {erro && <Alerta>{erro}</Alerta>}
      </div>
    </Modal>
  );

  return { pedir, modal, errosEnvio };
}
