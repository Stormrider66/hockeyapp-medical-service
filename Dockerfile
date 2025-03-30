FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3005

# Expose the port the app runs on
EXPOSE 3005

# Start the application
CMD ["node", "src/server.js"]