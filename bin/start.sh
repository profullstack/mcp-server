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

# Start the server
pnpm start