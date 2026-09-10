import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationsService } from './notifications.service';

class NotifyAlertDto {
  @IsString()
  alertId!: string;
}

class PushKeysDto {
  @IsString()
  p256dh!: string;
  @IsString()
  auth!: string;
}

class PushSubscribeDto {
  @IsString()
  endpoint!: string;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys!: PushKeysDto;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

class PushUnsubscribeDto {
  @IsString()
  endpoint!: string;
}

@UseGuards(AuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('push/vapid-public-key')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST', 'AUDITOR', 'CLIENT')
  vapidKey() {
    return this.service.vapidPublicKey();
  }

  @Post('push/subscribe')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST', 'AUDITOR', 'CLIENT')
  subscribe(@CurrentUser() user: AuthUser, @Body() dto: PushSubscribeDto) {
    return this.service.subscribePush(user.tenantId, user.sub, {
      endpoint: dto.endpoint,
      keys: dto.keys,
      userAgent: dto.userAgent,
    });
  }

  @Delete('push/subscribe')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST', 'AUDITOR', 'CLIENT')
  unsubscribe(@CurrentUser() user: AuthUser, @Body() dto: PushUnsubscribeDto) {
    return this.service.unsubscribePush(user.tenantId, dto.endpoint);
  }

  @Post('alerts/email')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER')
  notifyAlert(@CurrentUser() user: AuthUser, @Body() dto: NotifyAlertDto) {
    return this.service.notifyAlert(user.tenantId, dto.alertId);
  }
}
