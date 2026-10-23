import type { ContagemStatus } from '@univille/shared';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Icon, type NomeIcone } from '../components/Icon';
import { Drawer } from '../components/Overlay';
import { ProfileMenu } from '../components/ProfileMenu';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Marca, Rodape } from './PublicLayout';

type Item = { para: string; rotulo: string; icone: NomeIcone; contador?: number; fim?: boolean };

/**
 * Área autenticada: a navegação fica numa gaveta lateral aberta pelo botão Menu.
 * O perfil (com Sair) fica sempre visível no canto da barra.
 */
export function AppLayout() {
  const { usuario, sair } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [pendentes, setPendentes] = useState<number | undefined>();
  const local = useLocation();
  const navigate = useNavigate();
  const ehAdmin = usuario?.perfil === 'ADMIN';

  useEffect(() => setAberto(false), [local.pathname]);

  useEffect(() => {
    if (!ehAdmin) return;
    api<ContagemStatus>('/admin/solicitacoes/contagem')
      .then((c) => setPendentes(c.AGUARDANDO))
      .catch(() => undefined);
  }, [ehAdmin, local.pathname]);

  const solicitante: Item[] = [
    { para: '/', rotulo: 'Agenda pública', icone: 'agenda', fim: true },
    { para: '/solicitacoes', rotulo: 'Minhas solicitações', icone: 'lista', fim: true },
    { para: '/solicitacoes/nova', rotulo: 'Nova solicitação', icone: 'mais' },
  ];
  const admin: Item[] = [
    { para: '/admin/solicitacoes', rotulo: 'Fila de aprovação', icone: 'fila', contador: pendentes },
    { para: '/admin/cadastros', rotulo: 'Cadastros', icone: 'cadastro' },
    { para: '/admin/usuarios', rotulo: 'Usuários', icone: 'usuarios' },
    { para: '/admin/relatorios', rotulo: 'Relatórios', icone: 'relatorio' },
    { para: '/admin/configuracoes', rotulo: 'Configurações', icone: 'config' },
  ];

  const deslogar = async () => {
    await sair();
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 flex h-[58px] items-center gap-3 bg-uni px-3 shadow-[0_1px_3px_rgba(0,0,0,.25)] sm:gap-4 sm:px-5">
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          aria-expanded={aberto}
          className="flex items-center gap-2 rounded-[4px] border border-white/55 px-2.5 py-1.5 text-[14px] text-white hover:bg-white/10"
        >
          <Icon nome="menu" className="size-[18px]" />
          <span className="hidden sm:inline">Menu</span>
          {ehAdmin && !!pendentes && (
            <span className="rounded-full bg-alerta px-1.5 text-[11px] font-bold">{pendentes}</span>
          )}
        </button>
        <Marca />
        <div className="ml-auto">
          <ProfileMenu />
        </div>
      </header>

      <Drawer aberto={aberto} fechar={() => setAberto(false)} titulo="Menu principal">
        <div className="flex items-center justify-between border-b border-[#e2e2e2] bg-[#ebebeb] px-4 py-3">
          <div className="flex items-center gap-2">
            <span role="img" aria-label="Univille" className="logo-verde h-7 w-[125px]" />
            <span className="text-[12px] font-bold text-[#5aa83c]">eventos</span>
          </div>
          <button type="button" onClick={() => setAberto(false)} aria-label="Fechar menu" className="text-suave">
            <Icon nome="fechar" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2" aria-label="Navegação">
          <Grupo itens={solicitante} />
          {ehAdmin && <Grupo titulo="Administração" itens={admin} />}
        </nav>
        <div className="border-t border-[#e2e2e2] py-2">
          <Grupo itens={[{ para: '/perfil', rotulo: 'Meu perfil', icone: 'perfil' }]} />
          <button
            type="button"
            onClick={deslogar}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[15px] text-[#a94442] hover:bg-[#ebebeb]"
          >
            <Icon nome="sair" /> Sair
          </button>
        </div>
      </Drawer>

      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pt-6 pb-4 sm:px-6">
        <Outlet />
      </main>
      <Rodape />
    </div>
  );
}

function Grupo({ titulo, itens }: { titulo?: string; itens: Item[] }) {
  return (
    <div className="py-1">
      {titulo && (
        <p className="px-4 pt-3 pb-1 text-[11.5px] font-bold tracking-[.08em] text-suave uppercase">{titulo}</p>
      )}
      <ul>
        {itens.map((i) => (
          <li key={i.para}>
            <NavLink
              to={i.para}
              end={i.fim}
              className={({ isActive }) =>
                `flex items-center gap-3 border-l-[3px] px-4 py-2.5 text-[15px] no-underline ${
                  isActive
                    ? 'border-uni bg-white font-bold text-texto'
                    : 'border-transparent text-link hover:bg-[#ebebeb]'
                }`
              }
            >
              <Icon nome={i.icone} className="size-5 shrink-0 text-uni" />
              <span className="flex-1">{i.rotulo}</span>
              {!!i.contador && (
                <span className="rounded-full bg-alerta px-2 py-px text-[11.5px] font-bold text-white">
                  {i.contador}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
