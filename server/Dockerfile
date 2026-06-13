FROM node:20-alpine
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ .
COPY src/data/theoryBank.json src/data/theoryBankL4.json src/data/codeFillBank.json ./assets/banks/
RUN npm run build
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.js"]
