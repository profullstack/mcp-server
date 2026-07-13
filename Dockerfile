# Use Node.js LTS as the base image
FROM node:20-alpine

# Install pnpm (as root, into the global prefix)
RUN npm install -g pnpm

# Set working directory and hand it to the built-in non-root `node` user
WORKDIR /app
RUN chown node:node /app

# Copy package files (owned by the non-root user so pnpm can write to the tree)
COPY --chown=node:node package.json pnpm-lock.yaml ./

# Drop privileges before installing/running — never run the app as root
USER node

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application code
COPY --chown=node:node . .

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["pnpm", "start"]
