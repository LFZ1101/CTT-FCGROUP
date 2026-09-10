import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TenantOwnershipService } from '../../common/tenancy/tenant-ownership.service';
import { CreateTaskDto } from './dto/task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: TenantOwnershipService,
  ) {}

  list(tenantId: string) {
    return this.prisma.task.findMany({
      where: { tenantId },
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      include: { company: true, instrument: true, assignee: true },
    });
  }

  async create(tenantId: string, dto: CreateTaskDto) {
    await this.ownership.assertCompany(tenantId, dto.companyId);
    await this.ownership.assertInstrument(tenantId, dto.instrumentId);
    await this.ownership.assertUser(tenantId, dto.assigneeId);
    return this.prisma.task.create({
      data: {
        tenantId,
        title: dto.title,
        description: dto.description,
        companyId: dto.companyId,
        instrumentId: dto.instrumentId,
        assigneeId: dto.assigneeId,
        priority: dto.priority ?? 3,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
    });
  }

  async status(tenantId: string, id: string, status: TaskStatus) {
    const result = await this.prisma.task.updateMany({
      where: { id, tenantId },
      data: { status },
    });
    if (result.count === 0) throw new NotFoundException('Tarefa não encontrada');
    return { updated: true, status };
  }

  async syncPendingReviewTasks(tenantId: string) {
    const pending = await this.prisma.collectiveInstrument.findMany({
      where: { tenantId, status: 'PENDING_REVIEW' },
      select: { id: true, title: true, type: true },
    });

    let created = 0;
    for (const instrument of pending) {
      const open = await this.prisma.task.findFirst({
        where: {
          tenantId,
          instrumentId: instrument.id,
          title: { startsWith: 'Revisar instrumento' },
          status: { in: ['TODO', 'IN_PROGRESS'] },
        },
      });
      if (open) continue;

      await this.prisma.task.create({
        data: {
          tenantId,
          instrumentId: instrument.id,
          title: `Revisar instrumento: ${instrument.title}`,
          description: `Validação humana necessária para ${instrument.type}. Confirme vigência, partes e aplicação antes de marcar como VALIDATED.`,
          priority: 2,
          status: 'TODO',
        },
      });
      created++;
    }

    return { pending: pending.length, created };
  }
}
