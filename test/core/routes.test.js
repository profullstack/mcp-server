/**
 * Routes Tests
 *
 * This file contains tests for the core routes functionality.
 */

import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import sinon from 'sinon';
import { Hono } from 'hono';

// Import the routes setup function
import { setupCoreRoutes } from '../../src/core/routes.js';

// We'll use a mock fetch for testing instead of supertest
import { createMockFetch } from '../utils/mockFetch.js';

describe('Core Routes', () => {
  // Sinon sandbox for managing stubs
  let sandbox;

  // Hono app instance
  let app;

  // Mock fetch instance
  let request;

  // Mock objects
  let mockModelState;
  let mockActivateModel;
  let mockDeactivateModel;
  let mockGetActiveModel;
  let mockPerformInference;
  let mockGetModelById;
  let mockListModels;
  let mockGetModulesInfo;

  beforeEach(() => {
    // Create a new sandbox before each test
    sandbox = sinon.createSandbox();

    // Create a new Hono app instance
    app = new Hono();

    // Create a mock modelState
    mockModelState = {
      activeModel: null,
      models: {},
    };

    // Create mock functions for model manager
    mockActivateModel = sandbox.stub().resolves({ success: true });
    mockDeactivateModel = sandbox.stub().resolves({ success: true });
    mockGetActiveModel = sandbox
      .stub()
      .resolves({ activeModel: 'model1', modelInfo: { status: 'activated' } });
    mockPerformInference = sandbox.stub().resolves({ result: 'test' });
    mockGetModelById = sandbox.stub().resolves({ id: 'model1', name: 'Model 1' });
    mockListModels = sandbox.stub().resolves([
      { id: 'model1', name: 'Model 1' },
      { id: 'model2', name: 'Model 2' },
    ]);

    // Create mock functions for module loader
    mockGetModulesInfo = sandbox.stub().resolves([
      { name: 'module1', version: '1.0.0' },
      { name: 'module2', version: '1.0.0' },
    ]);

    // Create a mock implementation of the modelManager
    const mockModelManager = {
      modelState: mockModelState,
      activateModel: mockActivateModel,
      deactivateModel: mockDeactivateModel,
      getActiveModel: mockGetActiveModel,
      performInference: mockPerformInference,
      getModelById: mockGetModelById,
      listModels: mockListModels,
    };

    // Create a mock implementation of the moduleLoader
    const mockModuleLoader = {
      getModulesInfo: mockGetModulesInfo,
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

  describe('GET /', () => {
    it('should return server information', async () => {
      const response = await request.get('/');

      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('object');
      expect(response.body.name).to.equal('MCP Server');
      expect(response.body.status).to.equal('running');
      expect(response.body.version).to.be.a('string');
    });
  });

  describe('GET /status', () => {
    it('should return server status', async () => {
      const response = await request.get('/status');

      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('object');
      expect(response.body.status).to.equal('running');
      expect(response.body.activeModel).to.be.null;
      expect(response.body.uptime).to.be.a('number');
      expect(response.body.timestamp).to.be.a('string');
    });

    it('should include active model when one is set', async () => {
      // We need to directly modify the global testOverrides to set the active model
      global.testOverrides.modelManager.modelState.activeModel = 'test-model';

      // Mock the getActiveModel to return the expected model
      mockGetActiveModel.resolves({
        activeModel: 'test-model',
        modelInfo: { status: 'activated' },
      });

      // We need to recreate the app and routes to pick up the new active model
      app = new Hono();
      setupCoreRoutes(app);
      request = createMockFetch(app);

      const response = await request.get('/status');

      expect(response.status).to.equal(200);
      expect(response.body.activeModel).to.equal('test-model');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request.get('/health');

      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('object');
      expect(response.body.status).to.equal('healthy');
      expect(response.body.checks).to.be.an('object');
      expect(response.body.checks.server).to.equal('running');
      expect(response.body.checks.models).to.equal('available');
    });

    it('should indicate active model when one is set', async () => {
      // We need to directly modify the global testOverrides to set the active model
      global.testOverrides.modelManager.modelState.activeModel = 'test-model';

      // Mock the getActiveModel to return the expected model
      mockGetActiveModel.resolves({
        activeModel: 'test-model',
        modelInfo: { status: 'activated' },
      });

      // We need to recreate the app and routes to pick up the new active model
      app = new Hono();
      setupCoreRoutes(app);
      request = createMockFetch(app);

      const response = await request.get('/health');

      expect(response.status).to.equal(200);
      expect(response.body.checks.models).to.equal('active');
    });
  });

  describe('GET /metrics', () => {
    it('should return server metrics', async () => {
      const response = await request.get('/metrics');

      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('object');
      expect(response.body.uptime).to.be.a('number');
      expect(response.body.memory).to.be.an('object');
      expect(response.body.cpu).to.be.an('object');
    });
  });

  describe('GET /models', () => {
    it('should return list of available models', async () => {
      // Stub listModels to return mock models
      const mockModels = [
        { id: 'model1', name: 'Model 1' },
        { id: 'model2', name: 'Model 2' },
      ];
      mockListModels.resolves(mockModels);

      const response = await request.get('/models');

      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('object');
      expect(response.body.models).to.deep.equal(mockModels);
      expect(mockListModels.calledOnce).to.be.true;
    });
  });

  describe('GET /model/:modelId', () => {
    it('should return model information when model exists', async () => {
      // Stub getModelById to return a mock model
      const mockModel = { id: 'model1', name: 'Model 1' };
      mockGetModelById.withArgs('model1').resolves(mockModel);

      const response = await request.get('/model/model1');

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal(mockModel);
      expect(mockGetModelById.calledOnce).to.be.true;
      expect(mockGetModelById.calledWith('model1')).to.be.true;
    });

    it('should return 404 when model does not exist', async () => {
      // Stub getModelById to return null
      mockGetModelById.withArgs('nonexistent').resolves(null);

      const response = await request.get('/model/nonexistent');

      expect(response.status).to.equal(404);
      expect(response.body).to.be.an('object');
      expect(response.body.error).to.equal('Model nonexistent not found');
      expect(mockGetModelById.calledOnce).to.be.true;
      expect(mockGetModelById.calledWith('nonexistent')).to.be.true;
    });
  });

  describe('POST /model/:modelId/activate', () => {
    it('should activate the specified model', async () => {
      // Stub activateModel to return success
      const activateResult = { success: true, model: 'model1' };
      mockActivateModel.withArgs('model1', {}).resolves(activateResult);

      // Mock the getModelById to return a valid model to prevent the error
      mockGetModelById.withArgs('model1').resolves({ id: 'model1', name: 'Model 1' });

      const response = await request.post('/model/model1/activate');

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal(activateResult);
      expect(mockActivateModel.calledOnce).to.be.true;
      expect(mockActivateModel.calledWith('model1', {})).to.be.true;
    });

    it('should pass config when provided', async () => {
      // Stub activateModel to return success
      const config = { param1: 'value1', param2: 'value2' };
      const activateResult = { success: true, model: 'model1', config };
      mockActivateModel.withArgs('model1', config).resolves(activateResult);

      // Mock the getModelById to return a valid model to prevent the error
      mockGetModelById.withArgs('model1').resolves({ id: 'model1', name: 'Model 1' });

      const response = await request.post('/model/model1/activate', { config });

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal(activateResult);
      expect(mockActivateModel.calledOnce).to.be.true;
      expect(mockActivateModel.calledWith('model1', config)).to.be.true;
    });
  });

  describe('POST /model/deactivate', () => {
    it('should deactivate the current model', async () => {
      // Stub deactivateModel to return success
      const deactivateResult = { success: true };
      mockDeactivateModel.resolves(deactivateResult);

      const response = await request.post('/model/deactivate');

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal(deactivateResult);
      expect(mockDeactivateModel.calledOnce).to.be.true;
    });
  });

  describe('GET /model/active', () => {
    it('should return active model information', async () => {
      // Set an active model
      global.testOverrides.modelManager.modelState.activeModel = 'model1';

      // Stub getModelById to return a mock model
      const mockModel = { id: 'model1', name: 'Model 1' };
      mockGetModelById.withArgs('model1').resolves(mockModel);

      // We need to recreate the app and routes to pick up the new active model
      app = new Hono();
      setupCoreRoutes(app);
      request = createMockFetch(app);

      const response = await request.get('/model/active');

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal(mockModel);
    });
  });

  describe('POST /model/infer', () => {
    it('should perform inference with active model', async () => {
      // Set an active model
      global.testOverrides.modelManager.modelState.activeModel = 'active-model';

      // Mock the model to be activated
      mockGetModelById
        .withArgs('active-model')
        .resolves({ id: 'active-model', name: 'Active Model' });
      global.testOverrides.modelManager.modelState.models = {
        'active-model': { status: 'activated' },
      };

      // We need to recreate the app and routes to pick up the new active model
      app = new Hono();
      setupCoreRoutes(app);
      request = createMockFetch(app);

      // Stub performInference to return a mock result
      const inferenceInput = { prompt: 'Test prompt' };
      const inferenceResult = { result: 'Test result' };
      mockPerformInference.withArgs('active-model', inferenceInput).resolves(inferenceResult);

      // Override the modelState.activeModel check in the route handler
      Object.defineProperty(global.testOverrides.modelManager.modelState, 'activeModel', {
        get: function () {
          return 'active-model';
        },
      });

      const response = await request.post('/model/infer', inferenceInput);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal(inferenceResult);
      expect(mockPerformInference.calledOnce).to.be.true;
      expect(mockPerformInference.calledWith('active-model', inferenceInput)).to.be.true;
    });

    it('should return 400 when no active model', async () => {
      // Ensure no active model
      mockModelState.activeModel = null;

      const response = await request.post('/model/infer', { prompt: 'Test prompt' });

      expect(response.status).to.equal(400);
      expect(response.body).to.be.an('object');
      expect(response.body.error).to.be.an('object');
      expect(response.body.error.code).to.equal('no_active_model');
      expect(response.body.error.message).to.equal('No active model');
      expect(mockPerformInference.called).to.be.false;
    });

    it('should handle inference errors', async () => {
      // Set an active model
      global.testOverrides.modelManager.modelState.activeModel = 'active-model';

      // We need to recreate the app and routes to pick up the new active model
      app = new Hono();
      setupCoreRoutes(app);
      request = createMockFetch(app);

      // Stub performInference to throw an error
      const inferenceInput = { prompt: 'Test prompt' };
      const error = new Error('Inference failed');
      mockPerformInference.withArgs('active-model', inferenceInput).rejects(error);

      // Override the modelState.activeModel check in the route handler
      Object.defineProperty(global.testOverrides.modelManager.modelState, 'activeModel', {
        get: function () {
          return 'active-model';
        },
      });

      const response = await request.post('/model/infer', inferenceInput);

      expect(response.status).to.equal(500);
      expect(response.body).to.be.an('object');
      expect(response.body.error).to.be.an('object');
      expect(response.body.error.code).to.equal('inference_failed');
      expect(response.body.error.message).to.equal('Inference failed');
      expect(mockPerformInference.calledOnce).to.be.true;
    });
  });

  describe('POST /model/:modelId/infer', () => {
    it('should perform inference with specified model', async () => {
      // Stub performInference to return a mock result
      const inferenceInput = { prompt: 'Test prompt' };
      const inferenceResult = { result: 'Test result' };
      mockPerformInference.withArgs('model1', inferenceInput).resolves(inferenceResult);

      // Mock the model to be available
      mockGetModelById.withArgs('model1').resolves({ id: 'model1', name: 'Model 1' });
      global.testOverrides.modelManager.modelState.models = { model1: { status: 'activated' } };

      const response = await request.post('/model/model1/infer', inferenceInput);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal(inferenceResult);
      expect(mockPerformInference.calledOnce).to.be.true;
      expect(mockPerformInference.calledWith('model1', inferenceInput)).to.be.true;
    });

    it('should handle inference errors', async () => {
      // Stub performInference to throw an error
      const inferenceInput = { prompt: 'Test prompt' };
      const error = new Error('Inference failed');
      mockPerformInference.withArgs('model1', inferenceInput).rejects(error);

      const response = await request.post('/model/model1/infer', inferenceInput);

      expect(response.status).to.equal(500);
      expect(response.body).to.be.an('object');
      expect(response.body.error).to.be.an('object');
      expect(response.body.error.code).to.equal('inference_failed');
      expect(response.body.error.message).to.equal('Inference failed');
      expect(mockPerformInference.calledOnce).to.be.true;
    });
  });

  describe('GET /modules', () => {
    it('should return list of installed modules', async () => {
      // Stub getModulesInfo to return mock modules
      const mockModules = [
        { name: 'module1', version: '1.0.0' },
        { name: 'module2', version: '1.0.0' },
      ];
      mockGetModulesInfo.resolves(mockModules);

      const response = await request.get('/modules');

      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('object');
      expect(response.body.modules).to.deep.equal(mockModules);
      expect(mockGetModulesInfo.calledOnce).to.be.true;
    });
  });

  describe('GET /modules/:moduleId', () => {
    it('should return module information when module exists', async () => {
      // Stub getModulesInfo to return mock modules
      const mockModules = [
        { name: 'module1', version: '1.0.0' },
        { name: 'module2', version: '1.0.0' },
      ];
      mockGetModulesInfo.resolves(mockModules);

      const response = await request.get('/modules/module1');

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal(mockModules[0]);
      expect(mockGetModulesInfo.calledOnce).to.be.true;
    });

    it('should return 404 when module does not exist', async () => {
      // Stub getModulesInfo to return mock modules
      const mockModules = [
        { name: 'module1', version: '1.0.0' },
        { name: 'module2', version: '1.0.0' },
      ];
      mockGetModulesInfo.resolves(mockModules);

      const response = await request.get('/modules/nonexistent');

      expect(response.status).to.equal(404);
      expect(response.body).to.be.an('object');
      expect(response.body.error).to.equal('Module nonexistent not found');
      expect(mockGetModulesInfo.calledOnce).to.be.true;
    });
  });

  describe('GET /tools', () => {
    it('should return empty tools list', async () => {
      const response = await request.get('/tools');

      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('object');
      expect(response.body.tools).to.be.an('array').that.is.empty;
    });
  });

  describe('GET /resources', () => {
    it('should return empty resources list', async () => {
      const response = await request.get('/resources');

      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('object');
      expect(response.body.resources).to.be.an('array').that.is.empty;
    });
  });

  describe('Not Found Handler', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await request.get('/undefined-route');

      expect(response.status).to.equal(404);
      expect(response.body).to.be.an('object');
      expect(response.body.error).to.be.an('object');
      expect(response.body.error.code).to.equal('not_found');
      expect(response.body.error.message).to.equal('The requested endpoint does not exist');
    });
  });
});
