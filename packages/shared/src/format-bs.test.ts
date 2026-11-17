import { describe, expect, it } from 'vitest';
import { formatBs } from './format-bs';

describe('formatBs', () => {
  it('usa punto de miles y coma decimal', () => {
    expect(formatBs(1250)).toBe('Bs. 1.250,00');
    expect(formatBs(1234567.5)).toBe('Bs. 1.234.567,50');
  });

  it('formatea montos pequeños sin separador de miles', () => {
    expect(formatBs(0)).toBe('Bs. 0,00');
    expect(formatBs(20)).toBe('Bs. 20,00');
    expect(formatBs(80)).toBe('Bs. 80,00');
    expect(formatBs(500)).toBe('Bs. 500,00');
  });

  it('siempre muestra 2 decimales y redondea a céntimos', () => {
    expect(formatBs(12.5)).toBe('Bs. 12,50');
    expect(formatBs(1.005)).toBe('Bs. 1,01');
    expect(formatBs(999.999)).toBe('Bs. 1.000,00');
  });

  it('acepta strings numéricos (ej. Decimal de Prisma serializado)', () => {
    expect(formatBs('1250.00')).toBe('Bs. 1.250,00');
  });

  it('pone el signo delante para montos negativos', () => {
    expect(formatBs(-20)).toBe('-Bs. 20,00');
    expect(formatBs(-0.001)).toBe('Bs. 0,00');
  });

  it('nunca usa el símbolo $', () => {
    expect(formatBs(100)).not.toContain('$');
  });

  it('rechaza montos inválidos', () => {
    expect(() => formatBs(Number.NaN)).toThrow(RangeError);
    expect(() => formatBs('abc')).toThrow(RangeError);
    expect(() => formatBs(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
