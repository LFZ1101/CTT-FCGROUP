# Deploy na Netlify — CCT Intelligence (frontend)

## O que a Netlify hospeda

Apenas o **frontend Next.js** (`apps/web`).

**Não** entram na Netlify (precisam de outro host):

- API NestJS (`apps/api`)
- Worker BullMQ (`services/worker`)
- PostgreSQL / Redis / MinIO

Sem a API pública, o site abre, mas login e dados não funcionam.

## Deploy via ZIP (arrastar no Netlify)

1. Faça upload do arquivo `CCT-Intelligence-netlify.zip` em **Sites → Add new site → Deploy manually**  
   ou **Import from Git** (recomendado) apontando para o repositório.
2. Build settings (já no `netlify.toml`):
   - **Build command:** `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @cct/web build`
   - **Publish directory:** `apps/web/.next`
   - Plugin: `@netlify/plugin-nextjs`
3. Em **Environment variables**, defina:
   - `NEXT_PUBLIC_API_URL` = `https://sua-api.../api/v1`
4. Deploy.

## Deploy via Git (recomendado)

1. Conecte o GitHub `LFZ1101/CTT-FCGROUP`.
2. Branch: a que quiser publicar (`main` ou a de UX).
3. Netlify lê `netlify.toml` automaticamente.
4. Configure `NEXT_PUBLIC_API_URL`.

## Checklist pós-deploy

- [ ] Site abre (login visível)
- [ ] `NEXT_PUBLIC_API_URL` responde CORS/HTTPS
- [ ] Login com tenant/e-mail/senha funciona
- [ ] Rotas autenticadas carregam dados

## Credenciais de demo (seed local)

Só válidas se a API seedada estiver no ar:

- workspace: conforme seed do ambiente
- ver `README.md` do repositório
