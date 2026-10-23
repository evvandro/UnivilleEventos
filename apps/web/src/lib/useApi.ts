import { useCallback, useEffect, useState } from 'react';
import { api, mensagemDe } from './api';

/** GET simples com estado de carregamento, erro e recarga. */
export function useApi<T>(caminho: string | null) {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(Boolean(caminho));
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!caminho) return;
    let ativo = true;
    setCarregando(true);
    api<T>(caminho)
      .then((d) => {
        if (!ativo) return;
        setDados(d);
        setErro(null);
      })
      .catch((e) => ativo && setErro(mensagemDe(e)))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [caminho, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  return { dados, carregando, erro, recarregar, setDados };
}
