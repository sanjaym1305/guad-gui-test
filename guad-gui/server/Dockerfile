# Use official Node.js runtime
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy ALL backend files (not just server.js)
COPY . .

# Set environment
ENV NODE_ENV=production

# Render provides PORT dynamically
ENV PORT=10000

# Expose the port (not required but good practice)
EXPOSE 10000

# Health check (use dynamic port)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:10000/api/health || exit 1

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001
USER nodeuser

# Start the server
CMD ["node", "server.js"]
