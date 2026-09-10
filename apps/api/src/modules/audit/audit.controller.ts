import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from './audit.service';

@UseGuards(AuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST', 'AUDITOR')
  list(
    @CurrentUser() user: AuthUser,
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(user.tenantId, {
      entity,
      entityId,
      action,
      limit: limit ? Number(limit) : 50,
    });
  }
}
