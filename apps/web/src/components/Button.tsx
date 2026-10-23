import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';

type Variante = 'primario' | 'padrao' | 'perigo' | 'sucesso' | 'fantasma';

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-[4px] border font-normal whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-60';
const TAMANHO = { sm: 'h-7 px-2.5 text-[13px]', md: 'h-9 px-4 text-[14px]' };
const VARIANTE: Record<Variante, string> = {
  primario: 'border-azul-borda bg-azul text-white hover:bg-azul-escuro',
  padrao: 'border-[#ccc] bg-white text-texto hover:bg-[#e6e6e6]',
  perigo: 'border-[#ac2925] bg-perigo text-white hover:bg-[#ac2925]',
  sucesso: 'border-[#2f6f2f] bg-ok text-white hover:bg-[#2f6f2f]',
  fantasma: 'border-transparent bg-transparent text-link hover:bg-black/5',
};

export const classesBotao = (v: Variante = 'padrao', t: 'sm' | 'md' = 'md') =>
  `${BASE} ${TAMANHO[t]} ${VARIANTE[v]}`;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tamanho?: 'sm' | 'md';
  carregando?: boolean;
};

export function Button({ variante, tamanho, carregando, className = '', children, disabled, ...p }: Props) {
  return (
    <button
      type="button"
      {...p}
      disabled={disabled || carregando}
      className={`${classesBotao(variante, tamanho)} ${className}`}
    >
      {carregando && (
        <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
      )}
      {children}
    </button>
  );
}

export function LinkBotao({
  variante,
  tamanho,
  className = '',
  ...p
}: LinkProps & { variante?: Variante; tamanho?: 'sm' | 'md' }) {
  return <Link {...p} className={`${classesBotao(variante, tamanho)} no-underline ${className}`} />;
}
