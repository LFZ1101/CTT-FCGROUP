import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';
import { EnqueueDownloadDto } from './dto/document.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  list(@CurrentUser() user: { tenantId: string }) {
    return this.service.list(user.tenantId);
  }

  @Get(':id')
  get(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.service.get(user.tenantId, id);
  }

  @Get(':id/pages')
  pages(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.service.pages(user.tenantId, id);
  }

  @Get(':id/clauses')
  clauses(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.service.clauses(user.tenantId, id);
  }

  @Get(':id/signed-url')
  signedUrl(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.service.signedUrl(user.tenantId, id);
  }

  @Post('download')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  enqueue(@CurrentUser() user: { tenantId: string }, @Body() dto: EnqueueDownloadDto) {
    return this.service.enqueueDownload(user.tenantId, dto.documentId);
  }

  @Post(':id/download')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  enqueueOne(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.service.enqueueDownload(user.tenantId, id);
  }

  @Post('parse')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  enqueueParse(@CurrentUser() user: { tenantId: string }, @Body() dto: EnqueueDownloadDto) {
    return this.service.enqueueParse(user.tenantId, dto.documentId);
  }

  @Post(':id/parse')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  enqueueParseOne(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.service.enqueueParse(user.tenantId, id);
  }
}
