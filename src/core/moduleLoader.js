import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// config is used for module directory configuration
import { config } from './config.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory module state
// In a production environment, consider using a more robust state management solution
export const moduleState = {
  modules: {}, // Stores module status information
};

/**
 * Loads all modules from the modules directory and registers them with the app
 * @param {import('hono').Hono} app - The Hono app instance
 */
export async function loadModules(app) {
  try {
    const modulesDir = path.resolve(__dirname, '..', '..', 'mcp_modules');

    // Check if modules directory exists
    if (!fs.existsSync(modulesDir)) {
      logger.warn(`Modules directory not found: ${modulesDir}`);
      return;
    }

    // Get all module directories
    const moduleDirs = fs
      .readdirSync(modulesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    if (moduleDirs.length === 0) {
      logger.info('No modules found to load');
      return;
    }

    logger.info(`Found ${moduleDirs.length} modules to load: ${moduleDirs.join(', ')}`);

    // Load each module
    for (const moduleDir of moduleDirs) {
      try {
        const modulePath = path.join(modulesDir, moduleDir);
        const indexPath = path.join(modulePath, 'index.js');

        // Skip if no index.js file
        if (!fs.existsSync(indexPath)) {
          logger.warn(`Module ${moduleDir} has no index.js file, skipping`);
          continue;
        }

        // Import the module
        const moduleUrl = `file://${indexPath}`;
        // Use the global.importModule function if it exists (for testing)
        const module = global.importModule
          ? await global.importModule(indexPath)
          : await import(moduleUrl);

        // Check if the module has a register function
        if (typeof module.register !== 'function') {
          logger.warn(`Module ${moduleDir} has no register function, skipping`);
          continue;
        }

        // Register the module with the app
        await module.register(app);
        logger.info(`Successfully loaded module: ${moduleDir}`);
      } catch (error) {
        logger.error(`Error loading module ${moduleDir}: ${error.message}`);
      }
    }
  } catch (error) {
    logger.error(`Error loading modules: ${error.message}`);
  }
}

/**
 * Gets information about all available modules
 * @returns {Array} Array of module information objects
 */
export async function getModulesInfo() {
  try {
    // For tests, we'll use the mock data if it's available
    if (global.testOverrides?.moduleLoader) {
      return global.testOverrides.moduleLoader.getModulesInfo();
    }

    const modulesDir = path.resolve(__dirname, '..', '..', 'mcp_modules');

    if (!fs.existsSync(modulesDir)) {
      return [];
    }

    const moduleDirs = fs
      .readdirSync(modulesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const modulesInfo = [];

    for (const moduleDir of moduleDirs) {
      try {
        const modulePath = path.join(modulesDir, moduleDir);
        const packageJsonPath = path.join(modulePath, 'package.json');

        let moduleInfo = {
          name: moduleDir,
          directoryName: moduleDir, // Add the directory name for lookup
          version: 'unknown',
          description: '',
          enabled: moduleState.modules[moduleDir]?.enabled !== false, // Default to true unless explicitly disabled
        };

        // Try to get info from package.json if it exists
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

          // Include all relevant package.json fields
          moduleInfo = {
            ...moduleInfo,
            name: packageJson.name || moduleDir,
            version: packageJson.version || 'unknown',
            description: packageJson.description || '',
            author: packageJson.author || '',
            license: packageJson.license || '',
            homepage: packageJson.homepage || '',
            repository: packageJson.repository || '',
            bugs: packageJson.bugs || '',
            keywords: packageJson.keywords || [],
            engines: packageJson.engines || {},
            dependencies: packageJson.dependencies || {},
            devDependencies: packageJson.devDependencies || {},
          };
        }

        // Try to get metadata from the module's index.js if it exists
        const indexPath = path.join(modulePath, 'index.js');
        if (fs.existsSync(indexPath)) {
          try {
            const moduleUrl = `file://${indexPath}`;
            // Use the global.importModule function if it exists (for testing)
            const module = global.importModule
              ? await global.importModule(indexPath)
              : await import(moduleUrl);

            // If the module has metadata, merge it with the package.json info
            if (module.metadata) {
              moduleInfo = {
                ...moduleInfo,
                ...module.metadata,
                // Ensure these fields from package.json take precedence
                name: moduleInfo.name,
                version: moduleInfo.version,
                description: moduleInfo.description || module.metadata.description,
                author: moduleInfo.author || module.metadata.author,
              };
            }
          } catch (error) {
            logger.warn(
              `Could not load metadata from index.js for module ${moduleDir}: ${error.message}`
            );
          }
        }

        // Add status information from moduleState if available
        if (moduleState.modules[moduleDir]) {
          moduleInfo.status = moduleState.modules[moduleDir].enabled ? 'enabled' : 'disabled';
          moduleInfo.lastStatusChange = moduleState.modules[moduleDir].lastStatusChange;
        } else {
          moduleInfo.status = 'enabled'; // Default status
        }

        modulesInfo.push(moduleInfo);
      } catch (error) {
        logger.error(`Error getting info for module ${moduleDir}: ${error.message}`);
      }
    }

    return modulesInfo;
  } catch (error) {
    logger.error(`Error getting modules info: ${error.message}`);
    return [];
  }
}

/**
 * Enables a module
 * @param {string} moduleId - The ID of the module to enable
 * @returns {Object} Result of the operation
 */
export async function enableModule(moduleId) {
  try {
    logger.info(`Enabling module: ${moduleId}`);

    // For tests, we'll use the mock data if it's available
    if (global.testOverrides?.moduleLoader) {
      return global.testOverrides.moduleLoader.enableModule(moduleId);
    }

    // Check if module exists
    const modules = await getModulesInfo();
    const module = modules.find(m => m.name === moduleId || m.directoryName === moduleId);

    if (!module) {
      throw new Error(`Module ${moduleId} not found`);
    }

    // Update module state
    const moduleKey = module.directoryName;
    if (!moduleState.modules[moduleKey]) {
      moduleState.modules[moduleKey] = {};
    }

    moduleState.modules[moduleKey].enabled = true;
    moduleState.modules[moduleKey].lastStatusChange = new Date().toISOString();

    return {
      name: module.name,
      directoryName: module.directoryName,
      status: 'enabled',
      timestamp: moduleState.modules[moduleKey].lastStatusChange,
    };
  } catch (error) {
    logger.error(`Error enabling module ${moduleId}: ${error.message}`);
    throw error;
  }
}

/**
 * Disables a module
 * @param {string} moduleId - The ID of the module to disable
 * @returns {Object} Result of the operation
 */
export async function disableModule(moduleId) {
  try {
    logger.info(`Disabling module: ${moduleId}`);

    // For tests, we'll use the mock data if it's available
    if (global.testOverrides?.moduleLoader) {
      return global.testOverrides.moduleLoader.disableModule(moduleId);
    }

    // Check if module exists
    const modules = await getModulesInfo();
    const module = modules.find(m => m.name === moduleId || m.directoryName === moduleId);

    if (!module) {
      throw new Error(`Module ${moduleId} not found`);
    }

    // Update module state
    const moduleKey = module.directoryName;
    if (!moduleState.modules[moduleKey]) {
      moduleState.modules[moduleKey] = {};
    }

    moduleState.modules[moduleKey].enabled = false;
    moduleState.modules[moduleKey].lastStatusChange = new Date().toISOString();

    return {
      name: module.name,
      directoryName: module.directoryName,
      status: 'disabled',
      timestamp: moduleState.modules[moduleKey].lastStatusChange,
    };
  } catch (error) {
    logger.error(`Error disabling module ${moduleId}: ${error.message}`);
    throw error;
  }
}
