# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./

RUN npm config set fetch-timeout 60000 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci --prefer-offline --no-audit

COPY . .

RUN npm run build

# Run Stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3006
ENV HOST=0.0.0.0

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 3006

CMD ["serve", "-s", "dist", "-l", "3006"]
