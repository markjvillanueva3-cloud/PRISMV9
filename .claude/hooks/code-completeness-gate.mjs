#!/usr/bin/env node
// tier: T0
/**
 * code-completeness-gate.mjs — PreToolUse hook for Edit/Write
 *
 * Hard-blocks incomplete code patterns that a master coder would never ship:
 * - TODO/FIXME comments
 * - Empty catch blocks
 * - Placeholder returns
 * - Magic numbers without explanation
 * - Console.log debugging left in
 * - Commented-out code blocks
 * - Stub test assertions
 *
 * FIRES ON: PreToolUse (Edit, Write, MultiEdit)
 * BLOCKING: YES — returns deny on violations
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

// Patterns that indicate incomplete code
const BLOCKERS = [
  {
    pattern: /\/\/\s*TODO(?!.*\[TRACKED\])/i,
    message: 'TODO comment without [TRACKED] tag — complete the work or create a tracked issue',
    severity: 'block',
  },
  {
    pattern: /\/\/\s*FIXME/i,
    message: 'FIXME comment — fix it now, don\'t defer',
    severity: 'block',
  },
  {
    pattern: /\/\/\s*HACK/i,
    message: 'HACK comment — implement properly or document why hack is necessary',
    severity: 'warn',
  },
  {
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/,
    message: 'Empty catch block — handle the error or explicitly ignore with comment',
    severity: 'block',
  },
  {
    pattern: /catch\s*\([^)]*\)\s*\{\s*\/\/\s*ignore/i,
    message: 'Catch with just "ignore" comment — explain WHY it\'s safe to ignore',
    severity: 'warn',
  },
  {
    pattern: /return\s+['"]placeholder['"]/i,
    message: 'Placeholder return value — implement real logic',
    severity: 'block',
  },
  {
    pattern: /throw\s+new\s+Error\s*\(\s*['"]not\s+implemented['"]/i,
    message: '"Not implemented" error — implement it now',
    severity: 'block',
  },
  {
    pattern: /throw\s+new\s+Error\s*\(\s*['"]TODO['"]/i,
    message: 'TODO error — implement the function',
    severity: 'block',
  },
  {
    pattern: /console\.log\s*\(\s*['"]debug/i,
    message: 'Debug console.log — remove before shipping',
    severity: 'block',
  },
  {
    pattern: /console\.log\s*\(\s*['"]test/i,
    message: 'Test console.log — remove before shipping',
    severity: 'block',
  },
  {
    // SLOT-DRIFT-FIX-MS0/U-SDF10 (2026-05-17): bumped threshold 4 -> 8 lines.
    // The 4-line threshold falsely flagged every multi-line explanatory
    // comment block (my own commit headers, doctrine pointers, ENG docs)
    // as "commented-out code". 8+ consecutive comment lines is a much
    // stronger signal of actual code that got commented out (which tends
    // to be larger blocks). Explanatory prose rarely exceeds 7 lines.
    // The hook still catches the real anti-pattern (commenting code
    // instead of deleting it) — just no longer fires on doc comments.
    pattern: /^\s*\/\/[^\n]*(?:\n\s*\/\/[^\n]*){7,}/m,
    message: 'Large commented-out code block — delete it (git has history)',
    severity: 'warn',
  },
  {
    pattern: /=\s*(?:42|123|999|1000|9999)\s*[;,)]/,
    message: 'Magic number — extract to named constant with explanation',
    severity: 'warn',
  },
  {
    pattern: /expect\s*\([^)]+\)\s*\.\s*toBeDefined\s*\(\s*\)\s*;?\s*$/m,
    message: 'Weak assertion (toBeDefined only) — assert actual expected value',
    severity: 'block',
  },
  {
    pattern: /expect\s*\(\s*true\s*\)\s*\.\s*toBe\s*\(\s*true\s*\)/,
    message: 'Tautological assertion (true === true) — test real behavior',
    severity: 'block',
  },
  {
    pattern: /expect\s*\(\s*1\s*\)\s*\.\s*toBe\s*\(\s*1\s*\)/,
    message: 'Tautological assertion (1 === 1) — test real behavior',
    severity: 'block',
  },
  {
    pattern: /it\.skip\s*\(/,
    message: 'Skipped test — fix it or delete it',
    severity: 'block',
  },
  {
    pattern: /describe\.skip\s*\(/,
    message: 'Skipped test suite — fix it or delete it',
    severity: 'block',
  },
  {
    pattern: /test\.skip\s*\(/,
    message: 'Skipped test — fix it or delete it',
    severity: 'block',
  },
  {
    pattern: /\.only\s*\(/,
    message: '.only() left in — remove before committing',
    severity: 'block',
  },
  {
    pattern: /any\s+as\s+any/,
    message: '"any as any" type escape — fix the types properly',
    severity: 'warn',
  },
  {
    pattern: /@ts-ignore(?!\s+—)/,
    message: '@ts-ignore without explanation — fix types or document why',
    severity: 'warn',
  },
  {
    pattern: /eslint-disable(?!.*—)/,
    message: 'eslint-disable without explanation — fix the issue or document why',
    severity: 'warn',
  },
];

// File types to check
const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const TEST_PATTERNS = ['test.', 'spec.', '__tests__'];

function isCodeFile(filePath) {
  return CODE_EXTENSIONS.some(ext => filePath.endsWith(ext));
}

function isTestFile(filePath) {
  return TEST_PATTERNS.some(p => filePath.includes(p));
}

function checkContent(content, filePath) {
  const violations = [];
  const isTest = isTestFile(filePath);

  for (const rule of BLOCKERS) {
    // Skip test-specific rules for non-test files
    if (!isTest && (rule.message.includes('assertion') || rule.message.includes('test'))) {
      continue;
    }

    if (rule.pattern.test(content)) {
      violations.push({
        severity: rule.severity,
        message: rule.message,
      });
    }
  }

  return violations;
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

  // Only check Edit/Write/MultiEdit
  if (!['Edit', 'Write', 'MultiEdit'].includes(toolName)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const filePath = toolInput.file_path || toolInput.filePath || '';

  // Only check code files
  if (!isCodeFile(filePath)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Get content to check
  let content = '';
  if (toolName === 'Write') {
    content = toolInput.content || '';
  } else if (toolName === 'Edit') {
    content = toolInput.new_string || toolInput.newString || '';
  } else if (toolName === 'MultiEdit') {
    content = (toolInput.edits || []).map(e => e.new_string || e.newString || '').join('\n');
  }

  if (!content) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const violations = checkContent(content, filePath);

  if (violations.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const blocks = violations.filter(v => v.severity === 'block');
  const warns = violations.filter(v => v.severity === 'warn');

  if (blocks.length > 0) {
    // Hard block — PreToolUse contract is {decision:"block", reason:"..."}.
    // {continue:false, message:} is silently dropped (tool proceeds anyway).
    const reasons = blocks.map(b => `• ${b.message}`).join('\n');
    console.log(JSON.stringify({
      decision: "block",
      reason: `CODE COMPLETENESS GATE — BLOCKED\n\nMaster coders don't ship:\n${reasons}\n\nFix these issues before writing.`,
    }));
    return;
  }

  if (warns.length > 0) {
    // Warn but allow
    const warnings = warns.map(w => `• ${w.message}`).join('\n');
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `CODE COMPLETENESS WARNING:\n${warnings}`,
      }
    }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
