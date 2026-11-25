import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

@Injectable()
export class RewardsService {
  async grant(tx: Prisma.TransactionClient, studentId: number, key: string, xp: number, coins = 0) {
    const grant = await tx.rewardGrant.createMany({
      data: { studentId, key, xp, coins },
      skipDuplicates: true,
    });
    if (!grant.count) return { xpAwarded: 0, coinsAwarded: 0 };
    await tx.student.update({
      where: { id: studentId },
      data: { xp: { increment: xp }, coins: { increment: coins } },
    });
    return { xpAwarded: xp, coinsAwarded: coins };
  }
}
