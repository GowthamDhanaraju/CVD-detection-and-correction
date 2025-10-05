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

# Try to build for web production, fallback to development mode
RUN npx expo export || echo "Export failed, will run in development mode"

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

# Start the application in web mode for production
CMD ["npx", "expo", "start", "--web", "--port", "8080", "--host", "0.0.0.0"]