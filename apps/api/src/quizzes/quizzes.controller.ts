import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, CurrentUser, Roles } from '../auth/auth.guard';
import type { TokenPayload } from '../auth/auth.types';
import { QuizzesService } from './quizzes.service';

@ApiTags('quizzes')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Roles('STUDENT')
@Controller({ path: 'quizzes', version: '1' })
export class QuizzesController {
  constructor(private readonly quizzes: QuizzesService) {}

  @Get(':id')
  get(@CurrentUser() user: TokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.quizzes.get(user.sub, id);
  }

  @Post(':id/attempts')
  start(@CurrentUser() user: TokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.quizzes.start(user.sub, id);
  }
}
