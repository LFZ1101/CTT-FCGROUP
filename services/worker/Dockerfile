# Worker
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY services/worker/package.json services/worker/
COPY packages/database/package.json packages/database/
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS build
COPY packages/database packages/database
COPY services/worker services/worker
RUN pnpm --filter @cct/database prisma generate
RUN pnpm --filter @cct/worker build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/services/worker/dist ./services/worker/dist
COPY --from=build /app/services/worker/package.json ./services/worker/package.json
COPY --from=build /app/packages/database ./packages/database
WORKDIR /app/services/worker
CMD ["node", "dist/index.js"]
