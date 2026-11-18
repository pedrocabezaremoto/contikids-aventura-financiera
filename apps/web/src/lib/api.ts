/**
 * Cliente HTTP de la API (/api/v1, mismo origen).
 * - El access token vive solo en memoria (nunca en localStorage).
 * - El refresh token va en un cookie httpOnly que el navegador manda solo a /api/v1/auth.
 * - Si una petición responde 401, se intenta renovar la sesión una vez y se reintenta.
 */
import type { SessionUser } from './types';

const BASE = '/api/v1';
let accessToken: string | null = null;
let refreshing: Promise<SessionData | null> | null = null;

export interface SessionData {
  accessToken: string;
  user: SessionUser;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: { message?: string | string[]; code?: string; [k: string]: unknown } | null,
  ) {
    const msg = Array.isArray(body?.message) ? body.message[0] : body?.message;
    super(msg ?? `Error ${status}`);
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

/** Renueva la sesión con el cookie de refresh. Comparte la promesa si ya hay una en curso. */
export function refreshSession(): Promise<SessionData | null> {
  refreshing ??= fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'same-origin' })
    .then(async (res) => {
      if (!res.ok) {
        accessToken = null;
        return null;
      }
      const data = (await res.json()) as SessionData;
      accessToken = data.accessToken;
      return data;
    })
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** false para rutas públicas (login, lista de perfiles). */
  auth?: boolean;
}

export async function api<T>(path: string, opts: RequestOptions = {}, retry = true): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });

  if (res.status === 401 && auth && retry && (await refreshSession())) {
    return api<T>(path, opts, false);
  }

  const data: unknown = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data as ApiError['body']);
  return data as T;
}
