import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { MatchingService } from './matching.service';

class DecideLinkDto {
  @IsIn(['CONFIRM', 'REJECT', 'NEEDS_REVIEW'])
  decision!: 'CONFIRM' | 'REJECT' | 'NEEDS_REVIEW';

  @IsOptional()
  @IsString()
  notes?: string;
}

@UseGuards(AuthGuard, RolesGuard)
@Controller()
export class MatchingController {
  constructor(private readonly service: MatchingService) {}

  @Get('companies/:id/union-suggestions')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  suggest(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.service.suggestForCompany(u.tenantId, id);
  }

  @Post('companies/:id/union-suggestions/persist')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  persist(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.service.persistSuggestions(u.tenantId, id);
  }

  @Post('company-unions/:linkId/decide')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  decide(
    @CurrentUser() u: AuthUser,
    @Param('linkId') linkId: string,
    @Body() dto: DecideLinkDto,
  ) {
    return this.service.decideLink(u.tenantId, linkId, dto.decision, u.sub, dto.notes);
  }
}
