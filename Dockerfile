FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --production

COPY . .

RUN bun run build

FROM oven/bun:1-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["bun", "dist/index.js"]