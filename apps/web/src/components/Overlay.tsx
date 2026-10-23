import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

const FOCAVEIS = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Fecha com Esc, prende o foco dentro do painel e devolve o foco ao fechar. */
function usePainelModal(aberto: boolean, fechar: () => void) {
  const painel = useRef<HTMLDivElement>(null);
  // Guarda a função mais recente sem reexecutar o efeito (callers passam funções inline).
  const fecharRef = useRef(fechar);
  fecharRef.current = fechar;
  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    const el = painel.current;
    (el?.querySelector<HTMLElement>('[data-autofoco]') ?? el?.querySelector<HTMLElement>(FOCAVEIS))?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fecharRef.current();
      if (e.key !== 'Tab' || !el) return;
      const itens = Array.from(el.querySelectorAll<HTMLElement>(FOCAVEIS));
      if (!itens.length) return;
      const [primeiro, ultimo] = [itens[0], itens[itens.length - 1]];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener('keydown', tecla);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tecla);
      document.body.style.overflow = '';
      anterior?.focus?.();
    };
  }, [aberto]);
  return painel;
}

/** Gaveta lateral à esquerda (navegação da área autenticada). */
export function Drawer({
  aberto,
  fechar,
  titulo,
  children,
}: {
  aberto: boolean;
  fechar: () => void;
  titulo: string;
  children: ReactNode;
}) {
  const painel = usePainelModal(aberto, fechar);
  return createPortal(
    <div className={`fixed inset-0 z-50 ${aberto ? '' : 'pointer-events-none'}`} aria-hidden={!aberto}>
      <div
        className={`absolute inset-0 bg-black/35 transition-opacity duration-200 ${aberto ? 'opacity-100' : 'opacity-0'}`}
        onClick={fechar}
      />
      <div
        ref={painel}
        role={aberto ? 'dialog' : undefined}
        aria-modal={aberto || undefined}
        aria-label={titulo}
        inert={!aberto}
        className={`absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-[#f4f4f4] shadow-[2px_0_12px_rgba(0,0,0,.25)] transition-transform duration-200 ${
          aberto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Diálogo central para formulários curtos e confirmações. */
export function Modal({
  aberto,
  fechar,
  titulo,
  children,
  rodape,
  largura = 'max-w-lg',
}: {
  aberto: boolean;
  fechar: () => void;
  titulo: string;
  children: ReactNode;
  rodape?: ReactNode;
  largura?: string;
}) {
  const painel = usePainelModal(aberto, fechar);
  if (!aberto) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-black/40" onClick={fechar} />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        className={`relative w-full ${largura} bg-white shadow-[0_5px_20px_rgba(0,0,0,.3)]`}
      >
        <div className="flex items-center justify-between border-b border-linha bg-[#f5f5f5] px-4 py-3">
          <h2 id="modal-titulo" className="text-[16px] font-bold">
            {titulo}
          </h2>
          <button type="button" onClick={fechar} className="text-suave hover:text-texto" aria-label="Fechar">
            <Icon nome="fechar" />
          </button>
        </div>
        <div className="p-4">{children}</div>
        {rodape && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-linha px-4 py-3">{rodape}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
