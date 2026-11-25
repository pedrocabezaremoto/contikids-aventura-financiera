import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

@Injectable()
export class RewardsService {
  async grantXp(tx: Prisma.TransactionClient, studentId: number, key: string, xp: number) {
    const grant = await tx.rewardGrant.createMany({
      data: { studentId, key, xp },
      skipDuplicates: true,
    });
    if (!grant.count) return 0;
    await tx.student.update({ where: { id: studentId }, data: { xp: { increment: xp } } });
    return xp;
  }
}
