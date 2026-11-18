import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, refreshSession, setAccessToken, type SessionData } from '../lib/api';
import type { SessionUser, StudentUser, TeacherUser } from '../lib/types';
import { AuthContext, type AuthState, type AuthStatus } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);

  // Al abrir la app: si hay cookie de refresh, se recupera la sesión.
  useEffect(() => {
    let alive = true;
    void refreshSession().then((s) => {
      if (!alive) return;
      setUser(s?.user ?? null);
      setStatus(s ? 'authenticated' : 'anonymous');
    });
    return () => {
      alive = false;
    };
  }, []);

  const start = useCallback((s: SessionData) => {
    setAccessToken(s.accessToken);
    setUser(s.user);
    setStatus('authenticated');
  }, []);

  const loginTeacher = useCallback(
    async (email: string, password: string) => {
      const s = await api<SessionData>('/auth/teacher/login', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });
      start(s);
      return s.user as TeacherUser;
    },
    [start],
  );

  const loginStudent = useCallback(
    async (studentId: number, pin: string) => {
      const s = await api<SessionData>('/auth/student/login', {
        method: 'POST',
        body: { studentId, pin },
        auth: false,
      });
      start(s);
      return s.user as StudentUser;
    },
    [start],
  );

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST', auth: false }).catch(() => undefined);
    setAccessToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo<AuthState>(
    () => ({ status, user, loginTeacher, loginStudent, logout }),
    [status, user, loginTeacher, loginStudent, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
