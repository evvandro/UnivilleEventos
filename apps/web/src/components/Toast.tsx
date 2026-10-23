import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Tipo = 'sucesso' | 'erro';
type Item = { id: number; tipo: Tipo; texto: string };
type Ctx = { sucesso: (t: string) => void; erro: (t: string) => void };

const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<Item[]>([]);

  const mostrar = useCallback((tipo: Tipo, texto: string) => {
    const id = Date.now() + Math.random();
    setItens((l) => [...l, { id, tipo, texto }]);
    setTimeout(() => setItens((l) => l.filter((i) => i.id !== id)), tipo === 'erro' ? 6000 : 3500);
  }, []);

  const [valor] = useState<Ctx>(() => ({
    sucesso: (t) => mostrar('sucesso', t),
    erro: (t) => mostrar('erro', t),
  }));

  return (
    <ToastCtx.Provider value={valor}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end"
      >
        {itens.map((i) => (
          <div
            key={i.id}
            role={i.tipo === 'erro' ? 'alert' : 'status'}
            className={`pointer-events-auto max-w-sm border px-4 py-3 text-[14px] shadow-lg ${
              i.tipo === 'erro'
                ? 'border-[#ebccd1] bg-[#f2dede] text-[#a94442]'
                : 'border-[#d6e9c6] bg-[#dff0d8] text-[#3c763d]'
            }`}
          >
            {i.texto}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const c = useContext(ToastCtx);
  if (!c) throw new Error('useToast precisa estar dentro de <ToastProvider>');
  return c;
}
