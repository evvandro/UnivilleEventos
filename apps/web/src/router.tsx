import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './layouts/AppLayout';
import { RequireAdmin, RequireAuth } from './layouts/Guards';
import { PublicLayout } from './layouts/PublicLayout';
import AgendaImpressao from './pages/admin/AgendaImpressao';
import Cadastros from './pages/admin/Cadastros';
import Configuracoes from './pages/admin/Configuracoes';
import Fila from './pages/admin/Fila';
import Relatorios from './pages/admin/Relatorios';
import Usuarios from './pages/admin/Usuarios';
import Agenda from './pages/Agenda';
import Entrar from './pages/Entrar';
import Perfil from './pages/Perfil';
import FormSolicitacao from './pages/solicitacoes/Form';
import MinhasSolicitacoes from './pages/solicitacoes/Lista';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <Agenda /> },
      { path: '/entrar', element: <Entrar /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        // Página de impressão: sem barra nem gaveta.
        element: <RequireAdmin />,
        children: [{ path: '/admin/relatorios/agenda', element: <AgendaImpressao /> }],
      },
      {
        element: <AppLayout />,
        children: [
          { path: '/perfil', element: <Perfil /> },
          { path: '/solicitacoes', element: <MinhasSolicitacoes /> },
          { path: '/solicitacoes/nova', element: <FormSolicitacao /> },
          { path: '/solicitacoes/:id', element: <FormSolicitacao /> },
          {
            element: <RequireAdmin />,
            children: [
              { path: '/admin/solicitacoes', element: <Fila /> },
              {
                path: '/admin/cadastros',
                element: <Navigate to="/admin/cadastros/temas" replace />,
              },
              { path: '/admin/cadastros/:tipo', element: <Cadastros /> },
              { path: '/admin/usuarios', element: <Usuarios /> },
              { path: '/admin/relatorios', element: <Relatorios /> },
              { path: '/admin/configuracoes', element: <Configuracoes /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
