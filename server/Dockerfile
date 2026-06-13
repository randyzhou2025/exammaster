FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# 题库 JSON 在 server/assets/banks/（scripts/sync-banks-to-server.mjs 同步，勿从仓库根 src/data 拷贝）
RUN npm run build
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.js"]
