import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, LinkCompanyUnionDto, UpdateCompanyDto } from './dto/company.dto';

@UseGuards(AuthGuard)
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
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateCompanyDto) {
    return this.service.create(u.tenantId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.service.update(u.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.service.remove(u.tenantId, id);
  }

  @Post(':id/unions')
  linkUnion(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: LinkCompanyUnionDto,
  ) {
    return this.service.linkUnion(u.tenantId, id, dto);
  }

  @Delete(':id/unions/:linkId')
  unlinkUnion(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Param('linkId') linkId: string,
  ) {
    return this.service.unlinkUnion(u.tenantId, id, linkId);
  }
}
