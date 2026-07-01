/**
 * Safe Expression Evaluator — sandboxed arithmetic expression compiler
 *
 * Compiles an arithmetic expression STRING into a pure `(scope) => number`
 * closure WITHOUT `eval` or the `Function` constructor. This is the
 * security-reviewed bridge identified in
 * `state/shared/specs/U-COURSE-FORGE-DISPATCHER-WIRING-DESIGN.md` (Option A):
 * it lets closure-input numerical primitives (GradientDescent's objective,
 * ODEIntegrator's derivative, LagrangianMechanics' Lagrangian, …) be driven
 * from JSON dispatcher params — the params carry expression strings, this
 * module turns them into the closures those algorithms need.
 *
 * Pipeline:  source string → tokenizer → recursive-descent parser → AST
 *            → `evaluate(scope)` tree-walk.
 *
 * Grammar (precedence low → high):
 *   expression := term      (('+' | '-') term)*
 *   term       := power     (('*' | '/' | '%') power)*
 *   power      := unary     ('^' unary)*              -- right-associative
 *   unary      := ('-' | '+') unary | primary
 *   primary    := number | constant | funcall | varref | '(' expression ')'
 *   varref     := ident | ident '[' expression ']'   -- array index for vector vars
 *   funcall    := ident '(' (expression (',' expression)*)? ')'
 *
 * SECURITY (this is a P0 surface — see the adversarial test suite):
 *   - NO `eval`, NO `Function`, NO `with`. The AST is walked by hand.
 *   - Every identifier MUST resolve to an allowed variable, a whitelisted
 *     constant, or a whitelisted math function — anything else throws at
 *     COMPILE time.
 *   - Reserved/dangerous names (constructor, __proto__, prototype, process,
 *     require, eval, Function, global, globalThis, import) are hard-rejected
 *     even if a caller foolishly lists them as an allowed variable.
 *   - Source length is capped (MAX_SOURCE_LEN); parser recursion is depth-
 *     capped (MAX_DEPTH) — both DoS guards.
 *   - The only member access permitted is numeric `[index]` on a vector
 *     variable; there is no `.property` access in the grammar at all.
 *
 * KNOWLEDGE-CONVERSION-MS0/U-COURSE-FORGE-EXPR: Created 2026-05-17. The
 * keystone enabling Option A of the dispatcher-wiring design — and a
 * reusable primitive (safe formula evaluation is broadly applicable:
 * user-supplied objectives, manufactured test solutions, config formulas).
 *
 * @module algorithms/SafeExpressionEvaluator
 */

// ─── public types ──────────────────────────────────────────────────

/** Variable scope: a name maps to a scalar or a numeric vector. */
export type ExprScope = Record<string, number | readonly number[]>;

/** A compiled expression — `evaluate` is a pure closure, reusable. */
export interface CompiledExpression {
  /** Evaluate against a variable scope. Throws on missing var / bad index. */
  evaluate: (scope: ExprScope) => number;
  /** The original source (for diagnostics). */
  source: string;
  /** Variable names referenced by the expression (subset of allowedVars). */
  referencedVars: string[];
}

// ─── limits + whitelists ───────────────────────────────────────────

const MAX_SOURCE_LEN = 4096;
const MAX_DEPTH = 128;

/** Names that may NEVER be used as identifiers, even if caller-allowed. */
const FORBIDDEN_NAMES = new Set([
  "constructor", "__proto__", "prototype", "process", "require",
  "eval", "Function", "global", "globalThis", "import", "module",
  "exports", "this", "arguments", "window", "self",
]);

/** Whitelisted nullary constants. */
const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  tau: 2 * Math.PI,
};

/** Whitelisted unary math functions. */
const UNARY_FNS: Record<string, (x: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  exp: Math.exp, log: Math.log, log10: Math.log10, log2: Math.log2,
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
  floor: Math.floor, ceil: Math.ceil, round: Math.round,
  sign: Math.sign, trunc: Math.trunc,
};

/** Whitelisted binary math functions. */
const BINARY_FNS: Record<string, (a: number, b: number) => number> = {
  pow: Math.pow,
  atan2: Math.atan2,
  min: Math.min,
  max: Math.max,
  hypot: Math.hypot,
  mod: (a, b) => a % b,
};

// ─── tokenizer ─────────────────────────────────────────────────────

