# Fase 6 — Colaboradores e impacto em folha

## Escopo entregue

- Model `Employee` com minimização de PII (sem CPF obrigatório; `externalId` opcional)
- CRUD `/employees` + import CSV `/employees/import`
- Estimativa de impacto de **piso salarial**: `GET /payroll-impact/instruments/:id/floor`
- UI `/colaboradores`

## Regras

- Não altera folha automaticamente
- Estimativa exige revisão humana
- Isolamento por `tenantId`

## CSV

`cnpj_empresa,nome,matricula,cargo,salario,jornada,status`
