import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { Loading } from '../components/ui';
import type { Role } from '../lib/types';
import { homeFor, useAuth } from './auth-context';

/** Ruta protegida: exige sesión y el rol indicado; si no, redirige. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { status, user } = useAuth();
  if (status === 'loading') return <Loading />;
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== role) return <Navigate to={homeFor(user)} replace />;
  return children;
}
