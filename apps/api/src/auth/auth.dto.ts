import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsString, Length, Matches, MaxLength, Min } from 'class-validator';

export class TeacherLoginDto {
  @ApiProperty({ example: 'docente@contikids.test' })
  @IsEmail({}, { message: 'Escribe un correo válido' })
  @MaxLength(200)
  email!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 200, { message: 'Escribe tu contraseña' })
  password!: string;
}

export class SectionQueryDto {
  @ApiProperty({ example: 'DEMO-5A' })
  @IsString()
  @Length(1, 20, { message: 'Escribe el código de tu sección' })
  sectionCode!: string;
}

export class StudentLoginDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  studentId!: number;

  @ApiProperty({ example: '1234', description: 'PIN de 4 dígitos' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'El PIN tiene 4 números' })
  pin!: string;
}
