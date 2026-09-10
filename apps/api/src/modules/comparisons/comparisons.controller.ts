import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ComparisonsService } from './comparisons.service';
import { CreateComparisonDto } from './dto/comparison.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('comparisons')
export class ComparisonsController {
  constructor(private readonly service: ComparisonsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('instrumentId') instrumentId?: string) {
    return this.service.list(user.tenantId, instrumentId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.get(user.tenantId, id);
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateComparisonDto) {
    return this.service.create(user.tenantId, user.sub, dto);
  }
}
