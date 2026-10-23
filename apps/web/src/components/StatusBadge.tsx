import { STATUS_LABEL, type Status } from '@univille/shared';

const COR: Record<Status, string> = {
  RASCUNHO: 'bg-[#777]',
  AGUARDANDO: 'bg-alerta',
  APROVADO: 'bg-ok',
  REJEITADO: 'bg-perigo',
  CANCELADO: 'bg-cancelado',
};

export function StatusBadge({ status, curto }: { status: Status; curto?: boolean }) {
  const texto = curto && status === 'AGUARDANDO' ? 'Aguardando' : STATUS_LABEL[status];
  return (
    <span
      className={`inline-block rounded-[3px] px-[7px] py-1 text-[11.5px] leading-none font-bold whitespace-nowrap text-white ${COR[status]}`}
    >
      {texto}
    </span>
  );
}
