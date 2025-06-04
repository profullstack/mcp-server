/**
 * Fake JSON Module Basic Usage Example
 *
 * This file demonstrates how to use the fake_json module in your application.
 *
 * To run this example:
 * 1. Start the MCP server
 * 2. Make requests to the fake_json module endpoints
 */

// Example using fetch API (for browser or Node.js with node-fetch)
async function fakeJsonModuleExample() {
  const BASE_URL = 'http://localhost:3000';

  try {
    console.log('Fake JSON Module Example');
    console.log('========================');

    // 1. Get fake user data
    console.log('\n1. Getting fake user data...');
    const userResponse = await fetch(`${BASE_URL}/fake_json/users/123`);
    const userData = await userResponse.json();
    console.log('User data:', userData);

    // 2. Get fake product data with specific fields
    console.log('\n2. Getting fake product data with specific fields...');
    const productResponse = await fetch(
      `${BASE_URL}/fake_json/products?fields=id,name,price,description`
    );
    const productData = await productResponse.json();
    console.log('Product data:', productData);

    // 3. Get fake blog posts
    console.log('\n3. Getting fake blog posts...');
    const blogResponse = await fetch(`${BASE_URL}/fake_json/blog/posts`);
    const blogData = await blogResponse.json();
    console.log('Blog data:', blogData);

    // 4. Get fake weather data
    console.log('\n4. Getting fake weather data...');
    const weatherResponse = await fetch(`${BASE_URL}/fake_json/weather/forecast/daily`);
    const weatherData = await weatherResponse.json();
    console.log('Weather data:', weatherData);

    // 5. Get fake API settings
    console.log('\n5. Getting fake API settings...');
    const settingsResponse = await fetch(`${BASE_URL}/fake_json/api/settings`);
    const settingsData = await settingsResponse.json();
    console.log('Settings data:', settingsData);

    console.log('\nExample completed successfully!');
  } catch (error) {
    console.error('Error in example:', error);
  }
}

// Example using the MCP tool directly
async function fakeJsonMcpToolExample() {
  console.log('Fake JSON MCP Tool Example');
  console.log('==========================');

  // This would be used in another module or client that has access to the MCP tools
  const exampleUsage = `
  // Example of using the fake_json tool in another module
  const result = await useMcpTool({
    server_name: 'mcp-server',
    tool_name: 'fake_json',
    arguments: {
      endpoint: '/users/123',
      fields: 'id,name,email,address'
    }
  });
  
  console.log('Fake JSON tool result:', result);
  `;

  console.log(exampleUsage);
}

// Uncomment to run the examples
// fakeJsonModuleExample();
// fakeJsonMcpToolExample();

export { fakeJsonModuleExample, fakeJsonMcpToolExample };
