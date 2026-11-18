import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController, MeController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { TokensService } from './tokens.service';

@Module({
  // Los secretos y la duración se pasan en cada firma (TokensService).
  imports: [JwtModule.register({})],
  controllers: [AuthController, MeController],
  providers: [AuthService, TokensService, AuthGuard],
  exports: [AuthGuard, TokensService],
})
export class AuthModule {}
