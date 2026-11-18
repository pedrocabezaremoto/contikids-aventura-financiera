import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role, TokenPayload } from './auth.types';
import { TokensService } from './tokens.service';

export const ROLES_KEY = 'roles';
/** Limita una ruta a uno o más roles. Sin @Roles, basta con estar logueado. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export type AuthedRequest = Request & { user?: TokenPayload };

/** Usuario del access token (lo pone AuthGuard). */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): TokenPayload | undefined =>
    ctx.switchToHttp().getRequest<AuthedRequest>().user,
);

/**
 * Verifica el access token (header `Authorization: Bearer …`) y, si la ruta tiene @Roles,
 * que el rol del usuario esté permitido.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokensService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Necesitas iniciar sesión');

    let payload: TokenPayload;
    try {
      payload = await this.tokens.verifyAccess(header.slice('Bearer '.length));
    } catch {
      throw new UnauthorizedException('Tu sesión venció, vuelve a entrar');
    }
    req.user = payload;

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (roles?.length && !roles.includes(payload.role)) {
      throw new ForbiddenException('No tienes permiso para entrar aquí');
    }
    return true;
  }
}
