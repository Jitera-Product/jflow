FROM node:24-alpine AS web
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web ./
RUN npm run build

FROM node:24-alpine AS build
WORKDIR /app/service
COPY service/package*.json ./
RUN npm ci
COPY service/tsconfig.json ./
COPY service/src ./src
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app/service
COPY service/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/service/dist ./dist
COPY service/migrations ./migrations
COPY --from=web /app/web/dist /app/web/dist
COPY templates /app/templates
USER node
EXPOSE 8080
CMD ["node", "dist/main.js"]
