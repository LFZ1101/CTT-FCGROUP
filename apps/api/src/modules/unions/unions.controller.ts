import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { UnionsService } from './unions.service';
import { CreateUnionDto, UpdateUnionDto } from './dto/union.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('unions')
export class UnionsController {
  constructor(private readonly service: UnionsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.tenantId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.get(user.tenantId, id);
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUnionDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateUnionDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id);
  }
}
