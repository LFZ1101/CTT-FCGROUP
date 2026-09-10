import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, LinkCompanyUnionDto, UpdateCompanyDto } from './dto/company.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}

  @Get()
  list(@CurrentUser() u: AuthUser) {
    return this.service.list(u.tenantId);
  }

  @Get(':id')
  get(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.service.get(u.tenantId, id);
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER')
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateCompanyDto) {
    return this.service.create(u.tenantId, dto);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER')
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.service.update(u.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  remove(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.service.remove(u.tenantId, id);
  }

  @Post(':id/unions')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  linkUnion(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: LinkCompanyUnionDto,
  ) {
    return this.service.linkUnion(u.tenantId, id, dto);
  }

  @Delete(':id/unions/:linkId')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  unlinkUnion(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Param('linkId') linkId: string,
  ) {
    return this.service.unlinkUnion(u.tenantId, id, linkId);
  }
}
