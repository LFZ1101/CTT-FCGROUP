import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { InstrumentsService } from './instruments.service';
import { CreateInstrumentDto, ReviewInstrumentDto } from './dto/instrument.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('instruments')
export class InstrumentsController {
  constructor(private readonly service: InstrumentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.tenantId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.get(user.tenantId, id);
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInstrumentDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Post(':id/validate')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER')
  validate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewInstrumentDto,
  ) {
    return this.service.validate(user.tenantId, user.sub, id, dto);
  }

  @Post(':id/reject')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER')
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewInstrumentDto,
  ) {
    return this.service.reject(user.tenantId, user.sub, id, dto);
  }

  @Get(':id/applications')
  listApplications(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.listApplications(user.tenantId, id);
  }

  @Post(':id/applications/suggest')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  suggestApplications(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.suggestApplications(user.tenantId, id);
  }

  @Post(':id/applications/:applicationId/confirm')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER')
  confirmApplication(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('applicationId') applicationId: string,
  ) {
    return this.service.confirmApplication(user.tenantId, user.sub, id, applicationId, true);
  }

  @Post(':id/applications/:applicationId/unconfirm')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER')
  unconfirmApplication(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('applicationId') applicationId: string,
  ) {
    return this.service.confirmApplication(user.tenantId, user.sub, id, applicationId, false);
  }
}
