FROM oven/bun:1.2.3

WORKDIR /app

# Install TypeScript globally
RUN bun add -g typescript

# Copy root tsconfig first
COPY tsconfig.json ./
COPY packages/mcp/tsconfig.json ./packages/mcp/

# Copy package files
COPY package.json ./
COPY packages/mcp/package.json ./packages/mcp/

# Install dependencies
WORKDIR /app/packages/mcp
RUN bun install

# Copy source files
COPY packages/mcp/src ./src

# Build the application
RUN bun run build

# Start the MCP server
CMD ["bun", "dist/index.js"] 
