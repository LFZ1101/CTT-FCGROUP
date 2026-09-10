# Base / Rede Colaborativa de CCTs

## Objetivo

Permitir que escritórios compartilhem CCTs obtidas legitimamente (fora do Mediador/site) com **moderação**, **consentimento auditado**, **diferenciação de origem** e **isolamento multi-tenant**.

Não é um repositório aberto de PDFs: só objetos publicados na camada `CollaborativePublication` saem do isolamento.

## Origens (`SourceType`)

| Tipo | Significado |
|---|---|
| `MEDIADOR_MTE` | Oficial Ministério do Trabalho |
| `LABOR_UNION` / `EMPLOYER_UNION` | Site oficial do sindicato |
| `COLLABORATIVE_NETWORK` | Contribuição aprovada/publicada |
| `MANUAL_UPLOAD` | Upload privado do escritório |

Apresentação de confiança: oficial ≠ sindical ≠ colaborativo validado ≠ colaborativo pendente.

## Arquitetura de dados

```
TENANT DATA                         SHARED CATALOG (via publicação)
───────────                         ────────────────────────────────
Companies / Users                   Unions (por tenant, correlacionados por unionMatchKey)
Private uploads (MANUAL_UPLOAD)     Official docs (Mediador / site)
CollaborativeContribution           CollaborativePublication (ACTIVE)
DocumentRequest                     Approved collaborative documents
```

### Entidades

- **CollaborativeContribution** — envio + consentimento + moderação + match oficial
- **CollaborativePublication** — camada explícita de visibilidade na rede
- **DocumentRequest** — pedido à rede (agregado por `groupKey`)

### Escopos (`CollaborativeSharingScope`)

- `PRIVATE` — só o tenant remetente
- `NETWORK_RELATED_UNION` — tenants com empresas vinculadas ao mesmo sindicato (`unionMatchKey` CNPJ/nome+UF)
- `NETWORK_GLOBAL` — toda a rede (quando permitido)

## Pipeline

Reutiliza o pipeline documental existente (`StorageService` + fila `document-parse`):

UPLOAD → MIME → SHA-256 → dedup → storage → parse/classificação → moderação → `CollaborativePublication` → alertas → match oficial (worker)

Não há segundo pipeline de parse.

## Privacidade

Consumidores da rede veem:

- Origem: Base colaborativa
- Data de inclusão / status de validação
- Confirmação oficial (sim/não)

**Não** veem o nome do escritório colaborador por padrão. Moderadores/admins do tenant remetente veem auditoria completa.

## Moderação

OWNER/ADMIN do tenant remetente: aprovar, rejeitar, solicitar revisão, marcar duplicado. Publicação na rede **não** ocorre só porque o upload terminou.

## Solicitações

`POST /collaborative/requests` → agregação por `groupKey` (sindicato|tipo|vigência). Contribuição aprovada marca pedidos abertos como `FULFILLED` e alerta os solicitantes.

## Confirmação oficial

Quando um documento `MEDIADOR_MTE` / sindical / boletim é armazenado:

1. **CONTENT_HASH** (preferencial, confiança 1.0)
2. **METADATA_TITLE_UNION** (fallback): mesmo `unionMatchKey` + similaridade de título ≥ 0.72 (ou registro no título)

Atualiza status `MATCHED_OFFICIAL_SOURCE` + alerta `COLLABORATIVE_DOCUMENT_CONFIRMED`.

## Reputação interna

`GET /collaborative/reputation` (OWNER/ADMIN): `totalContributions`, `approvedContributions`, `officiallyConfirmedContributions`, `rejectedContributions`, `confirmationRate`. Sem ranking público.

## Empresas relacionadas

No acesso à publicação, o consumidor vê `relatedCompaniesCount` e aviso explícito de fonte COLABORATIVA / status oficial / necessidade de revisão humana.

## Alertas novos

- `COLLABORATIVE_DOCUMENT_AVAILABLE`
- `COLLABORATIVE_DOCUMENT_CONFIRMED`
- `DOCUMENT_REQUEST_FULFILLED`
- `COLLABORATIVE_DOCUMENT_REVOKED` (via revoke + audit)

## Auditoria

`COLLABORATIVE_DOCUMENT_SUBMITTED|APPROVED|REJECTED|PUBLISHED|REVOKED`, `DOCUMENT_REQUEST_CREATED|FULFILLED`, `OFFICIAL_SOURCE_MATCHED`. Consentimento: `userId`, timestamp, `collaborative-share-v1`, `sharingScope`.

## Segurança do upload

Limite de tamanho, allowlist MIME com `file-type`, SHA-256, storage privado, signed URL, sem confiança em extensão.

## RAG / busca

Documentos colaborativos do próprio tenant podem participar do RAG; a resposta **obriga** origem (Base Colaborativa) e status de confirmação oficial. Busca documental expõe badge `COLABORATIVO` / `OFICIAL` / `SINDICATO`.

## UI

- `/rede` — overview
- `/rede/enviar` — wizard de envio
- `/rede/moderacao` — fila
- `/rede/solicitar` — pedido à rede

## Reputação

Métricas internas (aprovados / confirmados / rejeitados) — **sem** ranking público de escritórios.
