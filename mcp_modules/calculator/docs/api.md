# calculator API

## POST /calculator/evaluate

Evaluate a mathematical expression.

**Request body**
```json
{ "expression": "1 + 2 * 3" }
```

**Response (200)**
```json
{ "expression": "1 + 2 * 3", "result": 7 }
```

**Response (400)**
```json
{ "error": "Division by zero" }
```

## GET /calculator/capabilities

Returns the supported operators, functions, and constants.
