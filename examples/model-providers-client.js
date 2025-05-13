/**
 * MCP Server Model Providers Client Example
 *
 * This example demonstrates how to interact with the different model providers
 * integrated with the MCP server.
 */

// Using fetch API for simplicity, but you could use any HTTP client
const MCP_SERVER_URL = 'http://localhost:3000';
import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';

/**
 * MCP Client class for interacting with an MCP server
 */
class MCPClient {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
  }

  /**
   * Get server information
   * @returns {Promise<Object>} Server information
   */
  async getServerInfo() {
    const response = await fetch(this.serverUrl);
    return response.json();
  }

  /**
   * List available models
   * @returns {Promise<Object>} List of available models
   */
  async listModels() {
    const response = await fetch(`${this.serverUrl}/models`);
    return response.json();
  }

  /**
   * Activate a model
   * @param {string} modelId - The ID of the model to activate
   * @param {Object} config - Optional model configuration
   * @returns {Promise<Object>} Activation result
   */
  async activateModel(modelId, config = {}) {
    const response = await fetch(`${this.serverUrl}/model/${modelId}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ config })
    });
    return response.json();
  }

  /**
   * Perform inference with the active model
   * @param {Object} data - Input data for inference
   * @returns {Promise<Object>} Inference result
   */
  async infer(data) {
    const response = await fetch(`${this.serverUrl}/model/infer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  /**
   * Perform streaming inference with the active model
   * @param {Object} data - Input data for inference
   * @returns {Promise<ReadableStream<Uint8Array>>} Stream of inference results
   * @throws {Error} If the response body is null
   */
  async inferStream(data) {
    const streamData = { ...data, stream: true };
    const response = await fetch(`${this.serverUrl}/model/infer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(streamData)
    });

    if (!response.body) {
      throw new Error('Response body is null');
    }

    return response.body;
  }

  /**
   * Perform speech-to-text transcription with Whisper
   * @param {string} audioFilePath - Path to the audio file
   * @param {Object} options - Additional options for transcription
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeAudio(audioFilePath, options = {}) {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioFilePath));
    formData.append('model', options.model || 'whisper-1');
    
    if (options.language) {
      formData.append('language', options.language);
    }
    
    if (options.temperature !== undefined) {
      formData.append('temperature', options.temperature.toString());
    }
    
    if (options.response_format) {
      formData.append('response_format', options.response_format);
    }

    const response = await fetch(`${this.serverUrl}/model/whisper/infer`, {
      method: 'POST',
      body: formData
    });

    return response.json();
  }

  /**
   * Generate an image with Stable Diffusion
   * @param {Object} data - Input data for image generation
   * @returns {Promise<Object>} Image generation result
   */
  async generateImage(data) {
    // First activate the stable-diffusion model
    await this.activateModel('stable-diffusion');
    
    // Then perform inference
    const result = await this.infer(data);
    
    return result;
  }
}

/**
 * Example usage
 */
async function main() {
  const client = new MCPClient(MCP_SERVER_URL);

  try {
    // Get server information
    console.log('Server Info:');
    const serverInfo = await client.getServerInfo();
    console.log(serverInfo);
    console.log();

    // List available models
    console.log('Available Models:');
    const models = await client.listModels();
    console.log(models);
    console.log();

    // Example 1: Text generation with GPT-4
    console.log('Example 1: Text generation with GPT-4');
    
    // Activate GPT-4
    console.log('Activating GPT-4...');
    const activationResult = await client.activateModel('gpt-4', {
      temperature: 0.7
    });
    console.log(activationResult);
    
    // Perform inference
    console.log('Generating text...');
    const textResult = await client.infer({
      prompt: 'Explain quantum computing in simple terms',
      temperature: 0.5,
      max_tokens: 200
    });
    console.log(textResult);
    console.log();

    // Example 2: Image generation with Stable Diffusion
    console.log('Example 2: Image generation with Stable Diffusion');
    
    // Generate image
    console.log('Generating image...');
    const imageResult = await client.generateImage({
      prompt: 'A beautiful sunset over mountains',
      height: 512,
      width: 512,
      steps: 20,
      cfg_scale: 7
    });
    
    // The response includes base64-encoded images
    console.log('Image generated!');
    console.log(`Number of images: ${imageResult.response.length}`);
    console.log(`First image seed: ${imageResult.response[0].seed}`);
    
    // Save the first image to a file
    if (imageResult.response && imageResult.response[0]) {
      const imageBase64 = imageResult.response[0].base64;
      const buffer = Buffer.from(imageBase64, 'base64');
      fs.writeFileSync('generated-image.png', buffer);
      console.log('Image saved to generated-image.png');
    }
    console.log();

    // Example 3: Streaming text generation
    console.log('Example 3: Streaming text generation');
    
    // Activate GPT-4 again (it's already activated, but just to be sure)
    await client.activateModel('gpt-4');
    
    // Perform streaming inference
    console.log('Generating text with streaming...');
    const stream = await client.inferStream({
      prompt: 'Write a short story about a robot',
      temperature: 0.7,
      max_tokens: 300
    });
    
    // Process the stream
    console.log('Streaming response:');
    
    // Create a reader for the stream
    const reader = stream.getReader();
    let streamText = '';
    
    // Read the stream
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Convert the chunk to text
      const chunk = new TextDecoder().decode(value);
      streamText += chunk;
      
      // Print the chunk
      process.stdout.write(chunk);
    }
    console.log('\nStreaming complete!');
    console.log();

    // Example 4: Speech-to-text with Whisper
    console.log('Example 4: Speech-to-text with Whisper');
    console.log('Note: This example requires an audio file. Uncomment the code to run it.');
    
    /*
    // Activate Whisper
    await client.activateModel('whisper');
    
    // Transcribe audio
    console.log('Transcribing audio...');
    const transcriptionResult = await client.transcribeAudio('path/to/audio/file.mp3', {
      language: 'en',
      temperature: 0,
      response_format: 'json'
    });
    console.log(transcriptionResult);
    */
    console.log();

    // Example 5: Text generation with Claude
    console.log('Example 5: Text generation with Claude');
    
    // Activate Claude
    console.log('Activating Claude...');
    const claudeActivationResult = await client.activateModel('claude-3-opus', {
      temperature: 0.7
    });
    console.log(claudeActivationResult);
    
    // Perform inference
    console.log('Generating text with Claude...');
    const claudeResult = await client.infer({
      prompt: 'Explain how neural networks work',
      temperature: 0.5,
      max_tokens: 300
    });
    console.log(claudeResult);
    console.log();

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the example
main().catch(console.error);

// Export the client class for use in other files
export default MCPClient;