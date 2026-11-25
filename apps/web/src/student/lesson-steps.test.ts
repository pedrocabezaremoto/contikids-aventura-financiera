import { describe, expect, it } from 'vitest';
import type { LessonBlock } from '@contikids/shared';
import { lessonSteps } from './lesson-steps';

const block = (
  kind: string,
  text: string | null,
  assetPath: string | null = null,
): LessonBlock => ({
  id: 1,
  order: 1,
  kind,
  text,
  assetPath,
});

describe('pasos de la lección', () => {
  it('agrupa imágenes y diagramas con todos sus textos y reserva el consejo para el final', () => {
    const diagram = block('diagram', '🎁 > PIG');
    const image = block('image', 'Mi alcancía', '/alcancia.webp');
    expect(
      lessonSteps([
        block('text', 'Inicio'),
        diagram,
        block('text', 'A'),
        block('text', 'B'),
        block('waddles_tip', 'Consejo'),
        image,
        block('text', 'C'),
      ]),
    ).toEqual([
      { paragraphs: ['Inicio'] },
      { visual: diagram, paragraphs: ['A', 'B'] },
      { visual: image, paragraphs: ['C'] },
      { tip: true, paragraphs: ['Consejo'] },
    ]);
  });
  it('deja vacía la lección sin bloques visibles', () => {
    expect(
      lessonSteps([
        block('image', null),
        block('diagram', ' '),
        block('otro', '?'),
        block('text', null),
      ]),
    ).toEqual([]);
  });
});
