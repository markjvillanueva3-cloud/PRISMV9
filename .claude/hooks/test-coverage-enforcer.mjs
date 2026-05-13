#!/usr/bin/env node
// tier: T1
/**
 * test-coverage-enforcer.mjs — PreToolUse hook for Write (new files)
 *
 * When creating new source files, reminds/warns if no corresponding test exists.
 * When creating new exports, suggests test cases.
 *
 * FIRES ON: PreToolUse (Write)
 * BLOCKING: never — adds reminders
 */
import fs from "node:fs";
import { dirname, basename, join } from 'node:path';



function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];
const TEST_PATTERNS = ['.test.', '.spec.', '__tests__'];

function isSourceFile(filePath) {
  if (!filePath) return false;
  if (TEST_PATTERNS.some(p => filePath.includes(p))) return false;
  return CODE_EXTENSIONS.some(ext => filePath.endsWith(ext));
}

function getTestPaths(filePath) {
  const dir = dirname(filePath);
  const base = basename(filePath);
  const ext = CODE_EXTENSIONS.find(e => base.endsWith(e)) || '.ts';
  const name = base.replace(ext, '');

  return [
    join(dir, `${name}.test${ext}`),
    join(dir, `${name}.spec${ext}`),
    join(dir, '__tests__', `${name}.test${ext}`),
    join(dir, '__tests__', `${name}.spec${ext}`),
    join(dir, '..', '__tests__', `${name}.test${ext}`),
  ];
}

function extractExports(code) {
  const exports = [];

  const functionExports = code.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g);
  for (const m of functionExports) {
    exports.push({ type: 'function', name: m[1] });
  }

  const classExports = code.matchAll(/export\s+class\s+(\w+)/g);
  for (const m of classExports) {
    exports.push({ type: 'class', name: m[1] });
  }

  const constExports = code.matchAll(/export\s+const\s+(\w+)/g);
  for (const m of constExports) {
    exports.push({ type: 'const', name: m[1] });
  }

  const defaultExports = code.matchAll(/export\s+default\s+(?:class|function)?\s*(\w+)?/g);
  for (const m of defaultExports) {
    exports.push({ type: 'default', name: m[1] || 'default' });
  }

  return exports;
}

function suggestTests(exports, fileName) {
  const suggestions = [];

  for (const exp of exports.slice(0, 5)) {
    if (exp.type === 'function') {
      suggestions.push(`describe('${exp.name}', () => {
  it('should handle valid input', () => { ... });
  it('should throw on invalid input', () => { ... });
  it('should handle edge cases (empty, null)', () => { ... });
});`);
    } else if (exp.type === 'class') {
      suggestions.push(`describe('${exp.name}', () => {
  it('should instantiate correctly', () => { ... });
  it('should handle method calls', () => { ... });
  it('should maintain state correctly', () => { ... });
});`);
    }
  }

  return suggestions;
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

  if (toolName !== 'Write') {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const filePath = toolInput.file_path || toolInput.filePath || '';
  const content = toolInput.content || '';

  if (!isSourceFile(filePath)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const testPaths = getTestPaths(filePath);
  const hasTest = testPaths.some(p => fs.existsSync(p));

  if (hasTest) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const exports = extractExports(content);

  if (exports.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const suggestions = suggestTests(exports, basename(filePath));
  const exportList = exports.slice(0, 5).map(e => `• ${e.type}: ${e.name}`).join('\n');

  const lines = [];
  lines.push('TEST COVERAGE REMINDER');
  lines.push('━'.repeat(50));
  lines.push(`New file with ${exports.length} export(s) but no test file found.`);
  lines.push('');
  lines.push('**Exports detected:**');
  lines.push(exportList);
  lines.push('');
  lines.push('**Suggested test location:**');
  lines.push(`  ${testPaths[0]}`);

  if (suggestions.length > 0) {
    lines.push('');
    lines.push('**Test skeleton:**');
    lines.push('```typescript');
    lines.push(suggestions[0]);
    lines.push('```');
  }

  console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: lines.join('\n'), } }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
