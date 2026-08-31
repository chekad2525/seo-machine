FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
RUN npm install
COPY . .
RUN npx prisma generate --schema packages/db/prisma/schema.prisma && npm run build -w @seo-machine/db && npm run build -w @seo-machine/web
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "@seo-machine/web"]
