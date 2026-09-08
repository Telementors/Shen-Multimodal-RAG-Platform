# ---- build ----
FROM node:20 AS builder
WORKDIR /app

# Increase Node.js memory limit to prevent OOM during install/build
ENV NODE_OPTIONS="--max-old-space-size=4096"

COPY package.json package-lock.json ./

# Use npm ci for clean, deterministic installs (faster & more reliable in Docker)
RUN npm ci --legacy-peer-deps

COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npx next build

# ---- run ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 3000
CMD ["npm", "run", "start"]
