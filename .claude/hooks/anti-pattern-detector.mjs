#!/usr/bin/env node
// tier: T0
import fs from "node:fs";


function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}
/**
 * anti-pattern-detector.mjs — PreToolUse hook for Edit/Write/MultiEdit
 *
 * Detects common anti-patterns and bugs before they land in code:
 * - await inside loops without Promise.all (N+1 async)
 * - Event listeners without cleanup
 * - Regex with user input (ReDoS vulnerability)
 * - String concatenation in SQL/shell (injection)
 * - `any` type spreading
 * - console.log left in production code
 * - Synchronous file operations in async context
 * - Missing error handling on promises
 *
 * FIRES ON: PreToolUse (Edit, Write, MultiEdit)
 * BLOCKING: YES for security issues, WARN for others
 */

const ANTI_PATTERNS = [
  {
    id: 'await-in-loop',
    pattern: /for\s*\([^)]*\)\s*\{[^}]*await\s+/,
    altPattern: /for\s+await\s+/,
    message: 'await inside loop without Promise.all — causes N+1 sequential async calls',
    suggestion: 'Use Promise.all(items.map(async item => ...)) for parallel execution',
    severity: 'warn',
    skipIf: (code) => code.includes('Promise.all') || code.includes('for await'),
  },
  {
    id: 'event-listener-leak',
    pattern: /addEventListener\s*\(/,
    message: 'Event listener added — ensure cleanup with removeEventListener',
    suggestion: 'Store reference and call removeEventListener in cleanup/unmount',
    severity: 'warn',
    skipIf: (code) => code.includes('removeEventListener') || code.includes('AbortController'),
  },
  {
    id: 'regex-user-input',
    pattern: /new\s+RegExp\s*\(\s*(?:req\.|input|user|param|query|body|args)/,
    message: 'RegExp with user input — potential ReDoS vulnerability',
    suggestion: 'Sanitize input or use a safe regex library like re2',
    severity: 'block',
  },
  {
    id: 'sql-concat',
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|WHERE).*\+\s*(?:req\.|input|user|param|query|body|args|\$\{)/i,
    message: 'SQL string concatenation with user input — SQL injection risk',
    suggestion: 'Use parameterized queries: db.query(sql, [param])',
    severity: 'block',
  },
  {
    id: 'shell-concat',
    pattern: /(?:exec|spawn|execSync|spawnSync)\s*\([^)]*\+\s*(?:req\.|input|user|param|\$\{)/,
    message: 'Shell command with string concatenation — command injection risk',
    suggestion: 'Use execFileSync with array args, never string concatenation',
    severity: 'block',
  },
  {
    id: 'eval-usage',
    pattern: /\beval\s*\(/,
    message: 'eval() usage — code injection risk and performance hit',
    suggestion: 'Use JSON.parse for data, Function constructor only if absolutely necessary',
    severity: 'block',
  },
  {
    id: 'any-spread',
    pattern: /:\s*any(?:\s*[,;)\]]|\s*$)/m,
    message: '`any` type weakens TypeScript safety',
    suggestion: 'Use unknown, generics, or proper typing',
    severity: 'warn',
    skipIf: (code, filePath) => filePath?.includes('.test.') || filePath?.includes('__tests__'),
  },
  {
    id: 'any-cast',
    pattern: /as\s+any(?:\s*[,;)\]]|\s*$)/m,
    message: '`as any` cast bypasses type safety',
    suggestion: 'Fix the type mismatch instead of casting to any',
    severity: 'warn',
  },
  {
    id: 'sync-fs-in-async',
    pattern: /(?:async\s+function|async\s*\()[^}]*(?:readFileSync|writeFileSync|existsSync|mkdirSync)/s,
    message: 'Synchronous fs operation in async function — blocks event loop',
    suggestion: 'Use async variants: readFile, writeFile, access, mkdir',
    severity: 'warn',
  },
  {
    id: 'unhandled-promise',
    pattern: /(?:fetch|axios|request)\s*\([^)]*\)(?!\s*\.(?:then|catch|finally)|\s*;?\s*(?:await|\.)|.*catch)/,
    message: 'Promise without error handling',
    suggestion: 'Add .catch() or use try/catch with await',
    severity: 'warn',
  },
  {
    id: 'hardcoded-secret',
    pattern: /(?:password|secret|apikey|api_key|token|auth)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    message: 'Hardcoded secret/credential detected',
    suggestion: 'Use environment variables: process.env.SECRET_NAME',
    severity: 'block',
  },
  {
    id: 'innerHTML-xss',
    pattern: /innerHTML\s*=\s*(?:req\.|input|user|param|\$\{|`)/,
    message: 'innerHTML with user input — XSS vulnerability',
    suggestion: 'Use textContent or sanitize with DOMPurify',
    severity: 'block',
  },
  {
    id: 'dangerouslySetInnerHTML',
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html:\s*(?!sanitize|DOMPurify|escape)/,
    message: 'dangerouslySetInnerHTML without sanitization — XSS risk',
    suggestion: 'Sanitize with DOMPurify.sanitize() before setting',
    severity: 'block',
  },
  {
    id: 'catch-ignore',
    pattern: /catch\s*\(\s*\w+\s*\)\s*\{\s*\}/,
    message: 'Empty catch block silently swallows errors',
    suggestion: 'At minimum: console.error(err) or rethrow',
    severity: 'warn',
  },
  {
    id: 'floating-promise',
    pattern: /^\s*(?!return|await|void\s)(?:\w+\.)+\w+\([^)]*\)\s*;?\s*$/m,
    message: 'Possibly floating promise (no await/return)',
    suggestion: 'Prefix with await, return, or void if intentionally fire-and-forget',
    severity: 'info',
    skipIf: (code) => !code.includes('async'),
  },
  {
    id: 'magic-number',
    pattern: /(?:timeout|delay|interval|retry|limit|max|min)\s*[:=]\s*\d{4,}/,
    message: 'Magic number in timing/limit — extract to named constant',
    suggestion: 'const TIMEOUT_MS = 30000; // 30 seconds',
    severity: 'info',
  },
];

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

function isCodeFile(filePath) {
  return CODE_EXTENSIONS.some(ext => filePath?.endsWith(ext));
}

function checkContent(content, filePath) {
  const violations = [];

  for (const rule of ANTI_PATTERNS) {
    if (rule.skipIf && rule.skipIf(content, filePath)) {
      continue;
    }

    if (rule.altPattern && rule.altPattern.test(content)) {
      continue;
    }

    if (rule.pattern.test(content)) {
      violations.push({
        id: rule.id,
        severity: rule.severity,
        message: rule.message,
        suggestion: rule.suggestion,
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

  const violations = checkContent(content, filePath);

  if (violations.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const blocks = violations.filter(v => v.severity === 'block');
  const warns = violations.filter(v => v.severity === 'warn');
  const infos = violations.filter(v => v.severity === 'info');

  if (blocks.length > 0) {
    // PreToolUse block contract: {decision:"block", reason:"..."}.
    // {continue:false, message:} is silently dropped.
    const reasons = blocks.map(b => `• [${b.id}] ${b.message}\n  → ${b.suggestion}`).join('\n');
    console.log(JSON.stringify({
      decision: "block",
      reason: `ANTI-PATTERN DETECTOR — BLOCKED (security risk)\n\n${reasons}\n\nFix these issues before writing.`,
    }));
    return;
  }

  if (warns.length > 0 || infos.length > 0) {
    const all = [...warns, ...infos];
    const warnings = all.map(w => `• [${w.id}] ${w.message}\n  → ${w.suggestion}`).join('\n');
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `ANTI-PATTERN WARNING:\n${warnings}`,
      }
    }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
