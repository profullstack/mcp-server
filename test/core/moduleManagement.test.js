/**
 * Module Management Tests
 *
 * This file contains tests for the module management functionality.
 */

import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import sinon from 'sinon';
import { Hono } from 'hono';

// Import the routes setup function
import { setupCoreRoutes } from '../../src/core/routes.js';

// We'll use a mock fetch for testing
import { createMockFetch } from '../utils/mockFetch.js';

describe('Module Management', () => {
  // Sinon sandbox for managing stubs
  let sandbox;

  // Hono app instance
  let app;

  // Mock fetch instance
  let request;

  // Mock objects
  let mockGetModulesInfo;
  let mockEnableModule;
  let mockDisableModule;
  let mockModuleState;

  beforeEach(() => {
    // Create a new sandbox before each test
    sandbox = sinon.createSandbox();

    // Create a new Hono app instance
    app = new Hono();

    // Create mock module state
    mockModuleState = {
      modules: {
        'test-module': {
          enabled: true,
          lastStatusChange: new Date().toISOString(),
        },
        'disabled-module': {
          enabled: false,
          lastStatusChange: new Date().toISOString(),
        },
      },
    };

    // Create mock functions for module loader
    mockGetModulesInfo = sandbox.stub().resolves([
      {
        name: 'test-module',
        directoryName: 'test-module',
        version: '1.0.0',
        description: 'Test module',
        enabled: true,
        status: 'enabled',
      },
      {
        name: 'disabled-module',
        directoryName: 'disabled-module',
        version: '1.0.0',
        description: 'Disabled module',
        enabled: false,
        status: 'disabled',
      },
    ]);

    mockEnableModule = sandbox.stub().callsFake(async moduleId => {
      if (moduleId !== 'test-module' && moduleId !== 'disabled-module') {
        throw new Error(`Module ${moduleId} not found`);
      }

      mockModuleState.modules[moduleId] = {
        enabled: true,
        lastStatusChange: new Date().toISOString(),
      };

      return {
        name: moduleId,
        directoryName: moduleId,
        status: 'enabled',
        timestamp: mockModuleState.modules[moduleId].lastStatusChange,
      };
    });

    mockDisableModule = sandbox.stub().callsFake(async moduleId => {
      if (moduleId !== 'test-module' && moduleId !== 'disabled-module') {
        throw new Error(`Module ${moduleId} not found`);
      }

      mockModuleState.modules[moduleId] = {
        enabled: false,
        lastStatusChange: new Date().toISOString(),
      };

      return {
        name: moduleId,
        directoryName: moduleId,
        status: 'disabled',
        timestamp: mockModuleState.modules[moduleId].lastStatusChange,
      };
    });

    // Create a mock implementation of the moduleLoader
    const mockModuleLoader = {
      moduleState: mockModuleState,
      getModulesInfo: mockGetModulesInfo,
      enableModule: mockEnableModule,
      disableModule: mockDisableModule,
    };

    // Create a mock implementation of the modelManager
    const mockModelManager = {
      modelState: {
        activeModel: null,
        models: {},
      },
    };

    // Override the imported modules with our mocks
    global.testOverrides = {
      moduleLoader: mockModuleLoader,
      modelManager: mockModelManager,
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

  describe('GET /modules', () => {
    it('should return list of modules with status information', async () => {
      const response = await request.get('/modules');

      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('object');
      expect(response.body.modules).to.be.an('array').with.lengthOf(2);

      // Check that the enabled module is returned with the correct status
      const enabledModule = response.body.modules.find(m => m.name === 'test-module');
      expect(enabledModule).to.exist;
      expect(enabledModule.enabled).to.be.true;
      expect(enabledModule.status).to.equal('enabled');

      // Check that the disabled module is returned with the correct status
      const disabledModule = response.body.modules.find(m => m.name === 'disabled-module');
      expect(disabledModule).to.exist;
      expect(disabledModule.enabled).to.be.false;
      expect(disabledModule.status).to.equal('disabled');
    });
  });

  describe('POST /modules/:moduleId/enable', () => {
    it('should enable a disabled module', async () => {
      const response = await request.post('/modules/disabled-module/enable');

      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('object');
      expect(response.body.name).to.equal('disabled-module');
      expect(response.body.status).to.equal('enabled');
      expect(response.body.timestamp).to.be.a('string');

      expect(mockEnableModule.calledOnce).to.be.true;
      expect(mockEnableModule.calledWith('disabled-module')).to.be.true;
    });

    it('should return 404 when module does not exist', async () => {
      const response = await request.post('/modules/nonexistent-module/enable');

      expect(response.status).to.equal(404);
      expect(response.body).to.be.an('object');
      expect(response.body.error).to.be.an('object');
      expect(response.body.error.code).to.equal('module_enable_failed');
      expect(response.body.error.message).to.equal('Module nonexistent-module not found');

      expect(mockEnableModule.calledOnce).to.be.true;
      expect(mockEnableModule.calledWith('nonexistent-module')).to.be.true;
    });
  });

  describe('POST /modules/:moduleId/disable', () => {
    it('should disable an enabled module', async () => {
      const response = await request.post('/modules/test-module/disable');

      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('object');
      expect(response.body.name).to.equal('test-module');
      expect(response.body.status).to.equal('disabled');
      expect(response.body.timestamp).to.be.a('string');

      expect(mockDisableModule.calledOnce).to.be.true;
      expect(mockDisableModule.calledWith('test-module')).to.be.true;
    });

    it('should return 404 when module does not exist', async () => {
      const response = await request.post('/modules/nonexistent-module/disable');

      expect(response.status).to.equal(404);
      expect(response.body).to.be.an('object');
      expect(response.body.error).to.be.an('object');
      expect(response.body.error.code).to.equal('module_disable_failed');
      expect(response.body.error.message).to.equal('Module nonexistent-module not found');

      expect(mockDisableModule.calledOnce).to.be.true;
      expect(mockDisableModule.calledWith('nonexistent-module')).to.be.true;
    });
  });
});
