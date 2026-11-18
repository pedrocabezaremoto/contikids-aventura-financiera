import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Section, Student, Teacher } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import type {
  LoginResult,
  SessionUser,
  StudentUser,
  TeacherUser,
  TokenPayload,
} from './auth.types';
import { TokensService } from './tokens.service';

const DEFAULT_MAX_PIN_ATTEMPTS = 5;
const DEFAULT_PIN_LOCK_MINUTES = 5;

export const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] ?? fullName;

export function toTeacherUser(t: Teacher): TeacherUser {
  return { role: 'TEACHER', id: t.id, fullName: t.fullName, email: t.email };
}

export function toStudentUser(s: Student & { section: Section }): StudentUser {
  return {
    role: 'STUDENT',
    id: s.id,
    name: firstName(s.fullName),
    fullName: s.fullName,
    username: s.username,
    avatarColor: s.avatarColor,
    coins: s.coins,
    xp: s.xp,
    sectionCode: s.section.code,
  };
}

/** 423 Locked con datos para que la app muestre cuánto falta. */
function lockedError(until: Date, now: Date) {
  const minutesLeft = Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 60_000));
  return new HttpException(
    {
      statusCode: HttpStatus.LOCKED,
      code: 'LOCKED',
      message: `Tu perfil está en pausa. Intenta de nuevo en ${minutesLeft} min.`,
      lockedUntil: until.toISOString(),
      minutesLeft,
    },
    HttpStatus.LOCKED,
  );
}

@Injectable()
export class AuthService {
  /** Hash de relleno: si el correo no existe se verifica igual, así el tiempo no delata nada. */
  private readonly dummyHash = argon2.hash('contikids-dummy-password');

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
  ) {}

  private async issue(user: SessionUser): Promise<LoginResult> {
    const payload: TokenPayload = { sub: user.id, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.tokens.signAccess(payload),
      this.tokens.signRefresh(payload),
    ]);
    return { accessToken, refreshToken, user };
  }

  // ---------- Docente ----------
  async teacherLogin(email: string, password: string): Promise<LoginResult> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    const ok = teacher
      ? await argon2.verify(teacher.passwordHash, password)
      : (await argon2.verify(await this.dummyHash, password), false);
    if (!teacher || !ok) throw new UnauthorizedException('Correo o contraseña incorrectos');
    return this.issue(toTeacherUser(teacher));
  }

  // ---------- Estudiante ----------
  /** Perfiles de UNA sección para elegir avatar. Nunca devuelve el PIN ni su hash. */
  async listStudents(sectionCode: string) {
    const section = await this.prisma.section.findUnique({
      where: { code: sectionCode.trim().toUpperCase() },
      include: {
        students: {
          select: { id: true, fullName: true, avatarColor: true },
          orderBy: { fullName: 'asc' },
        },
      },
    });
    if (!section) throw new NotFoundException('No encontramos esa sección. Revisa el código.');
    return {
      section: { code: section.code, grade: section.grade },
      students: section.students.map((s) => ({
        id: s.id,
        name: firstName(s.fullName),
        avatarColor: s.avatarColor,
      })),
    };
  }

  async studentLogin(studentId: number, pin: string): Promise<LoginResult> {
    const now = new Date();
    const [settings, student] = await Promise.all([
      this.prisma.systemSettings.findUnique({ where: { id: 1 } }),
      this.prisma.student.findUnique({ where: { id: studentId }, include: { section: true } }),
    ]);
    if (!student) throw new UnauthorizedException('No encontramos ese perfil');

    if (student.lockedUntil && student.lockedUntil > now) {
      throw lockedError(student.lockedUntil, now);
    }

    const maxAttempts = settings?.maxPinAttempts ?? DEFAULT_MAX_PIN_ATTEMPTS;
    const lockMinutes = settings?.pinLockMinutes ?? DEFAULT_PIN_LOCK_MINUTES;

    if (!(await argon2.verify(student.pinHash, pin))) {
      const failed = student.failedPinCount + 1;
      if (failed >= maxAttempts) {
        const until = new Date(now.getTime() + lockMinutes * 60_000);
        await this.prisma.student.update({
          where: { id: student.id },
          data: { failedPinCount: 0, lockedUntil: until },
        });
        throw lockedError(until, now);
      }
      await this.prisma.student.update({
        where: { id: student.id },
        data: { failedPinCount: failed },
      });
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        code: 'WRONG_PIN',
        message: 'Ese PIN no es. ¡Inténtalo otra vez!',
        attemptsLeft: maxAttempts - failed,
      });
    }

    const updated = await this.prisma.student.update({
      where: { id: student.id },
      data: { failedPinCount: 0, lockedUntil: null, lastLoginAt: now },
      include: { section: true },
    });
    return this.issue(toStudentUser(updated));
  }

  // ---------- Sesión ----------
  async userFor(payload: TokenPayload): Promise<SessionUser | null> {
    if (payload.role === 'TEACHER') {
      const t = await this.prisma.teacher.findUnique({ where: { id: payload.sub } });
      return t ? toTeacherUser(t) : null;
    }
    const s = await this.prisma.student.findUnique({
      where: { id: payload.sub },
      include: { section: true },
    });
    return s ? toStudentUser(s) : null;
  }

  async refresh(refreshToken: string | undefined): Promise<LoginResult> {
    if (!refreshToken) throw new UnauthorizedException('No hay sesión');
    let payload: TokenPayload;
    try {
      payload = await this.tokens.verifyRefresh(refreshToken);
    } catch {
      throw new UnauthorizedException('La sesión venció');
    }
    const user = await this.userFor(payload);
    if (!user) throw new UnauthorizedException('La sesión ya no es válida');
    return this.issue(user);
  }
}
