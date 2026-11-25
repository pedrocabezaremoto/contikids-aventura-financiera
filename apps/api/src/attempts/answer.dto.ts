import { IsArray, IsInt, IsOptional, Min, Max } from 'class-validator';
import { GAME_RULES } from '@contikids/shared';

export class AnswerDto {
  @IsInt() @Min(1) @Max(2147483647) questionId!: number;
  @IsOptional() @IsInt() @Min(1) @Max(2147483647) optionId?: number;
  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(0, { each: true }) items?: number[];
  @IsInt() @Min(0) timeSeconds!: number;

  /** Permite repetir el envío tras un corte de red. El servidor asigna el número real. */
  @IsOptional() @IsInt() @Min(1) @Max(GAME_RULES.maxTriesPerQuestion) expectedTry?: number;
}
