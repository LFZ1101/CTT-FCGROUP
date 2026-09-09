import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DocumentClass, ClauseCategory, InstrumentStatus } from '@prisma/client';
import { classifyDocument } from './classify.ts';
import { segmentClauses } from './segment.ts';
import { extractPages } from './extract.ts';
import { extractMetadata } from './metadata.ts';
import { mapInstrumentType, isLockedInstrumentStatus } from './promote.ts';

test('classifica CCT por heurística com evidência textual', () => {
  const result = classifyDocument('CONVENÇÃO COLETIVA DE TRABALHO 2026/2027', 'CCT Comércio');
  assert.equal(result.documentClass, DocumentClass.CCT);
  assert.ok(result.confidence >= 0.9);
  assert.ok(result.evidence.length >= 1);
  assert.match(result.evidence[0].snippet.toLowerCase(), /conven/);
});

test('classifica aditivo com prioridade sobre CCT', () => {
  const result = classifyDocument('Termo Aditivo à Convenção Coletiva');
  assert.equal(result.documentClass, DocumentClass.ADDENDUM);
});

test('segmenta cláusulas numeradas', () => {
  const pages = [
    {
      pageNumber: 1,
      text: 'CLÁUSULA 1ª - PISO SALARIAL\nFica estabelecido o piso de R$ 2.000,00.\n\nCLÁUSULA 2ª - VALE-ALIMENTAÇÃO\nO vale-alimentação será de R$ 30,00.',
    },
  ];
  const clauses = segmentClauses(pages);
  assert.ok(clauses.length >= 2);
  assert.equal(clauses[0].category, ClauseCategory.FLOOR);
  assert.equal(clauses[1].category, ClauseCategory.MEAL_VOUCHER);
});

test('extrai texto plano como página única', async () => {
  const pages = await extractPages(Buffer.from('CLÁUSULA QUARTA - PISO SALARIAL'), 'text/plain');
  assert.equal(pages.length, 1);
  assert.match(pages[0].text, /PISO SALARIAL/);
});

test('extrai metadados com vigência, CNPJ e partes', () => {
  const pages = [
    {
      pageNumber: 1,
      text: `
        CONVENÇÃO COLETIVA DE TRABALHO 2026/2027
        Vigência: 01/05/2026 a 30/04/2027
        Data-base: maio de 2026
        Registro Mediador: MR123456/2026
        Número da solicitação: 20260012345
        Categoria: Comércio varejista
        Abrangência: Estado de SP
        Sindicato dos Empregados no Comércio de Exemplo
        Sindicato do Comércio Varejista de Exemplo
        CNPJ: 12.345.678/0001-90
        CNPJ: 98.765.432/0001-10
      `,
    },
  ];
  const meta = extractMetadata(pages, 'CCT Exemplo');
  assert.equal(meta.startDate, '2026-05-01');
  assert.equal(meta.endDate, '2027-04-30');
  assert.match(meta.baseDate || '', /maio/i);
  assert.equal(meta.registration, 'MR123456/2026');
  assert.equal(meta.category, 'Comércio varejista');
  assert.deepEqual(meta.territory, ['SP']);
  assert.ok((meta.parties || []).some((p) => /Comércio de Exemplo/i.test(p)));
  assert.ok((meta.parties || []).length >= 2);
  assert.ok((meta.cnpjs || []).length >= 2);
  assert.ok(meta.fields.some((f) => f.field === 'startDate' && f.page === 1));
});

test('extrai metadados de HTML stripado da fixture', async () => {
  const html = `
<html><body>
<h1>CONVENÇÃO COLETIVA DE TRABALHO 2026/2027</h1>
<p>Sindicato dos Empregados no Comércio de Exemplo · CNPJ 12.345.678/0001-90</p>
<p>Sindicato do Comércio Varejista de Exemplo · CNPJ 98.765.432/0001-10</p>
<p>Vigência: 01/05/2026 a 30/04/2027</p>
<p>Data-base: maio de 2026</p>
<p>Registro Mediador: MR123456/2026</p>
<p>Categoria: Comércio varejista de Exemplo</p>
<p>Abrangência territorial: Estado de SP</p>
</body></html>`;
  const pages = await extractPages(Buffer.from(html), 'text/html');
  const meta = extractMetadata(pages, 'Convenção Coletiva de Trabalho 2026/2027');
  assert.equal(meta.startDate, '2026-05-01');
  assert.equal(meta.endDate, '2027-04-30');
  assert.ok((meta.cnpjs || []).length >= 2);
  assert.ok((meta.parties || []).every((p) => /Comércio/i.test(p)));
});

test('mapeia classe documental para tipo de instrumento', () => {
  assert.equal(mapInstrumentType(DocumentClass.CCT), 'CCT');
  assert.equal(mapInstrumentType(DocumentClass.ADDENDUM), 'ADDENDUM');
  assert.equal(mapInstrumentType(DocumentClass.NOTICE), null);
  assert.equal(mapInstrumentType(DocumentClass.IRRELEVANT), null);
});

test('instrumentos validados/rejeitados ficam travados para reparse', () => {
  assert.equal(isLockedInstrumentStatus(InstrumentStatus.VALIDATED), true);
  assert.equal(isLockedInstrumentStatus(InstrumentStatus.REJECTED), true);
  assert.equal(isLockedInstrumentStatus(InstrumentStatus.PENDING_REVIEW), false);
});
