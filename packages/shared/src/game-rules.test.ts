import { describe, expect, it } from 'vitest';
import { GAME_RULES } from './game-rules';

describe('GAME_RULES', () => {
  it('la nota baja de 1 a 0,5 a 0 con cada intento', () => {
    const { firstTry, secondTry, fail } = GAME_RULES.points;
    expect([firstTry, secondTry, fail]).toEqual([1, 0.5, 0]);
  });

  it('XP y bono según la decisión de Pedro', () => {
    expect(GAME_RULES.xp).toEqual({ lesson: 20, quiz: 30, exam: 50 });
    expect(GAME_RULES.coins.examPassBonus).toBe(5);
  });

  it('el avance del módulo sube y termina en 100', () => {
    const { start, lesson, quiz, exam } = GAME_RULES.modulePercent;
    expect([start, lesson, quiz, exam]).toEqual([0, 33, 66, 100]);
  });

  it('las estrellas siempre son al menos 1 y máximo 3', () => {
    expect(GAME_RULES.stars.min).toBe(1);
    expect(GAME_RULES.stars.max).toBe(3);
  });
});
