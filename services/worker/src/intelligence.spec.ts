import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DocumentClass, ClauseCategory } from '@prisma/client';
import { classifyDocument } from './classify.ts';
import { segmentClauses } from './segment.ts';
import { extractPages } from './extract.ts';

test('classifica CCT por heurística', () => {
  const result = classifyDocument('CONVENÇÃO COLETIVA DE TRABALHO 2026/2027', 'CCT Comércio');
  assert.equal(result.documentClass, DocumentClass.CCT);
  assert.ok(result.confidence >= 0.9);
});

test('classifica aditivo', () => {
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
