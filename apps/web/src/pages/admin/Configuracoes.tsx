import { MESES_AGENDA_MAXIMO, MESES_AGENDA_MINIMO } from '@univille/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { classeCampo, Field } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { Alerta, Carregando, PageHeader } from '../../components/Ui';
import { api, ApiError, mensagemDe } from '../../lib/api';
import { useApi } from '../../lib/useApi';

export default function Configuracoes() {
  const toast = useToast();
  const { dados, carregando } = useApi<{ mesesAgendaPublica: number }>('/admin/configuracoes');
  const [meses, setMeses] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [erroCampo, setErroCampo] = useState<string | undefined>();
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (dados) setMeses(String(dados.mesesAgendaPublica));
  }, [dados]);

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    setErroCampo(undefined);
    try {
      await api('/admin/configuracoes', { method: 'PUT', body: { mesesAgendaPublica: meses } });
      toast.sucesso('Configuração salva. A agenda pública já usa o novo período.');
    } catch (err) {
      if (err instanceof ApiError && err.campos.mesesAgendaPublica) setErroCampo(err.campos.mesesAgendaPublica);
      else setErro(mensagemDe(err));
    } finally {
      setSalvando(false);
    }
  };

  const n = Number(meses);
  return (
    <>
      <PageHeader titulo="Configurações" migalhas={[{ rotulo: 'Administração' }, { rotulo: 'Configurações' }]} />
      {carregando && !dados ? (
        <Carregando />
      ) : (
        <form onSubmit={salvar} noValidate className="cartao grid max-w-xl gap-4 p-5">
          <h2 className="text-[16px] font-bold">Agenda pública</h2>
          {erro && <Alerta>{erro}</Alerta>}
          <Field
            id="meses"
            rotulo="Meses exibidos na agenda pública"
            erro={erroCampo}
            dica={`Conta a partir do mês atual. O padrão do setor é ${MESES_AGENDA_MINIMO} (mês atual + 2); o máximo é ${MESES_AGENDA_MAXIMO}.`}
          >
            <input
              id="meses"
              type="number"
              min={MESES_AGENDA_MINIMO}
              max={MESES_AGENDA_MAXIMO}
              className={`${classeCampo(erroCampo)} w-32`}
              value={meses}
              onChange={(e) => setMeses(e.target.value)}
            />
          </Field>
          {n >= MESES_AGENDA_MINIMO && (
            <p className="text-[14px] text-[#555]">A agenda mostrará o mês atual e os {n - 1} meses seguintes.</p>
          )}
          <div>
            <Button type="submit" variante="primario" carregando={salvando}>Salvar</Button>
          </div>
        </form>
      )}
    </>
  );
}
