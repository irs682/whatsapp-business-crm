# ==============================================================================
# Multi-stage Production Dockerfile for Stech WhatsApp Business CRM Backend
# Node.js 20 LTS Alpine | Non-root execution | Minimal attack surface
# ==============================================================================

# Stage 1: Dependencies & Prisma Generation
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

# Stage 2: Production Execution Runtime
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl dumb-init curl

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy Prisma schema and generated clients from builder stage
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Copy application source code
COPY src ./src

# Use non-root system user for security compliance
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "src/server.js"]
