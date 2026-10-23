import { z } from 'zod';

// Mensagens padrão do Zod em português (as nossas mensagens customizadas continuam valendo).
z.config(z.locales.pt());

export * from './enums';
export * from './types';
export * from './schemas/solicitacao';
export * from './schemas/cadastros';

/** Transforma os erros do Zod em { campo: mensagem } (primeira mensagem de cada campo). */
export function errosPorCampo(error: z.ZodError): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const issue of error.issues) {
    const chave = issue.path.length ? String(issue.path[0]) : '_';
    if (!campos[chave]) campos[chave] = issue.message;
  }
  return campos;
}
