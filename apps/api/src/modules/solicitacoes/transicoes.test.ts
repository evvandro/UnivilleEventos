import { STATUS, type Acao, type Status } from '@univille/shared';
import { describe, expect, it } from 'vitest';
import { acoesDisponiveis, verificar } from './transicoes';

const autor = (status: Status) => ({ status, ehAutor: true, ehAdmin: false });
const admin = (status: Status) => ({ status, ehAutor: false, ehAdmin: true });
const outro = (status: Status) => ({ status, ehAutor: false, ehAdmin: false });

describe('ações disponíveis por estado (caderno, seção 5)', () => {
  const esperado: Record<Status, { autor: Acao[]; admin: Acao[] }> = {
    RASCUNHO: { autor: ['editar', 'enviar', 'excluir'], admin: [] },
    AGUARDANDO: { autor: ['editar', 'cancelar'], admin: ['cancelar', 'aprovar', 'rejeitar'] },
    REJEITADO: { autor: ['editar', 'enviar'], admin: [] },
    APROVADO: { autor: [], admin: ['editar', 'cancelar'] },
    CANCELADO: { autor: [], admin: [] },
  };

  it.each(STATUS)('%s', (status) => {
    expect(acoesDisponiveis(autor(status))).toEqual(esperado[status].autor);
    expect(acoesDisponiveis(admin(status))).toEqual(esperado[status].admin);
    expect(acoesDisponiveis(outro(status))).toEqual([]);
  });
});

describe('verificar', () => {
  it('enviar leva rascunho e rejeitado para aguardando', () => {
    expect(verificar('enviar', autor('RASCUNHO'))).toEqual({ permitido: true, para: 'AGUARDANDO' });
    expect(verificar('enviar', autor('REJEITADO'))).toEqual({
      permitido: true,
      para: 'AGUARDANDO',
    });
  });

  it('aprovar e rejeitar só a partir de aguardando', () => {
    expect(verificar('aprovar', admin('AGUARDANDO'))).toEqual({
      permitido: true,
      para: 'APROVADO',
    });
    expect(verificar('rejeitar', admin('AGUARDANDO'))).toEqual({
      permitido: true,
      para: 'REJEITADO',
    });
    expect(verificar('aprovar', admin('RASCUNHO'))).toMatchObject({
      permitido: false,
      causa: 'estado',
    });
  });

  it('solicitante não altera evento aprovado', () => {
    expect(verificar('editar', autor('APROVADO'))).toMatchObject({
      permitido: false,
      causa: 'permissao',
    });
    expect(verificar('cancelar', autor('APROVADO'))).toMatchObject({
      permitido: false,
      causa: 'permissao',
    });
  });

  it('cancelado é terminal', () => {
    expect(verificar('editar', admin('CANCELADO'))).toMatchObject({
      permitido: false,
      causa: 'estado',
    });
  });
});
