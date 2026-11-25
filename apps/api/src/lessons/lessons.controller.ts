import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { AuthGuard, CurrentUser, Roles } from '../auth/auth.guard';
import type { TokenPayload } from '../auth/auth.types';
import { LessonsService } from './lessons.service';

export class CompleteLessonDto {
  @IsInt()
  @Min(0)
  @Max(2147483647)
  timeSecs!: number;
}

@ApiTags('lessons')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Roles('STUDENT')
@Controller({ path: 'lessons', version: '1' })
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  @Get(':id')
  get(@CurrentUser() user: TokenPayload, @Param('id', ParseIntPipe) id: number) {
    return this.lessons.get(user.sub, id);
  }

  @Post(':id/complete')
  @HttpCode(200)
  complete(
    @CurrentUser() user: TokenPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CompleteLessonDto,
  ) {
    return this.lessons.complete(user.sub, id, body.timeSecs);
  }
}
