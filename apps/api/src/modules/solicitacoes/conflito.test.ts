import { solicitacaoEnvioSchema } from '@univille/shared';
import { describe, expect, it } from 'vitest';
import { paraDate } from '../../tempo';
import { mensagemConflito, sobrepoe } from './conflito';

const faixa = (ini: string, fim: string) => ({
  inicio: paraDate('2026-11-06', ini),
  fim: paraDate('2026-11-06', fim),
});

describe('sobreposição de horários (caderno, 7.1)', () => {
  const aprovado = faixa('19:00', '20:00');

  it('19h30–21h conflita com 19h–20h', () => {
    expect(sobrepoe(aprovado, faixa('19:30', '21:00'))).toBe(true);
  });
  it('20h–21h não conflita com 19h–20h (intervalo semiaberto)', () => {
    expect(sobrepoe(aprovado, faixa('20:00', '21:00'))).toBe(false);
  });
  it('faixa que engloba a outra conflita', () => {
    expect(sobrepoe(aprovado, faixa('18:00', '22:00'))).toBe(true);
  });
  it('faixa antes não conflita', () => {
    expect(sobrepoe(aprovado, faixa('17:00', '19:00'))).toBe(false);
  });
});

describe('mensagem de conflito', () => {
  it('cita local, evento, data e horário', () => {
    const msg = mensagemConflito({
      nome: 'Workshop de Git',
      ...faixa('18:30', '20:00'),
      ambiente: { nome: 'Lab. 105' },
    });
    expect(msg).toBe(
      'Conflito de agenda: Lab. 105 já tem “Workshop de Git” aprovado em 06/11, das 18h30 às 20h00. Escolha outro horário ou local.',
    );
  });
});

describe('validação de envio (caderno, 6.2)', () => {
  const completo = {
    nome: 'Evento',
    temaId: 1,
    data: '2026-11-06',
    horaInicio: '19:00',
    horaFim: '21:00',
    ambienteId: 1,
    cursoId: 1,
    solicitanteNome: 'Ana',
    palestrante: 'Fulano',
    publicoAlvo: 'Alunos',
    justificativa: 'J',
    objetivo: 'O',
    cerimonial: false,
    haveraInscricoes: true,
    necessitaDeclaracoes: false,
  };

  it('aceita solicitação completa sem campos opcionais', () => {
    expect(solicitacaoEnvioSchema.safeParse(completo).success).toBe(true);
  });
  it('exige término depois do início', () => {
    const r = solicitacaoEnvioSchema.safeParse({ ...completo, horaFim: '18:00' });
    expect(r.success).toBe(false);
  });
  it('recusa horário fora de 00:00–23:59', () => {
    expect(solicitacaoEnvioSchema.safeParse({ ...completo, horaFim: '24:00' }).success).toBe(false);
  });
  it('trata string vazia como campo não preenchido', () => {
    expect(solicitacaoEnvioSchema.safeParse({ ...completo, palestrante: '' }).success).toBe(false);
  });
  it('exige resposta sim/não', () => {
    expect(solicitacaoEnvioSchema.safeParse({ ...completo, cerimonial: null }).success).toBe(false);
  });
});
