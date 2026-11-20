/** Contrato del mapa (api ↔ web): `GET /me/map` y `GET /modules/:ref`. Solo tipos. */
export type ProgressStatus = 'LOCKED' | 'IN_PROGRESS' | 'COMPLETED';
export type SubmoduleType = 'LESSON' | 'QUIZ' | 'EXAM';

export interface MapModule {
  id: number;
  code: string;
  order: number;
  title: string;
  color: string;
  status: ProgressStatus;
  /** Avance 0–100 (ver GAME_RULES.modulePercent). */
  percent: number;
  /** Abierto o no, le falta el quiz o la prueba en la BD: se muestra como "Próximamente". */
  comingSoon: boolean;
}

export interface MapSubmodule {
  type: SubmoduleType;
  status: ProgressStatus;
  /** lessonId / quizId según el tipo; null si ese contenido todavía no existe. */
  refId: number | null;
  bestScore: number | null;
  bestStars: number | null;
}

/** `GET /modules/:ref` */
export interface ModuleDetail {
  module: MapModule;
  submodules: MapSubmodule[];
}

/** `GET /me/map` */
export interface MapData {
  coins: number;
  xp: number;
  modules: MapModule[];
}
