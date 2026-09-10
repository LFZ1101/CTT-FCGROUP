import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/alert.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly service: AlertsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.tenantId);
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAlertDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Post('scan-expiring')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  scanExpiring(@CurrentUser() user: AuthUser) {
    return this.service.scanExpiringInstruments(user.tenantId);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.markRead(user.tenantId, id);
  }
}
