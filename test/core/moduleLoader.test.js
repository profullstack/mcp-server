/**
 * Module Loader Tests
 *
 * This file contains tests for the module loader functionality.
 */

import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import sinon from 'sinon';
import fs from 'fs';
// path is used in the stubs
import path from 'path';

// Import the module loader
import { loadModules, getModulesInfo } from '../../src/core/moduleLoader.js';
import { logger } from '../../src/utils/logger.js';

describe('Module Loader', () => {
  // Sinon sandbox for managing stubs
  let sandbox;

  // Mock Hono app
  let mockApp;

  beforeEach(() => {
    // Create a new sandbox before each test
    sandbox = sinon.createSandbox();

    // Create a mock Hono app
    mockApp = {
      get: sandbox.stub(),
      post: sandbox.stub(),
      put: sandbox.stub(),
      delete: sandbox.stub(),
    };

    // Stub logger to prevent console output during tests
    sandbox.stub(logger, 'info');
    sandbox.stub(logger, 'warn');
    sandbox.stub(logger, 'error');
  });

  afterEach(() => {
    // Restore all stubs after each test
    sandbox.restore();

    // Clean up global importModule
    if (global.importModule) {
      delete global.importModule;
    }
  });

  describe('loadModules()', () => {
    it('should load modules successfully', async () => {
      // Stub fs.existsSync to return true for modules directory
      sandbox.stub(fs, 'existsSync').callsFake(path => {
        // Return true for the modules directory and module index files
        return true;
      });

      // Stub fs.readdirSync to return mock module directories
      const mockDirents = [
        { name: 'valid-module-1', isDirectory: () => true },
        { name: 'valid-module-2', isDirectory: () => true },
        { name: 'not-a-directory', isDirectory: () => false },
      ];
      sandbox.stub(fs, 'readdirSync').returns(mockDirents);

      // Stub path.join to return predictable paths
      const originalJoin = path.join;
      sandbox.stub(path, 'join').callsFake((...args) => {
        const joinedPath = originalJoin(...args);
        return joinedPath;
      });

      // Stub path.resolve to return predictable paths
      sandbox.stub(path, 'resolve').returns('/mock/path/to/mcp_modules');

      // Mock the fs.readdirSync to return mock module directories
      // This is a simpler approach that doesn't require stubbing dynamic imports
      const mockModules = {
        'valid-module-1': {
          register: sandbox.stub().resolves(),
        },
        'valid-module-2': {
          register: sandbox.stub().resolves(),
        },
      };

      // Create a mock implementation for moduleLoader's internal functions
      // Instead of trying to stub dynamic imports, we'll just mock the behavior

      // Mock the import behavior by overriding the global import function
      global.importModule = async modulePath => {
        const moduleName = modulePath.split('/').slice(-2)[0];
        return mockModules[moduleName] || {};
      };

      // Call the function under test
      await loadModules(mockApp);

      // Verify that the register function was called for each module
      expect(mockModules['valid-module-1'].register.calledOnce).to.be.true;
      expect(mockModules['valid-module-1'].register.calledWith(mockApp)).to.be.true;

      expect(mockModules['valid-module-2'].register.calledOnce).to.be.true;
      expect(mockModules['valid-module-2'].register.calledWith(mockApp)).to.be.true;

      // Verify that the logger was called with the expected messages
      expect(logger.info.calledWith('Found 2 modules to load: valid-module-1, valid-module-2')).to
        .be.true;
      expect(logger.info.calledWith('Successfully loaded module: valid-module-1')).to.be.true;
      expect(logger.info.calledWith('Successfully loaded module: valid-module-2')).to.be.true;
    });

    it('should handle modules without a register function', async () => {
      // Stub fs.existsSync to return true for modules directory
      sandbox.stub(fs, 'existsSync').returns(true);

      // Stub fs.readdirSync to return a mock module directory
      const mockDirents = [{ name: 'invalid-module', isDirectory: () => true }];
      sandbox.stub(fs, 'readdirSync').returns(mockDirents);

      // Stub path.resolve to return a predictable path
      sandbox.stub(path, 'resolve').returns('/mock/path/to/mcp_modules');

      // Stub path.join to return predictable paths
      const originalJoin = path.join;
      sandbox.stub(path, 'join').callsFake((...args) => {
        return originalJoin(...args);
      });

      // Create a mock module without a register function
      const mockModules = {
        'invalid-module': {},
      };

      // Mock the import behavior
      global.importModule = async modulePath => {
        const moduleName = modulePath.split('/').slice(-2)[0];
        return mockModules[moduleName] || {};
      };

      // Call the function under test
      await loadModules(mockApp);

      // Verify that the logger was called with the expected warning
      expect(logger.warn.calledWith('Module invalid-module has no register function, skipping')).to
        .be.true;
    });

    it('should handle modules with no index.js file', async () => {
      // Stub fs.existsSync to return true for modules directory but false for index.js
      sandbox.stub(fs, 'existsSync').callsFake(path => {
        return !path.endsWith('index.js');
      });

      // Stub fs.readdirSync to return a mock module directory
      const mockDirents = [{ name: 'no-index-module', isDirectory: () => true }];
      sandbox.stub(fs, 'readdirSync').returns(mockDirents);

      // Stub path.resolve to return a predictable path
      sandbox.stub(path, 'resolve').returns('/mock/path/to/mcp_modules');

      // Call the function under test
      await loadModules(mockApp);

      // Verify that the logger was called with the expected warning
      expect(logger.warn.calledWith('Module no-index-module has no index.js file, skipping')).to.be
        .true;
    });

    it('should handle errors when loading modules', async () => {
      // Stub fs.existsSync to return true for modules directory
      sandbox.stub(fs, 'existsSync').returns(true);

      // Stub fs.readdirSync to return a mock module directory
      const mockDirents = [{ name: 'error-module', isDirectory: () => true }];
      sandbox.stub(fs, 'readdirSync').returns(mockDirents);

      // Stub path.resolve to return a predictable path
      sandbox.stub(path, 'resolve').returns('/mock/path/to/mcp_modules');

      // Stub path.join to return predictable paths
      const originalJoin = path.join;
      sandbox.stub(path, 'join').callsFake((...args) => {
        return originalJoin(...args);
      });

      // Mock the import behavior to throw an error for the error-module
      global.importModule = async modulePath => {
        const moduleName = modulePath.split('/').slice(-2)[0];
        if (moduleName === 'error-module') {
          throw new Error('Failed to import module');
        }
        return {};
      };

      // Call the function under test
      await loadModules(mockApp);

      // Verify that the logger was called with the expected error
      expect(logger.error.calledWith('Error loading module error-module: Failed to import module'))
        .to.be.true;
    });

    it('should handle non-existent modules directory', async () => {
      // Stub fs.existsSync to return false for modules directory
      sandbox.stub(fs, 'existsSync').returns(false);

      // Stub path.resolve to return a predictable path
      sandbox.stub(path, 'resolve').returns('/mock/path/to/mcp_modules');

      // Call the function under test
      await loadModules(mockApp);

      // Verify that the logger was called with the expected warning
      expect(logger.warn.calledWith('Modules directory not found: /mock/path/to/mcp_modules')).to.be
        .true;
    });
  });

  describe('getModulesInfo()', () => {
    it('should return information about all modules', async () => {
      // Stub fs.existsSync to return true for modules directory and package.json
      sandbox.stub(fs, 'existsSync').returns(true);

      // Stub fs.readdirSync to return mock module directories
      const mockDirents = [
        { name: 'module-1', isDirectory: () => true },
        { name: 'module-2', isDirectory: () => true },
      ];
      sandbox.stub(fs, 'readdirSync').returns(mockDirents);

      // Stub path.resolve to return a predictable path
      sandbox.stub(path, 'resolve').returns('/mock/path/to/mcp_modules');

      // Stub path.join to return predictable paths
      const originalJoin = path.join;
      sandbox.stub(path, 'join').callsFake((...args) => {
        return originalJoin(...args);
      });

      // Stub fs.readFileSync to return mock package.json content
      const mockPackageJson1 = JSON.stringify({
        name: 'module-1',
        version: '1.0.0',
        description: 'Module 1 description',
        author: 'Test Author',
        license: 'ISC',
      });

      const mockPackageJson2 = JSON.stringify({
        name: 'module-2',
        version: '2.0.0',
        description: 'Module 2 description',
        author: 'Test Author',
        license: 'MIT',
      });

      const readFileStub = sandbox.stub(fs, 'readFileSync');
      readFileStub.onFirstCall().returns(mockPackageJson1);
      readFileStub.onSecondCall().returns(mockPackageJson2);

      // Call the function under test
      const modulesInfo = await getModulesInfo();

      // Verify the result
      expect(modulesInfo).to.be.an('array').with.lengthOf(2);

      // We only check the basic fields since the full object has many fields now
      expect(modulesInfo[0]).to.include({
        name: 'module-1',
        directoryName: 'module-1',
        version: '1.0.0',
        description: 'Module 1 description',
        author: 'Test Author',
        license: 'ISC',
        enabled: true,
      });

      expect(modulesInfo[1]).to.include({
        name: 'module-2',
        directoryName: 'module-2',
        version: '2.0.0',
        description: 'Module 2 description',
        author: 'Test Author',
        license: 'MIT',
        enabled: true,
      });
    });

    it('should handle modules without package.json', async () => {
      // Stub fs.existsSync to return true for modules directory but false for package.json
      sandbox.stub(fs, 'existsSync').callsFake(path => {
        return !path.endsWith('package.json');
      });

      // Stub fs.readdirSync to return a mock module directory
      const mockDirents = [{ name: 'no-package-module', isDirectory: () => true }];
      sandbox.stub(fs, 'readdirSync').returns(mockDirents);

      // Stub path.resolve to return a predictable path
      sandbox.stub(path, 'resolve').returns('/mock/path/to/mcp_modules');

      // Stub path.join to return predictable paths
      const originalJoin = path.join;
      sandbox.stub(path, 'join').callsFake((...args) => {
        return originalJoin(...args);
      });

      // Call the function under test
      const modulesInfo = await getModulesInfo();

      // Verify the result
      expect(modulesInfo).to.be.an('array').with.lengthOf(1);

      // We only check the basic fields since the full object has many fields now
      expect(modulesInfo[0]).to.include({
        name: 'no-package-module',
        directoryName: 'no-package-module',
        version: 'unknown',
        description: '',
        enabled: true,
      });
    });

    it('should handle non-existent modules directory', async () => {
      // Stub fs.existsSync to return false for modules directory
      sandbox.stub(fs, 'existsSync').returns(false);

      // Stub path.resolve to return a predictable path
      sandbox.stub(path, 'resolve').returns('/mock/path/to/mcp_modules');

      // Call the function under test
      const modulesInfo = await getModulesInfo();

      // Verify the result
      expect(modulesInfo).to.be.an('array').that.is.empty;
    });

    it('should handle errors when getting module info', async () => {
      // Stub fs.existsSync to return true for modules directory
      sandbox.stub(fs, 'existsSync').returns(true);

      // Stub fs.readdirSync to return a mock module directory
      const mockDirents = [{ name: 'error-module', isDirectory: () => true }];
      sandbox.stub(fs, 'readdirSync').returns(mockDirents);

      // Stub path.resolve to return a predictable path
      sandbox.stub(path, 'resolve').returns('/mock/path/to/mcp_modules');

      // Stub path.join to return predictable paths
      const originalJoin = path.join;
      sandbox.stub(path, 'join').callsFake((...args) => {
        return originalJoin(...args);
      });

      // Stub fs.readFileSync to throw an error
      sandbox.stub(fs, 'readFileSync').throws(new Error('Failed to read package.json'));

      // Call the function under test
      const modulesInfo = await getModulesInfo();

      // Verify the result
      expect(modulesInfo).to.be.an('array').that.is.empty;

      // Verify that the logger was called with the expected error
      expect(
        logger.error.calledWith(
          'Error getting info for module error-module: Failed to read package.json'
        )
      ).to.be.true;
    });
  });
});
