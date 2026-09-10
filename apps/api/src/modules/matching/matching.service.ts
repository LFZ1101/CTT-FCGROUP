import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { rankUnionSuggestions } from './union-match';

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  async suggestForCompany(tenantId: string, companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId, active: true },
    });
    if (!company) throw new NotFoundException('Empresa não encontrada');

    const unions = await this.prisma.union.findMany({ where: { tenantId } });
    const existing = await this.prisma.companyUnion.findMany({
      where: { companyId },
      select: { unionId: true, kind: true, status: true },
    });
    const existingKeys = new Set(
      existing.filter((e) => e.status !== 'REJECTED').map((e) => `${e.unionId}:${e.kind}`),
    );

    const ranked = rankUnionSuggestions(company, unions, { minScore: 0.28, limit: 10 }).filter(
      (s) => !existingKeys.has(`${s.unionId}:${s.kind}`),
    );

    return {
      companyId,
      label: 'Sindicatos potencialmente aplicáveis',
      disclaimer:
        'Sugestões assistidas com score explicável. Exigem validação humana — não afirmam o sindicato correto.',
      suggestions: ranked,
    };
  }

  async persistSuggestions(tenantId: string, companyId: string) {
    const { suggestions } = await this.suggestForCompany(tenantId, companyId);
    const created = [];
    for (const s of suggestions.slice(0, 5)) {
      const row = await this.prisma.companyUnion.upsert({
        where: {
          companyId_unionId_kind: {
            companyId,
            unionId: s.unionId,
            kind: s.kind,
          },
        },
        create: {
          companyId,
          unionId: s.unionId,
          kind: s.kind,
          status: 'SUGGESTED',
          confirmed: false,
          confidence: s.score,
          validationMethod: 'ASSISTED_SCORE_V1',
          notes: s.factors
            .filter((f) => f.status === 'match' || f.status === 'warning')
            .map((f) => f.detail)
            .join('; ')
            .slice(0, 500),
        },
        update: {
          status: 'SUGGESTED',
          confirmed: false,
          confidence: s.score,
          validationMethod: 'ASSISTED_SCORE_V1',
        },
        include: { union: true },
      });
      created.push({ ...row, match: s });
    }
    return { created: created.length, links: created };
  }

  async decideLink(
    tenantId: string,
    linkId: string,
    decision: 'CONFIRM' | 'REJECT' | 'NEEDS_REVIEW',
    userId: string,
    notes?: string,
  ) {
    const link = await this.prisma.companyUnion.findFirst({
      where: { id: linkId },
      include: { company: true, union: true },
    });
    if (!link || link.company.tenantId !== tenantId) {
      throw new NotFoundException('Vínculo não encontrado');
    }
    if (!['CONFIRM', 'REJECT', 'NEEDS_REVIEW'].includes(decision)) {
      throw new BadRequestException('Decisão inválida');
    }
    const status =
      decision === 'CONFIRM' ? 'CONFIRMED' : decision === 'REJECT' ? 'REJECTED' : 'NEEDS_REVIEW';
    const updated = await this.prisma.companyUnion.update({
      where: { id: linkId },
      data: {
        status,
        confirmed: decision === 'CONFIRM',
        validatedBy: userId,
        validatedAt: new Date(),
        validationMethod: 'HUMAN',
        notes: notes ?? link.notes,
      },
      include: { union: true, company: true },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: `UNION_LINK_${decision}`,
        entity: 'CompanyUnion',
        entityId: linkId,
        metadata: {
          companyId: link.companyId,
          unionId: link.unionId,
          kind: link.kind,
          previousStatus: link.status,
          notes: notes || null,
        },
      },
    });

    return updated;
  }
}
