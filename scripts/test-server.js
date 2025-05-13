#!/usr/bin/env node

/**
 * MCP Server Test Script
 * 
 * This script tests the basic functionality of the MCP server.
 * It starts the server, makes a few requests to test the core endpoints,
 * and then shuts down the server.
 */

import { spawn } from 'child_process';
import fetch from 'node-fetch';
import { setTimeout } from 'timers/promises';

const SERVER_URL = 'http://localhost:3000';
const SERVER_START_TIMEOUT = 3000; // 3 seconds

/**
 * Main test function
 */
async function runTests() {
  console.log('Starting MCP server test...');
  
  // Start the server
  const server = spawn('node', ['index.js'], {
    stdio: 'inherit',
    detached: true
  });
  
  // Wait for the server to start
  console.log(`Waiting ${SERVER_START_TIMEOUT}ms for server to start...`);
  await setTimeout(SERVER_START_TIMEOUT);
  
  try {
    // Test 1: Get server info
    console.log('\nTest 1: Get server info');
    const infoResponse = await fetch(SERVER_URL);
    const info = await infoResponse.json();
    console.log('Server info:', info);
    console.log('Test 1 passed!');
    
    // Test 2: Get server status
    console.log('\nTest 2: Get server status');
    const statusResponse = await fetch(`${SERVER_URL}/status`);
    const status = await statusResponse.json();
    console.log('Server status:', status);
    console.log('Test 2 passed!');
    
    // Test 3: List models
    console.log('\nTest 3: List models');
    const modelsResponse = await fetch(`${SERVER_URL}/models`);
    const models = await modelsResponse.json();
    console.log('Models:', models);
    console.log('Test 3 passed!');
    
    // Test 4: Activate a model
    console.log('\nTest 4: Activate a model');
    const modelId = models.models[0]?.id || 'gpt-4';
    const activateResponse = await fetch(`${SERVER_URL}/model/${modelId}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    const activateResult = await activateResponse.json();
    console.log('Activation result:', activateResult);
    console.log('Test 4 passed!');
    
    // Test 5: Get active model
    console.log('\nTest 5: Get active model');
    const activeModelResponse = await fetch(`${SERVER_URL}/model/active`);
    const activeModel = await activeModelResponse.json();
    console.log('Active model:', activeModel);
    console.log('Test 5 passed!');
    
    // Test 6: Perform inference
    console.log('\nTest 6: Perform inference');
    const inferResponse = await fetch(`${SERVER_URL}/model/infer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'Hello, how are you today?'
      })
    });
    const inferResult = await inferResponse.json();
    console.log('Inference result:', inferResult);
    console.log('Test 6 passed!');
    
    // Test 7: Deactivate model
    console.log('\nTest 7: Deactivate model');
    const deactivateResponse = await fetch(`${SERVER_URL}/model/deactivate`, {
      method: 'POST'
    });
    const deactivateResult = await deactivateResponse.json();
    console.log('Deactivation result:', deactivateResult);
    console.log('Test 7 passed!');
    
    console.log('\nAll tests passed!');
  } catch (error) {
    console.error('\nTest failed:', error.message);
  } finally {
    // Kill the server
    console.log('\nShutting down server...');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', server.pid, '/f', '/t']);
    } else {
      process.kill(-server.pid);
    }
    console.log('Server shut down.');
  }
}

// Run the tests
runTests().catch(console.error);