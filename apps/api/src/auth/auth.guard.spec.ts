import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard, Roles } from './auth.guard';
import type { Role } from './auth.types';
import type { TokensService } from './tokens.service';

class Routes {
  @Roles('TEACHER')
  teacherOnly() {}

  @Roles('STUDENT')
  studentOnly() {}

  anyRole() {}
}

function context(handler: () => void, authorization?: string) {
  const req: { headers: Record<string, string | undefined>; user?: unknown } = {
    headers: { authorization },
  };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => handler,
    getClass: () => Routes,
  } as unknown as ExecutionContext;
  return { ctx, req };
}

function guardFor(role: Role | 'invalid') {
  const tokens = {
    verifyAccess: jest.fn(async (t: string) => {
      if (role === 'invalid' || t !== 'valid') throw new Error('bad token');
      return { sub: 1, role };
    }),
  } as unknown as TokensService;
  return new AuthGuard(tokens, new Reflector());
}

describe('AuthGuard (guard por rol)', () => {
  const routes = new Routes();

  it('sin token: 401', async () => {
    const { ctx } = context(routes.anyRole);
    await expect(guardFor('TEACHER').canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('token inválido o vencido: 401', async () => {
    const { ctx } = context(routes.anyRole, 'Bearer valid');
    await expect(guardFor('invalid').canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('docente en ruta de docente: pasa y deja el usuario en la request', async () => {
    const { ctx, req } = context(routes.teacherOnly, 'Bearer valid');
    await expect(guardFor('TEACHER').canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual({ sub: 1, role: 'TEACHER' });
  });

  it('estudiante en ruta de docente: 403', async () => {
    const { ctx } = context(routes.teacherOnly, 'Bearer valid');
    await expect(guardFor('STUDENT').canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('docente en ruta de estudiante: 403', async () => {
    const { ctx } = context(routes.studentOnly, 'Bearer valid');
    await expect(guardFor('TEACHER').canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ruta sin @Roles: cualquier usuario logueado pasa', async () => {
    const { ctx } = context(routes.anyRole, 'Bearer valid');
    await expect(guardFor('STUDENT').canActivate(ctx)).resolves.toBe(true);
  });
});
