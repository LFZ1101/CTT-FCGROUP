import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { RagService } from './rag.service';
import { AskRagDto, ReindexRagDto } from './dto/rag.dto';

@UseGuards(AuthGuard)
@Controller('rag')
export class RagController {
  constructor(private readonly service: RagService) {}

  @Post('ask')
  ask(@CurrentUser() user: AuthUser, @Body() dto: AskRagDto) {
    return this.service.ask(user.tenantId, user.sub, dto);
  }

  @Post('reindex')
  reindex(@CurrentUser() user: AuthUser, @Body() dto: ReindexRagDto) {
    return this.service.reindex(user.tenantId, dto);
  }
}
