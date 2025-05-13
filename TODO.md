# MCP Server Implementation TODOs

This document outlines the remaining tasks needed to fully implement the MCP standard methods as defined in the [MCP Standard Methods](docs/mcp_standard_methods.md) document.

## Inference Support

- [ ] Enhance the inference implementation in `modelManager.js` to support more advanced inference capabilities:
  - [ ] Add support for streaming responses
  - [ ] Implement proper error handling with standardized error codes
  - [ ] Add support for different inference parameters (temperature, max_tokens, etc.)
  - [ ] Implement rate limiting for inference requests

## Tools and Resources

- [ ] Implement the tools execution endpoint:

  - [ ] Create a proper implementation for `/tools/:toolName` endpoint
  - [ ] Add a mechanism for modules to register tools
  - [ ] Implement tool execution logic

- [ ] Implement the resources access endpoint:
  - [ ] Create a proper implementation for `/resources/:resourceUri` endpoint
  - [ ] Add a mechanism for modules to register resources
  - [ ] Implement resource access logic

## Module Management

- [ ] Implement module enable/disable functionality:
  - [ ] Add `/modules/:moduleId/enable` endpoint
  - [ ] Add `/modules/:moduleId/disable` endpoint
  - [ ] Update the module loader to respect enabled/disabled status

## Testing

- [ ] Write unit tests for inference functionality:

  - [ ] Test streaming responses
  - [ ] Test error handling
  - [ ] Test parameter validation

- [ ] Write unit tests for tools and resources:

  - [ ] Test tool registration
  - [ ] Test tool execution
  - [ ] Test resource registration
  - [ ] Test resource access

- [ ] Write unit tests for module enable/disable functionality

## Pre-commit Hook

- [ ] Update the pre-commit hook to run tests:

  ```sh
  #!/usr/bin/env sh
  . "$(dirname -- "$0")/_/husky.sh"

  # Run lint-staged to lint and format staged files
  pnpm lint-staged

  # Run tests before commit
  echo "Running tests before commit..."
  pnpm test || exit 1

  echo "Pre-commit checks passed. Proceeding with commit."
  ```

## Documentation

- [ ] Update documentation to reflect the new functionality
- [ ] Add examples for using the inference API
- [ ] Add examples for creating and using tools
- [ ] Add examples for creating and accessing resources
