import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { SourcesService } from './sources.service';
import { CreateSourceDto, UpdateSourceDto } from './dto/source.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('sources')
export class SourcesController {
  constructor(private readonly service: SourcesService) {}

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
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSourceDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateSourceDto) {
    return this.service.update(user.tenantId, id, dto);
  }
}
