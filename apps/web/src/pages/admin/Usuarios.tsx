import { PERFIL_LABEL, PERFIS, type Perfil, type UsuarioDTO } from '@univille/shared';
import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { classeCampo, Field } from '../../components/Field';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/Overlay';
import { useToast } from '../../components/Toast';
import { Alerta, Carregando, PageHeader } from '../../components/Ui';
import { api, ApiError, mensagemDe } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';

type Valores = { matricula: string; nome: string; email: string; senha: string; perfil: Perfil; ativo: boolean };

export default function Usuarios() {
  const { usuario: eu } = useAuth();
  const { dados, carregando, erro, recarregar } = useApi<UsuarioDTO[]>('/admin/usuarios');
  const [editando, setEditando] = useState<UsuarioDTO | 'novo' | null>(null);

  return (
    <>
      <PageHeader
        titulo="Usuários"
        migalhas={[{ rotulo: 'Administração' }, { rotulo: 'Usuários' }]}
        subtitulo="Não há autocadastro: as contas de solicitantes e administradores são criadas aqui. Usuários são desativados, nunca excluídos."
        acoes={
          <Button variante="primario" onClick={() => setEditando('novo')}>
            <Icon nome="mais" className="size-4" /> Novo usuário
          </Button>
        }
      />
      <section className="cartao">
        {erro && <div className="p-4"><Alerta>{erro}</Alerta></div>}
        {carregando && !dados ? (
          <Carregando />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela min-w-[640px]">
              <thead>
                <tr><th>Matrícula</th><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th><th className="w-px" /></tr>
              </thead>
              <tbody>
                {dados?.map((u) => (
                  <tr key={u.id} className={u.ativo ? '' : 'text-suave'}>
                    <td className="tabular-nums">{u.matricula}</td>
                    <td>{u.nome}{u.id === eu?.id && <span className="ml-1.5 text-[12px] text-suave">(você)</span>}</td>
                    <td className="break-all">{u.email}</td>
                    <td>{PERFIL_LABEL[u.perfil]}</td>
                    <td>
                      <span className={`text-[12.5px] font-bold ${u.ativo ? 'text-ok' : 'text-perigo'}`}>{u.ativo ? 'Ativo' : 'Desativado'}</span>
                    </td>
                    <td><Button variante="fantasma" tamanho="sm" onClick={() => setEditando(u)}>Editar</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {editando && (
        <FormUsuario
          usuario={editando === 'novo' ? null : editando}
          ehEu={editando !== 'novo' && editando.id === eu?.id}
          fechar={() => setEditando(null)}
          salvo={() => { setEditando(null); recarregar(); }}
        />
      )}
    </>
  );
}

function FormUsuario({ usuario, ehEu, fechar, salvo }: { usuario: UsuarioDTO | null; ehEu: boolean; fechar: () => void; salvo: () => void }) {
  const toast = useToast();
  const [v, setV] = useState<Valores>(() =>
    usuario
      ? { matricula: usuario.matricula, nome: usuario.nome, email: usuario.email, senha: '', perfil: usuario.perfil, ativo: usuario.ativo }
      : { matricula: '', nome: '', email: '', senha: '', perfil: 'SOLICITANTE', ativo: true },
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const set = <K extends keyof Valores>(k: K, x: Valores[K]) => setV((a) => ({ ...a, [k]: x }));

  const onSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      await api(usuario ? `/admin/usuarios/${usuario.id}` : '/admin/usuarios', { method: usuario ? 'PUT' : 'POST', body: v });
      toast.sucesso(usuario ? 'Usuário atualizado.' : 'Usuário criado. Ele já pode entrar com a matrícula e a senha informadas.');
      salvo();
    } catch (err) {
      if (err instanceof ApiError) setErros(err.campos);
      setErro(mensagemDe(err));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto
      fechar={fechar}
      titulo={usuario ? 'Editar usuário' : 'Novo usuário'}
      rodape={
        <>
          <Button onClick={fechar} disabled={salvando}>Cancelar</Button>
          <Button variante="primario" onClick={() => onSubmit()} carregando={salvando}>Salvar</Button>
        </>
      }
    >
      <form className="grid gap-3" onSubmit={onSubmit} noValidate>
        {erro && <Alerta>{erro}</Alerta>}
        <Field id="u-matricula" rotulo="Matrícula (login)" obrigatorio erro={erros.matricula} dica="Somente números.">
          <input
            id="u-matricula"
            inputMode="numeric"
            maxLength={20}
            className={classeCampo(erros.matricula)}
            value={v.matricula}
            onChange={(e) => set('matricula', e.target.value.replace(/\D/g, ''))}
          />
        </Field>
        <Field id="u-nome" rotulo="Nome completo" obrigatorio erro={erros.nome}>
          <input id="u-nome" className={classeCampo(erros.nome)} value={v.nome} onChange={(e) => set('nome', e.target.value)} />
        </Field>
        <Field id="u-email" rotulo="E-mail" obrigatorio erro={erros.email}>
          <input id="u-email" type="email" className={classeCampo(erros.email)} value={v.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field
          id="u-senha"
          rotulo={usuario ? 'Nova senha' : 'Senha'}
          obrigatorio={!usuario}
          erro={erros.senha}
          dica={usuario ? 'Deixe em branco para manter a senha atual.' : 'Mínimo de 6 caracteres.'}
        >
          <input id="u-senha" type="password" autoComplete="new-password" className={classeCampo(erros.senha)} value={v.senha} onChange={(e) => set('senha', e.target.value)} />
        </Field>
        <Field id="u-perfil" rotulo="Perfil" obrigatorio erro={erros.perfil}>
          <select id="u-perfil" className={classeCampo(erros.perfil)} value={v.perfil} disabled={ehEu} onChange={(e) => set('perfil', e.target.value as Perfil)}>
            {PERFIS.map((p) => <option key={p} value={p}>{PERFIL_LABEL[p]}</option>)}
          </select>
        </Field>
        <label className="inline-flex items-center gap-2 text-[14px]">
          <input type="checkbox" className="size-4 accent-azul" checked={v.ativo} disabled={ehEu} onChange={(e) => set('ativo', e.target.checked)} />
          Usuário ativo (pode entrar no sistema)
        </label>
        {ehEu && <p className="text-[12.5px] text-suave">Você não pode desativar nem mudar o perfil da sua própria conta.</p>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
