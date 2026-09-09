import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { BootstrapDto, LoginDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}
  @Post('bootstrap') bootstrap(@Body() dto: BootstrapDto) { return this.service.bootstrap(dto); }
  @Post('login') login(@Body() dto: LoginDto) { return this.service.login(dto); }
}
