import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { MonitoringService } from './monitoring.service';
import { TriggerSourceCheckDto } from './dto/monitoring.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly service: MonitoringService) {}

  @Get('history')
  history(@CurrentUser() user: AuthUser, @Query('sourceId') sourceId?: string) {
    return this.service.history(user.tenantId, sourceId);
  }

  @Get('discoveries')
  discoveries(@CurrentUser() user: AuthUser) {
    return this.service.discoveries(user.tenantId);
  }

  @Post('check')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  check(@CurrentUser() user: AuthUser, @Body() dto: TriggerSourceCheckDto) {
    return dto.sourceId
      ? this.service.checkOne(user.tenantId, dto.sourceId)
      : this.service.checkAll(user.tenantId);
  }
}
