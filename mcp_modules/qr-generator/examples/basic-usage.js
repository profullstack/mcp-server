/**
 * Template Module Basic Usage Example
 *
 * This file demonstrates how to use the template module in your application.
 *
 * To run this example:
 * 1. Start the MCP server
 * 2. Make requests to the template module endpoints
 */

// Example using fetch API (for browser or Node.js with node-fetch)
async function templateModuleExample() {
  const BASE_URL = 'http://localhost:3000';

  try {
    console.log('Template Module Example');
    console.log('=======================');

    // 1. Create an item
    console.log('\n1. Creating an item...');
    const createResponse = await fetch(`${BASE_URL}/template/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'example1',
        name: 'Example Item',
        description: 'This is an example item',
        tags: ['example', 'demo', 'template'],
      }),
    });

    const createResult = await createResponse.json();
    console.log('Create result:', createResult);

    // 2. Get all items
    console.log('\n2. Getting all items...');
    const getAllResponse = await fetch(`${BASE_URL}/template/items`);
    const getAllResult = await getAllResponse.json();
    console.log('All items:', getAllResult);

    // 3. Get item by ID
    console.log('\n3. Getting item by ID...');
    const getByIdResponse = await fetch(`${BASE_URL}/template/items/example1`);
    const getByIdResult = await getByIdResponse.json();
    console.log('Item by ID:', getByIdResult);

    // 4. Update an item
    console.log('\n4. Updating an item...');
    const updateResponse = await fetch(`${BASE_URL}/template/items/example1`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Updated Example Item',
        priority: 'high',
      }),
    });

    const updateResult = await updateResponse.json();
    console.log('Update result:', updateResult);

    // 5. Process an item
    console.log('\n5. Processing an item...');
    const processResponse = await fetch(`${BASE_URL}/template/items/example1/process`, {
      method: 'POST',
    });

    const processResult = await processResponse.json();
    console.log('Process result:', processResult);

    // 6. Delete an item
    console.log('\n6. Deleting an item...');
    const deleteResponse = await fetch(`${BASE_URL}/template/items/example1`, {
      method: 'DELETE',
    });

    const deleteResult = await deleteResponse.json();
    console.log('Delete result:', deleteResult);

    // 7. Verify item is deleted
    console.log('\n7. Verifying item is deleted...');
    const verifyResponse = await fetch(`${BASE_URL}/template/items`);
    const verifyResult = await verifyResponse.json();
    console.log('All items after deletion:', verifyResult);

    console.log('\nExample completed successfully!');
  } catch (error) {
    console.error('Error in example:', error);
  }
}

// Example using the MCP tool directly
async function templateMcpToolExample() {
  console.log('Template MCP Tool Example');
  console.log('=========================');

  // This would be used in another module or client that has access to the MCP tools
  const exampleUsage = `
  // Example of using the template tool in another module
  const result = await useTemplateModule({
    action: 'create',
    item: {
      id: 'mcp-example',
      name: 'MCP Example Item',
      value: 100
    }
  });
  
  console.log('Template tool result:', result);
  `;

  console.log(exampleUsage);
}

// Uncomment to run the examples
// templateModuleExample();
// templateMcpToolExample();

export { templateModuleExample, templateMcpToolExample };
