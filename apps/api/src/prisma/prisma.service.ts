import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Cliente de Prisma compartido por toda la API.
 * Se conecta de forma perezosa (en la primera consulta), así la API arranca
 * aunque la BD no esté lista y /health puede reportar "db: down".
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
