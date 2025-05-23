# Template Module API Documentation

This document describes the API endpoints provided by the Template Module.

## Base URL

All endpoints are relative to the MCP server base URL (e.g., `http://localhost:3000`).

## Endpoints

### Get All Items

Retrieves a list of all items.

**URL**: `/template/items`

**Method**: `GET`

**Response**:

```json
{
  "success": true,
  "count": 2,
  "items": [
    {
      "id": "item1",
      "name": "Item 1",
      "createdAt": "2025-05-12T14:30:00.000Z"
    },
    {
      "id": "item2",
      "name": "Item 2",
      "createdAt": "2025-05-12T14:35:00.000Z"
    }
  ]
}
```

### Get Item by ID

Retrieves a specific item by its ID.

**URL**: `/template/items/:id`

**Method**: `GET`

**URL Parameters**:

- `id` - The ID of the item to retrieve

**Success Response**:

```json
{
  "success": true,
  "timestamp": "2025-05-12T14:40:00.000Z",
  "data": {
    "id": "item1",
    "name": "Item 1",
    "createdAt": "2025-05-12T14:30:00.000Z"
  }
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Item with ID item1 not found"
}
```

### Create Item

Creates a new item.

**URL**: `/template/items`

**Method**: `POST`

**Request Body**:

```json
{
  "id": "item3",
  "name": "New Item",
  "description": "This is a new item",
  "tags": ["new", "example"]
}
```

**Success Response**:

```json
{
  "success": true,
  "message": "Item created successfully",
  "item": {
    "id": "item3",
    "name": "New Item",
    "description": "This is a new item",
    "tags": ["new", "example"],
    "createdAt": "2025-05-12T14:45:00.000Z"
  }
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Invalid item data"
}
```

### Update Item

Updates an existing item.

**URL**: `/template/items/:id`

**Method**: `PUT`

**URL Parameters**:

- `id` - The ID of the item to update

**Request Body**:

```json
{
  "name": "Updated Item",
  "description": "This item has been updated"
}
```

**Success Response**:

```json
{
  "success": true,
  "message": "Item updated successfully",
  "item": {
    "id": "item1",
    "name": "Updated Item",
    "description": "This item has been updated",
    "createdAt": "2025-05-12T14:30:00.000Z",
    "updatedAt": "2025-05-12T14:50:00.000Z"
  }
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Item with ID item1 not found"
}
```

### Delete Item

Deletes an item.

**URL**: `/template/items/:id`

**Method**: `DELETE`

**URL Parameters**:

- `id` - The ID of the item to delete

**Success Response**:

```json
{
  "success": true,
  "message": "Item deleted successfully"
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Item with ID item1 not found"
}
```

### Process Item

Processes an item.

**URL**: `/template/items/:id/process`

**Method**: `POST`

**URL Parameters**:

- `id` - The ID of the item to process

**Success Response**:

```json
{
  "success": true,
  "message": "Item processed successfully",
  "item": {
    "id": "item1",
    "name": "Item 1",
    "createdAt": "2025-05-12T14:30:00.000Z",
    "processed": true,
    "processedAt": "2025-05-12T14:55:00.000Z",
    "result": "Processed: item1"
  }
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Item with ID item1 not found"
}
```

## MCP Tool

The Template Module also provides an MCP tool that can be used by other modules.

### Tool: `template`

**Description**: Perform operations on template items

**Parameters**:

- `action` (string, required): The action to perform (create, get, update, delete, process)
- `id` (string, optional): The ID of the item for get, update, delete, and process actions
- `item` (object, optional): The item data for create and update actions

**Example Usage**:

```javascript
const result = await useTemplateModule({
  action: 'create',
  item: {
    id: 'mcp-example',
    name: 'MCP Example Item',
    value: 100,
  },
});
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Server Error

Error responses include a `success: false` flag and an `error` message describing the issue.
