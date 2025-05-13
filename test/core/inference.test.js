/**
 * Inference Tests
 *
 * This file contains tests for the inference functionality.
 */

import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import sinon from 'sinon';
import { Hono } from 'hono';

// Import the routes setup function
import { setupCoreRoutes } from '../../src/core/routes.js';

// We'll use a mock fetch for testing
import { createMockFetch } from '../utils/mockFetch.js';

describe('Inference Functionality', () => {
  // Sinon sandbox for managing stubs
  let sandbox;

  // Hono app instance
  let app;

  // Mock fetch instance
  let request;

  // Mock objects
  let mockModelState;
  let mockPerformInference;
  let mockPerformStreamingInference;

  beforeEach(() => {
    // Create a new sandbox before each test
    sandbox = sinon.createSandbox();

    // Create a new Hono app instance
    app = new Hono();

    // Create a mock modelState
    mockModelState = {
      activeModel: 'test-model',
      models: {
        'test-model': {
          status: 'activated',
          activatedAt: new Date().toISOString(),
        },
      },
    };

    // Create mock functions for model manager
    mockPerformInference = sandbox.stub().resolves({
      modelId: 'test-model',
      response: 'Test response',
      timestamp: new Date().toISOString(),
    });

    mockPerformStreamingInference = sandbox.stub().resolves({
      modelId: 'test-model',
      response: 'Test streaming response',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    });

    // Create a mock implementation of the modelManager
    const mockModelManager = {
      modelState: mockModelState,
      performInference: mockPerformInference,
      performStreamingInference: mockPerformStreamingInference,
    };

    // Create a mock implementation of the moduleLoader
    const mockModuleLoader = {
      getModulesInfo: sandbox.stub().resolves([]),
    };

    // Override the imported modules with our mocks
    global.testOverrides = {
      modelManager: mockModelManager,
      moduleLoader: mockModuleLoader,
    };

    // Setup core routes
    setupCoreRoutes(app);

    // Create a mock fetch instance
    request = createMockFetch(app);
  });

  afterEach(() => {
    // Restore all stubs after each test
    sandbox.restore();

    // Clean up global testOverrides
    if (global.testOverrides) {
      delete global.testOverrides;
    }
  });

  describe('Basic Inference', () => {
    it('should perform inference with active model', async () => {
      const inferenceInput = { prompt: 'Test prompt' };
      const inferenceResult = {
        modelId: 'test-model',
        response: 'Test response',
        timestamp: new Date().toISOString(),
      };

      mockPerformInference.withArgs('test-model', inferenceInput).resolves(inferenceResult);

      const response = await request.post('/model/infer', inferenceInput);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal(inferenceResult);
      expect(mockPerformInference.calledOnce).to.be.true;
      expect(mockPerformInference.calledWith('test-model', inferenceInput)).to.be.true;
    });

    it('should validate required parameters', async () => {
      const inferenceInput = {}; // Missing prompt

      // Mock the performInference to throw a validation error
      mockPerformInference
        .withArgs('test-model', inferenceInput)
        .rejects(new Error('Missing required parameter: prompt'));

      const response = await request.post('/model/infer', inferenceInput);

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('inference_failed');
      expect(response.body.error.message).to.equal('Missing required parameter: prompt');
    });
  });

  describe('Inference Parameters', () => {
    it('should pass inference parameters to the model', async () => {
      const inferenceInput = {
        prompt: 'Test prompt',
        temperature: 0.7,
        max_tokens: 100,
        top_p: 0.9,
      };

      const inferenceResult = {
        modelId: 'test-model',
        response: 'Test response with parameters',
        timestamp: new Date().toISOString(),
      };

      mockPerformInference.withArgs('test-model', inferenceInput).resolves(inferenceResult);

      const response = await request.post('/model/infer', inferenceInput);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal(inferenceResult);
      expect(mockPerformInference.calledOnce).to.be.true;
      expect(mockPerformInference.calledWith('test-model', inferenceInput)).to.be.true;
    });
  });

  describe('Error Handling', () => {
    it('should handle inference errors', async () => {
      const inferenceInput = { prompt: 'Test prompt' };

      mockPerformInference
        .withArgs('test-model', inferenceInput)
        .rejects(new Error('Inference failed'));

      const response = await request.post('/model/infer', inferenceInput);

      expect(response.status).to.equal(500);
      expect(response.body.error.code).to.equal('inference_failed');
      expect(response.body.error.message).to.equal('Inference failed');
    });

    it('should return 400 when no active model', async () => {
      // Set active model to null
      mockModelState.activeModel = null;

      const inferenceInput = { prompt: 'Test prompt' };

      const response = await request.post('/model/infer', inferenceInput);

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('no_active_model');
      expect(response.body.error.message).to.equal('No active model');
    });
  });

  describe('Streaming Inference', () => {
    it('should support streaming responses', async () => {
      const inferenceInput = {
        prompt: 'Test prompt',
        stream: true,
      };

      const streamingResult = {
        modelId: 'test-model',
        response: 'Test streaming response',
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };

      mockPerformStreamingInference
        .withArgs('test-model', inferenceInput)
        .resolves(streamingResult);

      const response = await request.post('/model/infer', inferenceInput);

      expect(response.status).to.equal(200);
      expect(mockPerformStreamingInference.calledOnce).to.be.true;
      expect(mockPerformStreamingInference.calledWith('test-model', inferenceInput)).to.be.true;

      // Check headers for streaming response
      expect(response.headers['content-type']).to.include('text/event-stream');
      expect(response.headers['cache-control']).to.include('no-cache');
      expect(response.headers['connection']).to.include('keep-alive');

      // Check that the response is a streaming response
      expect(response.isStreaming).to.be.true;
      expect(response.body).to.be.a('string');
      expect(response.body).to.include('data:');
    });

    it('should handle streaming errors', async () => {
      const inferenceInput = {
        prompt: 'Test prompt',
        stream: true,
      };

      mockPerformStreamingInference
        .withArgs('test-model', inferenceInput)
        .rejects(new Error('Streaming failed'));

      const response = await request.post('/model/infer', inferenceInput);

      expect(response.status).to.equal(200); // SSE responses are always 200
      expect(mockPerformStreamingInference.calledOnce).to.be.true;

      // Check headers for streaming response
      expect(response.headers['content-type']).to.include('text/event-stream');

      // Check that the response is a streaming response
      expect(response.isStreaming).to.be.true;
      expect(response.body).to.be.a('string');
      expect(response.body).to.include('streaming_inference_failed');
    });
  });
});
