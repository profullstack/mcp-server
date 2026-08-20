/**
 * Safe mathematical expression evaluator.
 *
 * Never uses `eval()` or `Function()`. Input is tokenized, parsed with a
 * recursive-descent parser into an AST, and evaluated against an explicit
 * whitelist of operators and functions. Anything outside that whitelist
 * (assignment, member access, identifiers that are not known constants or
 * functions) is rejected before it can run.
 */

const CONSTANTS = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
  phi: (1 + Math.sqrt(5)) / 2,
};

const FUNCTIONS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  exp: Math.exp,
  log: Math.log,        // natural log
  ln: Math.log,
  log10: Math.log10,
  log2: Math.log2,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
  trunc: Math.trunc,
  min: (...a) => Math.min(...a),
  max: (...a) => Math.max(...a),
  pow: (a, b) => Math.pow(a, b),
  atan2: (y, x) => Math.atan2(y, x),
  hypot: (...a) => Math.hypot(...a),
  clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
};

function tokenize(input) {
  const tokens = [];
  let i = 0;
  const s = String(input).trim();
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") { i++; continue; }
    // number (incl. decimals and scientific notation)
    if (/[0-9.]/.test(c)) {
      let j = i;
      let seenDot = false, seenExp = false;
      while (j < s.length) {
        const ch = s[j];
        if (ch >= "0" && ch <= "9") { j++; }
        else if (ch === "." && !seenDot && !seenExp) { seenDot = true; j++; }
        else if ((ch === "e" || ch === "E") && !seenExp && j > i) {
          seenExp = true; j++;
          if (s[j] === "+" || s[j] === "-") j++;
        } else break;
      }
      const num = parseFloat(s.slice(i, j));
      if (Number.isNaN(num)) throw new Error(`Invalid number at position ${i}`);
      tokens.push({ type: "number", value: num });
      i = j;
      continue;
    }
    // identifier (function name or constant)
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j++;
      tokens.push({ type: "ident", value: s.slice(i, j) });
      i = j;
      continue;
    }
    // operators / parens
    if ("+-*/^%".includes(c)) {
      // Unary +/-: at start, or right after another operator or an opening
      // paren. Encode as `0 <op> ...` so precedence stays explicit and the
      // recursive-descent parser handles it uniformly (e.g. -2^2 == 0 - 2^2 == -4).
      const prev = tokens[tokens.length - 1];
      const isUnary = (c === "-" || c === "+") &&
        (!prev || prev.type === "op" || prev.type === "lparen");
      if (isUnary) tokens.push({ type: "number", value: 0 });
      tokens.push({ type: "op", value: c });
      i++;
      continue;
    }
    if (c === "(") { tokens.push({ type: "lparen" }); i++; continue; }
    if (c === ")") { tokens.push({ type: "rparen" }); i++; continue; }
    if (c === ",") { tokens.push({ type: "comma" }); i++; continue; }
    throw new Error(`Unexpected character "${c}" at position ${i}`);
  }
  return tokens;
}

// Recursive-descent parser -> evaluates directly (Pratt-style for precedence)
class Parser {
  constructor(tokens) { this.tokens = tokens; this.pos = 0; }
  peek() { return this.tokens[this.pos]; }
  next() { return this.tokens[this.pos++]; }

  parse() {
    const v = this.parseExpression(0);
    if (this.pos < this.tokens.length) throw new Error("Unexpected trailing input");
    return v;
  }

  // precedence: + - (1), * / % (2), unary - (3), ^ (4 right-assoc)
  parseExpression(minPrec) {
    let left = this.parseUnary();
    while (true) {
      const t = this.peek();
      if (!t || t.type !== "op") break;
      const prec = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2, "^": 4 }[t.value];
      if (prec === undefined || prec < minPrec) break;
      this.next();
      // Right-associative (^): recurse at the SAME precedence so 2^3^2 = 2^(3^2) = 512.
      // Left-associative (+ - * / %): recurse at prec+1 so 10-3-2 = (10-3)-2.
      const rightPrec = t.value === "^" ? prec : prec + 1;
      const right = this.parseExpression(rightPrec);
      left = this.applyBinary(t.value, left, right);
    }
    return left;
  }

  parseUnary() {
    const t = this.peek();
    if (t && t.type === "op" && (t.value === "-" || t.value === "+")) {
      this.next();
      const v = this.parseUnary();
      return t.value === "-" ? -v : v;
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    const t = this.next();
    if (!t) throw new Error("Unexpected end of expression");
    if (t.type === "number") return t.value;
    if (t.type === "lparen") {
      const v = this.parseExpression(0);
      const close = this.next();
      if (!close || close.type !== "rparen") throw new Error("Missing closing parenthesis");
      return v;
    }
    if (t.type === "ident") {
      if (t.value in CONSTANTS) return CONSTANTS[t.value];
      if (t.value in FUNCTIONS) {
        const open = this.peek();
        if (!open || open.type !== "lparen") throw new Error(`Function "${t.value}" requires parentheses`);
        this.next(); // consume (
        const args = [];
        if (this.peek() && this.peek().type !== "rparen") {
          args.push(this.parseExpression(0));
          while (this.peek() && this.peek().type === "comma") {
            this.next();
            args.push(this.parseExpression(0));
          }
        }
        const close = this.next();
        if (!close || close.type !== "rparen") throw new Error(`Missing ) after function "${t.value}"`);
        return FUNCTIONS[t.value](...args);
      }
      throw new Error(`Unknown identifier "${t.value}"`);
    }
    throw new Error("Unexpected token in expression");
  }

  applyBinary(op, a, b) {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/":
        if (b === 0) throw new Error("Division by zero");
        return a / b;
      case "%":
        if (b === 0) throw new Error("Modulo by zero");
        return a % b;
      case "^": return Math.pow(a, b);
      default: throw new Error(`Unknown operator ${op}`);
    }
  }
}

export function evaluate(expression) {
  if (expression === undefined || expression === null || String(expression).trim() === "") {
    throw new Error("Empty expression");
  }
  const tokens = tokenize(expression);
  if (tokens.length === 0) throw new Error("Empty expression");
  const result = new Parser(tokens).parse();
  if (typeof result !== "number" || Number.isNaN(result) || !Number.isFinite(result)) {
    throw new Error("Expression did not evaluate to a finite number");
  }
  return result;
}

export const supportedFunctions = Object.keys(FUNCTIONS);
export const supportedConstants = Object.keys(CONSTANTS);
