import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AskRagDto, ReindexRagDto } from './dto/rag.dto';
import { EMBEDDING_MODEL, embedText } from './embeddings';
import { syncTenantChunkVecs } from './pgvector';
import { buildExtractiveAnswer, retrieveChunks } from './retrieve';

@Injectable()
export class RagService {
  constructor(private readonly prisma: PrismaService) {}

  async reindex(tenantId: string, dto: ReindexRagDto) {
    if (!dto.documentId && !dto.instrumentId) {
      throw new BadRequestException('Informe documentId e/ou instrumentId.');
    }
    const result: { documentChunks?: number; instrumentChunks?: number } = {};
    if (dto.documentId) {
      result.documentChunks = await this.indexDocument(tenantId, dto.documentId);
    }
    if (dto.instrumentId) {
      result.instrumentChunks = await this.indexInstrument(tenantId, dto.instrumentId);
    }
    return { ok: true, ...result };
  }

  async ask(tenantId: string, userId: string, dto: AskRagDto) {
    const question = dto.question?.trim();
    if (!question) throw new BadRequestException('Pergunta obrigatória.');
    if (!dto.documentId && !dto.instrumentId) {
      throw new BadRequestException('Informe documentId ou instrumentId para delimitar o escopo.');
    }
    if (dto.documentId && dto.instrumentId) {
      throw new BadRequestException('Informe apenas um escopo: documentId ou instrumentId.');
    }

    if (dto.documentId) {
      await this.ensureDocumentChunks(tenantId, dto.documentId);
    } else if (dto.instrumentId) {
      await this.ensureInstrumentChunks(tenantId, dto.instrumentId);
    }

    const chunks = await this.prisma.documentChunk.findMany({
      where: {
        tenantId,
        ...(dto.documentId ? { discoveredDocumentId: dto.documentId } : {}),
        ...(dto.instrumentId ? { instrumentId: dto.instrumentId } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!chunks.length) {
      throw new NotFoundException(
        'Nenhum chunk indexado para este escopo. Faça o parse/promoção do documento ou reindexe.',
      );
    }

    const hitsHybrid = retrieveChunks(
      question,
      chunks.map((c) => ({
        id: c.id,
        title: c.title,
        clauseNumber: c.clauseNumber,
        category: c.category,
        text: c.text,
        pageStart: c.pageStart,
        pageEnd: c.pageEnd,
        embedding: Array.isArray(c.embedding) ? (c.embedding as number[]) : null,
      })),
      dto.topK ?? 5,
    );

    // Boost com ranking pgvector quando a extensão estiver disponível.
    let hits = hitsHybrid;
    let provider: string = `hybrid-${EMBEDDING_MODEL}`;
    try {
      const { hasPgvector, searchByPgvector } = await import('./pgvector');
      if (await hasPgvector(this.prisma)) {
        const qEmb = embedText(question);
        const vecHits = await searchByPgvector(this.prisma, {
          tenantId,
          embedding: qEmb,
          limit: Math.max(dto.topK ?? 5, 10),
          documentId: dto.documentId,
          instrumentId: dto.instrumentId,
        });
        if (vecHits.length) {
          const byId = new Map(hitsHybrid.map((h) => [h.id, h]));
          for (const v of vecHits) {
            const existing = byId.get(v.id);
            if (existing) {
              existing.semanticScore = Math.max(existing.semanticScore, v.semantic);
              existing.score = Math.max(existing.score, 0.55 * existing.score + 0.45 * v.semantic);
            }
          }
          hits = [...byId.values()].sort((a, b) => b.score - a.score).slice(0, dto.topK ?? 5);
          provider = `hybrid-${EMBEDDING_MODEL}+pgvector`;
        }
      }
    } catch {
      /* pgvector opcional */
    }

    const built = buildExtractiveAnswer(question, hits);
    let answer = built.answer;

    if (!built.insufficientEvidence && process.env.OPENAI_API_KEY) {
      const synthesized = await this.synthesizeWithOpenAI(question, hits.slice(0, 3));
      if (synthesized) {
        answer = synthesized;
        provider = `${provider}+openai`;
      }
    }

    const originMeta = await this.resolveOriginDisclaimer(tenantId, dto.documentId, dto.instrumentId);
    if (originMeta && !built.insufficientEvidence) {
      answer = `${answer}\n\nFonte: ${originMeta.sourceTitle}\nOrigem: ${originMeta.originLabel}\nStatus: ${originMeta.statusLabel}`;
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'RAG_ASK',
        entity: dto.instrumentId ? 'CollectiveInstrument' : 'DiscoveredDocument',
        entityId: dto.instrumentId || dto.documentId,
        metadata: {
          question,
          insufficientEvidence: built.insufficientEvidence,
          topScore: hits[0]?.score ?? 0,
          lexicalScore: hits[0]?.lexicalScore ?? 0,
          semanticScore: hits[0]?.semanticScore ?? 0,
          citationCount: built.citations.length,
          provider,
          origin: originMeta,
        },
      },
    });

    return {
      question,
      answer,
      insufficientEvidence: built.insufficientEvidence,
      provider,
      origin: originMeta,
      scope: {
        documentId: dto.documentId ?? null,
        instrumentId: dto.instrumentId ?? null,
      },
      citations: built.citations.map((c) => {
        const row = chunks.find((x) => x.id === c.chunkId);
        return {
          ...c,
          documentClauseId: row?.documentClauseId ?? null,
          instrumentClauseId: row?.instrumentClauseId ?? null,
          discoveredDocumentId: row?.discoveredDocumentId ?? null,
          instrumentId: row?.instrumentId ?? null,
          originLabel: originMeta?.originLabel ?? null,
        };
      }),
    };
  }

  private async resolveOriginDisclaimer(
    tenantId: string,
    documentId?: string,
    instrumentId?: string,
  ) {
    let doc = null as null | {
      title: string | null;
      source: { type: string; name: string };
      collaborativeContributions: Array<{
        status: string;
        confirmedByOfficialSourceAt: Date | null;
        moderationStatus: string;
      }>;
    };

    if (documentId) {
      doc = await this.prisma.discoveredDocument.findFirst({
        where: { id: documentId, tenantId },
        select: {
          title: true,
          source: { select: { type: true, name: true } },
          collaborativeContributions: {
            select: { status: true, confirmedByOfficialSourceAt: true, moderationStatus: true },
            take: 1,
            orderBy: { submittedAt: 'desc' },
          },
        },
      });
    } else if (instrumentId) {
      const linked = await this.prisma.discoveredDocument.findFirst({
        where: { tenantId, instrumentId },
        select: {
          title: true,
          source: { select: { type: true, name: true } },
          collaborativeContributions: {
            select: { status: true, confirmedByOfficialSourceAt: true, moderationStatus: true },
            take: 1,
            orderBy: { submittedAt: 'desc' },
          },
        },
      });
      doc = linked;
    }
    if (!doc) return null;

    const contrib = doc.collaborativeContributions[0];
    const isCollab = doc.source.type === 'COLLABORATIVE_NETWORK' || Boolean(contrib);
    if (!isCollab && doc.source.type === 'MEDIADOR_MTE') {
      return {
        sourceTitle: doc.title || 'Documento',
        originLabel: 'Mediador/MTE',
        statusLabel: 'Fonte oficial',
        badge: 'OFICIAL',
      };
    }
    if (!isCollab && (doc.source.type === 'LABOR_UNION' || doc.source.type === 'EMPLOYER_UNION')) {
      return {
        sourceTitle: doc.title || 'Documento',
        originLabel: 'Site oficial do sindicato',
        statusLabel: 'Fonte sindical',
        badge: 'SINDICATO',
      };
    }
    if (isCollab) {
      const confirmed = Boolean(contrib?.confirmedByOfficialSourceAt);
      return {
        sourceTitle: doc.title || 'Documento',
        originLabel: 'Base Colaborativa',
        statusLabel: confirmed
          ? 'Confirmado posteriormente em fonte oficial'
          : 'Ainda não confirmada em fonte oficial',
        badge: 'COLABORATIVO',
      };
    }
    return {
      sourceTitle: doc.title || 'Documento',
      originLabel: doc.source.name,
      statusLabel: doc.source.type,
      badge: null,
    };
  }

  private async synthesizeWithOpenAI(
    question: string,
    hits: Array<{ clauseNumber: string | null; title: string | null; snippet: string; text: string }>,
  ): Promise<string | null> {
    try {
      const context = hits
        .map((h, i) => {
          const head = [h.clauseNumber ? `Cláusula ${h.clauseNumber}` : null, h.title]
            .filter(Boolean)
            .join(' — ');
          return `[${i + 1}] ${head || 'Trecho'}\n${h.text.slice(0, 900)}`;
        })
        .join('\n\n');

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: 0,
          messages: [
            {
              role: 'system',
              content:
                'Você é um assistente jurídico trabalhista. Responda em português somente com base no contexto fornecido. Cite as cláusulas usadas. Se o contexto for insuficiente, diga que não há evidência suficiente.',
            },
            {
              role: 'user',
              content: `Pergunta: ${question}\n\nContexto:\n${context}`,
            },
          ],
        }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return json.choices?.[0]?.message?.content?.trim() || null;
    } catch {
      return null;
    }
  }

