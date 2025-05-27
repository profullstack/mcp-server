#!/bin/zsh

# Load zshrc if it exists
if [ -f $HOME/.zshrc ]; then
  source $HOME/.zshrc
fi

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Set NODE_ENV to production if not already set
export NODE_ENV=${NODE_ENV:-production}

# Install dependencies for all MCP modules
echo "Installing dependencies for MCP modules..."
for module_dir in mcp_modules/*/; do
  if [ -f "${module_dir}package.json" ]; then
    echo "Installing dependencies for $(basename "$module_dir")..."
    (cd "$module_dir" && pnpm install --prod --silent)
  fi
done

echo "Starting MCP server..."
# Start the server
pnpm start