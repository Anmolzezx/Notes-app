FROM node:20-alpine AS builder

WORKDIR /app

# Backend deps
COPY package*.json ./
RUN npm ci

# Frontend deps
COPY web/package*.json ./web/
RUN npm --prefix web ci

# Source
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
COPY web ./web

# Build backend
RUN npx prisma generate
RUN npx tsc

# Build frontend
RUN npm --prefix web run build

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY openapi.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/web/dist ./web/dist

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
