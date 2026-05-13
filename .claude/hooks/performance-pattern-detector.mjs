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
 * performance-pattern-detector.mjs — PreToolUse hook for Edit/Write/MultiEdit
 *
 * Detects common performance anti-patterns:
 * - O(n²) nested loops on same collection
 * - Unnecessary re-renders in React
 * - Repeated expensive operations in loops
 * - Missing memoization opportunities
 * - Sync operations blocking event loop
 * - Memory leaks (growing arrays, unclosed resources)
 *
 * FIRES ON: PreToolUse (Edit, Write, MultiEdit)
 * BLOCKING: WARN level
 */

const PERF_ISSUES = [
  {
    id: 'nested-loops-same-array',
    pattern: /for\s*\([^)]*(\w+)\.length[^}]+for\s*\([^)]*\1\.(?:length|forEach|map|filter)/s,
    message: 'Nested loops on same array — O(n²) complexity',
    suggestion: 'Use Set/Map for O(1) lookup, or restructure algorithm',
    severity: 'warn',
  },
  {
    id: 'includes-in-loop',
    pattern: /(?:for|while|\.forEach|\.map|\.filter)\s*\([^}]*\.includes\s*\(/s,
    message: 'Array.includes() inside loop — O(n²) when array is large',
    suggestion: 'Convert to Set before loop: const set = new Set(arr)',
    severity: 'warn',
  },
  {
    id: 'indexof-in-loop',
    pattern: /(?:for|while|\.forEach|\.map|\.filter)\s*\([^}]*\.indexOf\s*\(/s,
    message: 'Array.indexOf() inside loop — O(n²) when array is large',
    suggestion: 'Use Set.has() or Map.get() for O(1) lookup',
    severity: 'warn',
  },
  {
    id: 'find-in-loop',
    pattern: /(?:for|while|\.forEach|\.map|\.filter)\s*\([^}]*\.find\s*\(/s,
    message: 'Array.find() inside loop — consider pre-indexing',
    suggestion: 'Build a Map keyed by search field before the loop',
    severity: 'info',
  },
  {
    id: 'regex-in-loop',
    pattern: /(?:for|while|\.forEach|\.map|\.filter)\s*\([^}]*new\s+RegExp\s*\(/s,
    message: 'Creating RegExp inside loop — compile once outside',
    suggestion: 'const regex = /pattern/; then use inside loop',
    severity: 'warn',
  },
  {
    id: 'date-in-loop',
    pattern: /(?:for|while|\.forEach|\.map|\.filter)\s*\([^}]*new\s+Date\s*\(\s*\)/s,
    message: 'new Date() inside loop — capture once if current time needed',
    suggestion: 'const now = Date.now(); before loop',
    severity: 'info',
  },
  {
    id: 'spread-in-reduce',
    pattern: /\.reduce\s*\([^}]*\.\.\./s,
    message: 'Spread operator in reduce — creates new array each iteration',
    suggestion: 'Use push() to mutate accumulator, or restructure',
    severity: 'warn',
  },
  {
    id: 'concat-in-loop',
    pattern: /(?:for|while)\s*\([^}]*=\s*\w+\.concat\s*\(/s,
    message: 'Array.concat() in loop — O(n²) total copies',
    suggestion: 'Use push() or spread at end: [...acc, ...items]',
    severity: 'warn',
  },
  {
    id: 'string-concat-loop',
    pattern: /(?:for|while)\s*\([^}]*\+=\s*['"`]/s,
    message: 'String concatenation in loop — consider array.join()',
    suggestion: 'Push to array, then parts.join("") at end',
    severity: 'info',
  },
  {
    id: 'inline-function-jsx',
    pattern: /(?:onClick|onChange|onSubmit|on\w+)=\{\s*\([^)]*\)\s*=>/,
    message: 'Inline arrow function in JSX — recreates on every render',
    suggestion: 'Extract to useCallback or class method',
    severity: 'info',
  },
  {
    id: 'object-literal-jsx',
    pattern: /(?:style|className)=\{\{/,
    message: 'Object literal in JSX prop — recreates on every render',
    suggestion: 'Extract to const or useMemo',
    severity: 'info',
  },
  {
    id: 'useeffect-missing-deps',
    pattern: /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]+\}\s*\)/,
    message: 'useEffect without dependency array — runs on every render',
    suggestion: 'Add dependency array: useEffect(() => {...}, [deps])',
    severity: 'warn',
  },
  {
    id: 'json-stringify-comparison',
    pattern: /JSON\.stringify\s*\([^)]+\)\s*===?\s*JSON\.stringify/,
    message: 'JSON.stringify for comparison — slow for large objects',
    suggestion: 'Use deep-equal library or compare specific fields',
    severity: 'warn',
  },
  {
    id: 'sync-readfile',
    pattern: /readFileSync\s*\([^)]+\)/,
    message: 'Synchronous file read — blocks event loop',
    suggestion: 'Use async readFile with await, or stream for large files',
    severity: 'info',
    skipIf: (code) => code.includes('import.meta') || code.includes('require.main'),
  },
  {
    id: 'unbounded-cache',
    pattern: /(?:const|let)\s+\w+\s*=\s*(?:new\s+)?Map\s*\(\)/,
    message: 'Map/Object used as cache — consider LRU to bound memory',
    suggestion: 'Use lru-cache or implement max size with eviction',
    severity: 'info',
    skipIf: (code) => code.includes('delete') || code.includes('.clear()'),
  },
  {
    id: 'growing-array',
    pattern: /\w+\.push\s*\([^)]+\)(?![^;]*\.shift|[^;]*\.splice|[^;]*\.length\s*[<>])/,
    message: 'Array grows without bound check',
    suggestion: 'Add max length check or use circular buffer pattern',
    severity: 'info',
    skipIf: (code) => code.includes('.length') && (code.includes('<') || code.includes('>')),
  },
];

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

function isCodeFile(filePath) {
  return CODE_EXTENSIONS.some(ext => filePath?.endsWith(ext));
}

function checkContent(content, filePath) {
  const issues = [];

  for (const rule of PERF_ISSUES) {
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

  if (!content || content.length < 30) {
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
        additionalContext: `PERFORMANCE WARNING:\n${warnings}`,
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
        additionalContext: `PERFORMANCE NOTE:\n${infoStr}`,
      }
    }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
