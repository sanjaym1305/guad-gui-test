FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Install wget for healthcheck
RUN apk add --no-cache wget

ENV NODE_ENV=production

EXPOSE 5001

# Create non-root user
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs
USER nodeuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5001/api/health || exit 1

CMD ["node", "server.js"]
