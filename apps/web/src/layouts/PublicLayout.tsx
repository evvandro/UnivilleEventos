import { Link, Outlet } from 'react-router';
import { ProfileMenu } from '../components/ProfileMenu';

export function Marca() {
  return (
    <Link
      to="/"
      aria-label="Univille Eventos: agenda"
      className="flex items-center gap-2.5 text-white no-underline"
    >
      <img
        src="/logo-univille.png"
        alt="Univille"
        width={125}
        height={28}
        className="block h-7 w-auto"
      />
      <span className="border-l border-white/45 pl-2.5 text-[13px] leading-none opacity-85">
        eventos
      </span>
    </Link>
  );
}

export function Rodape() {
  return (
    <footer className="px-4 pt-8 pb-10 text-center text-[13px] text-[#555]">
      <p>Univille Eventos 0.1 · Software Engineering Challenge 2026</p>
    </footer>
  );
}

/** Área pública: barra verde com a marca e o acesso (Entrar ou perfil). Sem gaveta. */
export function PublicLayout() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 flex h-[58px] items-center gap-4 bg-uni px-4 shadow-[0_1px_3px_rgba(0,0,0,.25)] sm:px-6">
        <Marca />
        <div className="ml-auto">
          <ProfileMenu mostrarMinhaArea />
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <Rodape />
    </div>
  );
}
