import {
  computeMap,
  type MapModuleInput,
  type SubmoduleRow,
  type SubmoduleType,
} from './compute-map';

/** 5 módulos; solo M1 tiene quiz y prueba (como el seed de hoy). */
const modules: MapModuleInput[] = [1, 2, 3, 4, 5].map((n) => ({
  id: n,
  code: `M${n}`,
  order: n,
  title: `Módulo ${n}`,
  color: '#2e9ca3',
  lessonId: n * 10,
  quizId: n === 1 ? 100 : null,
  examId: n === 1 ? 101 : null,
}));

const done = (moduleId: number, ...types: SubmoduleType[]): SubmoduleRow[] =>
  types.map((type) => ({
    moduleId,
    type,
    status: 'COMPLETED',
    bestScore: 100,
    bestStars: 3,
  }));

const statusOf = (states: ReturnType<typeof computeMap>, code: string) =>
  states.find((s) => s.module.code === code)!;
const subs = (states: ReturnType<typeof computeMap>, code: string) =>
  statusOf(states, code).submodules.map((s) => s.status);

describe('computeMap', () => {
  it('alumno sin filas: M1 abierto (lección abierta, quiz y prueba cerrados), M2–M5 cerrados', () => {
    const s = computeMap(modules, []);
    expect(statusOf(s, 'M1').module.status).toBe('IN_PROGRESS');
    expect(subs(s, 'M1')).toEqual(['IN_PROGRESS', 'LOCKED', 'LOCKED']);
    for (const code of ['M2', 'M3', 'M4', 'M5']) {
      expect(statusOf(s, code).module.status).toBe('LOCKED');
      expect(subs(s, code)).toEqual(['LOCKED', 'LOCKED', 'LOCKED']);
    }
    expect(statusOf(s, 'M1').module.percent).toBe(0);
  });

  it('lección hecha → el quiz se abre (33 %)', () => {
    const s = computeMap(modules, done(1, 'LESSON'));
    expect(subs(s, 'M1')).toEqual(['COMPLETED', 'IN_PROGRESS', 'LOCKED']);
    expect(statusOf(s, 'M1').module.percent).toBe(33);
  });

  it('quiz terminado → la prueba se abre (66 %)', () => {
    const s = computeMap(modules, done(1, 'LESSON', 'QUIZ'));
    expect(subs(s, 'M1')).toEqual(['COMPLETED', 'COMPLETED', 'IN_PROGRESS']);
    expect(statusOf(s, 'M1').module.percent).toBe(66);
    expect(statusOf(s, 'M2').module.status).toBe('LOCKED');
  });

  it('prueba aprobada → M1 completo (100 %) y M2 se abre con su lección', () => {
    const s = computeMap(modules, done(1, 'LESSON', 'QUIZ', 'EXAM'));
    expect(statusOf(s, 'M1').module).toMatchObject({ status: 'COMPLETED', percent: 100 });
    expect(statusOf(s, 'M2').module.status).toBe('IN_PROGRESS');
    expect(subs(s, 'M2')).toEqual(['IN_PROGRESS', 'LOCKED', 'LOCKED']);
    expect(statusOf(s, 'M3').module.status).toBe('LOCKED');
  });

  it('módulo sin quiz o prueba en la BD → comingSoon, aunque esté abierto', () => {
    const s = computeMap(modules, done(1, 'LESSON', 'QUIZ', 'EXAM'));
    expect(statusOf(s, 'M1').module.comingSoon).toBe(false);
    expect(statusOf(s, 'M2').module.status).toBe('IN_PROGRESS');
    expect(statusOf(s, 'M2').module.comingSoon).toBe(true);
    expect(statusOf(s, 'M2').submodules.map((x) => x.refId)).toEqual([20, null, null]);
  });

  it('una fila "COMPLETED" suelta no salta el orden (prueba sin quiz no cuenta)', () => {
    const s = computeMap(modules, done(1, 'EXAM'));
    expect(subs(s, 'M1')).toEqual(['IN_PROGRESS', 'LOCKED', 'LOCKED']);
    expect(statusOf(s, 'M2').module.status).toBe('LOCKED');
  });

  it('filas de un módulo cerrado se ignoran', () => {
    const s = computeMap(modules, done(2, 'LESSON'));
    expect(subs(s, 'M2')).toEqual(['LOCKED', 'LOCKED', 'LOCKED']);
  });

  it('devuelve las mejores notas y estrellas y respeta el orden', () => {
    const rows: SubmoduleRow[] = [
      { moduleId: 1, type: 'LESSON', status: 'COMPLETED', bestScore: null, bestStars: null },
      { moduleId: 1, type: 'QUIZ', status: 'COMPLETED', bestScore: 80, bestStars: 2 },
    ];
    const s = computeMap([...modules].reverse(), rows);
    expect(s.map((x) => x.module.order)).toEqual([1, 2, 3, 4, 5]);
    expect(statusOf(s, 'M1').submodules[1]).toMatchObject({
      type: 'QUIZ',
      refId: 100,
      bestScore: 80,
      bestStars: 2,
    });
  });
});
