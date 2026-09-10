import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { CollaborativeService } from './collaborative.service';
import {
  CreateDocumentRequestDto,
  ModerateContributionDto,
  RevokeContributionDto,
  SubmitContributionDto,
} from './dto/collaborative.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('collaborative')
export class CollaborativeController {
  constructor(private readonly service: CollaborativeService) {}

  @Get('overview')
  overview(@CurrentUser() u: AuthUser) {
    return this.service.overview(u.tenantId);
  }

  @Get('reputation')
  @Roles('OWNER', 'ADMIN')
  reputation(@CurrentUser() u: AuthUser) {
    return this.service.reputation(u.tenantId);
  }

  @Post('contributions')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  submit(@CurrentUser() u: AuthUser, @Body() dto: SubmitContributionDto) {
    return this.service.submit(u.tenantId, u.sub, {
      ...dto,
      sharingScope: dto.sharingScope as any,
    });
  }

  @Get('contributions')
  mine(@CurrentUser() u: AuthUser) {
    return this.service.listMine(u.tenantId);
  }

  @Get('contributions/:id')
  one(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.service.getContribution(u.tenantId, id);
  }

  @Get('moderation/pending')
  @Roles('OWNER', 'ADMIN', 'MODERATOR')
  pending(@CurrentUser() u: AuthUser) {
    return this.service.listPendingModeration(u.tenantId, u.role);
  }

  @Post('contributions/:id/moderate')
  @Roles('OWNER', 'ADMIN', 'MODERATOR')
  moderate(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: ModerateContributionDto,
  ) {
    return this.service.moderate(u.tenantId, u.sub, id, dto.decision, dto.notes, u.role);
  }

  @Post('contributions/:id/revoke')
  @Roles('OWNER', 'ADMIN', 'MODERATOR')
  revoke(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: RevokeContributionDto,
  ) {
    return this.service.revoke(u.tenantId, u.sub, id, dto.reason, u.role);
  }

  @Get('network')
  network(@CurrentUser() u: AuthUser) {
    return this.service.listNetwork(u.tenantId);
  }

  @Get('network/:publicationId/access')
  access(@CurrentUser() u: AuthUser, @Param('publicationId') publicationId: string) {
    return this.service.networkDocumentAccess(u.tenantId, publicationId);
  }

  @Post('requests')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  createRequest(@CurrentUser() u: AuthUser, @Body() dto: CreateDocumentRequestDto) {
    return this.service.createRequest(u.tenantId, u.sub, dto);
  }

  @Get('requests/groups')
  requestGroups() {
    return this.service.listRequestGroups();
  }

  @Post('requests/:id/cancel')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  cancelRequest(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.service.cancelRequest(u.tenantId, id);
  }

  @Get('surveillance-overlay')
  surveillance(@CurrentUser() u: AuthUser) {
    return this.service.surveillanceOverlay(u.tenantId);
  }

  @Post('match-official/:documentId')
  @Roles('OWNER', 'ADMIN')
  matchOfficial(@CurrentUser() u: AuthUser, @Param('documentId') documentId: string) {
    return this.service.matchOfficialByHash(u.tenantId, documentId);
  }
}
