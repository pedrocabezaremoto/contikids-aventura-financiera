import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ACCESS_TTL, REFRESH_TTL_DAYS, type Role, type TokenPayload } from './auth.types';

/** Firma y verifica los JWT: access (15 min) y refresh (7 días, en cookie httpOnly). */
@Injectable()
export class TokensService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessSecret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.refreshSecret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  signAccess(payload: TokenPayload): Promise<string> {
    return this.jwt.signAsync(
      { sub: payload.sub, role: payload.role },
      { secret: this.accessSecret, expiresIn: ACCESS_TTL },
    );
  }

  signRefresh(payload: TokenPayload): Promise<string> {
    return this.jwt.signAsync(
      { sub: payload.sub, role: payload.role, typ: 'refresh' },
      { secret: this.refreshSecret, expiresIn: `${REFRESH_TTL_DAYS}d` },
    );
  }

  async verifyAccess(token: string): Promise<TokenPayload> {
    const p = await this.jwt.verifyAsync<{ sub: number; role: Role; typ?: string }>(token, {
      secret: this.accessSecret,
    });
    if (p.typ === 'refresh') throw new Error('Se esperaba un access token');
    return { sub: p.sub, role: p.role };
  }

  async verifyRefresh(token: string): Promise<TokenPayload> {
    const p = await this.jwt.verifyAsync<{ sub: number; role: Role; typ?: string }>(token, {
      secret: this.refreshSecret,
    });
    if (p.typ !== 'refresh') throw new Error('Se esperaba un refresh token');
    return { sub: p.sub, role: p.role };
  }
}
