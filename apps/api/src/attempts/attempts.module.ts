import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QuizzesModule } from '../quizzes/quizzes.module';
import { RewardsService } from '../rewards/rewards.service';
import { AttemptsService } from './attempts.service';
import { AttemptsController } from './attempts.controller';

@Module({
  imports: [AuthModule, QuizzesModule],
  providers: [AttemptsService, RewardsService],
  controllers: [AttemptsController],
})
export class AttemptsModule {}
