import { describe, expect, it } from 'vitest';
import { configDoAmbiente, criarControleDeTentativas, PADRAO } from './tentativas';

describe('proteção contra força bruta', () => {
  it('bloqueia a conta depois de 5 erros e libera após a janela', () => {
    let t = 0;
    const c = criarControleDeTentativas(PADRAO, () => t);
    for (let i = 0; i < PADRAO.maxPorConta; i++) c.registrarErro('1.1.1.1', '2026000002');
    expect(c.bloqueioRestante('1.1.1.1', '2026000002')).toBeGreaterThan(0);
    expect(c.bloqueioRestante('1.1.1.1', '2026000003')).toBe(0);
    t += PADRAO.janelaMs + 1;
    expect(c.bloqueioRestante('1.1.1.1', '2026000002')).toBe(0);
  });

  it('login certo zera o contador da conta', () => {
    const c = criarControleDeTentativas(PADRAO, () => 0);
    for (let i = 0; i < PADRAO.maxPorConta - 1; i++) c.registrarErro('ip', '1');
    c.registrarSucesso('ip', '1');
    c.registrarErro('ip', '1');
    expect(c.bloqueioRestante('ip', '1')).toBe(0);
  });

  it('bloqueia o IP que tenta muitas contas diferentes', () => {
    const c = criarControleDeTentativas(PADRAO, () => 0);
    for (let i = 0; i < PADRAO.maxPorIp; i++) c.registrarErro('ip', String(i));
    expect(c.bloqueioRestante('ip', '999')).toBeGreaterThan(0);
    expect(c.bloqueioRestante('outro-ip', '999')).toBe(0);
  });

  it('limite por IP pode ser desligado (rede com NAT, ex.: Wi-Fi da faculdade)', () => {
    const c = criarControleDeTentativas({ ...PADRAO, maxPorIp: 0 }, () => 0);
    for (let i = 0; i < 100; i++) c.registrarErro('ip-da-faculdade', String(i));
    expect(c.bloqueioRestante('ip-da-faculdade', 'admin')).toBe(0);
  });

  it('lê a configuração do ambiente', () => {
    expect(configDoAmbiente({ LOGIN_MAX_POR_IP: '0', LOGIN_JANELA_MIN: '5' })).toEqual({
      maxPorConta: 5,
      maxPorIp: 0,
      janelaMs: 5 * 60000,
    });
    expect(configDoAmbiente({})).toEqual(PADRAO);
  });
});