type TokKind = "num" | "ident" | "op" | "lparen" | "rparen" | "lbracket" | "rbracket" | "comma";
interface Token {
  kind: TokKind;
  value: string;
  pos: number;
}

function tokenize(src: string): Token[] {
  const toks: Token[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i += 1;
      continue;
    }
    // number: digits with optional decimal + exponent
    if ((ch >= "0" && ch <= "9") || (ch === "." && src[i + 1] >= "0" && src[i + 1] <= "9")) {
      let j = i;
      while (j < n && ((src[j] >= "0" && src[j] <= "9") || src[j] === ".")) j += 1;
      // exponent
      if (j < n && (src[j] === "e" || src[j] === "E")) {
        let k = j + 1;
        if (k < n && (src[k] === "+" || src[k] === "-")) k += 1;
        if (k < n && src[k] >= "0" && src[k] <= "9") {
          while (k < n && src[k] >= "0" && src[k] <= "9") k += 1;
          j = k;
        }
      }
      const text = src.slice(i, j);
      if (!Number.isFinite(Number(text))) {
        throw new SyntaxError(`Malformed number "${text}" at position ${i}`);
      }
      toks.push({ kind: "num", value: text, pos: i });
      i = j;
      continue;
    }
    // identifier: letter/underscore then alphanumerics/underscore
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_") {
      let j = i;
      while (
        j < n &&
        ((src[j] >= "a" && src[j] <= "z") ||
          (src[j] >= "A" && src[j] <= "Z") ||
          (src[j] >= "0" && src[j] <= "9") ||
          src[j] === "_")
      ) {
        j += 1;
      }
      toks.push({ kind: "ident", value: src.slice(i, j), pos: i });
      i = j;
      continue;
    }
    // operators + punctuation
    if ("+-*/%^".includes(ch)) {
      toks.push({ kind: "op", value: ch, pos: i });
      i += 1;
      continue;
    }
    if (ch === "(") { toks.push({ kind: "lparen", value: ch, pos: i }); i += 1; continue; }
    if (ch === ")") { toks.push({ kind: "rparen", value: ch, pos: i }); i += 1; continue; }
    if (ch === "[") { toks.push({ kind: "lbracket", value: ch, pos: i }); i += 1; continue; }
    if (ch === "]") { toks.push({ kind: "rbracket", value: ch, pos: i }); i += 1; continue; }
    if (ch === ",") { toks.push({ kind: "comma", value: ch, pos: i }); i += 1; continue; }
    throw new SyntaxError(`Unexpected character "${ch}" at position ${i}`);
  }
  return toks;
}

// ─── AST ───────────────────────────────────────────────────────────

type Node =
  | { t: "num"; v: number }
  | { t: "const"; name: string }
  | { t: "var"; name: string }
  | { t: "index"; name: string; idx: Node }
  | { t: "unary"; op: "-" | "+"; arg: Node }
  | { t: "binop"; op: string; l: Node; r: Node }
  | { t: "ufn"; name: string; arg: Node }
  | { t: "bfn"; name: string; a: Node; b: Node };

// ─── parser (recursive descent) ────────────────────────────────────

class Parser {
  private toks: Token[];
  private pos = 0;
  private depth = 0;
  private allowed: Set<string>;
  readonly referenced = new Set<string>();

  constructor(toks: Token[], allowedVars: Set<string>) {
    this.toks = toks;
    this.allowed = allowedVars;
  }

  private peek(): Token | undefined {
    return this.toks[this.pos];
  }
  private next(): Token {
    const t = this.toks[this.pos];
    if (!t) throw new SyntaxError("Unexpected end of expression");
    this.pos += 1;
    return t;
  }
  private expect(kind: TokKind): Token {
    const t = this.next();
    if (t.kind !== kind) {
      throw new SyntaxError(`Expected ${kind} but got "${t.value}" at position ${t.pos}`);
    }
    return t;
  }
  private enter(): void {
    this.depth += 1;
    if (this.depth > MAX_DEPTH) {
      throw new SyntaxError(`Expression nesting exceeds max depth ${MAX_DEPTH}`);
    }
  }
  private leave(): void {
    this.depth -= 1;
  }

  parse(): Node {
    if (this.toks.length === 0) throw new SyntaxError("Empty expression");
    const node = this.expression();
    if (this.pos !== this.toks.length) {
      const t = this.toks[this.pos];
      throw new SyntaxError(`Unexpected trailing token "${t.value}" at position ${t.pos}`);
    }
    return node;
  }

