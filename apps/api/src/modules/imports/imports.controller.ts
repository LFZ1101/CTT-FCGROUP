import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ImportsService } from './imports.service';
import { CsvImportDto } from './dto/import.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('imports')
export class ImportsController {
  constructor(private readonly service: ImportsService) {}

  @Post('companies')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER')
  companies(@CurrentUser() u: AuthUser, @Body() dto: CsvImportDto) {
    if (dto.mode === 'preview') {
      return this.service.previewCompaniesForTenant(u.tenantId, dto.csvText);
    }
    return this.service.confirmCompanies(u.tenantId, u.sub, dto.csvText);
  }

  @Post('union-links')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER')
  unionLinks(@CurrentUser() u: AuthUser, @Body() dto: CsvImportDto) {
    if (dto.mode === 'preview') {
      return this.service.previewUnionLinksForTenant(u.tenantId, dto.csvText);
    }
    return this.service.confirmUnionLinks(u.tenantId, u.sub, dto.csvText);
  }
}
