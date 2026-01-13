# Lightify Relay Server
# Build: docker build -t lightify-relay .
# Run: docker run -d -p 3001:3001 --env-file .env lightify-relay

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy source code
COPY src ./src

# Expose the relay port
EXPOSE 3001

# Run the server
CMD ["node", "src/index.js"]
