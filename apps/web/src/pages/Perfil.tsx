import { PERFIL_LABEL } from '@univille/shared';
import { useNavigate } from 'react-router';
import { Button, LinkBotao } from '../components/Button';
import { PageHeader } from '../components/Ui';
import { inicioDoPerfil, useAuth } from '../lib/auth';
import { iniciais } from '../lib/format';

export default function Perfil() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();
  if (!usuario) return null;

  const deslogar = async () => {
    await sair();
    navigate('/', { replace: true });
  };

  return (
    <>
      <PageHeader titulo="Meu perfil" migalhas={[{ rotulo: 'Meu perfil' }]} />
      <section className="cartao max-w-xl">
        <div className="flex items-center gap-4 border-b border-linha bg-gradient-to-r from-[#4f9e36] to-[#7cc04a] px-5 py-4 text-white">
          <span className="grid size-14 place-items-center rounded-full border-2 border-white/70 bg-white/15 text-[18px] font-bold">
            {iniciais(usuario.nome)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[20px] font-bold">{usuario.nome}</p>
            <p className="text-[13px] opacity-90">{PERFIL_LABEL[usuario.perfil]}</p>
          </div>
        </div>
        <dl className="grid gap-3 px-5 py-4 text-[14px] sm:grid-cols-[140px_1fr]">
          <dt className="font-bold text-[#555]">Nome completo</dt>
          <dd>{usuario.nome}</dd>
          <dt className="font-bold text-[#555]">Matrícula (login)</dt>
          <dd className="tabular-nums">{usuario.matricula}</dd>
          <dt className="font-bold text-[#555]">E-mail</dt>
          <dd className="break-all">{usuario.email}</dd>
          <dt className="font-bold text-[#555]">Perfil</dt>
          <dd>{PERFIL_LABEL[usuario.perfil]}</dd>
        </dl>
        <p className="px-5 text-[13px] text-suave">
          Para alterar seus dados ou sua senha, fale com o setor de Eventos.
        </p>
        <div className="flex flex-wrap gap-2 px-5 py-4">
          <LinkBotao to={inicioDoPerfil(usuario)}>Ir para minha área</LinkBotao>
          <Button variante="perigo" onClick={deslogar}>
            Sair
          </Button>
        </div>
      </section>
    </>
  );
}
