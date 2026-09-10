import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, companyId?: string) {
    return this.prisma.employee.findMany({
      where: {
        tenantId,
        ...(companyId ? { companyId } : {}),
      },
      include: {
        company: { select: { id: true, legalName: true, tradeName: true, cnpj: true } },
      },
      orderBy: [{ companyId: 'asc' }, { displayName: 'asc' }],
      take: 500,
    });
  }

  async get(tenantId: string, id: string) {
    const row = await this.prisma.employee.findFirst({
      where: { id, tenantId },
      include: {
        company: { select: { id: true, legalName: true, tradeName: true, cnpj: true } },
      },
    });
    if (!row) throw new NotFoundException('Colaborador não encontrado');
    return row;
  }

  async create(tenantId: string, userId: string, dto: CreateEmployeeDto) {
    const company = await this.prisma.company.findFirst({
      where: { id: dto.companyId, tenantId, active: true },
    });
    if (!company) throw new NotFoundException('Empresa não encontrada');

    const row = await this.prisma.employee.create({
      data: {
        tenantId,
        companyId: dto.companyId,
        displayName: dto.displayName.trim(),
        externalId: dto.externalId?.trim() || null,
        jobTitle: dto.jobTitle?.trim() || null,
        baseSalaryCents:
          typeof dto.baseSalary === 'number' ? Math.round(dto.baseSalary * 100) : null,
        admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : null,
        weeklyHours: dto.weeklyHours ?? null,
        status: dto.status || 'ACTIVE',
        notes: dto.notes || null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'EMPLOYEE_CREATED',
        entity: 'Employee',
        entityId: row.id,
        metadata: { companyId: dto.companyId },
      },
    });
    return row;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateEmployeeDto) {
    await this.get(tenantId, id);
    const row = await this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName.trim() } : {}),
        ...(dto.externalId !== undefined ? { externalId: dto.externalId?.trim() || null } : {}),
        ...(dto.jobTitle !== undefined ? { jobTitle: dto.jobTitle?.trim() || null } : {}),
        ...(dto.baseSalary !== undefined
          ? {
              baseSalaryCents:
                dto.baseSalary === null ? null : Math.round(Number(dto.baseSalary) * 100),
            }
          : {}),
        ...(dto.admissionDate !== undefined
          ? { admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : null }
          : {}),
        ...(dto.weeklyHours !== undefined ? { weeklyHours: dto.weeklyHours } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'EMPLOYEE_UPDATED',
        entity: 'Employee',
        entityId: id,
      },
    });
    return row;
  }

  async remove(tenantId: string, userId: string, id: string) {
    await this.get(tenantId, id);
    await this.prisma.employee.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'EMPLOYEE_DEACTIVATED',
        entity: 'Employee',
        entityId: id,
      },
    });
    return { ok: true };
  }

  async importCsvPreview(tenantId: string, csvText: string) {
    const { parseCsv, mapRow, onlyDigits } = await import('../imports/csv');
    const aliases: Record<string, string> = {
      empresa_cnpj: 'companyCnpj',
      cnpj_empresa: 'companyCnpj',
      company_cnpj: 'companyCnpj',
      cnpj: 'companyCnpj',
      nome: 'displayName',
      colaborador: 'displayName',
      display_name: 'displayName',
      matricula: 'externalId',
      external_id: 'externalId',
      id_externo: 'externalId',
      cargo: 'jobTitle',
      job_title: 'jobTitle',
      salario: 'baseSalary',
      salary: 'baseSalary',
      base_salary: 'baseSalary',
      admissao: 'admissionDate',
      admission_date: 'admissionDate',
      jornada: 'weeklyHours',
      weekly_hours: 'weeklyHours',
      status: 'status',
    };
    const parsed = parseCsv(csvText, Number(process.env.CSV_IMPORT_MAX_ROWS || 1000));
    if (!parsed.headers.length) throw new BadRequestException('CSV vazio');

    const companies = await this.prisma.company.findMany({
      where: { tenantId, active: true },
      select: { id: true, cnpj: true, legalName: true },
    });
    const byCnpj = new Map(companies.map((c) => [c.cnpj, c]));

    const issues: Array<{ line: number; message: string }> = [];
    const valid: Array<{
      line: number;
      companyId: string;
      companyName: string;
      displayName: string;
      externalId?: string;
      jobTitle?: string;
      baseSalaryCents?: number;
      admissionDate?: string;
      weeklyHours?: number;
      status: 'ACTIVE' | 'INACTIVE' | 'LEAVE';
    }> = [];

    parsed.rows.forEach((raw, idx) => {
      const line = idx + 2;
      const row = mapRow(raw, aliases);
      const cnpj = onlyDigits(row.companyCnpj || '');
      const company = byCnpj.get(cnpj);
      if (!company) {
        issues.push({ line, message: 'Empresa não encontrada neste tenant' });
        return;
      }
      const displayName = (row.displayName || '').trim();
      if (!displayName) {
        issues.push({ line, message: 'Nome do colaborador obrigatório' });
        return;
      }
      let baseSalaryCents: number | undefined;
      if (row.baseSalary) {
        const n = Number(String(row.baseSalary).replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, ''));
        if (Number.isNaN(n)) {
          issues.push({ line, message: 'Salário inválido' });
          return;
        }
        baseSalaryCents = Math.round(n * 100);
      }
      let status: 'ACTIVE' | 'INACTIVE' | 'LEAVE' = 'ACTIVE';
      if (row.status) {
        const s = row.status.toUpperCase();
        if (['ACTIVE', 'INACTIVE', 'LEAVE', 'ATIVO', 'INATIVO'].includes(s)) {
          status = s.startsWith('INAT') ? 'INACTIVE' : s.startsWith('LEAVE') ? 'LEAVE' : 'ACTIVE';
          if (s === 'INACTIVE' || s === 'INATIVO') status = 'INACTIVE';
          if (s === 'LEAVE') status = 'LEAVE';
          if (s === 'ACTIVE' || s === 'ATIVO') status = 'ACTIVE';
        }
      }
      valid.push({
        line,
        companyId: company.id,
        companyName: company.legalName,
        displayName,
        externalId: row.externalId || undefined,
        jobTitle: row.jobTitle || undefined,
        baseSalaryCents,
        admissionDate: row.admissionDate || undefined,
        weeklyHours: row.weeklyHours ? Number(row.weeklyHours) : undefined,
        status,
      });
    });

    return {
      kind: 'EMPLOYEES' as const,
      validCount: valid.length,
      errorCount: issues.length,
      rawRowCount: parsed.rawRowCount,
      valid,
      issues,
      disclaimer: 'Minimização de PII: não envie CPF. Use matrícula/externalId se necessário.',
    };
  }

  async importCsvConfirm(tenantId: string, userId: string, csvText: string) {
    const preview = await this.importCsvPreview(tenantId, csvText);
    if (!preview.valid.length) throw new BadRequestException('Nenhuma linha válida');

    let created = 0;
    let updated = 0;
    for (const row of preview.valid) {
      if (row.externalId) {
        const existing = await this.prisma.employee.findFirst({
          where: { tenantId, companyId: row.companyId, externalId: row.externalId },
        });
        if (existing) {
          await this.prisma.employee.update({
            where: { id: existing.id },
            data: {
              displayName: row.displayName,
              jobTitle: row.jobTitle || null,
              baseSalaryCents: row.baseSalaryCents ?? null,
              admissionDate: row.admissionDate ? new Date(row.admissionDate) : null,
              weeklyHours: row.weeklyHours ?? null,
              status: row.status,
            },
          });
          updated++;
          continue;
        }
      }
      await this.prisma.employee.create({
        data: {
          tenantId,
          companyId: row.companyId,
          displayName: row.displayName,
          externalId: row.externalId || null,
          jobTitle: row.jobTitle || null,
          baseSalaryCents: row.baseSalaryCents ?? null,
          admissionDate: row.admissionDate ? new Date(row.admissionDate) : null,
          weeklyHours: row.weeklyHours ?? null,
          status: row.status,
        },
      });
      created++;
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'EMPLOYEES_CSV_IMPORTED',
        entity: 'Employee',
        metadata: { created, updated, errors: preview.errorCount },
      },
    });

    return { ok: true, created, updated, skippedInvalid: preview.errorCount, report: preview.issues };
  }
}
