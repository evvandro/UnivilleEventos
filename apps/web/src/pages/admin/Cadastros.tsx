import type { AmbienteDTO, CentroCustoDTO, CursoDTO, Ref } from '@univille/shared';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Button } from '../../components/Button';
import { classeCampo, Field } from '../../components/Field';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/Overlay';
import { useToast } from '../../components/Toast';
import { Abas, Alerta, Carregando, PageHeader, Vazio } from '../../components/Ui';
import { api, ApiError, mensagemDe } from '../../lib/api';
import { useApi } from '../../lib/useApi';

// ----------------------------------------------------------------------

type Item = { id: number } & Record<string, unknown>;
type Campo =
  | { nome: string; rotulo: string; tipo: 'texto' | 'numero'; obrigatorio?: boolean; dica?: string }
  | {
      nome: string;
      rotulo: string;
      tipo: 'select';
      fonte: string;
      obrigatorio?: boolean;
      rotuloOpcao: (o: Item) => string;
    }
  | { nome: string; rotulo: string; tipo: 'multi'; fonte: string; dica?: string };

type Config = {
  titulo: string;
  singular: string;
  caminho: string;
  campos: Campo[];
  colunas: { titulo: string; valor: (i: Item) => string }[];
  paraForm: (i: Item) => Record<string, unknown>;
};

const nomeCol = { titulo: 'Nome', valor: (i: Item) => String(i.nome) };
const nomeCampo: Campo = { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true };

const TIPOS: Record<string, Config> = {
  temas: {
    titulo: 'Temas',
    singular: 'tema',
    caminho: '/admin/temas',
    campos: [{ ...nomeCampo, dica: 'Ex.: Palestra, Congresso, Oficina' } as Campo],
    colunas: [nomeCol],
    paraForm: (i) => ({ nome: i.nome }),
  },
  ambientes: {
    titulo: 'Ambientes',
    singular: 'ambiente',
    caminho: '/admin/ambientes',
    campos: [
      nomeCampo,
      { nome: 'capacidade', rotulo: 'Capacidade (lugares)', tipo: 'numero' },
      {
        nome: 'recursoIds',
        rotulo: 'Recursos disponíveis neste ambiente',
        tipo: 'multi',
        fonte: '/admin/recursos',
        dica: 'Só estes recursos aparecem para marcação na solicitação.',
      },
    ],
    colunas: [
      nomeCol,
      { titulo: 'Capacidade', valor: (i) => (i.capacidade ? String(i.capacidade) : '—') },
      {
        titulo: 'Recursos',
        valor: (i) => (i as unknown as AmbienteDTO).recursos.map((r) => r.nome).join(', ') || '—',
      },
    ],
    paraForm: (i) => {
      const a = i as unknown as AmbienteDTO;
      return {
        nome: a.nome,
        capacidade: a.capacidade ?? '',
        recursoIds: a.recursos.map((r) => r.id),
      };
    },
  },
  recursos: {
    titulo: 'Recursos',
    singular: 'recurso',
    caminho: '/admin/recursos',
    campos: [{ ...nomeCampo, dica: 'Ex.: Projetor, Microfone, Palco' } as Campo],
    colunas: [nomeCol],
    paraForm: (i) => ({ nome: i.nome }),
  },
  cursos: {
    titulo: 'Cursos/coordenações',
    singular: 'curso/coordenação',
    caminho: '/admin/cursos',
    campos: [
      nomeCampo,
      {
        nome: 'centroCustoId',
        rotulo: 'Centro de custo',
        tipo: 'select',
        fonte: '/admin/centros-custo',
        obrigatorio: true,
        rotuloOpcao: (o) => `${o.codigo} · ${o.descricao}`,
      },
    ],
    colunas: [
      nomeCol,
      {
        titulo: 'Centro de custo',
        valor: (i) => {
          const c = (i as unknown as CursoDTO).centroCusto;
          return `${c.codigo} · ${c.descricao}`;
        },
      },
    ],
    paraForm: (i) => ({ nome: i.nome, centroCustoId: i.centroCustoId }),
  },
  'centros-custo': {
    titulo: 'Centros de custo',
    singular: 'centro de custo',
    caminho: '/admin/centros-custo',
    campos: [
      { nome: 'codigo', rotulo: 'Código', tipo: 'texto', obrigatorio: true, dica: 'Ex.: CC-4102' },
      { nome: 'descricao', rotulo: 'Descrição', tipo: 'texto', obrigatorio: true },
    ],
    colunas: [
      { titulo: 'Código', valor: (i) => String((i as unknown as CentroCustoDTO).codigo) },
      { titulo: 'Descrição', valor: (i) => String(i.descricao) },
    ],
    paraForm: (i) => ({ codigo: i.codigo, descricao: i.descricao }),
  },
};

