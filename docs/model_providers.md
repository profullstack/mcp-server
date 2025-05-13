# Model Providers

This document describes the model providers integrated with the MCP server and how to use them.

## Overview

The MCP server integrates with several AI model providers to offer a wide range of capabilities:

- **Text Generation**: Generate text responses using models like GPT-4 and Claude
- **Image Generation**: Create images from text prompts using Stable Diffusion
- **Speech-to-Text**: Transcribe audio using Whisper
- **Custom Models**: Use any model available on Hugging Face

Each provider implements a standard interface for performing inference, allowing the server to work with different model types through a unified API.

## Supported Providers

### OpenAI

OpenAI provides GPT models for text generation and Whisper for speech-to-text.

#### Configuration

```env
# OpenAI API (for GPT-4 and Whisper)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_ORG_ID=your_openai_org_id_here # Optional
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_API_VERSION=2023-05-15 # Update to latest version as needed
OPENAI_MAX_TOKENS=4096
OPENAI_TEMPERATURE=0.7
OPENAI_DEFAULT_MODEL=gpt-4 # Can be gpt-4, gpt-4-turbo, gpt-3.5-turbo, etc.

# OpenAI Whisper API (for speech-to-text)
# Note: This uses the same OPENAI_API_KEY as above
WHISPER_DEFAULT_MODEL=whisper-1
WHISPER_DEFAULT_LANGUAGE=en # Optional, auto-detects if not specified
WHISPER_DEFAULT_TEMPERATURE=0
WHISPER_DEFAULT_RESPONSE_FORMAT=json # Can be json, text, srt, verbose_json, or vtt
```

#### Supported Models

- **GPT Models**: gpt-4, gpt-4-turbo, gpt-3.5-turbo, etc.
- **Whisper Models**: whisper-1

#### Example Usage

Text generation with GPT-4:

```bash
# Activate the model
curl -X POST http://localhost:3000/model/gpt-4/activate \
  -H "Content-Type: application/json" \
  -d '{"config": {"temperature": 0.7}}'

# Perform inference
curl -X POST http://localhost:3000/model/infer \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain quantum computing in simple terms",
    "temperature": 0.5,
    "max_tokens": 200
  }'
```

Speech-to-text with Whisper (requires multipart form data):

```javascript
// JavaScript example using fetch and FormData
const formData = new FormData();
formData.append('file', audioFile);
formData.append('model', 'whisper-1');
formData.append('language', 'en');

const response = await fetch('http://localhost:3000/model/whisper/infer', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.response); // Transcribed text
```

### Stability AI

Stability AI provides Stable Diffusion for image generation.

#### Configuration

```env
# Stability AI API (for Stable Diffusion)
STABILITY_API_KEY=your_stability_api_key_here
STABILITY_API_BASE_URL=https://api.stability.ai/v1
STABILITY_DEFAULT_ENGINE=stable-diffusion-xl-1024-v1-0 # Update as needed
STABILITY_DEFAULT_STEPS=30
STABILITY_DEFAULT_CFG_SCALE=7
STABILITY_DEFAULT_WIDTH=1024
STABILITY_DEFAULT_HEIGHT=1024
```

#### Supported Models

- **Stable Diffusion**: stable-diffusion-xl-1024-v1-0, stable-diffusion-v1-5, etc.

#### Example Usage

Image generation with Stable Diffusion:

```bash
# Activate the model
curl -X POST http://localhost:3000/model/stable-diffusion/activate \
  -H "Content-Type: application/json" \
  -d '{}'

# Generate an image
curl -X POST http://localhost:3000/model/infer \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful sunset over mountains",
    "height": 1024,
    "width": 1024,
    "steps": 30,
    "cfg_scale": 7
  }'
```

The response includes base64-encoded images:

```json
{
  "modelId": "stable-diffusion-xl-1024-v1-0",
  "response": [
    {
      "base64": "base64_encoded_image_data",
      "seed": 123456,
      "finishReason": "SUCCESS"
    }
  ],
  "timestamp": "2025-05-12T21:57:59.000Z"
}
```

### Anthropic

Anthropic provides Claude models for text generation.

#### Configuration

```env
# Anthropic API (for Claude models)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_API_BASE_URL=https://api.anthropic.com
ANTHROPIC_API_VERSION=2023-06-01 # Update to latest version as needed
ANTHROPIC_DEFAULT_MODEL=claude-3-opus-20240229 # Can be claude-3-opus, claude-3-sonnet, etc.
ANTHROPIC_MAX_TOKENS=4096
ANTHROPIC_TEMPERATURE=0.7
```

#### Supported Models

- **Claude Models**: claude-3-opus, claude-3-sonnet, claude-3-haiku, etc.

#### Example Usage

Text generation with Claude:

```bash
# Activate the model
curl -X POST http://localhost:3000/model/claude-3-opus/activate \
  -H "Content-Type: application/json" \
  -d '{"config": {"temperature": 0.7}}'

# Perform inference
curl -X POST http://localhost:3000/model/infer \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain how neural networks work",
    "temperature": 0.5,
    "max_tokens": 300
  }'
```

### Hugging Face

Hugging Face provides access to thousands of open-source models.

#### Configuration

```env
# Hugging Face API
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
HUGGINGFACE_API_BASE_URL=https://api-inference.huggingface.co/models
```

#### Supported Models

Any model available on Hugging Face's inference API.

#### Example Usage

Using a custom model from Hugging Face:

```bash
# Activate the model (replace "gpt2" with the model ID)
curl -X POST http://localhost:3000/model/gpt2/activate \
  -H "Content-Type: application/json" \
  -d '{}'

# Perform inference
curl -X POST http://localhost:3000/model/infer \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Once upon a time",
    "parameters": {
      "temperature": 0.8,
      "max_length": 100
    }
  }'
```

## Streaming Inference

Some models support streaming responses, which can be useful for real-time applications.

### Example

```bash
curl -X POST http://localhost:3000/model/infer \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a short story about a robot",
    "stream": true
  }'
```

The response will be in Server-Sent Events (SSE) format with `Content-Type: text/event-stream`.

## Error Handling

All model providers implement consistent error handling. If an API key is missing or invalid, or if there's an issue with the model or the request, the server will return an appropriate error message.

Common error codes:

- `no_active_model`: No model is currently activated
- `inference_failed`: The inference request failed
- `streaming_inference_failed`: The streaming inference request failed
- `missing_required_parameter`: A required parameter is missing

## Adding New Providers

The MCP server is designed to be extensible. To add a new model provider:

1. Create a new file in `src/utils/providers/` for your provider
2. Implement the standard provider interface (performInference, performStreamingInference)
3. Update the `getProviderForModel` function in `src/utils/modelProviders.js` to include your provider
4. Add appropriate configuration to `src/core/config.js` and `sample.env`

See the existing providers for examples of how to implement a new provider.