import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProgressModule } from '../progress/progress.module';
import { RewardsService } from '../rewards/rewards.service';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

@Module({
  imports: [AuthModule, ProgressModule],
  controllers: [LessonsController],
  providers: [LessonsService, RewardsService],
})
export class LessonsModule {}
