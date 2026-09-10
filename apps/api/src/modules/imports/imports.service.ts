import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  COMPANY_HEADER_ALIASES,
  LINK_HEADER_ALIASES,
  isValidCnpjDigits,
  mapRow,
  onlyDigits,
  parseCsv,
} from './csv';

const MAX_ROWS = Number(process.env.CSV_IMPORT_MAX_ROWS || 1000);

export type PreviewRowIssue = { line: number; field?: string; message: string };

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  async previewCompaniesForTenant(tenantId: string, csvText: string) {
    const parsed = parseCsv(csvText, MAX_ROWS);
    if (!parsed.headers.length) throw new BadRequestException('CSV vazio ou sem cabeçalho');

    const existing = await this.prisma.company.findMany({
      where: { tenantId },
      select: { id: true, cnpj: true },
    });
    const byCnpj = new Map(existing.map((c) => [c.cnpj, c.id]));

    const issues: PreviewRowIssue[] = [];
    const valid: Array<{
      line: number;
      cnpj: string;
      legalName: string;
      tradeName?: string;
      mainCnae?: string;
      city?: string;
      state?: string;
      employeeCount?: number;
      action: 'CREATE' | 'UPDATE';
      existingId?: string;
    }> = [];
    const seenInFile = new Map<string, number>();

    parsed.rows.forEach((raw, idx) => {
      const line = idx + 2;
      const row = mapRow(raw, COMPANY_HEADER_ALIASES);
      const cnpj = onlyDigits(row.cnpj || '');
      const legalName = (row.legalName || '').trim();

      if (!cnpj) {
        issues.push({ line, field: 'cnpj', message: 'CNPJ obrigatório' });
        return;
      }
      if (!isValidCnpjDigits(cnpj)) {
        issues.push({ line, field: 'cnpj', message: `CNPJ inválido: ${row.cnpj}` });
        return;
      }
      if (!legalName) {
        issues.push({ line, field: 'legalName', message: 'Razão social obrigatória' });
        return;
      }
      if (seenInFile.has(cnpj)) {
        issues.push({
          line,
          field: 'cnpj',
          message: `CNPJ duplicado no arquivo (também na linha ${seenInFile.get(cnpj)})`,
        });
        return;
      }
      seenInFile.set(cnpj, line);

      let employeeCount: number | undefined;
      if (row.employeeCount) {
        const n = Number(String(row.employeeCount).replace(/\D/g, ''));
        if (Number.isNaN(n)) {
          issues.push({ line, field: 'employeeCount', message: 'Quantidade de funcionários inválida' });
          return;
        }
        employeeCount = n;
      }

      const existingId = byCnpj.get(cnpj);
      valid.push({
        line,
        cnpj,
        legalName,
        tradeName: row.tradeName || undefined,
        mainCnae: row.mainCnae || undefined,
        city: row.city || undefined,
        state: row.state ? row.state.toUpperCase().slice(0, 2) : undefined,
        employeeCount,
        action: existingId ? 'UPDATE' : 'CREATE',
        existingId,
      });
    });

    return {
      kind: 'COMPANIES' as const,
      headers: parsed.headers,
      truncated: parsed.rawRowCount > parsed.rows.length,
      rawRowCount: parsed.rawRowCount,
      validCount: valid.length,
      errorCount: issues.length,
      valid,
      issues,
      disclaimer: 'Linhas inválidas não serão importadas. Confirme explicitamente para processar.',
    };
  }

  async confirmCompanies(tenantId: string, userId: string, csvText: string) {
    const preview = await this.previewCompaniesForTenant(tenantId, csvText);
    if (!preview.valid.length) {
      throw new BadRequestException('Nenhuma linha válida para importar');
    }

    let created = 0;
    let updated = 0;
    for (const row of preview.valid) {
      if (row.action === 'CREATE') {
        await this.prisma.company.create({
          data: {
            tenantId,
            cnpj: row.cnpj,
            legalName: row.legalName,
            tradeName: row.tradeName,
            mainCnae: row.mainCnae,
            city: row.city,
            state: row.state,
            employeeCount: row.employeeCount,
          },
        });
        created++;
      } else if (row.existingId) {
        await this.prisma.company.update({
          where: { id: row.existingId },
          data: {
            legalName: row.legalName,
            tradeName: row.tradeName,
            mainCnae: row.mainCnae,
            city: row.city,
            state: row.state,
            employeeCount: row.employeeCount,
            active: true,
          },
        });
        updated++;
      }
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'COMPANIES_CSV_IMPORTED',
        entity: 'Company',
        metadata: {
          created,
          updated,
          errors: preview.errorCount,
          rawRowCount: preview.rawRowCount,
        },
      },
    });

    return {
      ok: true,
      created,
      updated,
      skippedInvalid: preview.errorCount,
      report: preview.issues,
    };
  }

  async previewUnionLinksForTenant(tenantId: string, csvText: string) {
    const parsed = parseCsv(csvText, MAX_ROWS);
    if (!parsed.headers.length) throw new BadRequestException('CSV vazio ou sem cabeçalho');

    const [companies, unions, existingLinks] = await Promise.all([
      this.prisma.company.findMany({
        where: { tenantId, active: true },
        select: { id: true, cnpj: true, legalName: true },
      }),
      this.prisma.union.findMany({
        where: { tenantId },
        select: { id: true, cnpj: true, name: true },
      }),
      this.prisma.companyUnion.findMany({
        where: { company: { tenantId } },
        select: { companyId: true, unionId: true, kind: true },
      }),
    ]);
    const companyByCnpj = new Map(companies.map((c) => [c.cnpj, c]));
    const unionByCnpj = new Map(
      unions.filter((u) => u.cnpj).map((u) => [onlyDigits(u.cnpj!), u]),
    );
    const normalizeName = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    const unionByName = new Map(unions.map((u) => [normalizeName(u.name), u]));
    const linkKeys = new Set(existingLinks.map((l) => `${l.companyId}:${l.unionId}:${l.kind}`));

    const issues: PreviewRowIssue[] = [];
    const valid: Array<{
      line: number;
      companyId: string;
      companyCnpj: string;
      companyName: string;
      unionId: string;
      unionName: string;
      kind: string;
      status: string;
      action: 'CREATE' | 'UPDATE';
    }> = [];

    for (let idx = 0; idx < parsed.rows.length; idx++) {
      const line = idx + 2;
      const row = mapRow(parsed.rows[idx], LINK_HEADER_ALIASES);
      const companyCnpj = onlyDigits(row.companyCnpj || '');
      if (!companyCnpj || !isValidCnpjDigits(companyCnpj)) {
        issues.push({ line, field: 'companyCnpj', message: 'CNPJ da empresa inválido ou ausente' });
        continue;
      }
      const company = companyByCnpj.get(companyCnpj);
      if (!company) {
        issues.push({
          line,
          field: 'companyCnpj',
          message: `Empresa não encontrada neste tenant (CNPJ ${companyCnpj})`,
        });
        continue;
      }

      const union =
        (row.unionCnpj && unionByCnpj.get(onlyDigits(row.unionCnpj))) ||
        (row.unionName && unionByName.get(normalizeName(row.unionName))) ||
        null;
      if (!union) {
        issues.push({
          line,
          field: row.unionCnpj ? 'unionCnpj' : 'unionName',
          message: 'Sindicato não encontrado neste tenant (informe cnpj_sindicato ou nome)',
        });
        continue;
      }

      const kind = (row.kind || 'LABOR').trim().toUpperCase() || 'LABOR';
      if (!['LABOR', 'EMPLOYER'].includes(kind)) {
        issues.push({ line, field: 'kind', message: 'kind deve ser LABOR ou EMPLOYER' });
        continue;
      }

      let status = (row.status || 'CONFIRMED').trim().toUpperCase();
      if (['TRUE', 'SIM', '1', 'CONFIRMADO'].includes(status)) status = 'CONFIRMED';
      if (['FALSE', 'NAO', 'NÃO', '0'].includes(status)) status = 'SUGGESTED';
      if (!['CONFIRMED', 'SUGGESTED', 'NEEDS_REVIEW'].includes(status)) {
        issues.push({
          line,
          field: 'status',
          message: 'status deve ser CONFIRMED, SUGGESTED ou NEEDS_REVIEW',
        });
        continue;
      }

      const key = `${company.id}:${union.id}:${kind}`;
      valid.push({
        line,
        companyId: company.id,
        companyCnpj,
        companyName: company.legalName,
        unionId: union.id,
        unionName: union.name,
        kind,
        status,
        action: linkKeys.has(key) ? 'UPDATE' : 'CREATE',
      });
    }

    return {
      kind: 'UNION_LINKS' as const,
      headers: parsed.headers,
      truncated: parsed.rawRowCount > parsed.rows.length,
      rawRowCount: parsed.rawRowCount,
      validCount: valid.length,
      errorCount: issues.length,
      valid,
      issues,
      disclaimer:
        'Vínculos inválidos não serão importados. Status CONFIRMED marca validação humana via importação CSV.',
    };
  }

  async confirmUnionLinks(tenantId: string, userId: string, csvText: string) {
    const preview = await this.previewUnionLinksForTenant(tenantId, csvText);
    if (!preview.valid.length) {
      throw new BadRequestException('Nenhuma linha válida para importar');
    }

    let created = 0;
    let updated = 0;
    for (const row of preview.valid) {
      const confirmed = row.status === 'CONFIRMED';
      await this.prisma.companyUnion.upsert({
        where: {
          companyId_unionId_kind: {
            companyId: row.companyId,
            unionId: row.unionId,
            kind: row.kind,
          },
        },
        create: {
          companyId: row.companyId,
          unionId: row.unionId,
          kind: row.kind,
          status: row.status,
          confirmed,
          validationMethod: 'CSV_IMPORT',
          validatedBy: userId,
          validatedAt: new Date(),
          confidence: confirmed ? 1 : 0.7,
        },
        update: {
          status: row.status,
          confirmed,
          validationMethod: 'CSV_IMPORT',
          validatedBy: userId,
          validatedAt: new Date(),
          confidence: confirmed ? 1 : 0.7,
        },
      });
      if (row.action === 'CREATE') created++;
      else updated++;
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'UNION_LINKS_CSV_IMPORTED',
        entity: 'CompanyUnion',
        metadata: {
          created,
          updated,
          errors: preview.errorCount,
          rawRowCount: preview.rawRowCount,
        },
      },
    });

    return {
      ok: true,
      created,
      updated,
      skippedInvalid: preview.errorCount,
      report: preview.issues,
    };
  }
}
