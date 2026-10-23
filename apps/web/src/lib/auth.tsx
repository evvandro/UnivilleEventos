import type { UsuarioSessao } from '@univille/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';

type AuthCtx = {
  usuario: UsuarioSessao | null;
  carregando: boolean;
  entrar: (matricula: string, senha: string) => Promise<UsuarioSessao>;
  sair: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api<UsuarioSessao>('/auth/me')
      .then(setUsuario)
      .catch(() => setUsuario(null))
      .finally(() => setCarregando(false));
    const expirou = () => setUsuario(null);
    window.addEventListener('sessao-expirada', expirou);
    return () => window.removeEventListener('sessao-expirada', expirou);
  }, []);

  const entrar = useCallback(async (matricula: string, senha: string) => {
    const u = await api<UsuarioSessao>('/auth/login', {
      method: 'POST',
      body: { matricula, senha },
    });
    setUsuario(u);
    return u;
  }, []);

  const sair = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setUsuario(null);
  }, []);

  const valor = useMemo(
    () => ({ usuario, carregando, entrar, sair }),
    [usuario, carregando, entrar, sair],
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return c;
}

/** Página inicial de cada perfil depois do login. */
export const inicioDoPerfil = (u: UsuarioSessao) =>
  u.perfil === 'ADMIN' ? '/admin/solicitacoes' : '/solicitacoes';
