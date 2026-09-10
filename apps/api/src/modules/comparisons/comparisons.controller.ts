import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ComparisonsService } from './comparisons.service';
import { CreateComparisonDto } from './dto/comparison.dto';

@UseGuards(AuthGuard)
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
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateComparisonDto) {
    return this.service.create(user.tenantId, user.sub, dto);
  }
}
