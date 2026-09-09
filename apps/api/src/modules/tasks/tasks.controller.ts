import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskStatusDto } from './dto/task.dto';
@UseGuards(AuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}
  @Get() list(@CurrentUser() user: AuthUser) { return this.service.list(user.tenantId); }
  @Post() create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) { return this.service.create(user.tenantId, dto); }
  @Patch(':id/status') status(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateTaskStatusDto) { return this.service.status(user.tenantId, id, dto.status); }
}
