import { Body, Controller, Headers, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { BootstrapDto, LoginDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('bootstrap')
  bootstrap(
    @Body() dto: BootstrapDto,
    @Headers('x-bootstrap-token') bootstrapToken?: string,
  ) {
    return this.authService.bootstrap(dto, bootstrapToken);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
