FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl

COPY package.json ./
COPY package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY prisma prisma
RUN npm ci

COPY backend backend
COPY frontend frontend
RUN ./node_modules/.bin/prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL=file:../data/database.sqlite
ENV PORT=3000
RUN apk add --no-cache openssl

COPY package.json ./
COPY package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY prisma prisma
RUN npm ci --omit=dev --workspace backend --include-workspace-root=false && npm cache clean --force

COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/frontend/dist frontend/dist
COPY --from=build /app/node_modules/.prisma node_modules/.prisma

EXPOSE 3000
CMD ["sh", "-c", "mkdir -p data/uploads/dishes data/uploads/avatar && ./node_modules/.bin/prisma db push --skip-generate && node backend/dist/server.js"]
