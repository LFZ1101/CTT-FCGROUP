import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PayrollService } from './payroll.service';

@UseGuards(AuthGuard, RolesGuard)
@Controller('payroll-impact')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Get('comparisons/:comparisonId')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  fromComparison(@CurrentUser() user: AuthUser, @Param('comparisonId') comparisonId: string) {
    return this.service.fromComparison(user.tenantId, user.sub, comparisonId);
  }

  @Get('instruments/:instrumentId/floor')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  floor(
    @CurrentUser() user: AuthUser,
    @Param('instrumentId') instrumentId: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.service.floorImpactForInstrument(user.tenantId, user.sub, instrumentId, companyId);
  }
}
