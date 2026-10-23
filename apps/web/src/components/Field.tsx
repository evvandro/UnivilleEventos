import type { ReactNode } from 'react';

type Props = {
  id: string;
  rotulo: string;
  obrigatorio?: boolean;
  erro?: string;
  dica?: string;
  className?: string;
  children: ReactNode;
};

/** Rótulo + controle + mensagem de erro, com ids ligados para leitores de tela. */
export function Field({ id, rotulo, obrigatorio, erro, dica, className = '', children }: Props) {
  return (
    <div className={`grid min-w-0 content-start gap-1 ${className}`}>
      <label htmlFor={id} className="text-[13px] font-bold text-[#444]">
        {rotulo}
        {obrigatorio && <span className="ml-0.5 text-perigo" aria-hidden="true">*</span>}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} className="text-[12.5px] text-perigo" role="alert">
          {erro}
        </p>
      ) : (
        dica && <p className="text-[12.5px] text-suave">{dica}</p>
      )}
    </div>
  );
}

export const classeCampo = (erro?: string) => `campo ${erro ? 'campo-erro' : ''}`;
