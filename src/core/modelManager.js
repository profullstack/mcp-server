import { config } from './config.js';
import { logger } from '../utils/logger.js';
import { getProviderForModel } from '../utils/modelProviders.js';

/**
 * In-memory model state
 * In a production environment, consider using a more robust state management solution
 */
export const modelState = {
  activeModel: null,
  models: {},
  lastActivity: null,
  // Sample models for demonstration
  availableModels: [
    {
      id: 'gpt-4',
      name: 'GPT-4',
      version: '1.0',
      description: 'Advanced language model with strong reasoning capabilities',
      capabilities: ['text-generation', 'code-generation', 'reasoning'],
      provider: 'openai',
    },
    {
      id: 'stable-diffusion',
      name: 'Stable Diffusion',
      version: '3.0',
      description: 'Image generation model',
      capabilities: ['image-generation'],
      provider: 'stability',
    },
    {
      id: 'whisper',
      name: 'Whisper',
      version: '2.0',
      description: 'Speech recognition model',
      capabilities: ['speech-to-text'],
      provider: 'openai',
    },
    {
      id: 'claude-3-opus',
      name: 'Claude 3 Opus',
      version: '1.0',
      description: 'Advanced language model from Anthropic',
      capabilities: ['text-generation', 'code-generation', 'reasoning'],
      provider: 'anthropic',
    },
  ],
};

/**
 * Lists all available models
 * @returns {Array} Array of model objects
 */
export async function listModels() {
  try {
    // For tests, we'll use the mock data if it's available
    if (global.testOverrides?.modelManager) {
      return global.testOverrides.modelManager.listModels();
    }

    // In a real implementation, this might fetch models from a database or API
    return modelState.availableModels.map(model => ({
      ...model,
      status: modelState.models[model.id]?.status || 'available',
    }));
  } catch (error) {
    logger.error(`Error listing models: ${error.message}`);
    throw error;
  }
}

/**
 * Gets a model by ID
 * @param {string} modelId - The ID of the model to get
 * @returns {Object|null} Model object or null if not found
 */
export async function getModelById(modelId) {
  try {
    // For tests, we'll use the mock data if it's available
    if (global.testOverrides?.modelManager) {
      return global.testOverrides.modelManager.getModelById(modelId);
    }

    const model = modelState.availableModels.find(m => m.id === modelId);

    if (!model) {
      return null;
    }

    return {
      ...model,
      status: modelState.models[modelId]?.status || 'available',
      isActive: modelState.activeModel === modelId,
    };
  } catch (error) {
    logger.error(`Error getting model ${modelId}: ${error.message}`);
    throw error;
  }
}

/**
 * Activates a model with the given ID
 * @param {string} modelId - The ID of the model to activate
 * @param {Object} modelConfig - Optional configuration for the model
 * @returns {Object} Activation result
 */
export async function activateModel(modelId, modelConfig = {}) {
  try {
    logger.info(`Activating model: ${modelId}`);

    // For tests, we'll use the mock data if it's available
    if (global.testOverrides?.modelManager) {
      return global.testOverrides.modelManager.activateModel(modelId, modelConfig);
    }

    // Check if model exists
    const modelExists = await getModelById(modelId);
    if (!modelExists) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Here you could add validation, authentication, or other checks

    modelState.activeModel = modelId;
    modelState.lastActivity = new Date().toISOString();

    if (!modelState.models[modelId]) {
      modelState.models[modelId] = {
        status: 'activated',
        activatedAt: new Date().toISOString(),
        config: modelConfig,
      };
    } else {
      modelState.models[modelId].status = 'activated';
      modelState.models[modelId].activatedAt = new Date().toISOString();
      modelState.models[modelId].config = {
        ...modelState.models[modelId].config,
        ...modelConfig,
      };
    }

    return {
      activeModel: modelId,
      status: 'activated',
      timestamp: modelState.lastActivity,
      config: modelState.models[modelId].config,
    };
  } catch (error) {
    logger.error(`Error activating model ${modelId}: ${error.message}`);
    throw error;
  }
}

