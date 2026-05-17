#!/usr/bin/env node
// tier: T1
import fs from "node:fs";


function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}
// RE-ENABLED 2026-04-27 by user approval (RESUME_AT_WORK section 5).
/**
 * magic-number-detector.mjs — PreToolUse hook for Edit/Write/MultiEdit
 *
 * Detects unexplained numeric literals (magic numbers):
 * - Numbers that aren't 0, 1, -1, 2, or common constants
 * - Numbers used in comparisons, array indices, or calculations
 * - Suggests extracting to named constants
 *
 * FIRES ON: PreToolUse (Edit, Write, MultiEdit)
 * BLOCKING: never (INFO level)
 */

const ALLOWED_NUMBERS = new Set([
  '0', '1', '-1', '2', '-2',
  '100', '1000', '1024', '2048', '4096',
  '60', '24', '365', '7',
  '255', '256', '512',
  '0.5', '0.25', '0.75',
  '3.14159', '2.71828',
  '200', '201', '204', '301', '302', '304', '400', '401', '403', '404', '500', '502', '503',
]);

const MAGIC_NUMBER_PATTERNS = [
  {
    id: 'comparison-magic',
    pattern: /[<>=!]=?\s*(\d+\.?\d*)/g,
    message: (num) => `Magic number ${num} in comparison`,
    suggestion: 'Extract to named constant: const MAX_ITEMS = X',
    skipNumbers: ALLOWED_NUMBERS,
  },
  {
    id: 'array-index-magic',
    pattern: /\[(\d+)\]/g,
    message: (num) => `Magic index [${num}] in array access`,
    suggestion: 'Use named constant or destructuring: const [first, second] = arr',
    skipNumbers: new Set(['0', '1', '-1']),
  },
  {
    id: 'timeout-magic',
    pattern: /(?:setTimeout|setInterval|delay|sleep)\s*\([^,]+,\s*(\d+)/g,
    message: (num) => `Magic timeout ${num}ms`,
    suggestion: 'Extract to constant: const DEBOUNCE_MS = 300',
    skipNumbers: new Set(['0', '1000']),
  },
  {
    id: 'retry-magic',
    pattern: /(?:retry|attempts|tries|maxRetries)\s*[=:]\s*(\d+)/gi,
    message: (num) => `Magic retry count ${num}`,
    suggestion: 'Extract to constant: const MAX_RETRIES = 3',
    skipNumbers: new Set(['0', '1', '3', '5']),
  },
  {
    id: 'calculation-magic',
    pattern: /[+\-*/]\s*(\d+\.?\d*)/g,
    message: (num) => `Magic number ${num} in calculation`,
    suggestion: 'Consider extracting to named constant for clarity',
    skipNumbers: ALLOWED_NUMBERS,
  },
  {
    id: 'threshold-magic',
    pattern: /(?:threshold|limit|max|min|cap|floor|ceiling)\s*[=:]\s*(\d+\.?\d*)/gi,
    message: (num) => `Magic threshold ${num}`,
    suggestion: 'Document the business reason for this value',
    skipNumbers: new Set(['0', '1', '100', '1000']),
  },
];

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

function isCodeFile(filePath) {
  return CODE_EXTENSIONS.some(ext => filePath?.endsWith(ext));
}

// SLOT-DRIFT-FIX-MS0/U-SDF09 (2026-05-17): strip noise that the magic-number
// regex falsely matches as numbers. Without this, every comment containing a
// date (e.g. "2026-05-17") fires ~3 magic-number warnings per Edit (the `-05`
// and `-17` match `[+\-*/]\s*\d+`). Across an autonomous /loop session this
// emits hundreds of false-positive system-reminders, burning ~500B per Edit
// of context for ZERO actionable signal. Strip:
//   1. Line comments (// to end of line)
//   2. Block comments (/* ... */)
//   3. String literals ("...", '...', `...` — including multi-line backticks)
//   4. ISO date patterns (\d{4}-\d{2}-\d{2})
// Real code outside these contexts is what we actually want to scan.
export function stripNoiseForScan(content) {
  if (typeof content !== "string" || content.length === 0) return "";
  let s = content;
  // Order matters: strip block comments before strings (block-comment delimiters
  // are not valid inside strings, but a string containing "/*" would be misread
  // if we did it the other way around).
  s = s.replace(/\/\*[\s\S]*?\*\//g, " ");
  // Line comments — but only //, NOT URLs like https://. Look for // NOT
  // preceded by ":" or "/" (already handled by block strip).
  s = s.replace(/(^|[^:\/])\/\/[^\n]*/g, "$1");
  // Strings (greedy-safe per-line — multi-line backtick template literals
  // get \s\S treatment).
  s = s.replace(/`[\s\S]*?`/g, " ");
  s = s.replace(/"(?:[^"\\]|\\.)*"/g, " ");
  s = s.replace(/'(?:[^'\\]|\\.)*'/g, " ");
  // ISO dates — leave nothing scannable
  s = s.replace(/\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/g, " ");
  return s;
}

function checkContent(content) {
  const issues = [];
  const seen = new Set();
  // U-SDF09: scan the noise-stripped content, not raw — kills date+comment
  // false-positives that dominated Edit-stream noise.
  const scanContent = stripNoiseForScan(content);

  for (const rule of MAGIC_NUMBER_PATTERNS) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);

    for (const match of scanContent.matchAll(regex)) {
      const num = match[1];

      if (rule.skipNumbers?.has(num)) continue;

      const key = `${rule.id}:${num}`;
      if (seen.has(key)) continue;
      seen.add(key);

      issues.push({
        id: rule.id,
        severity: 'info',
        message: rule.message(num),
        suggestion: rule.suggestion,
      });
    }
  }

  return issues;
}

async function main() {
  const input = readStdinSafe();
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const toolName = payload.tool_name || payload.toolName || '';
  const toolInput = payload.tool_input || payload.toolInput || {};

  if (!['Edit', 'Write', 'MultiEdit'].includes(toolName)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const filePath = toolInput.file_path || toolInput.filePath || '';

  if (!isCodeFile(filePath)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  let content = '';
  if (toolName === 'Write') {
    content = toolInput.content || '';
  } else if (toolName === 'Edit') {
    content = toolInput.new_string || toolInput.newString || '';
  } else if (toolName === 'MultiEdit') {
    content = (toolInput.edits || []).map(e => e.new_string || e.newString || '').join('\n');
  }

  if (!content || content.length < 20) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const issues = checkContent(content);

  if (issues.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  if (issues.length >= 3) {
    const noteStr = issues.slice(0, 4).map(i => `• ${i.message}`).join('\n');
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `MAGIC NUMBER NOTE:\n${noteStr}\n→ ${issues[0].suggestion}`,
      }
    }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
