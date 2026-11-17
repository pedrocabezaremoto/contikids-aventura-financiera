import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

const DOCS_PATH = 'api/docs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Rutas: /api/v1/...
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });

  // Cabeceras de seguridad. Swagger UI necesita scripts inline, así que en /api/docs
  // se desactiva solo la CSP; el resto de la API lleva helmet completo.
  const strict = helmet();
  const docs = helmet({ contentSecurityPolicy: false });
  app.use((req: Request, res: Response, next: NextFunction) =>
    req.path.startsWith(`/${DOCS_PATH}`) ? docs(req, res, next) : strict(req, res, next),
  );

  const origins = (config.get<string>('CORS_ORIGIN') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins.length > 0 ? origins : false, credentials: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swagger = new DocumentBuilder()
    .setTitle('CONTIKIDS API')
    .setDescription('API del simulador contable gamificado CONTIKIDS · Aventura Financiera')
    .setVersion('0.1.0')
    .build();
  SwaggerModule.setup(DOCS_PATH, app, SwaggerModule.createDocument(app, swagger));

  app.enableShutdownHooks();

  // Por defecto solo localhost: nada de Contikids escucha en 0.0.0.0.
  const host = config.get<string>('API_HOST') ?? '127.0.0.1';
  const port = Number(config.get<string>('API_PORT') ?? 4410);
  await app.listen(port, host);
  console.log(`API CONTIKIDS en http://${host}:${port}/api/v1 · docs en /${DOCS_PATH}`);
}

void bootstrap();
