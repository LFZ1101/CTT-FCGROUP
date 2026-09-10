import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTaskDto } from './dto/task.dto';
@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}
  list(tenantId: string) { return this.prisma.task.findMany({ where: { tenantId }, orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }], include: { company: true, instrument: true, assignee: true } }); }
  create(tenantId: string, dto: CreateTaskDto) { return this.prisma.task.create({ data: { tenantId, title: dto.title, description: dto.description, companyId: dto.companyId, instrumentId: dto.instrumentId, assigneeId: dto.assigneeId, priority: dto.priority ?? 3, dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined } }); }
  status(tenantId: string, id: string, status: any) { return this.prisma.task.updateMany({ where: { id, tenantId }, data: { status } }); }
}
