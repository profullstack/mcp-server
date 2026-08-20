# calculator

Safe mathematical expression evaluation for the Profullstack MCP server.

Unlike `eval()`, this module never executes arbitrary code. Input is tokenized
and parsed with a recursive-descent parser over a whitelisted set of operators,
constants, and functions.

## Features

- Operators: `+ - * / % ^` and unary minus
- Parentheses and comma-separated function arguments
- Constants: `pi`, `e`, `tau`, `phi`
- Functions: `sin cos tan asin acos atan sinh cosh tanh sqrt cbrt abs exp log ln
  log10 log2 floor ceil round sign trunc min max pow atan2 hypot clamp`
- Scientific notation (`1.5e3`)
- Right-associative exponentiation (`2 ^ 3 ^ 2 === 512`)

## Usage

```js
import { calculate } from "mcp-module-calculator";

calculate("1 + 2 * 3");        // 7
calculate("sqrt(16) + 2^8");   // 4 + 256 = 260
calculate("clamp(15, 0, 10)"); // 10
```

## HTTP surface

- `GET  /calculator` — module status
- `GET  /calculator/capabilities` — supported operators/functions/constants
- `POST /calculator/evaluate` — body `{ "expression": "1 + 2 * 3" }`

## Error handling

Invalid input throws a specific error (division by zero, unknown identifier,
unbalanced parentheses) instead of returning a misleading result.
