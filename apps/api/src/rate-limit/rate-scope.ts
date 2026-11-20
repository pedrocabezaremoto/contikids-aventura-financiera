import { SetMetadata } from '@nestjs/common';

/** Nombres de los límites "con ámbito": solo corren en las rutas que los piden con @RateScope. */
export type RateScopeName = 'studentLogin' | 'sectionProfiles';
export const SCOPE_KEY = 'rate-scope';

/** Activa un límite con ámbito (por alumno o por sección) en una ruta. */
export const RateScope = (name: RateScopeName) => SetMetadata(SCOPE_KEY, name);

export type Req = {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: { studentId?: unknown };
  query?: { sectionCode?: unknown };
};

export const ipOf = (req: Req) => `ip:${req.ip ?? 'desconocida'}`;

/** `studentId` del body como número entero válido; si no lo es, se limita por IP. */
export function studentTracker(req: Req): string {
  const id = Number(req.body?.studentId);
  return Number.isInteger(id) && id > 0 ? `student:${id}` : ipOf(req);
}

/** Código de sección normalizado (igual que el login: sin espacios y en mayúsculas). */
export function sectionTracker(req: Req): string {
  const raw = req.query?.sectionCode;
  const code = typeof raw === 'string' ? raw.trim().toUpperCase().slice(0, 20) : '';
  return code ? `section:${code}` : ipOf(req);
}
