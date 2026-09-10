import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateTaskDto } from './dto/task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.task.findMany({
      where: { tenantId },
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      include: { company: true, instrument: true, assignee: true },
    });
  }

  create(tenantId: string, dto: CreateTaskDto) {
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

  /**
   * Cria tarefas abertas para instrumentos PENDING_REVIEW sem tarefa equivalente.
   * Idempotente: não duplica enquanto existir TODO/IN_PROGRESS do tipo REVIEW_INSTRUMENT.
   */
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
