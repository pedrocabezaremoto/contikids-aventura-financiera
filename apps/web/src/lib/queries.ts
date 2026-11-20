import { QueryClient, useQuery } from '@tanstack/react-query';
import type { MapData, ModuleDetail } from '@contikids/shared';
import { api } from './api';

/**
 * Cliente de TanStack Query. Se vacía al entrar y al salir (ver AuthProvider): en el aula
 * varios niños usan el mismo equipo y nadie debe ver datos del anterior.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

export const mapKey = ['me', 'map'] as const;

/** Mapa de islas + monedas y XP del alumno (el HUD también lee de aquí). */
export function useMap() {
  return useQuery({ queryKey: mapKey, queryFn: () => api<MapData>('/me/map') });
}

/** Los 3 submódulos de un módulo. `ref` = código (m1) o id. */
export function useModuleDetail(ref: string | undefined) {
  return useQuery({
    queryKey: ['modules', ref?.toLowerCase()],
    queryFn: () => api<ModuleDetail>(`/modules/${encodeURIComponent(ref ?? '')}`),
    enabled: Boolean(ref),
  });
}
