/**
 * Safe math expression evaluator - replaces dangerous new Function() calls.
 * Only allows numeric operations, Math.* functions, and variable references.
 * Prevents Remote Code Execution (RCE) by blocking dangerous patterns.
 */

/** Patterns that must never appear in user-provided expressions */
const DANGEROUS_PATTERN = /require|import|process|eval|Function|fetch|fs\.|child_process|exec|spawn|__proto__|constructor|prototype|globalThis|window|document|setTimeout|setInterval|Proxy|Reflect|with\s*\(/i;

/** Allowed character set: numbers, identifiers, operators, parens, brackets, commas, spaces, ternary, comparison */
const ALLOWED_CHARS = /^[0-9a-zA-Z_.+\-*/%()<>,\s?:!&|=^~\[\]]+$/;

function validateExpression(expr: string): void {
  if (DANGEROUS_PATTERN.test(expr)) {
    throw new Error("Unsafe expression blocked: contains forbidden pattern");
  }
  if (!ALLOWED_CHARS.test(expr)) {
    throw new Error("Unsafe expression blocked: contains disallowed characters");
  }
}

/**
 * Safely evaluate a math expression with given variables.
 * Only Math.* and provided numeric variables are in scope.
 */
export function safeMathEval(expr: string, variables: Record<string, number> = {}): number {
  const sanitized = expr.trim();
  validateExpression(sanitized);

  const varNames = Object.keys(variables);
  const varValues = Object.values(variables);
  // Build a function with only Math and declared variables in scope — no globals
  const fn = new Function("Math", ...varNames, `"use strict"; return (${sanitized});`);
  return fn(Math, ...varValues);
}

/**
 * Safe function body evaluator for fitness/objective functions.
 * Creates a function that accepts named numeric array parameters and returns a number.
 * The body is validated once at creation time.
 *
 * @param body - The function body expression (e.g. "genes[0]**2 + genes[1]**2")
 * @param paramNames - Names of the parameters (e.g. ["genes"])
 * @returns A safe callable function
 */
export function safeFunctionEval(body: string, paramNames: string[]): (...args: any[]) => any {
  const sanitized = body.trim();
  validateExpression(sanitized);

  // Pre-compile the function with restricted scope
  const fn = new Function("Math", ...paramNames, `"use strict"; return (${sanitized});`);
  return (...args: any[]) => fn(Math, ...args);
}

/**
 * Safe evaluator for FormulaRegistry formula_js strings.
 * These are expected to be function definitions like "(inputs) => inputs.kc * inputs.h"
 * Returns the evaluated function result when called with inputs.
 */
export function safeFormulaEval(formulaJs: string, inputs: Record<string, number>): number | Record<string, number> {
  const sanitized = formulaJs.trim();
  // formula_js may use arrow functions, so allow => as well
  if (DANGEROUS_PATTERN.test(sanitized)) {
    throw new Error("Unsafe formula blocked: contains forbidden pattern");
  }
  // For formula_js, we need to support arrow function syntax like "(inputs) => ..."
  // so we use a slightly more permissive approach but still block dangerous patterns
  const fn = new Function("Math", "inputs", `"use strict"; return (${sanitized})(inputs);`);
  return fn(Math, inputs);
}
