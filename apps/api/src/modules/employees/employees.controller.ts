import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { IsIn, IsString, MinLength } from 'class-validator';

class EmployeeCsvDto {
  @IsString() @MinLength(3) csvText!: string;
  @IsIn(['preview', 'confirm']) mode!: 'preview' | 'confirm';
}

@UseGuards(AuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get()
  list(@CurrentUser() u: AuthUser, @Query('companyId') companyId?: string) {
    return this.service.list(u.tenantId, companyId);
  }

  @Post('import')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER')
  importCsv(@CurrentUser() u: AuthUser, @Body() dto: EmployeeCsvDto) {
    if (dto.mode === 'preview') return this.service.importCsvPreview(u.tenantId, dto.csvText);
    return this.service.importCsvConfirm(u.tenantId, u.sub, dto.csvText);
  }

  @Get(':id')
  get(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.service.get(u.tenantId, id);
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER')
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateEmployeeDto) {
    return this.service.create(u.tenantId, u.sub, dto);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER')
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.service.update(u.tenantId, u.sub, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER')
  remove(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.service.remove(u.tenantId, u.sub, id);
  }
}
