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
 * complexity-gate.mjs — PreToolUse hook for Edit/Write/MultiEdit
 *
 * Blocks or warns on overly complex code:
 * - Function > 50 lines → split
 * - Nesting > 4 levels → refactor
 * - Cyclomatic complexity > 10 → simplify
 * - More than 5 parameters → use object
 * - Too many branches in switch
 * - Excessive chaining
 *
 * FIRES ON: PreToolUse (Edit, Write, MultiEdit)
 * BLOCKING: WARN level (suggests refactor, doesn't hard block)
 */

const THRESHOLDS = {
  maxFunctionLines: 50,
  maxNestingDepth: 4,
  maxCyclomaticComplexity: 10,
  maxParameters: 5,
  maxSwitchCases: 10,
  maxChainLength: 5,
  maxFileLines: 500,
};

function countNestingDepth(code) {
  let maxDepth = 0;
  let currentDepth = 0;

  for (const char of code) {
    if (char === '{') {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    } else if (char === '}') {
      currentDepth = Math.max(0, currentDepth - 1);
    }
  }

  return maxDepth;
}

function countCyclomaticComplexity(code) {
  const branches = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /\?\s*[^:]/g,
    /\&\&/g,
    /\|\|/g,
    /\?\?/g,
  ];

  let complexity = 1;
  for (const pattern of branches) {
    const matches = code.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  return complexity;
}

function extractFunctions(code) {
  const functions = [];

  const patterns = [
    /(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{/g,
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\([^)]*\)\s*\{/g,
    /(\w+)\s*\(([^)]*)\)\s*\{/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const startIndex = match.index;
      let braceCount = 0;
      let endIndex = startIndex;
      let started = false;

      for (let i = startIndex; i < code.length; i++) {
        if (code[i] === '{') {
          braceCount++;
          started = true;
        } else if (code[i] === '}') {
          braceCount--;
          if (started && braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }

      if (endIndex > startIndex) {
        const funcBody = code.slice(startIndex, endIndex + 1);
        const lines = funcBody.split('\n').length;
        const params = match[2] || '';
        const paramCount = params.split(',').filter(p => p.trim()).length;

        functions.push({
          name: match[1] || 'anonymous',
          lines,
          paramCount,
          body: funcBody,
          complexity: countCyclomaticComplexity(funcBody),
          nesting: countNestingDepth(funcBody),
        });
      }
    }
  }

  return functions;
}

function countSwitchCases(code) {
  const switchMatch = code.match(/switch\s*\([^)]*\)\s*\{/g);
  if (!switchMatch) return 0;

  const caseMatches = code.match(/\bcase\s+/g);
  return caseMatches ? caseMatches.length : 0;
}

function countChainLength(code) {
  const chainPattern = /\.\w+\([^)]*\)(?:\s*\.\w+\([^)]*\))+/g;
  const matches = code.match(chainPattern) || [];

  let maxLength = 0;
  for (const chain of matches) {
    const length = (chain.match(/\.\w+\(/g) || []).length;
    maxLength = Math.max(maxLength, length);
  }

  return maxLength;
}

function analyzeCode(code, filePath) {
  const issues = [];
  const lines = code.split('\n').length;

  if (lines > THRESHOLDS.maxFileLines) {
    issues.push({
      type: 'file-length',
      severity: 'warn',
      message: `File is ${lines} lines (max ${THRESHOLDS.maxFileLines})`,
      suggestion: 'Split into smaller modules with single responsibility',
    });
  }

  const functions = extractFunctions(code);

  for (const func of functions) {
    if (func.lines > THRESHOLDS.maxFunctionLines) {
      issues.push({
        type: 'function-length',
        severity: 'warn',
        message: `Function '${func.name}' is ${func.lines} lines (max ${THRESHOLDS.maxFunctionLines})`,
        suggestion: 'Extract helper functions for distinct operations',
      });
    }

    if (func.paramCount > THRESHOLDS.maxParameters) {
      issues.push({
        type: 'parameter-count',
        severity: 'warn',
        message: `Function '${func.name}' has ${func.paramCount} parameters (max ${THRESHOLDS.maxParameters})`,
        suggestion: 'Use an options object: fn({ param1, param2, ... })',
      });
    }

    if (func.complexity > THRESHOLDS.maxCyclomaticComplexity) {
      issues.push({
        type: 'complexity',
        severity: 'warn',
        message: `Function '${func.name}' has cyclomatic complexity ${func.complexity} (max ${THRESHOLDS.maxCyclomaticComplexity})`,
        suggestion: 'Extract conditions into named predicates, use early returns',
      });
    }

    if (func.nesting > THRESHOLDS.maxNestingDepth) {
      issues.push({
        type: 'nesting',
        severity: 'warn',
        message: `Function '${func.name}' has nesting depth ${func.nesting} (max ${THRESHOLDS.maxNestingDepth})`,
        suggestion: 'Use guard clauses with early returns, extract nested blocks',
      });
    }
  }

  const switchCases = countSwitchCases(code);
  if (switchCases > THRESHOLDS.maxSwitchCases) {
    issues.push({
      type: 'switch-cases',
      severity: 'info',
      message: `Switch has ${switchCases} cases (max ${THRESHOLDS.maxSwitchCases})`,
      suggestion: 'Consider a lookup object or strategy pattern',
    });
  }

  const chainLength = countChainLength(code);
  if (chainLength > THRESHOLDS.maxChainLength) {
    issues.push({
      type: 'chain-length',
      severity: 'info',
      message: `Method chain of ${chainLength} calls (max ${THRESHOLDS.maxChainLength})`,
      suggestion: 'Extract intermediate results to named variables for readability',
    });
  }

  return issues;
}

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

function isCodeFile(filePath) {
  return CODE_EXTENSIONS.some(ext => filePath?.endsWith(ext));
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

  if (!content || content.length < 50) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const issues = analyzeCode(content, filePath);

  if (issues.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const warns = issues.filter(i => i.severity === 'warn');
  const infos = issues.filter(i => i.severity === 'info');

  if (warns.length > 0) {
    const warnings = warns.map(w => `• [${w.type}] ${w.message}\n  → ${w.suggestion}`).join('\n');
    const infoStr = infos.length > 0
      ? `\n\nAlso noted:\n${infos.map(i => `• ${i.message}`).join('\n')}`
      : '';

    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `COMPLEXITY WARNING — Consider refactoring:\n${warnings}${infoStr}`,
      }
    }));
    return;
  }

  if (infos.length > 0) {
    const infoStr = infos.map(i => `• ${i.message}`).join('\n');
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `COMPLEXITY NOTE:\n${infoStr}`,
      }
    }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
