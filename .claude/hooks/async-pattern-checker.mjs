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
 * async-pattern-checker.mjs — PreToolUse hook for Edit/Write/MultiEdit
 *
 * Detects async/await anti-patterns:
 * - await in forEach (doesn't wait)
 * - Promise without catch
 * - async function without try-catch
 * - .then() chains that could be await
 * - Return await (usually unnecessary)
 * - Missing await on async call
 *
 * FIRES ON: PreToolUse (Edit, Write, MultiEdit)
 * BLOCKING: WARN level
 */

const ASYNC_ISSUES = [
  {
    id: 'await-in-foreach',
    pattern: /\.forEach\s*\(\s*async\s*\(/,
    message: 'await in forEach does not wait — use for...of or Promise.all',
    suggestion: 'for (const item of items) { await process(item); } OR await Promise.all(items.map(...))',
    severity: 'warn',
  },
  {
    id: 'promise-no-catch',
    pattern: /new\s+Promise\s*\([^)]*\)(?![\s\S]*\.catch)/,
    message: 'Promise created without .catch() — unhandled rejection risk',
    suggestion: 'Add .catch() or use try/catch with await',
    severity: 'info',
  },
  {
    id: 'floating-promise',
    pattern: /(?:^|\s)(?!return|await|const|let|var|if|while|for|\.)(\w+)\s*\(\s*\)(?!\s*[.;,)\]])/m,
    message: 'Possible floating promise — async call without await or return',
    suggestion: 'Add await: await fn() or return: return fn()',
    severity: 'info',
    skipIf: (code) => !code.includes('async'),
  },
  {
    id: 'return-await',
    pattern: /return\s+await\s+(?!\w+\s*\?\s*)/,
    message: 'return await is usually unnecessary',
    suggestion: 'Just return the promise: return fn() (unless in try-catch)',
    severity: 'info',
  },
  {
    id: 'then-chain-long',
    pattern: /\.then\s*\([^)]+\)\s*\.then\s*\([^)]+\)\s*\.then/,
    message: 'Long .then() chain — consider async/await',
    suggestion: 'Refactor to: const a = await fn1(); const b = await fn2(a);',
    severity: 'info',
  },
  {
    id: 'catch-rethrow',
    pattern: /\.catch\s*\([^)]*\)\s*{\s*throw/,
    message: 'catch that just rethrows — consider removing or adding context',
    suggestion: 'Either remove catch or add error context: throw new Error(`Context: ${e.message}`)',
    severity: 'info',
  },
  {
    id: 'async-void',
    pattern: /:\s*Promise\s*<\s*void\s*>/,
    message: 'Promise<void> — ensure callers handle completion',
    suggestion: 'Consider if callers need to know when this completes',
    severity: 'info',
    skipIf: (code) => code.includes('useEffect') || code.includes('addEventListener'),
  },
  {
    id: 'settimeout-async',
    pattern: /setTimeout\s*\(\s*async\s*\(/,
    message: 'async function in setTimeout — errors may be unhandled',
    suggestion: 'Wrap in try-catch inside the async function',
    severity: 'warn',
  },
  {
    id: 'promise-race-uncaught',
    pattern: /Promise\.race\s*\(\s*\[[^\]]+\]\s*\)(?![\s\S]*\.catch)/,
    message: 'Promise.race without error handling',
    suggestion: 'Add .catch() to handle rejections from any promise',
    severity: 'warn',
  },
  {
    id: 'promise-all-catch',
    pattern: /Promise\.all\s*\(\s*\[[^\]]+\]\s*\)(?![\s\S]{0,50}\.catch|[\s\S]{0,50}try)/,
    message: 'Promise.all may need error handling',
    suggestion: 'Consider Promise.allSettled or add try-catch for partial failure handling',
    severity: 'info',
  },
];

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

function isCodeFile(filePath) {
  return CODE_EXTENSIONS.some(ext => filePath?.endsWith(ext));
}

function checkContent(content) {
  const issues = [];

  for (const rule of ASYNC_ISSUES) {
    if (rule.skipIf && rule.skipIf(content)) continue;

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
        additionalContext: `ASYNC PATTERN WARNING:\n${warnings}`,
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
        additionalContext: `ASYNC PATTERN NOTE:\n${infoStr}`,
      }
    }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
