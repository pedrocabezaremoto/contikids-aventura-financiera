/**
 * Rate limit del aula: los controladores REALES (auth + progreso) con servicios de mentira,
 * detrás del mismo guard y la misma configuración que en producción.
 */
import { ValidationPipe, VersioningType, type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { TokensService } from '../auth/tokens.service';
import { ProgressModule } from '../progress/progress.module';
import { ProgressService } from '../progress/progress.service';
import { RateLimitModule } from './rate-limit.module';
import { RATE_LIMITS } from './rate-limits';

const auth = {
  studentLogin: jest.fn(async () => ({ accessToken: 'a', refreshToken: 'r', user: {} })),
  teacherLogin: jest.fn(async () => ({ accessToken: 'a', refreshToken: 'r', user: {} })),
  listStudents: jest.fn(async () => ({ students: [] })),
};
const progress = { getMap: jest.fn(async () => ({ coins: 0, xp: 0, modules: [] })) };
/** Token de mentira: "student:5" / "teacher:1". */
const tokens = {
  verifyAccess: jest.fn(async (t: string) => {
    const [role, sub] = t.split(':');
    if ((role !== 'student' && role !== 'teacher') || !sub) throw new Error('token inválido');
    return { sub: Number(sub), role: role === 'student' ? 'STUDENT' : 'TEACHER' };
  }),
};

let app: INestApplication;
let base: string;

beforeEach(async () => {
  const mod = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      RateLimitModule,
      ProgressModule,
    ],
  })
    .overrideProvider(AuthService)
    .useValue(auth)
    .overrideProvider(TokensService)
    .useValue(tokens)
    .overrideProvider(ProgressService)
    .useValue(progress)
    .compile();
  app = mod.createNestApplication();
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  base = `${await app.getUrl()}/api/v1`;
});
afterEach(() => app.close());

const studentLogin = (studentId: number) =>
  fetch(`${base}/auth/student/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ studentId, pin: '1234' }),
  }).then((r) => r.status);

const teacherLogin = () =>
  fetch(`${base}/auth/teacher/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'docente@contikids.test', password: 'x' }),
  }).then((r) => r.status);

const profiles = (sectionCode: string) =>
  fetch(`${base}/auth/students?sectionCode=${encodeURIComponent(sectionCode)}`).then(
    (r) => r.status,
  );

const getMap = (token?: string) =>
  fetch(`${base}/me/map`, { headers: token ? { authorization: `Bearer ${token}` } : {} }).then(
    (r) => r.status,
  );

describe('rate limit del aula', () => {
  it('40 alumnos distintos entrando desde la MISMA IP pasan (no es por IP)', async () => {
    const statuses: number[] = [];
    for (let id = 1; id <= 40; id++) statuses.push(await studentLogin(id));
    expect(statuses.every((s) => s === 200)).toBe(true);
  });

  it('el mismo alumno: 10 intentos pasan y el 11.º recibe 429; otro alumno sigue entrando', async () => {
    for (let i = 0; i < RATE_LIMITS.studentLoginPerStudent; i++) {
      expect(await studentLogin(7)).toBe(200);
    }
    expect(await studentLogin(7)).toBe(429);
    expect(await studentLogin(8)).toBe(200);
  });

  it('login docente: por IP, 10 por minuto', async () => {
    for (let i = 0; i < RATE_LIMITS.teacherLoginPerIp; i++) expect(await teacherLogin()).toBe(200);
    expect(await teacherLogin()).toBe(429);
  });

  it('perfiles: 60 por sección (da igual cómo se escriba el código); otra sección no se afecta', async () => {
    for (let i = 0; i < RATE_LIMITS.profilesPerSection; i++) {
      expect(await profiles(i % 2 ? 'demo-5a ' : 'DEMO-5A')).toBe(200);
    }
    expect(await profiles('DEMO-5A')).toBe(429);
    expect(await profiles('OTRA-6B')).toBe(200);
  });

  it('rutas autenticadas: 120 por usuario; otro usuario no se afecta', async () => {
    for (let i = 0; i < RATE_LIMITS.perUser; i++) expect(await getMap('student:5')).toBe(200);
    expect(await getMap('student:5')).toBe(429);
    expect(await getMap('student:6')).toBe(200);
  });

  it('el docente recibe 403 en /me/map, sin token 401 y con token inválido 401', async () => {
    expect(await getMap('teacher:1')).toBe(403);
    expect(await getMap()).toBe(401);
    expect(await getMap('basura')).toBe(401);
    expect(await getMap('student:5')).toBe(200);
  });
});
