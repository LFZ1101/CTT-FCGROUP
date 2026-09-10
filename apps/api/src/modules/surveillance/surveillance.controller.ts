import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { SurveillanceService } from './surveillance.service';

@UseGuards(AuthGuard, RolesGuard)
@Controller('surveillance')
export class SurveillanceController {
  constructor(private readonly service: SurveillanceService) {}

  @Get()
  overview(@CurrentUser() u: AuthUser) {
    return this.service.overview(u.tenantId);
  }

  @Post('scan-divergences')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  scan(@CurrentUser() u: AuthUser) {
    return this.service.scanDivergences(u.tenantId);
  }
}
