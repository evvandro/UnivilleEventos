import { Navigate, Outlet, useLocation } from 'react-router';
import { Carregando } from '../components/Ui';
import { useAuth } from '../lib/auth';

/** Sem sessão → /entrar (guardando a página de origem). */
export function RequireAuth() {
  const { usuario, carregando } = useAuth();
  const local = useLocation();
  if (carregando) return <Carregando />;
  if (!usuario) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />;
  return <Outlet />;
}

/** Só administradores; o servidor também bloqueia com 403. */
export function RequireAdmin() {
  const { usuario } = useAuth();
  if (usuario?.perfil !== 'ADMIN') return <Navigate to="/solicitacoes" replace />;
  return <Outlet />;
}
