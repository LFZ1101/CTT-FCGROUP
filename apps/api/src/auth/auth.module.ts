import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Global()
@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET || 'dev-only-change-me' })],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard],
  exports: [JwtModule, AuthGuard, RolesGuard],
})
export class AuthModule {}
