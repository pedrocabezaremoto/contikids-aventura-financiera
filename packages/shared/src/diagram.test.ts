import { describe, expect, it } from 'vitest';
import { LESSONS, QUIZZES } from '../../../apps/api/prisma/seed-data';
import { parseDiagram } from './diagram';

describe('parseDiagram', () => {
  const diagrams = [
    ...LESSONS.flatMap((l) => l.blocks.filter((b) => b.kind === 'diagram').map((b) => b.text)),
    ...QUIZZES.flatMap((quiz) =>
      quiz.questions.flatMap(({ payload }) =>
        [payload?.visual, payload?.result, payload?.example].filter(
          (v): v is string => typeof v === 'string',
        ),
      ),
    ),
  ];
  it.each(diagrams)('reconoce todos los símbolos del seed en %s', (diagram) => {
    const tokens = parseDiagram(diagram);
    expect(tokens).toHaveLength(diagram.split(' ').length);
    expect(tokens.some((t) => t.kind === 'text')).toBe(false);
    expect(tokens).toContainEqual({ kind: 'arrow' });
    expect(tokens).toContainEqual({ kind: 'pig' });
  });
  it('conserva el orden, la cantidad, el emoji, los colores y los espacios', () => {
    expect(
      parseDiagram('  👵 > 20 COIN COIN PIG @gLO_TENGO @rGASTO @bMI_CAJA + otro_texto '),
    ).toEqual([
      { kind: 'emoji', text: '👵' },
      { kind: 'arrow' },
      { kind: 'coin', amount: '20' },
      { kind: 'coin' },
      { kind: 'pig' },
      { kind: 'label', color: 'green', text: 'LO TENGO' },
      { kind: 'label', color: 'red', text: 'GASTO' },
      { kind: 'label', color: 'blue', text: 'MI CAJA' },
      { kind: 'text', text: '+' },
      { kind: 'text', text: 'otro texto' },
    ]);
    expect(parseDiagram('  ')).toEqual([]);
  });
});
