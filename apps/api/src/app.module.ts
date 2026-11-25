import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AttemptsModule } from './attempts/attempts.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { LessonsModule } from './lessons/lessons.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProgressModule } from './progress/progress.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';

@Module({
  imports: [
    // El .env vive en la raíz del monorepo (lo comparte docker-compose).
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    // Rate limit por alumno / sección / usuario / IP (números en rate-limit/rate-limits.ts).
    RateLimitModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    ProgressModule,
    LessonsModule,
    AttemptsModule,
  ],
})
export class AppModule {}
