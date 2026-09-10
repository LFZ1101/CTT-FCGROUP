import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { IntegrationsService } from './integrations.service';

class RegisterIntegrationDto {
  @IsIn(['ONVIO', 'DOMINIO', 'ALTERDATA', 'OTHER'])
  provider!: 'ONVIO' | 'DOMINIO' | 'ALTERDATA' | 'OTHER';
  @IsOptional() @IsString() notes?: string;
}

@UseGuards(AuthGuard, RolesGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Get()
  list(@CurrentUser() u: AuthUser) {
    return this.service.list(u.tenantId);
  }

  @Post('intent')
  @Roles('OWNER', 'ADMIN')
  intent(@CurrentUser() u: AuthUser, @Body() dto: RegisterIntegrationDto) {
    return this.service.registerIntent(u.tenantId, u.sub, dto.provider, dto.notes);
  }
}
