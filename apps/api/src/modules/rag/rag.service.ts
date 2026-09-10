import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AskRagDto, ReindexRagDto } from './dto/rag.dto';
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

    const hits = retrieveChunks(
      question,
      chunks.map((c) => ({
        id: c.id,
        title: c.title,
        clauseNumber: c.clauseNumber,
        category: c.category,
        text: c.text,
        pageStart: c.pageStart,
        pageEnd: c.pageEnd,
      })),
      dto.topK ?? 5,
    );

    const built = buildExtractiveAnswer(question, hits);
    const provider = process.env.OPENAI_API_KEY ? 'heuristic+openai-ready' : 'heuristic-v1';

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
          citationCount: built.citations.length,
          provider,
        },
      },
    });

    return {
      question,
      answer: built.answer,
      insufficientEvidence: built.insufficientEvidence,
      provider: 'heuristic-v1',
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
        };
      }),
    };
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
          modelVersion: 'heuristic-v1',
        })),
      });
      return doc.clauses.length;
    }

    // Fallback: página como chunk quando não há cláusulas
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
          modelVersion: 'heuristic-v1',
        })),
      });
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
          modelVersion: 'heuristic-v1',
        })),
      });
      return instrument.clauses.length;
    }

    // Fallback: indexar documentos vinculados
    let total = 0;
    for (const d of instrument.discoveredDocuments) {
      total += await this.indexDocument(tenantId, d.id);
    }
    return total;
  }
}
