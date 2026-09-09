import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';
import { EnqueueDownloadDto } from './dto/document.dto';

@UseGuards(AuthGuard)
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
  enqueue(@CurrentUser() user: { tenantId: string }, @Body() dto: EnqueueDownloadDto) {
    return this.service.enqueueDownload(user.tenantId, dto.documentId);
  }

  @Post(':id/download')
  enqueueOne(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.service.enqueueDownload(user.tenantId, id);
  }

  @Post('parse')
  enqueueParse(@CurrentUser() user: { tenantId: string }, @Body() dto: EnqueueDownloadDto) {
    return this.service.enqueueParse(user.tenantId, dto.documentId);
  }

  @Post(':id/parse')
  enqueueParseOne(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.service.enqueueParse(user.tenantId, id);
  }
}
