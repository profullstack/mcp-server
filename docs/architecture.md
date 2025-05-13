# MCP Server Architecture

This document describes the architecture of the MCP server.

## Overview

The MCP server is designed with a modular architecture that allows for easy extension and customization. The core server provides basic functionality for model management and inference, while modules can be added to extend the server's capabilities.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         MCP Server                              │
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐   │
│  │   HTTP API  │────▶│  Core Logic │────▶│ Model Interface │   │
│  └─────────────┘     └─────────────┘     └─────────────────┘   │
│         │                   │                     │             │
│         │                   │                     │             │
│         ▼                   ▼                     ▼             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐   │
│  │   Routing   │     │ Model State │     │ Model Providers │   │
│  └─────────────┘     └─────────────┘     └─────────────────┘   │
│                                                 │               │
│                                                 │               │
│                                                 ▼               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     Module System                        │   │
│  │                                                          │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │   │
│  │  │  Module 1  │  │  Module 2  │  │      Module N      │ │   │
│  │  └────────────┘  └────────────┘  └────────────────────┘ │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Component Descriptions

### HTTP API

The HTTP API layer handles incoming HTTP requests and routes them to the appropriate handlers. It's built using the Hono framework, which provides a simple and efficient way to define routes and middleware.

### Core Logic

The core logic layer contains the business logic of the MCP server. It handles model activation, deactivation, and inference, as well as other core functionality.

### Model Interface

The model interface provides a standardized way to interact with different models. It abstracts away the details of specific model implementations, allowing the server to work with a variety of models.

### Routing

The routing component maps HTTP endpoints to handler functions. It's responsible for parsing request parameters and formatting responses.

### Model State

The model state component manages the state of models, including which model is currently active and any model-specific configuration.

### Model Providers

Model providers are responsible for loading and managing specific models. They implement the model interface and provide the actual inference functionality.

The MCP server includes integrations with several AI model providers:

1. **OpenAI Provider**: Connects to OpenAI's API for GPT models (text generation) and Whisper (speech-to-text)
2. **Stability AI Provider**: Connects to Stability AI's API for Stable Diffusion (image generation)
3. **Anthropic Provider**: Connects to Anthropic's API for Claude models (text generation)
4. **Hugging Face Provider**: Connects to Hugging Face's inference API for various open-source models

Each provider implements a standard interface for performing inference and streaming inference, allowing the server to work with different model types through a unified API.

### Module System

The module system allows for extending the server's functionality through modules. Each module can add new routes, middleware, models, or other functionality to the server.

## Data Flow

1. An HTTP request is received by the server
2. The routing component maps the request to a handler function
3. The handler function processes the request and calls the appropriate core logic
4. The core logic interacts with the model state and model interface as needed
5. If the request involves a model, the model interface delegates to the appropriate model provider
6. The response is formatted and returned to the client

## Module System

Modules are the primary way to extend the MCP server. Each module is a self-contained package that can add new functionality to the server. Modules are loaded dynamically at startup and can register routes, middleware, models, and other components with the server.

A module consists of:
- A main module file (index.js) that exports a `register` function
- Optional additional files for implementing the module's functionality
- Optional metadata for describing the module

When the server starts, it scans the modules directory and loads all modules it finds. Each module's `register` function is called with the Hono app instance, allowing the module to register routes and middleware.