  // expression := term (('+'|'-') term)*
  private expression(): Node {
    this.enter();
    let left = this.term();
    for (;;) {
      const t = this.peek();
      if (t && t.kind === "op" && (t.value === "+" || t.value === "-")) {
        this.next();
        left = { t: "binop", op: t.value, l: left, r: this.term() };
      } else break;
    }
    this.leave();
    return left;
  }

  // term := power (('*'|'/'|'%') power)*
  private term(): Node {
    let left = this.power();
    for (;;) {
      const t = this.peek();
      if (t && t.kind === "op" && (t.value === "*" || t.value === "/" || t.value === "%")) {
        this.next();
        left = { t: "binop", op: t.value, l: left, r: this.power() };
      } else break;
    }
    return left;
  }

  // power := unary ('^' unary)*  -- right-associative
  private power(): Node {
    const base = this.unary();
    const t = this.peek();
    if (t && t.kind === "op" && t.value === "^") {
      this.next();
      return { t: "binop", op: "^", l: base, r: this.power() };
    }
    return base;
  }

  // unary := ('-'|'+') unary | primary
  private unary(): Node {
    const t = this.peek();
    if (t && t.kind === "op" && (t.value === "-" || t.value === "+")) {
      this.next();
      return { t: "unary", op: t.value as "-" | "+", arg: this.unary() };
    }
    return this.primary();
  }

  // primary := number | '(' expr ')' | ident-driven (const|fn|var|index)
  private primary(): Node {
    const t = this.next();
    if (t.kind === "num") return { t: "num", v: Number(t.value) };
    if (t.kind === "lparen") {
      const e = this.expression();
      this.expect("rparen");
      return e;
    }
    if (t.kind === "ident") return this.identDriven(t);
    throw new SyntaxError(`Unexpected token "${t.value}" at position ${t.pos}`);
  }

  private identDriven(idTok: Token): Node {
    const name = idTok.value;
    if (FORBIDDEN_NAMES.has(name)) {
      throw new SyntaxError(`Forbidden identifier "${name}" at position ${idTok.pos}`);
    }
    const after = this.peek();

    // function call: ident '(' args ')'
    if (after && after.kind === "lparen") {
      this.next(); // consume '('
      const args: Node[] = [];
      if (this.peek() && this.peek()!.kind !== "rparen") {
        args.push(this.expression());
        while (this.peek() && this.peek()!.kind === "comma") {
          this.next();
          args.push(this.expression());
        }
      }
      this.expect("rparen");
      if (args.length === 1 && name in UNARY_FNS) {
        return { t: "ufn", name, arg: args[0] };
      }
      if (args.length === 2 && name in BINARY_FNS) {
        return { t: "bfn", name, a: args[0], b: args[1] };
      }
      throw new SyntaxError(
        `Unknown or wrong-arity function "${name}/${args.length}" at position ${idTok.pos}`,
      );
    }

    // array index: ident '[' expr ']'
    if (after && after.kind === "lbracket") {
      if (!this.allowed.has(name)) {
        throw new SyntaxError(`Unknown variable "${name}" at position ${idTok.pos}`);
      }
      this.next(); // consume '['
      const idx = this.expression();
      this.expect("rbracket");
      this.referenced.add(name);
      return { t: "index", name, idx };
    }

    // bare constant
    if (name in CONSTANTS) return { t: "const", name };

    // bare variable
    if (this.allowed.has(name)) {
      this.referenced.add(name);
      return { t: "var", name };
    }
    throw new SyntaxError(`Unknown identifier "${name}" at position ${idTok.pos}`);
  }
}

// ─── evaluator (AST tree-walk) ─────────────────────────────────────

