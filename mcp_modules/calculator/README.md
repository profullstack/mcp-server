# Calculator Module

A simple calculator module for the MCP server that performs basic mathematical calculations using Node.js.

## Features

- Basic arithmetic operations: addition (+), subtraction (-), multiplication (\*), division (/)
- Modulo operation (%)
- Parentheses for grouping operations
- Decimal number support
- Input validation and security checks

## Usage

### As an MCP Tool

The calculator can be used as an MCP tool with the following parameters:

```json
{
  "expression": "2 + 3 * 4"
}
```

### HTTP Endpoints

#### GET /calculator

Get module information and status.

#### POST /calculator/calculate

Perform a calculation.

**Request Body:**

```json
{
  "expression": "2 + 3 * 4"
}
```

**Response:**

```json
{
  "expression": "2 + 3 * 4",
  "result": 14,
  "timestamp": "2023-12-07T10:30:00.000Z"
}
```

#### POST /tools/calculator

MCP tool endpoint for performing calculations.

**Request Body:**

```json
{
  "expression": "(10 - 5) / 2"
}
```

**Response:**

```json
{
  "tool": "calculator",
  "expression": "(10 - 5) / 2",
  "result": 2.5,
  "timestamp": "2023-12-07T10:30:00.000Z"
}
```

## Supported Operations

- **Addition**: `2 + 3` → `5`
- **Subtraction**: `10 - 4` → `6`
- **Multiplication**: `3 * 7` → `21`
- **Division**: `15 / 3` → `5`
- **Modulo**: `10 % 3` → `1`
- **Parentheses**: `(2 + 3) * 4` → `20`
- **Decimals**: `3.14 * 2` → `6.28`
- **Complex expressions**: `2 + 3 * 4 - (10 / 2)` → `9`

## Security

The calculator module includes several security measures:

- Input validation to only allow mathematical characters
- Protection against code injection
- Safe evaluation using Function constructor instead of eval()
- Result validation to ensure finite numbers

## Error Handling

The module will return appropriate error messages for:

- Invalid characters in expressions
- Malformed mathematical expressions
- Division by zero
- Results that are not finite numbers

## Examples

```javascript
// Simple arithmetic
'2 + 3'; // Returns: 5
'10 - 4'; // Returns: 6
'3 * 7'; // Returns: 21
'15 / 3'; // Returns: 5

// With parentheses
'(2 + 3) * 4'; // Returns: 20
'10 / (2 + 3)'; // Returns: 2

// Decimal numbers
'3.14 * 2'; // Returns: 6.28
'22 / 7'; // Returns: 3.142857142857143

// Complex expressions
'2 + 3 * 4 - 5'; // Returns: 9
'(10 + 5) / 3'; // Returns: 5
```
