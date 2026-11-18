import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { SectionQueryDto, StudentLoginDto, TeacherLoginDto } from './auth.dto';
import { AuthGuard, CurrentUser, Roles } from './auth.guard';
import { AuthService } from './auth.service';
import {
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
  REFRESH_TTL_DAYS,
  type LoginResult,
  type TokenPayload,
} from './auth.types';

/** Límite de intentos de login por IP: 10 por minuto. */
const LOGIN_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  private readonly secureCookie: boolean;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    this.secureCookie = config.get<string>('NODE_ENV') === 'production';
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.secureCookie,
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
    };
  }

  /** Guarda el refresh en cookie httpOnly y devuelve solo el access + usuario. */
  private respond(res: Response, r: LoginResult) {
    res.cookie(REFRESH_COOKIE, r.refreshToken, {
      ...this.cookieOptions(),
      maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
    });
    return { accessToken: r.accessToken, user: r.user };
  }

  @Post('teacher/login')
  @HttpCode(200)
  @Throttle(LOGIN_THROTTLE)
  async teacherLogin(@Body() dto: TeacherLoginDto, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, await this.auth.teacherLogin(dto.email, dto.password));
  }

  @Get('students')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  listStudents(@Query() q: SectionQueryDto) {
    return this.auth.listStudents(q.sectionCode);
  }

  @Post('student/login')
  @HttpCode(200)
  @Throttle(LOGIN_THROTTLE)
  async studentLogin(@Body() dto: StudentLoginDto, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, await this.auth.studentLogin(dto.studentId, dto.pin));
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    return this.respond(res, await this.auth.refresh(token));
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }
}

@ApiTags('me')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ version: '1' })
export class MeController {
  constructor(private readonly auth: AuthService) {}

  /** GET /api/v1/me — datos básicos del usuario logueado (docente o estudiante). */
  @Get('me')
  async me(@CurrentUser() user: TokenPayload) {
    const found = await this.auth.userFor(user);
    if (!found) throw new NotFoundException('Usuario no encontrado');
    return found;
  }

  /** Destino provisional del estudiante (Fase 2: mapa). Solo rol STUDENT. */
  @Get('student/home')
  @Roles('STUDENT')
  studentHome(@CurrentUser() user: TokenPayload) {
    return { role: user.role, message: 'Tu mapa llega pronto' };
  }

  /** Destino provisional del docente (Fase 4: panel). Solo rol TEACHER. */
  @Get('teacher/home')
  @Roles('TEACHER')
  teacherHome(@CurrentUser() user: TokenPayload) {
    return { role: user.role, message: 'Panel docente — próximamente' };
  }
}
