#!/usr/bin/env node

/**
 * MCP Server Module Generator
 * 
 * This script generates a new module for the MCP server.
 * Usage: node scripts/create-module.js <module-name>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODULES_DIR = path.resolve(__dirname, '..', 'src', 'modules');
const TEMPLATE_DIR = path.resolve(__dirname, '..', 'src', 'modules', 'template');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompts the user for input
 * @param {string} question - The question to ask
 * @returns {Promise<string>} The user's answer
 */
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Recursively copies a directory
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 * @param {Object} metadata - Module metadata
 * @param {string} moduleName - The name of the module
 */
function copyDirectory(src, dest, metadata, moduleName) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  // Get all files and directories in the source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyDirectory(srcPath, destPath, metadata, moduleName);
    } else {
      // Copy and process file
      let content = fs.readFileSync(srcPath, 'utf8');
      
      // Replace template placeholders
      content = content.replace(/template/g, moduleName);
      content = content.replace(/Template Module/g, metadata.name);
      content = content.replace(/A template for creating new MCP server modules/g, metadata.description);
      content = content.replace(/Your Name/g, metadata.author);
      
      // Write file
      fs.writeFileSync(destPath, content);
    }
  }
}

/**
 * Creates a new module
 * @param {string} moduleName - The name of the module
 * @param {Object} metadata - Module metadata
 */
async function createModule(moduleName, metadata) {
  const moduleDir = path.join(MODULES_DIR, moduleName);
  
  // Check if module already exists
  if (fs.existsSync(moduleDir)) {
    console.error(`Error: Module '${moduleName}' already exists.`);
    process.exit(1);
  }
  
  // Copy template directory recursively
  copyDirectory(TEMPLATE_DIR, moduleDir, metadata, moduleName);
  
  console.log(`\nModule '${moduleName}' created successfully in ${moduleDir}`);
  console.log('\nDirectory Structure:');
  console.log(`${moduleName}/`);
  console.log('├── assets/            # Static assets (images, CSS, etc.)');
  console.log('├── docs/              # Documentation files');
  console.log('├── examples/          # Example usage');
  console.log('├── src/               # Source code');
  console.log('├── test/              # Test files');
  console.log('├── index.js           # Main module entry point');
  console.log('└── README.md          # Module documentation');
  
  console.log('\nNext steps:');
  console.log(`1. Implement your module's business logic in ${moduleDir}/src/`);
  console.log(`2. Update the routes in ${moduleDir}/index.js`);
  console.log(`3. Add documentation in ${moduleDir}/docs/`);
  console.log(`4. Create examples in ${moduleDir}/examples/`);
  console.log(`5. Write tests in ${moduleDir}/test/`);
  console.log('6. Restart the MCP server to load your module');
}

/**
 * Main function
 */
async function main() {
  console.log('MCP Server Module Generator\n');
  
  // Get module name from command line or prompt
  let moduleName = process.argv[2];
  
  if (!moduleName) {
    moduleName = await prompt('Module name (kebab-case): ');
  }
  
  // Validate module name
  if (!/^[a-z0-9-]+$/.test(moduleName)) {
    console.error('Error: Module name must be in kebab-case (lowercase letters, numbers, and hyphens only).');
    process.exit(1);
  }
  
  // Get module metadata
  const name = await prompt(`Module display name (default: ${moduleName.replace(/-/g, ' ')}): `);
  const description = await prompt('Module description: ');
  const author = await prompt('Module author: ');
  
  // Create module
  await createModule(moduleName, {
    name: name || moduleName.replace(/-/g, ' '),
    description,
    author
  });
  
  rl.close();
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});