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
 * type-safety-checker.mjs — PreToolUse hook for Edit/Write/MultiEdit
 *
 * Detects loose/unsafe TypeScript patterns:
 * - `any` usage without justification
 * - `as` casts that could fail at runtime
 * - Non-null assertions (!) on uncertain values
 * - Type guards without proper narrowing
 * - Generic constraints that are too loose
 *
 * FIRES ON: PreToolUse (Edit, Write, MultiEdit)
 * BLOCKING: WARN level
 */

const TYPE_ISSUES = [
  {
    id: 'any-parameter',
    pattern: /\(\s*\w+\s*:\s*any\s*[,)]/,
    message: 'Function parameter typed as `any` — loses all type safety',
    suggestion: 'Use `unknown` and narrow with type guards, or define proper type',
    severity: 'warn',
  },
  {
    id: 'any-return',
    pattern: /\)\s*:\s*any\s*[{=]/,
    message: 'Function return typed as `any` — callers lose type info',
    suggestion: 'Define explicit return type or let TypeScript infer it',
    severity: 'warn',
  },
  {
    id: 'any-variable',
    pattern: /(?:let|const|var)\s+\w+\s*:\s*any\s*=/,
    message: 'Variable explicitly typed as `any`',
    suggestion: 'Use proper type or `unknown` with type narrowing',
    severity: 'warn',
  },
  {
    id: 'double-assertion',
    pattern: /as\s+\w+\s+as\s+\w+/,
    message: 'Double type assertion (as X as Y) — usually indicates type system fight',
    suggestion: 'Fix the underlying type mismatch instead of double-casting',
    severity: 'warn',
  },
  {
    id: 'non-null-assertion-chain',
    pattern: /\w+!\.[\w!.]+!/,
    message: 'Multiple non-null assertions (!!) in chain — high crash risk',
    suggestion: 'Use optional chaining (?.) or proper null checks',
    severity: 'warn',
  },
  {
    id: 'cast-from-any',
    pattern: /\bas\s+(?!const|any)[\w<>[\]]+\s*[;,)\]}]/,
    message: 'Type assertion may hide runtime errors',
    suggestion: 'Prefer type guards (typeof, instanceof, in) for runtime safety',
    severity: 'info',
    skipIf: (code) => !code.includes(': any') && !code.includes('as any'),
  },
  {
    id: 'object-any',
    pattern: /:\s*\{\s*\[key:\s*string\]:\s*any\s*\}/,
    message: 'Object with any values — consider Record<string, unknown>',
    suggestion: 'Use Record<string, unknown> or define value type',
    severity: 'info',
  },
  {
    id: 'array-any',
    pattern: /:\s*any\s*\[\]/,
    message: 'Array of any — loses element type safety',
    suggestion: 'Define element type: string[], MyType[], unknown[]',
    severity: 'warn',
  },
  {
    id: 'promise-any',
    pattern: /Promise\s*<\s*any\s*>/,
    message: 'Promise<any> — async result type unknown',
    suggestion: 'Define the resolved value type',
    severity: 'warn',
  },
  {
    id: 'callback-any',
    pattern: /:\s*\([^)]*\)\s*=>\s*any/,
    message: 'Callback with any return — callers cannot rely on type',
    suggestion: 'Define callback signature with proper return type',
    severity: 'info',
  },
  {
    id: 'generic-any',
    pattern: /<\s*any\s*>/,
    message: 'Generic instantiated with <any>',
    suggestion: 'Provide proper type argument',
    severity: 'warn',
  },
  {
    id: 'json-parse-untyped',
    pattern: /JSON\.parse\s*\([^)]+\)(?!\s*as\s)/,
    message: 'JSON.parse returns unknown — consider type assertion or validation',
    suggestion: 'Add type assertion: JSON.parse(x) as MyType, or validate with Zod',
    severity: 'info',
  },
  {
    id: 'null-assertion-access',
    pattern: /\w+!\.\w+/,
    message: 'Non-null assertion before property access',
    suggestion: 'Use optional chaining: obj?.prop, or add null check',
    severity: 'info',
    skipIf: (code) => code.includes('if (') && code.includes('!= null'),
  },
  {
    id: 'implicit-any-catch',
    pattern: /catch\s*\(\s*(\w+)\s*\)\s*\{(?![\s\S]*:\s*\w)/,
    message: 'Catch error without type — implicitly any',
    suggestion: 'Type as unknown: catch (err: unknown) and narrow',
    severity: 'info',
  },
];

const CODE_EXTENSIONS = ['.ts', '.tsx'];

function isTypeScriptFile(filePath) {
  return CODE_EXTENSIONS.some(ext => filePath?.endsWith(ext));
}

function checkContent(content, filePath) {
  const issues = [];

  for (const rule of TYPE_ISSUES) {
    if (rule.skipIf && rule.skipIf(content, filePath)) {
      continue;
    }

    if (rule.pattern.test(content)) {
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

  if (!isTypeScriptFile(filePath)) {
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

  const issues = checkContent(content, filePath);

  if (issues.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const warns = issues.filter(i => i.severity === 'warn');
  const infos = issues.filter(i => i.severity === 'info');

  if (warns.length > 0) {
    const warnings = warns.slice(0, 5).map(w => `• [${w.id}] ${w.message}\n  → ${w.suggestion}`).join('\n');
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `TYPE SAFETY WARNING:\n${warnings}`,
      }
    }));
    return;
  }

  if (infos.length > 0) {
    const infoStr = infos.slice(0, 3).map(i => `• ${i.message}`).join('\n');
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `TYPE SAFETY NOTE:\n${infoStr}`,
      }
    }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