  private async ensureDocumentChunks(tenantId: string, documentId: string) {
    const count = await this.prisma.documentChunk.count({
      where: { tenantId, discoveredDocumentId: documentId },
    });
    if (count === 0) await this.indexDocument(tenantId, documentId);
  }

  private async ensureInstrumentChunks(tenantId: string, instrumentId: string) {
    const count = await this.prisma.documentChunk.count({
      where: { tenantId, instrumentId },
    });
    if (count === 0) await this.indexInstrument(tenantId, instrumentId);
  }

  private chunkPayload(text: string, title?: string | null, clauseNumber?: string | null, category?: string | null) {
    const blob = [clauseNumber, title, category, text].filter(Boolean).join(' ');
    return {
      embedding: embedText(blob),
      modelVersion: EMBEDDING_MODEL,
    };
  }

  async indexDocument(tenantId: string, documentId: string) {
    const doc = await this.prisma.discoveredDocument.findFirst({
      where: { id: documentId, tenantId },
      include: { clauses: { orderBy: { createdAt: 'asc' } }, pages: { orderBy: { pageNumber: 'asc' } } },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado');

    await this.prisma.documentChunk.deleteMany({
      where: { tenantId, discoveredDocumentId: documentId },
    });

    if (doc.clauses.length) {
      await this.prisma.documentChunk.createMany({
        data: doc.clauses.map((c) => ({
          tenantId,
          discoveredDocumentId: documentId,
          instrumentId: doc.instrumentId,
          documentClauseId: c.id,
          pageStart: c.startPage,
          pageEnd: c.endPage,
          clauseNumber: c.number,
          title: c.title,
          category: String(c.category),
          text: c.text,
          metadata: { source: 'DocumentClause', evidence: c.evidence },
          ...this.chunkPayload(c.text, c.title, c.number, String(c.category)),
        })),
      });
      await syncTenantChunkVecs(this.prisma, { tenantId, discoveredDocumentId: documentId });
      return doc.clauses.length;
    }

    if (doc.pages.length) {
      await this.prisma.documentChunk.createMany({
        data: doc.pages.map((p) => ({
          tenantId,
          discoveredDocumentId: documentId,
          instrumentId: doc.instrumentId,
          pageStart: p.pageNumber,
          pageEnd: p.pageNumber,
          title: `Página ${p.pageNumber}`,
          text: p.text,
          metadata: { source: 'DocumentPage' },
          ...this.chunkPayload(p.text, `Página ${p.pageNumber}`),
        })),
      });
      await syncTenantChunkVecs(this.prisma, { tenantId, discoveredDocumentId: documentId });
      return doc.pages.length;
    }

    return 0;
  }

  async indexInstrument(tenantId: string, instrumentId: string) {
    const instrument = await this.prisma.collectiveInstrument.findFirst({
      where: { id: instrumentId, tenantId },
      include: {
        clauses: { orderBy: { createdAt: 'asc' } },
        discoveredDocuments: { select: { id: true } },
      },
    });
    if (!instrument) throw new NotFoundException('Instrumento não encontrado');

    await this.prisma.documentChunk.deleteMany({
      where: { tenantId, instrumentId },
    });

    if (instrument.clauses.length) {
      await this.prisma.documentChunk.createMany({
        data: instrument.clauses.map((c) => ({
          tenantId,
          instrumentId,
          discoveredDocumentId: instrument.discoveredDocuments[0]?.id ?? null,
          instrumentClauseId: c.id,
          pageStart: c.page,
          pageEnd: c.page,
          clauseNumber: c.number,
          title: c.title,
          category: c.category,
          text: c.text,
          metadata: { source: 'InstrumentClause' },
          ...this.chunkPayload(c.text, c.title, c.number, c.category),
        })),
      });
      await syncTenantChunkVecs(this.prisma, { tenantId, instrumentId });
      return instrument.clauses.length;
    }

    let total = 0;
    for (const d of instrument.discoveredDocuments) {
      total += await this.indexDocument(tenantId, d.id);
    }
    return total;
  }
}
