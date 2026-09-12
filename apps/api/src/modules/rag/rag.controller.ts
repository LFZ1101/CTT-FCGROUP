import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { RagService } from './rag.service';
import { AskRagDto, ReindexRagDto } from './dto/rag.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('rag')
export class RagController {
  constructor(private readonly service: RagService) {}

  @Post('ask')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST', 'AUDITOR')
  ask(@CurrentUser() user: AuthUser, @Body() dto: AskRagDto) {
    return this.service.ask(user.tenantId, user.sub, dto);
  }

  @Post('reindex')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  reindex(@CurrentUser() user: AuthUser, @Body() dto: ReindexRagDto) {
    return this.service.reindex(user.tenantId, dto);
  }
}
