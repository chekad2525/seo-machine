FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
RUN npm install
COPY . .
RUN npx prisma generate --schema packages/db/prisma/schema.prisma && npm run build -w @seo-machine/db && npm run build -w @seo-machine/api
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app ./
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
