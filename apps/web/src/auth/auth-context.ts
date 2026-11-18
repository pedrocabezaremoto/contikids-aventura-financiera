import { createContext, useContext } from 'react';
import type { SessionUser, StudentUser, TeacherUser } from '../lib/types';

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

export interface AuthState {
  status: AuthStatus;
  user: SessionUser | null;
  loginTeacher: (email: string, password: string) => Promise<TeacherUser>;
  loginStudent: (studentId: number, pin: string) => Promise<StudentUser>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

/** Ruta de inicio según el rol. */
export const homeFor = (user: SessionUser) => (user.role === 'TEACHER' ? '/docente' : '/mapa');
