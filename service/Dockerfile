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
COPY templates /app/templates
USER node
EXPOSE 8080
CMD ["node", "dist/main.js"]
