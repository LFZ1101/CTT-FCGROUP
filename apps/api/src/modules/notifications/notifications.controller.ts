import { Body, Controller, Delete, Get, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
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

class PreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsString()
  minSeverity?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mutedTypes?: string[];
}

@UseGuards(AuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('preferences')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST', 'AUDITOR', 'CLIENT')
  getPreferences(@CurrentUser() user: AuthUser) {
    return this.service.getPreferences(user.tenantId, user.sub);
  }

  @Put('preferences')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST', 'AUDITOR', 'CLIENT')
  putPreferences(@CurrentUser() user: AuthUser, @Body() dto: PreferencesDto) {
    return this.service.upsertPreferences(user.tenantId, user.sub, dto);
  }

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
    return this.service.unsubscribePush(user.tenantId, user.sub, dto.endpoint);
  }

  @Post('alerts/email')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER')
  notifyAlert(@CurrentUser() user: AuthUser, @Body() dto: NotifyAlertDto) {
    return this.service.notifyAlert(user.tenantId, dto.alertId);
  }
}
