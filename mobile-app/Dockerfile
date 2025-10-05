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
    npx expo install --fix && \
    npm cache clean --force

# Copy application code
COPY . .

# Try to build for web production, fallback to development mode
RUN npx expo export || echo "Export failed, will run in development mode"

# Create non-root user and set up proper permissions
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app && \
    mkdir -p /tmp && \
    chmod 1777 /tmp && \
    chown -R nextjs:nodejs /tmp
USER nextjs

# Set environment variables for Metro bundler
ENV EXPO_NO_CACHE=1
ENV METRO_CACHE=false
ENV TMPDIR=/tmp
ENV NODE_ENV=production

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080 || exit 1

# Start the application in web mode for production using lan mode
CMD ["npx", "expo", "start", "--web", "--port", "8080", "--host", "lan"]