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
// DISABLED_TOKEN_REDUX_2026_04_23: short-circuited by user-approved token-reduction pass.
// Remove the next 2 lines to re-enable. See .claude/helpers/apply-hook-fixes.mjs
process.stdout.write(JSON.stringify({ continue: true })); process.exit(0);
/**
 * naming-convention-enforcer.mjs — PreToolUse hook for Edit/Write/MultiEdit
 *
 * Enforces consistent naming conventions:
 * - PascalCase for classes, interfaces, types, enums
 * - camelCase for functions, variables, parameters
 * - SCREAMING_SNAKE_CASE for constants
 * - kebab-case for file names (optional)
 * - No single-letter variables except loop indices
 * - Meaningful names (not data, info, temp, etc.)
 *
 * FIRES ON: PreToolUse (Edit, Write, MultiEdit)
 * BLOCKING: WARN level
 */

const NAMING_RULES = [
  {
    id: 'class-not-pascal',
    pattern: /class\s+([a-z][a-zA-Z0-9]*)\s*[{<(extends implements]/,
    message: (m) => `Class '${m[1]}' should be PascalCase`,
    suggestion: 'Classes use PascalCase: class MyClassName',
    severity: 'warn',
  },
  {
    id: 'interface-not-pascal',
    pattern: /interface\s+([a-z][a-zA-Z0-9]*)\s*[{<]/,
    message: (m) => `Interface '${m[1]}' should be PascalCase`,
    suggestion: 'Interfaces use PascalCase: interface MyInterface (no I prefix)',
    severity: 'warn',
  },
  {
    id: 'type-not-pascal',
    pattern: /type\s+([a-z][a-zA-Z0-9]*)\s*[<=]/,
    message: (m) => `Type '${m[1]}' should be PascalCase`,
    suggestion: 'Types use PascalCase: type MyType = ...',
    severity: 'warn',
  },
  {
    id: 'enum-not-pascal',
    pattern: /enum\s+([a-z][a-zA-Z0-9]*)\s*\{/,
    message: (m) => `Enum '${m[1]}' should be PascalCase`,
    suggestion: 'Enums use PascalCase: enum MyEnum { ... }',
    severity: 'warn',
  },
  {
    id: 'constant-not-screaming',
    pattern: /const\s+([A-Z][a-z]+[A-Z][a-zA-Z]*)\s*=\s*(?:['"`\d]|true|false|null)/,
    message: (m) => `Constant '${m[1]}' — use SCREAMING_SNAKE_CASE for true constants`,
    suggestion: 'Constants: const MAX_RETRIES = 3, const API_URL = "..."',
    severity: 'info',
  },
  {
    id: 'single-letter-var',
    pattern: /(?:const|let|var)\s+([a-zA-Z])\s*[=:]/,
    message: (m) => `Single-letter variable '${m[1]}' — use descriptive name`,
    suggestion: 'Exceptions: i/j/k for loops, x/y/z for coordinates, n for count',
    severity: 'info',
    skipIf: (code, match) => ['i', 'j', 'k', 'n', 'x', 'y', 'z', '_'].includes(match?.[1]),
  },
  {
    id: 'meaningless-name',
    pattern: /(?:const|let|var)\s+(data|info|temp|tmp|value|item|obj|result|res|ret)\s*[=:]/i,
    message: (m) => `Generic name '${m[1]}' — be more specific`,
    suggestion: 'Use domain-specific names: userData, toolInfo, tempFile, parseResult',
    severity: 'info',
  },
  {
    id: 'function-not-camel',
    pattern: /function\s+([A-Z][a-zA-Z0-9]*)\s*\(/,
    message: (m) => `Function '${m[1]}' starts with capital — use camelCase`,
    suggestion: 'Functions use camelCase: function processData() { }',
    severity: 'warn',
    skipIf: (code) => code.includes('React') || code.includes('jsx'),
  },
  {
    id: 'method-not-camel',
    pattern: /^\s+([A-Z][a-zA-Z0-9]*)\s*\([^)]*\)\s*[:{]/m,
    message: (m) => `Method '${m[1]}' starts with capital — use camelCase`,
    suggestion: 'Methods use camelCase: processData() { }',
    severity: 'warn',
    skipIf: (code) => code.includes('static') && code.includes(': '),
  },
  {
    id: 'bool-not-is-has',
    pattern: /(?:const|let)\s+([a-z]+(?:Flag|Bool|Boolean))\s*[=:]\s*(?:true|false)/i,
    message: (m) => `Boolean '${m[1]}' — prefer is/has/can/should prefix`,
    suggestion: 'Booleans: isActive, hasPermission, canEdit, shouldRetry',
    severity: 'info',
  },
  {
    id: 'array-not-plural',
    pattern: /(?:const|let)\s+([a-z]+)\s*:\s*(?:\w+\[\]|Array<)/,
    message: (m) => `Array '${m[1]}' — consider plural name`,
    suggestion: 'Arrays should be plural: items, users, results (not item, user, result)',
    severity: 'info',
    skipIf: (code, match) => match?.[1]?.endsWith('s') || match?.[1]?.endsWith('List'),
  },
  {
    id: 'hungarian-notation',
    pattern: /(?:const|let|var)\s+(str[A-Z]|num[A-Z]|arr[A-Z]|obj[A-Z]|int[A-Z]|bool[A-Z])/,
    message: (m) => `Hungarian notation '${m[1]}' — TypeScript types make this redundant`,
    suggestion: 'Just use the name: name instead of strName, count instead of intCount',
    severity: 'info',
  },
  {
    id: 'underscore-prefix-public',
    pattern: /(?:public\s+)?(_[a-zA-Z]+)\s*[(:=]/,
    message: (m) => `Underscore prefix '${m[1]}' on public member`,
    suggestion: 'Use #private or private keyword instead of _ prefix convention',
    severity: 'info',
    skipIf: (code) => code.includes('private ') || code.includes('#'),
  },
];

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

function isCodeFile(filePath) {
  return CODE_EXTENSIONS.some(ext => filePath?.endsWith(ext));
}

function checkContent(content, filePath) {
  const issues = [];

  for (const rule of NAMING_RULES) {
    const match = content.match(rule.pattern);

    if (match) {
      if (rule.skipIf && rule.skipIf(content, match)) {
        continue;
      }

      issues.push({
        id: rule.id,
        severity: rule.severity,
        message: typeof rule.message === 'function' ? rule.message(match) : rule.message,
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

  const issues = checkContent(content, filePath);

  if (issues.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const warns = issues.filter(i => i.severity === 'warn');
  const infos = issues.filter(i => i.severity === 'info');

  if (warns.length > 0) {
    const warnings = warns.slice(0, 4).map(w => `• [${w.id}] ${w.message}\n  → ${w.suggestion}`).join('\n');
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `NAMING CONVENTION WARNING:\n${warnings}`,
      }
    }));
    return;
  }

  if (infos.length > 0 && infos.length >= 2) {
    const infoStr = infos.slice(0, 3).map(i => `• ${i.message}`).join('\n');
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `NAMING NOTE:\n${infoStr}`,
      }
    }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
