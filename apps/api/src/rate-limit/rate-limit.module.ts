import { ExecutionContext, Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, type ThrottlerModuleOptions } from '@nestjs/throttler';
import { AuthModule } from '../auth/auth.module';
import { TokensService } from '../auth/tokens.service';
import {
  SCOPE_KEY,
  sectionTracker,
  studentTracker,
  ipOf,
  type RateScopeName,
  type Req,
} from './rate-scope';
import { RATE_LIMITS, RATE_WINDOW_MS } from './rate-limits';

function bearer(req: Req): string | undefined {
  const h = req.headers.authorization;
  return typeof h === 'string' && h.startsWith('Bearer ') ? h.slice(7) : undefined;
}

/** Opciones del rate limit. `tokens` verifica el JWT para saber quién es el usuario. */
export function buildThrottlerOptions(
  reflector: Reflector,
  tokens: Pick<TokensService, 'verifyAccess'>,
): ThrottlerModuleOptions {
  const scoped = (name: RateScopeName) => (ctx: ExecutionContext) =>
    reflector.getAllAndOverride<RateScopeName | undefined>(SCOPE_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]) !== name;

  return {
    throttlers: [
      // Por IP: red de seguridad general. Las rutas de login/perfiles la suben o bajan con @Throttle.
      {
        name: 'ip',
        ttl: RATE_WINDOW_MS,
        limit: RATE_LIMITS.ipGeneral,
        getTracker: (req) => ipOf(req as Req),
      },
      // Login de alumno: por alumno.
      {
        name: 'student',
        ttl: RATE_WINDOW_MS,
        limit: RATE_LIMITS.studentLoginPerStudent,
        skipIf: scoped('studentLogin'),
        getTracker: (req) => studentTracker(req as Req),
      },
      // Lista de perfiles: por sección.
      {
        name: 'section',
        ttl: RATE_WINDOW_MS,
        limit: RATE_LIMITS.profilesPerSection,
        skipIf: scoped('sectionProfiles'),
        getTracker: (req) => sectionTracker(req as Req),
      },
      // Rutas autenticadas: por usuario, un solo contador para todas sus rutas.
      {
        name: 'user',
        ttl: RATE_WINDOW_MS,
        limit: RATE_LIMITS.perUser,
        skipIf: (ctx) => !bearer(ctx.switchToHttp().getRequest<Req>()),
        getTracker: async (req) => {
          const token = bearer(req as Req);
          try {
            const p = await tokens.verifyAccess(token ?? '');
            return `user:${p.role}:${p.sub}`;
          } catch {
            return ipOf(req as Req); // token inválido: el AuthGuard lo rechazará con 401
          }
        },
        generateKey: (_ctx, tracker, name) => `${name}:${tracker}`,
      },
    ],
  };
}

/** El guard global es el de @nestjs/throttler; las reglas están en `buildThrottlerOptions`. */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [AuthModule],
      inject: [Reflector, TokensService],
      useFactory: (reflector: Reflector, tokens: TokensService) =>
        buildThrottlerOptions(reflector, tokens),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class RateLimitModule {}
