type Props = {
  id: string;
  rotulo: string;
  valor: boolean | null;
  onChange: (v: boolean) => void;
  obrigatorio?: boolean;
  erro?: string;
  disabled?: boolean;
};

/** Pergunta sim/não com dois botões (radiogroup acessível). */
export function SimNao({ id, rotulo, valor, onChange, obrigatorio, erro, disabled }: Props) {
  const opcao = (v: boolean, texto: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={valor === v}
      disabled={disabled}
      onClick={() => onChange(v)}
      className={`h-7 px-3 text-[13px] first:border-r first:border-[#ccc] ${
        valor === v ? 'bg-azul text-white' : 'bg-white text-texto hover:bg-[#f0f0f0]'
      }`}
    >
      {texto}
    </button>
  );
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dotted border-linha py-1.5 last:border-b-0">
      <span id={`${id}-rotulo`} className="text-[14px]">
        {rotulo}
        {obrigatorio && <span className="ml-0.5 text-perigo">*</span>}
        {erro && <span className="ml-2 text-[12.5px] text-perigo">{erro}</span>}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-rotulo`}
        className={`inline-flex overflow-hidden rounded-[3px] border ${erro ? 'border-perigo' : 'border-[#ccc]'}`}
      >
        {opcao(true, 'Sim')}
        {opcao(false, 'Não')}
      </div>
    </div>
  );
}