/**
 * Deactivates the currently active model
 * @returns {Object} Deactivation result
 */
export async function deactivateModel() {
  try {
    // For tests, we'll use the mock data if it's available
    if (global.testOverrides?.modelManager) {
      return global.testOverrides.modelManager.deactivateModel();
    }

    const previousModel = modelState.activeModel;

    if (previousModel && modelState.models[previousModel]) {
      modelState.models[previousModel].status = 'deactivated';
      modelState.models[previousModel].deactivatedAt = new Date().toISOString();
    }

    modelState.activeModel = null;
    modelState.lastActivity = new Date().toISOString();

    logger.info(`Model deactivated: ${previousModel}`);

    return {
      status: 'deactivated',
      previousModel,
      timestamp: modelState.lastActivity,
    };
  } catch (error) {
    logger.error(`Error deactivating model: ${error.message}`);
    throw error;
  }
}

/**
 * Gets the currently active model
 * @returns {Object} Active model information
 */
export async function getActiveModel() {
  // For tests, we'll use the mock data if it's available
  if (global.testOverrides?.modelManager) {
    return global.testOverrides.modelManager.getActiveModel();
  }

  const activeModel = modelState.activeModel;
  const modelInfo = activeModel ? modelState.models[activeModel] : null;

  return {
    activeModel,
    modelInfo,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validates inference parameters
 * @param {Object} data - The input data for inference
 * @throws {Error} If required parameters are missing or invalid
 */
function validateInferenceParams(data) {
  // Check for required parameters
  if (!data.prompt) {
    throw new Error('Missing required parameter: prompt');
  }

  // Validate parameter types and ranges
  if (
    data.temperature !== undefined &&
    (typeof data.temperature !== 'number' || data.temperature < 0 || data.temperature > 2)
  ) {
    throw new Error('Invalid temperature: must be a number between 0 and 2');
  }

  if (
    data.max_tokens !== undefined &&
    (typeof data.max_tokens !== 'number' || data.max_tokens < 1)
  ) {
    throw new Error('Invalid max_tokens: must be a positive number');
  }

  if (
    data.top_p !== undefined &&
    (typeof data.top_p !== 'number' || data.top_p < 0 || data.top_p > 1)
  ) {
    throw new Error('Invalid top_p: must be a number between 0 and 1');
  }

  // Additional parameter validation can be added here
}

/**
 * Performs inference using the specified model
 * @param {string} modelId - The ID of the model to use for inference
 * @param {Object} data - The input data for inference
 * @returns {Object} Inference result
 */
export async function performInference(modelId, data) {
  try {
    logger.info(`Performing inference with model ${modelId}`);

    // For tests, we'll use the mock data if it's available
    if (global.testOverrides?.modelManager) {
      return global.testOverrides.modelManager.performInference(modelId, data);
    }

    // Check if streaming is requested
    if (data.stream === true) {
      return performStreamingInference(modelId, data);
    }

    // Validate parameters
    try {
      validateInferenceParams(data);
    } catch (error) {
      logger.error(`Parameter validation error: ${error.message}`);
      throw error;
    }

    // Auto-activate the model if it's not already activated
    if (!modelState.models[modelId] || modelState.models[modelId].status !== 'activated') {
      try {
        logger.info(`Auto-activating model ${modelId} for inference`);
        await activateModel(modelId, {});
      } catch (error) {
        logger.error(`Failed to auto-activate model ${modelId}: ${error.message}`);
        throw new Error(`Model ${modelId} not found or could not be activated`);
      }
    }

    // Get the appropriate provider for this model
    const provider = getProviderForModel(modelId);

    if (!provider) {
      throw new Error(`No provider available for model ${modelId}`);
    }

    // Set a timeout for the inference request
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Inference request timed out after ${config.model.inferenceTimeout}ms`));
      }, config.model.inferenceTimeout);
    });

    // Perform the inference with the provider
    const inferencePromise = provider.performInference({
      ...data,
      model: modelId,
    });

    // Race the inference against the timeout
    const result = await Promise.race([inferencePromise, timeoutPromise]);

    // Update last activity
    modelState.lastActivity = new Date().toISOString();

    return {
      ...result,
      modelId,
      timestamp: modelState.lastActivity,
    };
  } catch (error) {
    logger.error(`Inference error with model ${modelId}: ${error.message}`);
    throw error;
  }
}

/**
 * Performs streaming inference using the specified model
 * @param {string} modelId - The ID of the model to use for inference
 * @param {Object} data - The input data for inference
 * @returns {Object} Streaming inference result
 */
export async function performStreamingInference(modelId, data) {
  try {
    logger.info(`Performing streaming inference with model ${modelId}`);

    // For tests, we'll use the mock data if it's available
    if (global.testOverrides?.modelManager) {
      return global.testOverrides.modelManager.performStreamingInference(modelId, data);
    }

    // Validate parameters
    try {
      validateInferenceParams(data);
    } catch (error) {
      logger.error(`Parameter validation error: ${error.message}`);
      throw error;
    }

    // Auto-activate the model if it's not already activated
    if (!modelState.models[modelId] || modelState.models[modelId].status !== 'activated') {
      try {
        logger.info(`Auto-activating model ${modelId} for streaming inference`);
        await activateModel(modelId, {});
      } catch (error) {
        logger.error(`Failed to auto-activate model ${modelId}: ${error.message}`);
        throw new Error(`Model ${modelId} not found or could not be activated`);
      }
    }

    // Get the appropriate provider for this model
    const provider = getProviderForModel(modelId);

    if (!provider) {
      throw new Error(`No provider available for model ${modelId}`);
    }

    // Check if the provider supports streaming
    if (!provider.performStreamingInference) {
      throw new Error(`Streaming is not supported for model ${modelId}`);
    }

    // Set a timeout for the streaming request
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Streaming request timed out after ${config.model.inferenceTimeout}ms`));
      }, config.model.inferenceTimeout);
    });

    // Perform the streaming inference with the provider
    const streamingPromise = provider.performStreamingInference({
      ...data,
      model: modelId,
    });

    // Race the streaming against the timeout
    const stream = await Promise.race([streamingPromise, timeoutPromise]);

    // Update last activity
    modelState.lastActivity = new Date().toISOString();

    // For compatibility with the existing mock implementation
    // In a real implementation, we would return the stream directly
    // and handle it appropriately in the routes
    return {
      modelId,
      response: stream,
      timestamp: modelState.lastActivity,
      isStreaming: true,
      parameters: {
        temperature: data.temperature,
        max_tokens: data.max_tokens,
        top_p: data.top_p,
      },
    };
  } catch (error) {
    logger.error(`Streaming inference error with model ${modelId}: ${error.message}`);
    throw error;
  }
}

/**
 * Activates all available models
 * @returns {Promise<Object>} Activation results
 */
export async function activateAllModels() {
  try {
    logger.info('Activating all available models');

    const results = [];

    for (const model of modelState.availableModels) {
      try {
        const result = await activateModel(model.id, {});
        results.push(result);
        logger.info(`Model ${model.id} activated successfully`);
      } catch (error) {
        logger.error(`Failed to activate model ${model.id}: ${error.message}`);
        results.push({
          modelId: model.id,
          status: 'error',
          error: error.message,
        });
      }
    }

    return {
      status: 'completed',
      results,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Error activating all models: ${error.message}`);
    throw error;
  }
}

// Auto-activate all models when the module is loaded (if not in test environment)
if (!global.testOverrides) {
  activateAllModels().catch(error => {
    logger.error(`Failed to auto-activate models on startup: ${error.message}`);
  });
}
