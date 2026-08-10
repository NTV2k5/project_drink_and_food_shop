# Backend Dockerfile for ExpressJS & Mongoose
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Expose port
EXPOSE 4000

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=4000

# Command to start the application
CMD ["node", "src/main.js"]
