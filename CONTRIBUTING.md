# Contributing to MCP Server

Thank you for considering contributing to the MCP Server project! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project. We aim to foster an inclusive and welcoming community.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with the following information:

- A clear, descriptive title
- A detailed description of the bug
- Steps to reproduce the bug
- Expected behavior
- Actual behavior
- Any relevant logs or screenshots
- Your environment (OS, Node.js version, etc.)

### Suggesting Features

If you have an idea for a new feature, please create an issue with the following information:

- A clear, descriptive title
- A detailed description of the feature
- Why this feature would be useful
- Any relevant examples or mockups

### Pull Requests

1. Fork the repository
2. Create a new branch for your changes
3. Make your changes
4. Run tests and ensure they pass
5. Submit a pull request

Please include the following in your pull request:

- A clear, descriptive title
- A detailed description of the changes
- Any relevant issue numbers
- Tests for your changes

## Development Setup

1. Clone the repository
2. Install dependencies with `pnpm install`
3. Copy `.env.example` to `.env` and configure as needed
4. Start the server with `pnpm dev`

## Project Structure

- `src/core/` - Core functionality
- `src/modules/` - Modules that extend the server
- `src/utils/` - Utility functions
- `examples/` - Example code
- `docs/` - Documentation
- `scripts/` - Helper scripts

## Creating Modules

Modules are the primary way to extend the MCP server. See the [README.md](README.md) for more information on creating modules.

## Coding Standards

- Use ESLint and Prettier for code formatting
- Write clear, descriptive comments
- Follow the existing code style
- Write tests for your code

## Testing

Run tests with `pnpm test`.

## Documentation

Please update documentation as needed when making changes. This includes:

- Code comments
- README.md
- Other documentation files

## License

By contributing to this project, you agree that your contributions will be licensed under the project's license.