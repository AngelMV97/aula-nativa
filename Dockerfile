# Dockerfile for Node.js server
FROM node:18-alpine

WORKDIR /app

# Install system dependencies for pdf-parse and sharp
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server code
COPY server/ ./

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "embeddings.js"]