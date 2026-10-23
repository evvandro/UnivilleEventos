import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Alerta } from '../components/Ui';
import { mensagemDe } from '../lib/api';
import { inicioDoPerfil, useAuth } from '../lib/auth';

/** Login no visual do Enturma: foto borrada ao fundo e caixa branca central. */
export default function Entrar() {
  const { usuario, entrar } = useAuth();
  const navigate = useNavigate();
  const local = useLocation();
  const de = (local.state as { de?: string } | null)?.de;
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={de ?? inicioDoPerfil(usuario)} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    const m = matricula.trim();
    if (!m) return setErro('Informe a matrícula.');
    if (!/^\d+$/.test(m)) return setErro('A matrícula deve conter apenas números.');
    if (!senha) return setErro('Informe a senha.');
    setEnviando(true);
    try {
      const u = await entrar(m, senha);
      navigate(de ?? inicioDoPerfil(u), { replace: true });
    } catch (err) {
      setErro(mensagemDe(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-58px)] bg-[#4a3218] bg-[url(/bg.png)] bg-cover bg-fixed bg-center px-4 pt-[min(150px,18vh)] pb-16 text-center">
      <form
        onSubmit={onSubmit}
        noValidate
        className="inline-grid w-[415px] max-w-full gap-3 bg-white px-[22px] pt-[26px] pb-[30px] text-left shadow-[0_1px_4px_rgba(0,0,0,.18)]"
        aria-labelledby="titulo-login"
      >
        {erro && <Alerta>{erro}</Alerta>}
        <label htmlFor="matricula" className="sr-only">
          Matrícula
        </label>
        <input
          id="matricula"
          type="text"
          inputMode="numeric"
          autoComplete="username"
          placeholder="Matrícula"
          maxLength={20}
          required
          value={matricula}
          onChange={(e) => setMatricula(e.target.value.replace(/\D/g, ''))}
          className="campo h-[38px] text-[15px]"
          data-autofoco
        />
        <label htmlFor="senha" className="sr-only">
          Senha
        </label>
        <input
          id="senha"
          type="password"
          autoComplete="current-password"
          placeholder="Senha"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="campo h-[38px] text-[15px]"
        />
        <div>
          <Button
            type="submit"
            variante="primario"
            carregando={enviando}
            className="mt-1 px-[18px] text-[15px]"
          >
            Entrar
          </Button>
        </div>
        <p className="mt-2 text-center text-[13px] text-suave">
          Não tem acesso? Entre em contato com a Administração.
        </p>
      </form>
      <nav className="mt-8 text-[15px] text-[#cfe3ff] [text-shadow:0_1px_6px_rgba(0,0,0,.5)]">
        <Link to="/" className="text-[#cfe3ff]">
          Voltar para a agenda
        </Link>
      </nav>
    </div>
  );
}
