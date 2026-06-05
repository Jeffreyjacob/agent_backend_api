# --- builder ---
FROM node:20-alpine AS builder
WORKDIR /app

# Alpine uses apk instead of apt-get
RUN apk add --no-cache python3 make g++ openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build


# --- runner ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# OpenSSL needed at runtime for Prisma query engine
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Copy both entrypoint scripts
COPY scripts/docker-entrypoint.sh ./docker-entrypoint.sh
COPY scripts/docker-entrypoint-worker.sh ./docker-entrypoint-worker.sh
RUN chmod +x ./docker-entrypoint.sh ./docker-entrypoint-worker.sh

USER node

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]