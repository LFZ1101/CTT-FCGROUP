import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { DeadlinesService } from './deadlines.service';

@UseGuards(AuthGuard, RolesGuard)
@Controller()
export class DeadlinesController {
  constructor(private readonly service: DeadlinesService) {}

  @Get('deadlines')
  list(@CurrentUser() u: AuthUser) {
    return this.service.list(u.tenantId);
  }

  @Post('instruments/:id/extract-deadlines')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  extract(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.service.extractForInstrument(u.tenantId, id);
  }

  @Post('deadlines/scan-alerts')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  scan(@CurrentUser() u: AuthUser) {
    return this.service.scanDeadlineAlerts(u.tenantId);
  }

  @Get('instruments/:id/impacted-companies')
  impacted(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.service.impactedCompanies(u.tenantId, id);
  }

  @Get('instruments/:id/operational-summary')
  async summary(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    const result = await this.service.extractForInstrument(u.tenantId, id);
    return result.summary;
  }
}
