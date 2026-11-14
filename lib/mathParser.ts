type ExprNode =
  | { type: 'num'; value: number }
  | { type: 'var'; name: 'x' | 'a' | 'b' }
  | { type: 'unary'; op: '-'; arg: ExprNode }
  | { type: 'bin'; op: '+' | '-' | '*' | '/' | '^'; left: ExprNode; right: ExprNode }
  | { type: 'call'; fn: string; arg: ExprNode };

type Token =
  | { type: 'num'; value: number }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: '+' | '-' | '*' | '/' | '^' }
  | { type: 'lparen' }
  | { type: 'rparen' };

const ALLOWED_FNS = new Set([
  'sin',
  'cos',
  'tan',
  'abs',
  'sqrt',
  'exp',
  'ln',
  'log',
]);

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      const start = i;
      let dotCount = ch === '.' ? 1 : 0;
      i += 1;
      while (i < input.length && /[0-9.]/.test(input[i])) {
        if (input[i] === '.') {
          dotCount += 1;
          if (dotCount > 1) {
            throw new Error('Invalid number format');
          }
        }
        i += 1;
      }
      const numStr = input.slice(start, i);
      const val = Number(numStr);
      if (!Number.isFinite(val)) {
        throw new Error(`Invalid number "${numStr}"`);
      }
      tokens.push({ type: 'num', value: val });
      continue;
    }

    if (/[a-zA-Z]/.test(ch)) {
      const start = i;
      i += 1;
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        i += 1;
      }
      tokens.push({ type: 'ident', value: input.slice(start, i).toLowerCase() });
      continue;
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
      tokens.push({ type: 'op', value: ch });
      i += 1;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i += 1;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i += 1;
      continue;
    }

    throw new Error(`Unsupported symbol "${ch}"`);
  }

  return tokens;
}

class Parser {
  private pos = 0;
  private readonly tokens: Token[];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token | undefined {
    const tok = this.tokens[this.pos];
    this.pos += 1;
    return tok;
  }

  public parse(): ExprNode {
    if (this.tokens.length === 0) {
      throw new Error('Empty expression');
    }
    const node = this.parseAddSub();
    if (this.pos < this.tokens.length) {
      throw new Error('Unexpected trailing input');
    }
    return node;
  }

  private parseAddSub(): ExprNode {
    let left = this.parseMulDiv();
    while (true) {
      const tok = this.peek();
      if (tok?.type === 'op' && (tok.value === '+' || tok.value === '-')) {
        this.consume();
        const right = this.parseMulDiv();
        left = { type: 'bin', op: tok.value, left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parseMulDiv(): ExprNode {
    let left = this.parseUnary();
    while (true) {
      const tok = this.peek();
      if (tok?.type === 'op' && (tok.value === '*' || tok.value === '/')) {
        this.consume();
        const right = this.parseUnary();
        left = { type: 'bin', op: tok.value, left, right };
      } else if (
        tok?.type === 'ident' ||
        tok?.type === 'lparen' ||
        tok?.type === 'num'
      ) {
        // Support implicit multiplication
        const right = this.parseUnary();
        left = { type: 'bin', op: '*', left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parseUnary(): ExprNode {
    const tok = this.peek();
    if (tok?.type === 'op' && tok.value === '-') {
      this.consume();
      return { type: 'unary', op: '-', arg: this.parseUnary() };
    }
    if (tok?.type === 'op' && tok.value === '+') {
      this.consume();
      return this.parseUnary();
    }
    return this.parsePower();
  }

  private parsePower(): ExprNode {
    const base = this.parsePrimary();
    const tok = this.peek();
    if (tok?.type === 'op' && tok.value === '^') {
      this.consume();
      const exponent = this.parseUnary();
      return { type: 'bin', op: '^', left: base, right: exponent };
    }
    return base;
  }

  private parsePrimary(): ExprNode {
    const tok = this.consume();
    if (!tok) {
      throw new Error('Unexpected end of expression');
    }

    if (tok.type === 'num') {
      return { type: 'num', value: tok.value };
    }

    if (tok.type === 'lparen') {
      const inner = this.parseAddSub();
      const close = this.consume();
      if (close?.type !== 'rparen') {
        throw new Error('Missing closing parenthesis');
      }
      return inner;
    }

    if (tok.type === 'ident') {
      if (tok.value === 'x' || tok.value === 'a' || tok.value === 'b') {
        return { type: 'var', name: tok.value };
      }
      if (tok.value === 'pi') {
        return { type: 'num', value: Math.PI };
      }
      if (tok.value === 'e') {
        return { type: 'num', value: Math.E };
      }
      if (ALLOWED_FNS.has(tok.value)) {
        const next = this.consume();
        if (next?.type !== 'lparen') {
          throw new Error(`Expected "(" after ${tok.value}`);
        }
        const arg = this.parseAddSub();
        const close = this.consume();
        if (close?.type !== 'rparen') {
          throw new Error(`Expected ")" after ${tok.value} argument`);
        }
        return { type: 'call', fn: tok.value, arg };
      }
      throw new Error(`Unknown identifier "${tok.value}"`);
    }

    throw new Error('Unexpected token in expression');
  }
}

function evaluateAst(node: ExprNode, x: number, a: number, b: number): number {
  switch (node.type) {
    case 'num':
      return node.value;
    case 'var':
      return node.name === 'x' ? x : node.name === 'a' ? a : b;
    case 'unary':
      return -evaluateAst(node.arg, x, a, b);
    case 'bin': {
      const l = evaluateAst(node.left, x, a, b);
      const r = evaluateAst(node.right, x, a, b);
      switch (node.op) {
        case '+':
          return l + r;
        case '-':
          return l - r;
        case '*':
          return l * r;
        case '/':
          return r === 0 ? NaN : l / r;
        case '^':
          return Math.pow(l, r);
      }
    }
    case 'call': {
      const v = evaluateAst(node.arg, x, a, b);
      switch (node.fn) {
        case 'sin':
          return Math.sin(v);
        case 'cos':
          return Math.cos(v);
        case 'tan':
          return Math.tan(v);
        case 'abs':
          return Math.abs(v);
        case 'sqrt':
          return v < 0 ? NaN : Math.sqrt(v);
        case 'exp':
          return Math.exp(v);
        case 'ln':
          return v <= 0 ? NaN : Math.log(v);
        case 'log':
          return v <= 0 ? NaN : Math.log10(v);
        default:
          return NaN;
      }
    }
  }
}

export function compileMathExpression(raw: string): {
  evaluate: ((x: number, a: number, b: number) => number) | null;
  error: string | null;
} {
  const cleaned = raw.trim().replace(/^y\s*=\s*/i, '');
  if (!cleaned) {
    return { evaluate: null, error: null };
  }
  try {
    const tokens = tokenize(cleaned);
    const ast = new Parser(tokens).parse();
    return {
      evaluate: (x, a, b) => evaluateAst(ast, x, a, b),
      error: null,
    };
  } catch (err) {
    return {
      evaluate: null,
      error: err instanceof Error ? err.message : 'Invalid expression',
    };
  }
}
