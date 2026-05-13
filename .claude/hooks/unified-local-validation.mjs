#!/usr/bin/env node
// tier: T1
/**
 * unified-local-validation.mjs — PreToolUse hook for Edit/Write/MultiEdit
 *
 * LOCAL-LLM-MS0: Unified validation hook that replaces 6 disabled advisory hooks:
 * - naming-convention-enforcer.mjs (naming checks)
 * - complexity-gate.mjs (complexity checks)
 * - type-safety-checker.mjs (type checks)
 * - magic-number-detector.mjs (magic number checks)
 * - async-pattern-checker.mjs (async pattern checks)
 * - performance-pattern-detector.mjs (performance pattern checks)
 *
 * Runs validation locally using regex patterns (same as LocalValidationEngine).
 * Token savings: ~1200 tokens/edit (6 hooks @ 200 each) → 0 (local regex).
 *
 * FIRES ON: PreToolUse (Edit, Write, MultiEdit)
 * BLOCKING: WARN level (advisory only)
 */
import fs from "node:fs";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

// Validation rules - same as LocalValidationEngine
const RULES = {
  naming: [
    { id: "class-not-pascal", pattern: /class\s+([a-z][a-zA-Z0-9]*)\s*[{<(]/g, msg: "Class should be PascalCase" },
    { id: "interface-not-pascal", pattern: /interface\s+([a-z][a-zA-Z0-9]*)\s*[{<]/g, msg: "Interface should be PascalCase" },
    { id: "type-not-pascal", pattern: /type\s+([a-z][a-zA-Z0-9]*)\s*[<=]/g, msg: "Type should be PascalCase" },
    { id: "enum-not-pascal", pattern: /enum\s+([a-z][a-zA-Z0-9]*)\s*\{/g, msg: "Enum should be PascalCase" },
    { id: "generic-name", pattern: /(?:let|const|var)\s+(data|info|temp|value|obj|result)\s*[=:]/gi, msg: "Avoid generic names" },
  ],
  complexity: [
    { id: "deep-nesting", pattern: /^(\s{20,})\S/gm, msg: "Deep nesting (>4 levels)" },
  ],
  types: [
    { id: "any-type", pattern: /:\s*any\b/g, msg: "Avoid 'any' type" },
    { id: "double-assertion", pattern: /as\s+\w+\s+as\s+\w+/g, msg: "Double type assertion" },
    { id: "non-null-chain", pattern: /\w+!\.\w+!/g, msg: "Non-null assertion chain" },
    { id: "ts-ignore-bare", pattern: /@ts-ignore(?!\s*—)/g, msg: "@ts-ignore without explanation" },
  ],
  magic: [
    { id: "magic-timeout", pattern: /setTimeout\s*\(\s*[^,]+,\s*(\d{4,})\s*\)/g, msg: "Magic number in timeout" },
  ],
  patterns: [
    { id: "await-in-foreach", pattern: /\.forEach\s*\(\s*async/g, msg: "await in forEach (use for...of or Promise.all)" },
    { id: "sql-concat", pattern: /(?:SELECT|INSERT|UPDATE|DELETE).*\$\{/gi, msg: "SQL string concatenation risk" },
    // Note: ev + al pattern detection handled separately to avoid self-triggering
    { id: "innerhtml-user", pattern: /\.innerHTML\s*=.*(?:user|input|param|query)/gi, msg: "innerHTML with user input risk" },
  ],
};

// Detect dangerous ev-al usage (split to avoid self-trigger)
const EVAL_PATTERN = new RegExp("\\b" + "ev" + "al\\s*\\(", "g");

function validate(code, filePath) {
  const issues = [];
  const ext = filePath?.split(".").pop() || "";

  // Skip non-code files
  if (!["ts", "tsx", "js", "jsx", "mjs", "cjs"].includes(ext)) {
    return issues;
  }

  for (const [category, rules] of Object.entries(RULES)) {
    for (const rule of rules) {
      const matches = code.matchAll(rule.pattern);
      for (const match of matches) {
        if (rule.filter && !rule.filter(match)) continue;
        issues.push({
          category,
          id: rule.id,
          message: rule.msg,
          line: code.substring(0, match.index).split("\n").length,
        });
      }
    }
  }

  // Check for dangerous function usage
  const evalMatches = code.matchAll(EVAL_PATTERN);
  for (const match of evalMatches) {
    issues.push({
      category: "patterns",
      id: "dangerous-eval",
      message: "Dangerous function usage",
      line: code.substring(0, match.index).split("\n").length,
    });
  }

  return issues;
}

async function main() {
  const raw = readStdinSafe();
  if (!raw) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const toolName = input.tool_name || "";
  if (!["Edit", "Write", "MultiEdit"].includes(toolName)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const params = input.tool_input || {};
  const filePath = params.file_path || params.path || "";
  const code = params.content || params.new_string || "";

  if (!code || code.length < 20) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const issues = validate(code, filePath);

  if (issues.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Build advisory message (max 3 issues to save tokens)
  const topIssues = issues.slice(0, 3);
  const summary = topIssues.map(i => `L${i.line}: ${i.message}`).join("; ");
  const hookSpecificOutput = `[local-validation] ${summary}${issues.length > 3 ? ` (+${issues.length - 3} more)` : ""}`;

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput,
  }));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
