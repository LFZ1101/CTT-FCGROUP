import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COMPANY_HEADER_ALIASES,
  isValidCnpjDigits,
  mapRow,
  onlyDigits,
  parseCsv,
} from './csv';

describe('csv import helpers', () => {
  it('parseCsv lê cabeçalho e linhas com aspas', () => {
    const csv = 'cnpj,razao_social,uf\n"11.222.333/0001-81","Empresa ""Demo"" Ltda",PR\n';
    const r = parseCsv(csv);
    assert.deepEqual(r.headers, ['cnpj', 'razao_social', 'uf']);
    assert.equal(r.rows.length, 1);
    assert.equal(r.rows[0].razao_social, 'Empresa "Demo" Ltda');
  });

  it('mapRow aplica aliases de empresa', () => {
    const mapped = mapRow(
      { cnpj: '11222333000181', razao_social: 'ACME', uf: 'pr' },
      COMPANY_HEADER_ALIASES,
    );
    assert.equal(mapped.legalName, 'ACME');
    assert.equal(mapped.state, 'pr');
    assert.equal(mapped.cnpj, '11222333000181');
  });

  it('valida CNPJ com dígitos verificadores', () => {
    assert.equal(isValidCnpjDigits('11.444.777/0001-61'), true);
    assert.equal(isValidCnpjDigits('11.111.111/1111-11'), false);
    assert.equal(onlyDigits('04.252.011/0001-10'), '04252011000110');
  });

  it('não importa silenciosamente além do limite', () => {
    const header = 'cnpj,razao_social\n';
    const lines = Array.from({ length: 5 }, (_, i) => `11444777000161,Empresa ${i}\n`).join('');
    const r = parseCsv(header + lines, 3);
    assert.equal(r.rawRowCount, 5);
    assert.equal(r.rows.length, 3);
  });
});
