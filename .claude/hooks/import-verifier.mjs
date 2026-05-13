#!/usr/bin/env node
// tier: T1
/**
 * import-verifier.mjs — PreToolUse hook for Edit/Write/MultiEdit
 *
 * Verifies import statements before they're written:
 * - Checks if relative import paths exist
 * - Validates common typos in module names
 * - Suggests corrections for near-misses
 * - Warns about circular import potential
 *
 * FIRES ON: PreToolUse (Edit, Write, MultiEdit)
 * BLOCKING: WARN level (suggests fixes, doesn't hard block)
 */
import fs from "node:fs";
import { dirname, join, resolve, extname, basename } from 'node:path';



function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const COMMON_TYPOS = {
  'reat': 'react',
  'recat': 'react',
  'raect': 'react',
  'noed': 'node',
  'ndoe': 'node',
  'expresss': 'express',
  'expres': 'express',
  'lodahs': 'lodash',
  'lodasj': 'lodash',
  'axois': 'axios',
  'axos': 'axios',
  'moent': 'moment',
  'momnet': 'moment',
  'typescipt': 'typescript',
  'typscript': 'typescript',
  'esling': 'eslint',
  'elint': 'eslint',
};

const EXTENSIONS_TO_TRY = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '/index.ts', '/index.js'];

function extractImports(code) {
  const imports = [];

  const patterns = [
    /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /from\s+['"]([^'"]+)['"]/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const importPath = match[1];
      imports.push({
        path: importPath,
        isRelative: importPath.startsWith('.') || importPath.startsWith('/'),
        fullMatch: match[0],
      });
    }
  }

  return imports;
}

function checkRelativeImport(importPath, sourceFile) {
  if (!sourceFile) return { exists: true };

  const sourceDir = dirname(sourceFile);
  const targetBase = resolve(sourceDir, importPath);

  for (const ext of EXTENSIONS_TO_TRY) {
    const targetPath = targetBase + ext;
    if (fs.existsSync(targetPath)) {
      return { exists: true, resolvedPath: targetPath };
    }
  }

  const nearMatches = findNearMatches(targetBase, sourceDir);

  return {
    exists: false,
    attempted: targetBase,
    suggestions: nearMatches,
  };
}

function findNearMatches(targetBase, sourceDir) {
  const suggestions = [];
  const targetName = basename(targetBase).toLowerCase();
  const targetDir = dirname(targetBase);

  try {
    if (!fs.existsSync(targetDir)) {
      const parentDir = dirname(targetDir);
      if (fs.existsSync(parentDir)) {
        const entries = fs.readdirSync(parentDir, { withFileTypes: true });
        const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
        const targetDirName = basename(targetDir).toLowerCase();

        for (const dir of dirs) {
          if (levenshtein(dir.toLowerCase(), targetDirName) <= 2) {
            suggestions.push(`Did you mean directory '${dir}'?`);
          }
        }
      }
      return suggestions;
    }

    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    const files = entries.filter(e => e.isFile()).map(e => e.name);

    for (const file of files) {
      const fileBase = file.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, '').toLowerCase();
      if (levenshtein(fileBase, targetName) <= 2) {
        suggestions.push(file.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, ''));
      }
    }
  } catch {
    // ignore fs errors
  }

  return suggestions.slice(0, 3);
}

function levenshtein(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function checkPackageTypo(packageName) {
  const lower = packageName.toLowerCase();

  if (COMMON_TYPOS[lower]) {
    return { typo: true, suggestion: COMMON_TYPOS[lower] };
  }

  for (const [typo, correct] of Object.entries(COMMON_TYPOS)) {
    if (levenshtein(lower, typo) <= 1) {
      return { typo: true, suggestion: correct };
    }
  }

  return { typo: false };
}

function checkCircularPotential(importPath, sourceFile) {
  if (!importPath.startsWith('.') || !sourceFile) return false;

  const sourceBase = basename(sourceFile).replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, '');
  const importBase = basename(importPath).replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, '');

  if (importPath.includes('..') && importBase === sourceBase) {
    return true;
  }

  return false;
}

function analyzeImports(code, filePath) {
  const issues = [];
  const imports = extractImports(code);

  for (const imp of imports) {
    if (imp.isRelative) {
      const check = checkRelativeImport(imp.path, filePath);
      if (!check.exists) {
        let message = `Import path '${imp.path}' may not exist`;
        let suggestion = 'Verify the path is correct';

        if (check.suggestions && check.suggestions.length > 0) {
          suggestion = `Did you mean: ${check.suggestions.join(', ')}?`;
        }

        issues.push({
          type: 'missing-import',
          severity: 'warn',
          message,
          suggestion,
        });
      }

      if (checkCircularPotential(imp.path, filePath)) {
        issues.push({
          type: 'circular-risk',
          severity: 'info',
          message: `Import '${imp.path}' may create circular dependency`,
          suggestion: 'Consider extracting shared types to a separate module',
        });
      }
    } else {
      const packageName = imp.path.split('/')[0].replace(/^@[^/]+\//, '');
      const typoCheck = checkPackageTypo(packageName);

      if (typoCheck.typo) {
        issues.push({
          type: 'package-typo',
          severity: 'warn',
          message: `Package '${packageName}' looks like a typo`,
          suggestion: `Did you mean '${typoCheck.suggestion}'?`,
        });
      }
    }
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

  if (!content || content.length < 10) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const issues = analyzeImports(content, filePath);

  if (issues.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const warns = issues.filter(i => i.severity === 'warn');
  const infos = issues.filter(i => i.severity === 'info');

  if (warns.length > 0) {
    const warnings = warns.map(w => `• [${w.type}] ${w.message}\n  → ${w.suggestion}`).join('\n');
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `IMPORT VERIFICATION WARNING:\n${warnings}`,
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
        additionalContext: `IMPORT NOTE:\n${infoStr}`,
      }
    }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
