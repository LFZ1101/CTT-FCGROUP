import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskStatusDto } from './dto/task.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.tenantId);
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Post('sync-review')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST')
  syncReview(@CurrentUser() user: AuthUser) {
    return this.service.syncPendingReviewTasks(user.tenantId);
  }

  @Patch(':id/status')
  @Roles('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST', 'AUDITOR')
  status(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.service.status(user.tenantId, id, dto.status);
  }
}
