FROM node:18-alpine as builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . ./
RUN npm run build --webpack

FROM node:18-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY .env .env
COPY --from=builder /app/dist ./

HEALTHCHECK --start-period=10s --timeout=10s --interval=20s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider localhost:3000/health || exit 1

EXPOSE 3000
CMD npm run typeorm migration:run -- -d ormconfig && npm run start:prod
