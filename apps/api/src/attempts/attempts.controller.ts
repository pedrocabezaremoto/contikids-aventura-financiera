import { Body, Controller, HttpCode, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, CurrentUser, Roles } from '../auth/auth.guard';
import type { TokenPayload } from '../auth/auth.types';
import { AnswerDto } from './answer.dto';
import { AttemptsService } from './attempts.service';

@ApiTags('attempts')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Roles('STUDENT')
@Controller({ path: 'attempts', version: '1' })
export class AttemptsController {
  constructor(private readonly attempts: AttemptsService) {}

  @Post(':id/answers')
  @HttpCode(200)
  answer(
    @CurrentUser() user: TokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AnswerDto,
  ) {
    return this.attempts.answer(user.sub, id, body);
  }

  @Post(':id/finish')
  @HttpCode(200)
  finish(@CurrentUser() user: TokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.attempts.finish(user.sub, id);
  }
}
