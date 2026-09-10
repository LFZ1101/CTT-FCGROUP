import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/alert.dto';
@UseGuards(AuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly service: AlertsService) {}
  @Get() list(@CurrentUser() user: AuthUser) { return this.service.list(user.tenantId); }
  @Post() create(@CurrentUser() user: AuthUser, @Body() dto: CreateAlertDto) { return this.service.create(user.tenantId, dto); }
  @Patch(':id/read') read(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.markRead(user.tenantId, id); }
}
