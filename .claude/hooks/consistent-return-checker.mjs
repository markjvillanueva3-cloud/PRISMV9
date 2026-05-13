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
 * consistent-return-checker.mjs — PreToolUse hook for Edit/Write/MultiEdit
 *
 * Detects inconsistent return patterns:
 * - Functions with mixed explicit return and implicit undefined
 * - Functions returning different types in different branches
 * - Missing return in if branches
 * - Void return in functions that return values
 *
 * FIRES ON: PreToolUse (Edit, Write, MultiEdit)
 * BLOCKING: WARN level
 */

const RETURN_ISSUES = [
  {
    id: 'mixed-return',
    pattern: /function\s+\w+[^{]*\{[^}]*return\s+\w+[^}]*\n\s*\}(?!\s*;)/s,
    check: (code) => {
      const match = code.match(/function\s+\w+[^{]*\{([^}]+)\}/s);
      if (!match) return null;
      const body = match[1];
      const hasExplicitReturn = /return\s+[^;]+;/.test(body);
      const hasImplicitReturn = /\n\s*\}$/.test(body) && !body.trim().endsWith('return;') && !body.trim().endsWith('return');
      if (hasExplicitReturn && hasImplicitReturn) {
        return 'Function mixes explicit return with implicit undefined';
      }
      return null;
    },
    suggestion: 'Ensure all code paths explicitly return or mark as void',
    severity: 'warn',
  },
  {
    id: 'missing-else-return',
    pattern: /if\s*\([^)]+\)\s*\{[^}]*return\s+[^}]+\}(?!\s*else)/,
    message: 'if returns but no else — consider adding else return or guard clause',
    suggestion: 'Either add else { return ... } or restructure as guard clause',
    severity: 'info',
  },
  {
    id: 'return-undefined-explicit',
    pattern: /return\s+undefined\s*;/,
    message: 'Explicit return undefined — just use return;',
    suggestion: 'Simplify to: return;',
    severity: 'info',
  },
  {
    id: 'void-return-value',
    pattern: /:\s*void[^{]*\{[^}]*return\s+[^;}\s]+/,
    message: 'Void function returning a value',
    suggestion: 'Either change return type or remove the returned value',
    severity: 'warn',
  },
  {
    id: 'unreachable-after-return',
    pattern: /return\s+[^;]+;\s*[a-zA-Z]/,
    message: 'Code after return statement — unreachable',
    suggestion: 'Remove unreachable code or restructure logic',
    severity: 'warn',
  },
  {
    id: 'early-return-inverted',
    pattern: /if\s*\([^)]+\)\s*\{[^}]{100,}\}\s*else\s*\{\s*return/s,
    message: 'Long if block with short else return — consider inverting',
    suggestion: 'Flip condition for early return: if (!cond) { return; } // main logic',
    severity: 'info',
  },
  {
    id: 'nested-ternary-return',
    pattern: /return\s+[^?]+\?[^:]+:[^?]+\?[^:]+:/,
    message: 'Nested ternary in return — hard to read',
    suggestion: 'Extract to if/else or separate variable assignments',
    severity: 'info',
  },
  {
    id: 'return-assignment',
    pattern: /return\s+\w+\s*=[^=]/,
    message: 'Assignment in return statement — likely a bug',
    suggestion: 'Did you mean === for comparison?',
    severity: 'warn',
  },
];

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

function isCodeFile(filePath) {
  return CODE_EXTENSIONS.some(ext => filePath?.endsWith(ext));
}

function checkContent(content) {
  const issues = [];

  for (const rule of RETURN_ISSUES) {
    if (rule.check) {
      const result = rule.check(content);
      if (result) {
        issues.push({
          id: rule.id,
          severity: rule.severity,
          message: result,
          suggestion: rule.suggestion,
        });
      }
    } else if (rule.pattern.test(content)) {
      issues.push({
        id: rule.id,
        severity: rule.severity,
        message: rule.message,
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

  const warns = issues.filter(i => i.severity === 'warn');
  const infos = issues.filter(i => i.severity === 'info');

  if (warns.length > 0) {
    const warnings = warns.slice(0, 3).map(w => `• [${w.id}] ${w.message}\n  → ${w.suggestion}`).join('\n');
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `RETURN PATTERN WARNING:\n${warnings}`,
      }
    }));
    return;
  }

  if (infos.length >= 2) {
    const infoStr = infos.slice(0, 3).map(i => `• ${i.message}`).join('\n');
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `RETURN PATTERN NOTE:\n${infoStr}`,
      }
    }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
