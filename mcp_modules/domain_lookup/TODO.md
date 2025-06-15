# Domain Lookup Module - TODO

## Overview

Create an MCP module that wraps the tldx CLI tool for domain availability checking and brainstorming.

## Features to Implement

### Core Tools

- [ ] `check_domain_availability` - Basic domain availability check
- [ ] `generate_domain_suggestions` - Generate domain suggestions with prefixes/suffixes
- [ ] `show_tld_presets` - Show available TLD presets
- [ ] `bulk_domain_check` - Check multiple domains at once

### tldx CLI Features to Support

- [ ] Basic domain availability checking
- [ ] Keyword permutations with prefixes and suffixes
- [ ] TLD presets (popular, tech, geo, business, creative, etc.)
- [ ] Multiple output formats (text, json, json-stream, json-array, csv)
- [ ] Filtering options:
  - [ ] Only available domains (`--only-available`)
  - [ ] Maximum domain length (`--max-domain-length`)
- [ ] Statistics display (`--show-stats`)
- [ ] Verbose output (`--verbose`)

### Implementation Tasks

- [ ] Update package.json with domain lookup specific info
- [ ] Create service layer for tldx CLI interaction
- [ ] Create controller with MCP tool endpoints
- [ ] Create utility functions for CLI command building
- [ ] Write comprehensive tests
- [ ] Update README with usage examples
- [ ] Create API documentation

### Dependencies

- [ ] Add child_process for CLI execution (built-in Node.js)
- [ ] Ensure tldx CLI is available or provide installation instructions

### Testing Strategy

- [ ] Mock tldx CLI responses for unit tests
- [ ] Test all parameter combinations
- [ ] Test error handling for CLI failures
- [ ] Test output format parsing
- [ ] Integration tests with actual tldx CLI (optional)

## Development Workflow

1. Update package.json and basic module structure
2. Write tests first (TDD approach)
3. Implement service layer
4. Implement controller layer
5. Update documentation
6. Test integration with MCP server
