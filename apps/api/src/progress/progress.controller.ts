import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, CurrentUser, Roles } from '../auth/auth.guard';
import type { TokenPayload } from '../auth/auth.types';
import { ProgressService } from './progress.service';

@ApiTags('progress')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Roles('STUDENT')
@Controller({ version: '1' })
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  /** Mapa de islas: 5 módulos con su estado + monedas y XP del alumno. */
  @Get('me/map')
  map(@CurrentUser() user: TokenPayload) {
    return this.progress.getMap(user.sub);
  }

  /** Los 3 submódulos (lección, quiz, prueba) de un módulo. `ref` = id o código (M1). */
  @Get('modules/:ref')
  module(@CurrentUser() user: TokenPayload, @Param('ref') ref: string) {
    return this.progress.getModule(user.sub, ref);
  }
}
