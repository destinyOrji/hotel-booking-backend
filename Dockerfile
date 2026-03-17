# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install only production deps
RUN npm ci --omit=dev

# Copy app code
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PORT=3006

EXPOSE 3006

# Start the server
CMD ["npm", "start"]
