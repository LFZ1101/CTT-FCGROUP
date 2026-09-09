import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAlertDto } from './dto/alert.dto';
@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}
  list(tenantId: string) { return this.prisma.alert.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, include: { company: true, instrument: true } }); }
  create(tenantId: string, dto: CreateAlertDto) { return this.prisma.alert.create({ data: { tenantId, ...dto } }); }
  markRead(tenantId: string, id: string) { return this.prisma.alert.updateMany({ where: { id, tenantId }, data: { readAt: new Date() } }); }
}
