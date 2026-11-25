import { describe, expect, it, vi } from 'vitest';
import { shuffleOptions } from './quiz-options';

describe('opciones del Quiz', () => {
  it('baraja sin cambiar el contenido recibido de la API', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const source = Object.freeze([{ id: 1 }, { id: 2 }, { id: 3 }]);
      expect(shuffleOptions(source).map((o) => o.id)).toEqual([2, 3, 1]);
      expect(source.map((o) => o.id)).toEqual([1, 2, 3]);
    } finally {
      random.mockRestore();
    }
  });
});
