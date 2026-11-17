import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthStatus {
  status: 'ok' | 'error';
  db: 'up' | 'down';
  timestamp: string;
}

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /api/v1/health — estado de la API y de la base de datos. */
  @Get()
  @ApiOkResponse({ description: 'API y base de datos funcionando' })
  @ApiServiceUnavailableResponse({ description: 'La base de datos no responde' })
  async check(): Promise<HealthStatus> {
    let db: HealthStatus['db'] = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }

    const body: HealthStatus = {
      status: db === 'up' ? 'ok' : 'error',
      db,
      timestamp: new Date().toISOString(),
    };
    if (db === 'down') throw new ServiceUnavailableException(body);
    return body;
  }
}
