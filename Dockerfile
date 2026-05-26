FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY frontend/package*.json ./frontend/
RUN npm ci
RUN npm --prefix frontend ci

FROM deps AS build
WORKDIR /app
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm run build:front

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/frontend/dist ./frontend/dist
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "dist/main.js"]
