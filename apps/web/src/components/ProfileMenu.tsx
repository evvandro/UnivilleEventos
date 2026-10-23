import { PERFIL_LABEL } from '@univille/shared';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { inicioDoPerfil, useAuth } from '../lib/auth';
import { iniciais } from '../lib/format';
import { Icon } from './Icon';

/** Avatar no canto da barra: Entrar (sem sessão) ou menu com Perfil, Minha área e Sair. */
export function ProfileMenu({ mostrarMinhaArea }: { mostrarMinhaArea?: boolean }) {
  const { usuario, sair } = useAuth();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !caixa.current?.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto]);

  if (!usuario) {
    return (
      <Link
        to="/entrar"
        className="rounded-[4px] border border-white/60 px-3.5 py-1.5 text-[14px] text-white no-underline hover:bg-white/10"
      >
        Entrar
      </Link>
    );
  }

  const deslogar = async () => {
    setAberto(false);
    await sair();
    navigate('/', { replace: true });
  };

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2 rounded-[4px] px-1.5 py-1 text-white hover:bg-white/10"
      >
        <span className="grid size-8 place-items-center rounded-full border-2 border-white/70 bg-white/15 text-[12px] font-bold">
          {iniciais(usuario.nome)}
        </span>
        <span className="hidden max-w-[180px] truncate text-[13px] font-bold uppercase sm:inline">{usuario.nome}</span>
        <span className="text-[10px] opacity-80">▼</span>
      </button>
      {aberto && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-1 w-64 border border-black/15 bg-white py-1 text-texto shadow-[0_6px_12px_rgba(0,0,0,.18)]"
        >
          <div className="border-b border-[#eee] px-4 py-2.5">
            <p className="truncate text-[14px] font-bold">{usuario.nome}</p>
            <p className="truncate text-[12.5px] text-suave">Matrícula {usuario.matricula}</p>
            <p className="mt-1 text-[11.5px] font-bold tracking-wide text-uni uppercase">{PERFIL_LABEL[usuario.perfil]}</p>
          </div>
          {mostrarMinhaArea && (
            <MenuItem to={inicioDoPerfil(usuario)} icone="lista" onClick={() => setAberto(false)}>
              Minha área
            </MenuItem>
          )}
          <MenuItem to="/perfil" icone="perfil" onClick={() => setAberto(false)}>
            Meu perfil
          </MenuItem>
          <button
            role="menuitem"
            type="button"
            onClick={deslogar}
            className="flex w-full items-center gap-2.5 border-t border-[#eee] px-4 py-2 text-left text-[14px] text-[#a94442] hover:bg-[#f5f5f5]"
          >
            <Icon nome="sair" className="size-4" /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  to,
  icone,
  onClick,
  children,
}: {
  to: string;
  icone: 'lista' | 'perfil';
  onClick: () => void;
  children: string;
}) {
  return (
    <Link
      role="menuitem"
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2 text-[14px] text-texto no-underline hover:bg-[#f5f5f5]"
    >
      <Icon nome={icone} className="size-4 text-suave" /> {children}
    </Link>
  );
}
