/**
 * Example MCP Client
 * 
 * This is a simple example of how to interact with an MCP server from a client application.
 */

// Using fetch API for simplicity, but you could use any HTTP client
const MCP_SERVER_URL = 'http://localhost:3000';

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
   * Get server status
   * @returns {Promise<Object>} Server status
   */
  async getStatus() {
    const response = await fetch(`${this.serverUrl}/status`);
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
   * Get information about a specific model
   * @param {string} modelId - The ID of the model to get information about
   * @returns {Promise<Object>} Model information
   */
  async getModel(modelId) {
    const response = await fetch(`${this.serverUrl}/model/${modelId}`);
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
   * Deactivate the current model
   * @returns {Promise<Object>} Deactivation result
   */
  async deactivateModel() {
    const response = await fetch(`${this.serverUrl}/model/deactivate`, {
      method: 'POST'
    });
    return response.json();
  }

  /**
   * Get information about the active model
   * @returns {Promise<Object>} Active model information
   */
  async getActiveModel() {
    const response = await fetch(`${this.serverUrl}/model/active`);
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
   * Perform inference with a specific model
   * @param {string} modelId - The ID of the model to use for inference
   * @param {Object} data - Input data for inference
   * @returns {Promise<Object>} Inference result
   */
  async inferWithModel(modelId, data) {
    const response = await fetch(`${this.serverUrl}/model/${modelId}/infer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  /**
   * List available modules
   * @returns {Promise<Object>} List of available modules
   */
  async listModules() {
    const response = await fetch(`${this.serverUrl}/modules`);
    return response.json();
  }

  /**
   * Get information about a specific module
   * @param {string} moduleId - The ID of the module to get information about
   * @returns {Promise<Object>} Module information
   */
  async getModule(moduleId) {
    const response = await fetch(`${this.serverUrl}/modules/${moduleId}`);
    return response.json();
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

    // Activate a model
    console.log('Activating model gpt-4:');
    const activationResult = await client.activateModel('gpt-4');
    console.log(activationResult);
    console.log();

    // Perform inference
    console.log('Performing inference:');
    const inferenceResult = await client.infer({
      prompt: 'Hello, how are you today?'
    });
    console.log(inferenceResult);
    console.log();

    // Deactivate the model
    console.log('Deactivating model:');
    const deactivationResult = await client.deactivateModel();
    console.log(deactivationResult);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

// Export the client class for use in other files
module.exports = MCPClient;