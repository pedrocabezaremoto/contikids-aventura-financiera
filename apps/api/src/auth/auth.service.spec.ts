import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import type { TokensService } from './tokens.service';

const PIN = '4821';

function makeStudent(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    sectionId: 1,
    fullName: 'Luisa P.',
    username: 'luisa_p',
    age: 9,
    pinHash: '',
    avatarColor: '#2e9ca3',
    coins: 3,
    xp: 40,
    failedPinCount: 0,
    lockedUntil: null as Date | null,
    lastLoginAt: null,
    totalPlaySecs: 0,
    createdAt: new Date(),
    section: { id: 1, code: 'DEMO-5A', grade: '5to', schoolTerm: '2026-2027', teacherId: 1 },
    ...overrides,
  };
}

function setup(student: ReturnType<typeof makeStudent> | null) {
  const update = jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    ...student,
    ...data,
  }));
  const prisma = {
    systemSettings: {
      findUnique: jest.fn().mockResolvedValue({ id: 1, maxPinAttempts: 3, pinLockMinutes: 5 }),
    },
    student: { findUnique: jest.fn().mockResolvedValue(student), update },
  } as unknown as PrismaService;
  const tokens = {
    signAccess: jest.fn().mockResolvedValue('access.jwt'),
    signRefresh: jest.fn().mockResolvedValue('refresh.jwt'),
  } as unknown as TokensService;
  return { service: new AuthService(prisma, tokens), update };
}

describe('AuthService.studentLogin', () => {
  let pinHash: string;
  beforeAll(async () => {
    pinHash = await argon2.hash(PIN);
  });

  it('PIN correcto: entrega tokens, resetea los fallos y registra lastLoginAt', async () => {
    const { service, update } = setup(makeStudent({ pinHash, failedPinCount: 2 }));
    const r = await service.studentLogin(7, PIN);

    expect(r.accessToken).toBe('access.jwt');
    expect(r.refreshToken).toBe('refresh.jwt');
    expect(r.user).toMatchObject({ role: 'STUDENT', id: 7, name: 'Luisa', sectionCode: 'DEMO-5A' });
    expect(r.user).not.toHaveProperty('pinHash');
    const data = update.mock.calls[0]![0].data;
    expect(data).toMatchObject({ failedPinCount: 0, lockedUntil: null });
    expect(data.lastLoginAt).toBeInstanceOf(Date);
  });

  it('PIN incorrecto: 401, suma un fallo y dice cuántos intentos quedan', async () => {
    const { service, update } = setup(makeStudent({ pinHash, failedPinCount: 0 }));
    await expect(service.studentLogin(7, '0000')).rejects.toMatchObject({
      response: { code: 'WRONG_PIN', attemptsLeft: 2 },
    });
    await expect(service.studentLogin(7, '0000')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(update.mock.calls[0]![0].data).toEqual({ failedPinCount: 1 });
  });

  it('bloqueo: al llegar a maxPinAttempts queda en pausa pinLockMinutes (423)', async () => {
    const { service, update } = setup(makeStudent({ pinHash, failedPinCount: 2 }));
    const before = Date.now();
    const err = await service.studentLogin(7, '0000').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(HttpStatus.LOCKED);
    const data = update.mock.calls[0]![0].data as { failedPinCount: number; lockedUntil: Date };
    expect(data.failedPinCount).toBe(0);
    const lockMs = data.lockedUntil.getTime() - before;
    expect(lockMs).toBeGreaterThanOrEqual(5 * 60_000 - 1000);
    expect(lockMs).toBeLessThanOrEqual(5 * 60_000 + 1000);
  });

  it('perfil bloqueado: rechaza incluso el PIN correcto y no toca la BD', async () => {
    const lockedUntil = new Date(Date.now() + 3 * 60_000);
    const { service, update } = setup(makeStudent({ pinHash, lockedUntil }));
    await expect(service.studentLogin(7, PIN)).rejects.toMatchObject({
      response: { code: 'LOCKED', minutesLeft: 3 },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('el bloqueo vencido ya no impide entrar', async () => {
    const lockedUntil = new Date(Date.now() - 60_000);
    const { service } = setup(makeStudent({ pinHash, lockedUntil }));
    await expect(service.studentLogin(7, PIN)).resolves.toMatchObject({
      accessToken: 'access.jwt',
    });
  });

  it('perfil inexistente: 401', async () => {
    const { service } = setup(null);
    await expect(service.studentLogin(99, PIN)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
