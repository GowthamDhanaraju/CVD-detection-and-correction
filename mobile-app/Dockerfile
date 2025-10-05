# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies needed for node-gyp and native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm install -g @expo/cli@latest && \
    npx expo install typescript && \
    npm cache clean --force

# Copy application code
COPY . .

# Build the web version for production
RUN npm run web:build || npx expo export:web

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080 || exit 1

# Start the application in web mode for production using lan mode
CMD ["npx", "expo", "start", "--web", "--port", "8080", "--host", "lan"]