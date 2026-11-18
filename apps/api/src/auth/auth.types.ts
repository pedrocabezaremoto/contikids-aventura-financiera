export type Role = 'TEACHER' | 'STUDENT';

/** Contenido de los JWT (access y refresh). `sub` = id del docente o del alumno. */
export interface TokenPayload {
  sub: number;
  role: Role;
}

export interface TeacherUser {
  role: 'TEACHER';
  id: number;
  fullName: string;
  email: string;
}

export interface StudentUser {
  role: 'STUDENT';
  id: number;
  /** Nombre corto para mostrar al niño (primer nombre). */
  name: string;
  fullName: string;
  username: string;
  avatarColor: string;
  coins: number;
  xp: number;
  sectionCode: string;
}

export type SessionUser = TeacherUser | StudentUser;

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

/** Nombre del cookie httpOnly que guarda el refresh token. */
export const REFRESH_COOKIE = 'ck_refresh';
/** El cookie solo viaja a las rutas de auth. */
export const REFRESH_COOKIE_PATH = '/api/v1/auth';
export const ACCESS_TTL = '15m';
export const REFRESH_TTL_DAYS = 7;
