# Imagem única: API (Fastify) servindo também o front já compilado, na porta 3333.
FROM node:22-alpine

# OpenSSL é exigido pelo Prisma no Alpine.
RUN apk add --no-cache openssl

WORKDIR /app

# Instala dependências (o postinstall gera o Prisma Client para esta plataforma).
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/api/prisma apps/api/prisma
RUN npm ci

# Código e build do front.
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3333

# Aplica as migrations pendentes e sobe o servidor.
CMD ["npm", "start"]