function evalNode(node: Node, scope: ExprScope): number {
  switch (node.t) {
    case "num":
      return node.v;
    case "const":
      return CONSTANTS[node.name];
    case "var": {
      const v = scope[node.name];
      if (v === undefined) throw new Error(`Variable "${node.name}" not in scope`);
      if (typeof v !== "number") {
        throw new Error(`Variable "${node.name}" is a vector — use ${node.name}[i]`);
      }
      if (!Number.isFinite(v)) throw new Error(`Variable "${node.name}" is non-finite`);
      return v;
    }
    case "index": {
      const v = scope[node.name];
      if (v === undefined) throw new Error(`Variable "${node.name}" not in scope`);
      if (typeof v === "number") {
        throw new Error(`Variable "${node.name}" is a scalar — cannot index it`);
      }
      const i = evalNode(node.idx, scope);
      if (!Number.isInteger(i) || i < 0 || i >= v.length) {
        throw new Error(`Index ${i} out of range for "${node.name}" (length ${v.length})`);
      }
      return v[i];
    }
    case "unary": {
      const a = evalNode(node.arg, scope);
      return node.op === "-" ? -a : a;
    }
    case "binop": {
      const l = evalNode(node.l, scope);
      const r = evalNode(node.r, scope);
      switch (node.op) {
        case "+": return l + r;
        case "-": return l - r;
        case "*": return l * r;
        case "/": return l / r;
        case "%": return l % r;
        case "^": return Math.pow(l, r);
        default: throw new Error(`Unknown operator "${node.op}"`);
      }
    }
    case "ufn":
      return UNARY_FNS[node.name](evalNode(node.arg, scope));
    case "bfn":
      return BINARY_FNS[node.name](evalNode(node.a, scope), evalNode(node.b, scope));
    default: {
      // exhaustiveness guard
      const _never: never = node;
      throw new Error(`Unknown AST node: ${JSON.stringify(_never)}`);
    }
  }
}

// ─── public API ────────────────────────────────────────────────────

/**
 * Compile an arithmetic expression string into a reusable pure closure.
 *
 * @param source     the expression, e.g. "-1.0*y[0] - 0.5*y[1] + sin(t)"
 * @param allowedVars variable names the expression may reference (e.g. ["y","t"])
 * @returns a CompiledExpression whose `evaluate(scope)` is a pure function
 * @throws SyntaxError on any parse / whitelist / arity / forbidden-name error
 *
 * @example
 *   const ex = compileExpression("-k*x", ["k", "x"]);
 *   ex.evaluate({ k: 2, x: 3 });   // → -6
 */
export function compileExpression(source: string, allowedVars: readonly string[]): CompiledExpression {
  if (typeof source !== "string") {
    throw new SyntaxError("Expression source must be a string");
  }
  if (source.length === 0 || source.trim().length === 0) {
    throw new SyntaxError("Expression source is empty");
  }
  if (source.length > MAX_SOURCE_LEN) {
    throw new SyntaxError(`Expression exceeds max length ${MAX_SOURCE_LEN}`);
  }
  if (!Array.isArray(allowedVars)) {
    throw new SyntaxError("allowedVars must be an array of strings");
  }
  const allowed = new Set<string>();
  for (const v of allowedVars) {
    if (typeof v !== "string" || v.length === 0) {
      throw new SyntaxError("Each allowed variable must be a non-empty string");
    }
    if (FORBIDDEN_NAMES.has(v)) {
      throw new SyntaxError(`Variable name "${v}" is forbidden`);
    }
    if (v in CONSTANTS || v in UNARY_FNS || v in BINARY_FNS) {
      throw new SyntaxError(`Variable name "${v}" collides with a reserved constant/function`);
    }
    allowed.add(v);
  }

  const tokens = tokenize(source);
  const parser = new Parser(tokens, allowed);
  const ast = parser.parse();
  const referencedVars = Array.from(parser.referenced);

  return {
    source,
    referencedVars,
    evaluate: (scope: ExprScope): number => {
      if (!scope || typeof scope !== "object") {
        throw new Error("evaluate() requires a scope object");
      }
      const result = evalNode(ast, scope);
      if (typeof result !== "number") {
        throw new Error("Expression did not evaluate to a number");
      }
      return result;
    },
  };
}

/**
 * Convenience: compile a scalar-valued expression of a single vector variable
 * into the `(x: readonly number[]) => number` shape that GradientDescent's
 * ObjectiveFn expects.
 *
 * @example
 *   const f = compileObjective("x[0]^2 + x[1]^2", "x");  // a paraboloid
 *   f([3, 4]);  // → 25
 */
export function compileObjective(
  source: string,
  vectorVarName = "x",
): (x: readonly number[]) => number {
  const compiled = compileExpression(source, [vectorVarName]);
  return (x: readonly number[]): number => compiled.evaluate({ [vectorVarName]: x });
}
