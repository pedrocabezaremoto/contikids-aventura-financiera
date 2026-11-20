/**
 * Límites de peticiones (rate limit) de la API — TODOS los números en este archivo.
 *
 * Pensado para UN aula: ~30–40 alumnos que comparten la misma IP (NAT del colegio).
 * Por eso lo que protege de verdad es el límite POR ALUMNO / POR SECCIÓN / POR USUARIO, y el límite
 * por IP queda alto, solo como red de seguridad general. (El bloqueo por PIN, `maxPinAttempts`,
 * sigue protegiendo cada perfil aparte.)
 */
export const RATE_WINDOW_MS = 60_000;

export const RATE_LIMITS = {
  /** Por IP, alto (todo el aula junta): rutas autenticadas y cualquier ruta sin límite propio. */
  ipGeneral: 2000,
  /** Login docente: por IP (no hay otro dato fiable antes de autenticar). */
  teacherLoginPerIp: 10,
  /** Login de alumno: por alumno (`studentId` del body)… */
  studentLoginPerStudent: 10,
  /** …y por IP, alto: 40 niños entrando a la vez desde el mismo NAT no lo alcanzan. */
  studentLoginPerIp: 200,
  /** Lista de perfiles (`GET /auth/students?sectionCode=`): por sección… */
  profilesPerSection: 60,
  /** …y por IP, alto. */
  profilesPerIp: 200,
  /** Rutas autenticadas: por usuario (rol + `sub` del JWT), en total entre todas sus rutas. */
  perUser: 120,
} as const;
