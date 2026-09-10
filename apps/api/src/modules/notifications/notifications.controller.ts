import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { IsString } from 'class-validator';
import { NotificationsService } from './notifications.service';

class NotifyAlertDto {
  @IsString()
  alertId!: string;
}

@UseGuards(AuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post('alerts/email')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER')
  notifyAlert(@CurrentUser() user: AuthUser, @Body() dto: NotifyAlertDto) {
    return this.service.notifyAlert(user.tenantId, dto.alertId);
  }
}
