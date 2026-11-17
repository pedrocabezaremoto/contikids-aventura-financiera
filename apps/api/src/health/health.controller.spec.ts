import { ServiceUnavailableException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';

function controllerWith(queryRaw: jest.Mock) {
  return new HealthController({ $queryRaw: queryRaw } as unknown as PrismaService);
}

describe('HealthController', () => {
  it('responde ok cuando la base de datos contesta', async () => {
    const result = await controllerWith(jest.fn().mockResolvedValue([{ '?column?': 1 }])).check();
    expect(result.status).toBe('ok');
    expect(result.db).toBe('up');
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });

  it('responde 503 con db: down cuando la base de datos falla', async () => {
    const controller = controllerWith(jest.fn().mockRejectedValue(new Error('sin conexión')));
    await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(controller.check()).rejects.toMatchObject({
      response: { status: 'error', db: 'down' },
    });
  });
});
