# Worker CCT Intelligence

Consome filas BullMQ:

- `source-monitoring` — verificação periódica de fontes HTML e descoberta de candidatos
- `document-download` — download, validação MIME, SHA-256 de conteúdo e persistência no object storage

## Execução

```bash
pnpm --filter @cct/worker dev
```

Requer `DATABASE_URL`, `REDIS_URL` e variáveis `STORAGE_*` (ver `.env.example`).
