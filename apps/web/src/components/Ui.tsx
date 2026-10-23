import type { ReactNode } from 'react';
import { Link } from 'react-router';

type Migalha = { rotulo: string; para?: string };

/** Título da página com "Você está em" e a ação principal à direita. */
export function PageHeader({
  titulo,
  migalhas = [],
  acoes,
  subtitulo,
}: {
  titulo: string;
  migalhas?: Migalha[];
  acoes?: ReactNode;
  subtitulo?: ReactNode;
}) {
  return (
    <header className="mb-5">
      {migalhas.length > 0 && (
        <nav aria-label="Você está em" className="mb-2 text-[13px] text-suave">
          <span className="text-texto">Você está em</span>
          {migalhas.map((m, i) => (
            <span key={i}>
              <span className="mx-1.5">›</span>
              {m.para ? (
                <Link to={m.para} className="text-suave hover:text-link">
                  {m.rotulo}
                </Link>
              ) : (
                <span aria-current="page">{m.rotulo}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[24px] leading-tight font-bold tracking-tight text-[#222] text-balance">
            {titulo}
          </h1>
          {subtitulo && <p className="mt-1 text-[14px] text-suave">{subtitulo}</p>}
        </div>
        {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
      </div>
    </header>
  );
}

export function Alerta({
  tipo = 'erro',
  children,
}: {
  tipo?: 'erro' | 'aviso' | 'sucesso' | 'info';
  children: ReactNode;
}) {
  const cor = {
    erro: 'border-[#ebccd1] bg-[#f2dede] text-[#a94442]',
    aviso: 'border-[#faebcc] bg-[#fcf8e3] text-[#8a6d3b]',
    sucesso: 'border-[#d6e9c6] bg-[#dff0d8] text-[#3c763d]',
    info: 'border-[#bce8f1] bg-[#d9edf7] text-[#31708f]',
  }[tipo];
  return (
    <div
      role={tipo === 'erro' ? 'alert' : undefined}
      className={`rounded-[3px] border px-3 py-2.5 text-[14px] ${cor}`}
    >
      {children}
    </div>
  );
}

export function Vazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-[16px] font-bold text-[#555]">{titulo}</p>
      {children && <div className="mt-2 text-[14px] text-suave">{children}</div>}
    </div>
  );
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-12 text-[14px] text-suave"
      role="status"
    >
      <span className="size-4 animate-spin rounded-full border-2 border-suave border-r-transparent" />
      {texto}
    </div>
  );
}

/** Abas no estilo Bootstrap (nav-tabs), com contador opcional. */
export function Abas<T extends string>({
  itens,
  ativo,
  onChange,
  rotuloAcessivel,
}: {
  itens: { valor: T; rotulo: string; contagem?: number; cor?: string }[];
  ativo: T;
  onChange: (v: T) => void;
  rotuloAcessivel: string;
}) {
  return (
    <div role="tablist" aria-label={rotuloAcessivel} className="-mb-px flex overflow-x-auto">
      {itens.map((i) => {
        const on = i.valor === ativo;
        return (
          <button
            key={i.valor}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onChange(i.valor)}
            className={`shrink-0 rounded-t-[3px] border border-b-0 px-3.5 py-2 text-[14px] whitespace-nowrap ${
              on
                ? 'border-linha bg-white font-bold text-[#555]'
                : 'border-transparent text-link hover:bg-[#eee]'
            }`}
          >
            {i.rotulo}
            {i.contagem !== undefined && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-px text-[11px] font-bold text-white ${
                  i.cor && i.contagem > 0 ? i.cor : 'bg-[#999]'
                }`}
              >
                {i.contagem}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
