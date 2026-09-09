import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { createHash } from 'crypto';

@Injectable()
export class MonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  history(tenantId: string, sourceId?: string) {
    return this.prisma.sourceCheck.findMany({
      where: { tenantId, ...(sourceId ? { sourceId } : {}) },
      include: { source: true },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
  }

  discoveries(tenantId: string) {
    return this.prisma.discoveredDocument.findMany({
      where: { tenantId }, include: { source: true, instrument: true },
      orderBy: { firstSeenAt: 'desc' }, take: 200,
    });
  }

  async checkOne(tenantId: string, sourceId: string) {
    const source = await this.prisma.source.findFirst({ where: { id: sourceId, tenantId } });
    if (!source) throw new NotFoundException('Fonte não encontrada');
    if (!source.enabled) throw new BadRequestException('Fonte desativada');

    const check = await this.prisma.sourceCheck.create({
      data: { tenantId, sourceId, status: 'RUNNING' },
    });

    try {
      const response = await fetch(source.url, {
        redirect: 'follow',
        headers: { 'user-agent': 'CCT-Intelligence-Monitor/1.0 (+compliance; contact-admin)' },
      });
      const contentType = response.headers.get('content-type') || '';
      const body = await response.text();
      const links = this.extractCandidateLinks(body, source.url);
      let newDocs = 0;

      for (const link of links) {
        const normalizedUrl = this.normalizeUrl(link.url);
        const existing = await this.prisma.discoveredDocument.findUnique({
          where: { sourceId_normalizedUrl: { sourceId, normalizedUrl } },
        });
        if (!existing) {
          await this.prisma.discoveredDocument.create({
            data: {
              tenantId, sourceId, title: link.title || null, url: link.url,
              normalizedUrl, contentType: link.contentType || null,
              documentHash: createHash('sha256').update(normalizedUrl).digest('hex'),
              processingStatus: 'DISCOVERED',
              metadata: { discoveredFrom: source.url },
            },
          });
          newDocs++;
        } else {
          await this.prisma.discoveredDocument.update({ where: { id: existing.id }, data: { lastSeenAt: new Date() } });
        }
      }

      await this.prisma.source.update({
        where: { id: sourceId }, data: { lastCheckedAt: new Date(), lastSuccessAt: response.ok ? new Date() : source.lastSuccessAt },
      });
      await this.prisma.sourceCheck.update({
        where: { id: check.id }, data: {
          status: response.ok ? 'SUCCESS' : 'HTTP_ERROR', httpStatus: response.status,
          documentsFound: links.length, message: `${newDocs} novo(s) documento(s)`, finishedAt: new Date(),
        },
      });
      if (newDocs > 0) {
        await this.prisma.alert.create({ data: {
          tenantId, severity: 'WARNING', type: 'SOURCE_NEW_DOCUMENTS',
          title: `${newDocs} novo(s) documento(s) encontrado(s)`,
          message: `A fonte ${source.name} apresentou novos links candidatos a CCT/ACT ou aditivos.`,
        }});
      }
      return { sourceId, httpStatus: response.status, candidates: links.length, newDocuments: newDocs };
    } catch (error: any) {
      await this.prisma.source.update({ where: { id: sourceId }, data: { lastCheckedAt: new Date() } });
      await this.prisma.sourceCheck.update({
        where: { id: check.id }, data: { status: 'ERROR', message: String(error?.message || error), finishedAt: new Date() },
      });
      throw error;
    }
  }

  async checkAll(tenantId: string) {
    const sources = await this.prisma.source.findMany({ where: { tenantId, enabled: true } });
    const results = [] as any[];
    for (const source of sources) {
      try { results.push(await this.checkOne(tenantId, source.id)); }
      catch (error: any) { results.push({ sourceId: source.id, error: String(error?.message || error) }); }
    }
    return results;
  }

  private extractCandidateLinks(html: string, baseUrl: string) {
    const results: { url: string; title?: string; contentType?: string }[] = [];
    const regex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const keywords = /(cct|act|conven[cç][aã]o|acordo|coletiv|aditivo|prorroga|instrumento|mediador)/i;
    const seen = new Set<string>(); let m;
    while ((m = regex.exec(html))) {
      try {
        const href = new URL(m[1], baseUrl).toString();
        const title = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const isPdf = /\.pdf(?:$|[?#])/i.test(href);
        if (!isPdf && !keywords.test(`${href} ${title}`)) continue;
        if (seen.has(href)) continue; seen.add(href);
        results.push({ url: href, title, contentType: isPdf ? 'application/pdf' : 'text/html' });
      } catch {}
    }
    return results.slice(0, 250);
  }

  private normalizeUrl(raw: string) {
    const url = new URL(raw); url.hash = '';
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(k => url.searchParams.delete(k));
    return url.toString();
  }
}
