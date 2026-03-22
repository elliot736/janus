FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY tsconfig.base.json ./
RUN cd apps/api && npm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app .
COPY apps/api ./apps/api
COPY tsconfig.base.json ./
RUN cd apps/api && npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 janus
COPY --from=builder --chown=janus:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=janus:nodejs /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=janus:nodejs /app/apps/api/package.json ./
COPY --from=builder --chown=janus:nodejs /app/apps/api/drizzle ./drizzle
USER janus
EXPOSE 3001
CMD ["node", "dist/main.js"]