/** Cadastros auxiliares: uma única tela dirigida pela configuração de cada tipo. */
export default function Cadastros() {
  const { tipo = '' } = useParams();
  const navigate = useNavigate();
  const cfg = TIPOS[tipo];
  if (!cfg) return <Navigate to="/admin/cadastros/temas" replace />;
  return (
    <>
      <PageHeader
        titulo="Cadastros"
        migalhas={[{ rotulo: 'Administração' }, { rotulo: 'Cadastros' }, { rotulo: cfg.titulo }]}
        subtitulo="Itens usados nas solicitações. Um item vinculado a eventos ou a outros cadastros não pode ser excluído."
      />
      <div className="border-b border-linha">
        <Abas
          rotuloAcessivel="Tipo de cadastro"
          ativo={tipo}
          onChange={(t) => navigate(`/admin/cadastros/${t}`)}
          itens={Object.entries(TIPOS).map(([valor, c]) => ({ valor, rotulo: c.titulo }))}
        />
      </div>
      <Tabela key={tipo} cfg={cfg} />
    </>
  );
}

function Tabela({ cfg }: { cfg: Config }) {
  const toast = useToast();
  const { dados, carregando, erro, recarregar } = useApi<Item[]>(cfg.caminho);
  const [editando, setEditando] = useState<Item | 'novo' | null>(null);
  const [excluindo, setExcluindo] = useState<Item | null>(null);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const excluir = async () => {
    if (!excluindo) return;
    setOcupado(true);
    setErroExcluir(null);
    try {
      await api(`${cfg.caminho}/${excluindo.id}`, { method: 'DELETE' });
      toast.sucesso(`${capitalizar(cfg.singular)} excluído.`);
      setExcluindo(null);
      recarregar();
    } catch (e) {
      setErroExcluir(mensagemDe(e));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <section className="cartao border-t-0">
      <div className="flex items-center justify-between gap-2 border-b border-linha bg-[#f5f5f5] px-4 py-2.5">
        <h2 className="text-[15px] font-bold">{cfg.titulo}</h2>
        <Button variante="primario" tamanho="sm" onClick={() => setEditando('novo')}>
          <Icon nome="mais" className="size-4" /> Novo {cfg.singular}
        </Button>
      </div>
      {erro && (
        <div className="p-4">
          <Alerta>{erro}</Alerta>
        </div>
      )}
      {carregando && !dados ? (
        <Carregando />
      ) : !dados?.length ? (
        <Vazio titulo={`Nenhum ${cfg.singular} cadastrado`} />
      ) : (
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                {cfg.colunas.map((c) => (
                  <th key={c.titulo}>{c.titulo}</th>
                ))}
                <th className="w-px text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((i) => (
                <tr key={i.id}>
                  {cfg.colunas.map((c) => (
                    <td key={c.titulo}>{c.valor(i)}</td>
                  ))}
                  <td className="text-right whitespace-nowrap">
                    <Button variante="fantasma" tamanho="sm" onClick={() => setEditando(i)}>
                      Editar
                    </Button>
                    <Button
                      variante="fantasma"
                      tamanho="sm"
                      className="text-[#a94442]"
                      onClick={() => {
                        setErroExcluir(null);
                        setExcluindo(i);
                      }}
                    >
                      Excluir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editando && (
        <FormItem
          cfg={cfg}
          item={editando === 'novo' ? null : editando}
          fechar={() => setEditando(null)}
          salvo={() => {
            setEditando(null);
            recarregar();
          }}
        />
      )}

      <Modal
        aberto={!!excluindo}
        fechar={() => !ocupado && setExcluindo(null)}
        titulo={`Excluir ${cfg.singular}`}
        rodape={
          <>
            <Button onClick={() => setExcluindo(null)} disabled={ocupado}>
              Voltar
            </Button>
            <Button variante="perigo" onClick={excluir} carregando={ocupado} data-autofoco>
              Excluir
            </Button>
          </>
        }
      >
        <div className="grid gap-3 text-[14px]">
          <p>
            Excluir <b>{String(excluindo?.nome ?? excluindo?.codigo ?? '')}</b>? Esta ação não pode
            ser desfeita.
          </p>
          {erroExcluir && <Alerta tipo="aviso">{erroExcluir}</Alerta>}
        </div>
      </Modal>
    </section>
  );
}

function FormItem({
  cfg,
  item,
  fechar,
  salvo,
}: {
  cfg: Config;
  item: Item | null;
  fechar: () => void;
  salvo: () => void;
}) {
  const toast = useToast();
  const [valores, setValores] = useState<Record<string, unknown>>(() =>
    item
      ? cfg.paraForm(item)
      : Object.fromEntries(cfg.campos.map((c) => [c.nome, c.tipo === 'multi' ? [] : ''])),
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const onSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      await api(item ? `${cfg.caminho}/${item.id}` : cfg.caminho, {
        method: item ? 'PUT' : 'POST',
        body: valores,
      });
      toast.sucesso(item ? 'Alterações salvas.' : `${capitalizar(cfg.singular)} cadastrado.`);
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
      titulo={item ? `Editar ${cfg.singular}` : `Novo ${cfg.singular}`}
      rodape={
        <>
          <Button onClick={fechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button variante="primario" onClick={() => onSubmit()} carregando={salvando}>
            Salvar
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-3" noValidate>
        {erro && <Alerta>{erro}</Alerta>}
        {cfg.campos.map((c) => (
          <CampoCadastro
            key={c.nome}
            campo={c}
            valor={valores[c.nome]}
            erro={erros[c.nome]}
            onChange={(v) => setValores((x) => ({ ...x, [c.nome]: v }))}
          />
        ))}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function CampoCadastro({
  campo,
  valor,
  erro,
  onChange,
}: {
  campo: Campo;
  valor: unknown;
  erro?: string;
  onChange: (v: unknown) => void;
}) {
  const id = `cad-${campo.nome}`;
  if (campo.tipo === 'select' || campo.tipo === 'multi')
    return <CampoComFonte campo={campo} id={id} valor={valor} erro={erro} onChange={onChange} />;
  return (
    <Field
      id={id}
      rotulo={campo.rotulo}
      obrigatorio={campo.obrigatorio}
      erro={erro}
      dica={campo.dica}
    >
      <input
        id={id}
        type={campo.tipo === 'numero' ? 'number' : 'text'}
        min={campo.tipo === 'numero' ? 1 : undefined}
        className={classeCampo(erro)}
        value={String(valor ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

function CampoComFonte({
  campo,
  id,
  valor,
  erro,
  onChange,
}: {
  campo: Extract<Campo, { fonte: string }>;
  id: string;
  valor: unknown;
  erro?: string;
  onChange: (v: unknown) => void;
}) {
  const { dados } = useApi<Item[]>(campo.fonte);
  if (campo.tipo === 'select') {
    return (
      <Field id={id} rotulo={campo.rotulo} obrigatorio={campo.obrigatorio} erro={erro}>
        <select
          id={id}
          className={classeCampo(erro)}
          value={String(valor ?? '')}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Selecione…</option>
          {dados?.map((o) => (
            <option key={o.id} value={o.id}>
              {campo.rotuloOpcao(o)}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  const marcados = (valor as number[]) ?? [];
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1 text-[13px] font-bold text-[#444]">{campo.rotulo}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {(dados as Ref[] | null)?.map((o) => (
          <label key={o.id} className="inline-flex items-center gap-1.5 text-[14px]">
            <input
              type="checkbox"
              className="size-4 accent-azul"
              checked={marcados.includes(o.id)}
              onChange={(e) =>
                onChange(
                  e.target.checked ? [...marcados, o.id] : marcados.filter((x) => x !== o.id),
                )
              }
            />
            {o.nome}
          </label>
        ))}
      </div>
      {campo.dica && <p className="text-[12.5px] text-suave">{campo.dica}</p>}
      {erro && <p className="text-[12.5px] text-perigo">{erro}</p>}
    </fieldset>
  );
}

const capitalizar = (s: string) => s[0].toUpperCase() + s.slice(1);
