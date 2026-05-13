#!/usr/bin/env node
// tier: T3
/**
 * error-pattern-memory.mjs — PostToolUse Hook (Bash, Edit, Write)
 *
 * Enhanced error pattern memory with learning:
 * - Tracks error → fix pairs for future prevention
 * - Pre-warns when writing similar code that previously failed
 * - Learns from success/failure sequences
 * - File-level error tracking for hot spots
 * - Pattern recognition across error types
 *
 * FIRES ON: PostToolUse (Bash for errors, Edit/Write for fixes)
 * BLOCKING: never — adds context/warnings
 */
import fs from "node:fs";
import { dirname, basename } from 'node:path';



function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const ERROR_PATH = 'H:/prism/mcp-server/data/state/error-memory.json';
const MAX_ERRORS = 100;
const MAX_FIXES = 50;
const MAX_HOTSPOTS = 20;

function loadMemory() {
  try {
    if (fs.existsSync(ERROR_PATH)) {
      return JSON.parse(fs.readFileSync(ERROR_PATH, 'utf8'));
    }
  } catch { /* use defaults */ }
  return {
    errors: [],
    fixes: {},
    hotspots: {},
    patterns: {},
    lastError: null,
    sessionStart: new Date().toISOString(),
  };
}

function saveMemory(data) {
  try {
    const dir = dirname(ERROR_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ERROR_PATH, JSON.stringify(data, null, 2));
  } catch { /* ignore */ }
}

function extractError(output) {
  const errors = [];

  const tsErrors = output.matchAll(/error TS(\d+):\s*(.+)/gi);
  for (const m of tsErrors) {
    errors.push({
      type: 'typescript',
      code: `TS${m[1]}`,
      message: m[2].slice(0, 100),
      severity: 'error',
    });
  }

  const moduleErrors = output.matchAll(/Cannot find module ['"]([^'"]+)['"]/gi);
  for (const m of moduleErrors) {
    errors.push({
      type: 'module',
      code: 'MODULE_NOT_FOUND',
      message: m[1],
      severity: 'error',
    });
  }

  const testFails = output.matchAll(/FAIL\s+(\S+\.test\.\S+)/gi);
  for (const m of testFails) {
    errors.push({
      type: 'test',
      code: 'TEST_FAIL',
      message: m[1],
      severity: 'error',
    });
  }

  const eslintErrors = output.matchAll(/(\d+):(\d+)\s+error\s+(.+?)\s+(\S+)$/gm);
  for (const m of eslintErrors) {
    errors.push({
      type: 'lint',
      code: m[4],
      message: m[3].slice(0, 80),
      line: parseInt(m[1]),
      severity: 'error',
    });
  }

  const assertionFails = output.matchAll(/AssertionError:\s*(.+)/gi);
  for (const m of assertionFails) {
    errors.push({
      type: 'assertion',
      code: 'ASSERTION_FAIL',
      message: m[1].slice(0, 100),
      severity: 'error',
    });
  }

  const expectErrors = output.matchAll(/expect\(received\)\.(\w+)\(expected\)/gi);
  for (const m of expectErrors) {
    errors.push({
      type: 'expectation',
      code: `EXPECT_${m[1].toUpperCase()}`,
      message: `expectation failed: ${m[1]}`,
      severity: 'error',
    });
  }

  const runtimeErrors = output.matchAll(/(TypeError|ReferenceError|RangeError|SyntaxError):\s*(.+)/gi);
  for (const m of runtimeErrors) {
    errors.push({
      type: 'runtime',
      code: m[1].toUpperCase(),
      message: m[2].slice(0, 100),
      severity: 'error',
    });
  }

  if (errors.length === 0 && output.toLowerCase().includes('error') && !output.includes('0 errors')) {
    errors.push({
      type: 'generic',
      code: 'UNKNOWN',
      message: 'unclassified error detected',
      severity: 'warn',
    });
  }

  return errors;
}

function extractFileFromEdit(toolInput) {
  return toolInput?.file_path || toolInput?.filePath || null;
}

function extractCodeSignature(code) {
  if (!code || code.length < 20) return null;

  const sig = [];

  if (code.includes('async')) sig.push('async');
  if (code.includes('await')) sig.push('await');
  if (code.includes('Promise')) sig.push('promise');
  if (code.includes('try')) sig.push('try-catch');
  if (code.match(/\bimport\s/)) sig.push('import');
  if (code.match(/\bexport\s/)) sig.push('export');
  if (code.includes('.map(')) sig.push('map');
  if (code.includes('.filter(')) sig.push('filter');
  if (code.includes('.reduce(')) sig.push('reduce');
  if (code.match(/\bclass\s/)) sig.push('class');
  if (code.match(/\binterface\s/)) sig.push('interface');
  if (code.match(/\btype\s+\w+\s*=/)) sig.push('type-alias');

  return sig.length > 0 ? sig.join(',') : null;
}

function generateFixKey(error) {
  return `${error.type}:${error.code}:${error.message.slice(0, 50)}`;
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

  const tool = payload.tool_name || payload.tool || '';
  const toolOutput = payload.tool_output || payload.output || '';
  const toolInput = payload.tool_input || payload.input || {};

  const data = loadMemory();

  if (tool === 'Bash') {
    const errors = extractError(toolOutput);

    if (errors.length === 0) {
      if (data.lastError && toolOutput.includes('0 errors')) {
        data.lastError = null;
        saveMemory(data);
        console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: '✓ Error resolved — pattern learned', } }));
        return;
      }
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    for (const error of errors) {
      const key = generateFixKey(error);

      data.errors.push({
        key,
        error,
        timestamp: new Date().toISOString(),
      });

      // INTEL-OLLAMA-OBSIDIAN-MS0/P2-U02: mirror to unified ledger
      try {
        const mod = await import("../helpers/unified-ledger-mirror.mjs");
        mod.mirrorToUnifiedLedgerAsync({
          source: "pattern_memory",
          tool: error.tool ?? error.toolName ?? undefined,
          errorClass: error.code ?? error.type ?? undefined,
          message: error.message ?? error.snippet ?? error.text ?? "",
          context: { key, error_type: error.type, code: error.code },
        });
      } catch { /* mirror is best-effort */ }

      const pattern = data.patterns[error.type] || { count: 0, codes: {} };
      pattern.count++;
      pattern.codes[error.code] = (pattern.codes[error.code] || 0) + 1;
      data.patterns[error.type] = pattern;
    }

    if (data.errors.length > MAX_ERRORS) {
      data.errors = data.errors.slice(-MAX_ERRORS);
    }

    data.lastError = {
      errors,
      timestamp: new Date().toISOString(),
    };

    saveMemory(data);

    const knownFixes = [];
    for (const error of errors) {
      const key = generateFixKey(error);
      if (data.fixes[key]) {
        knownFixes.push({
          error: error.message,
          fix: data.fixes[key].fix,
          confidence: data.fixes[key].successCount || 1,
        });
      }
    }

    if (knownFixes.length > 0) {
      const fixSuggestions = knownFixes
        .slice(0, 3)
        .map(f => `• ${f.error}\n  → Fix: ${f.fix} (worked ${f.confidence}× before)`)
        .join('\n');

      console.log(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `## Error Memory — Known Fixes Available\n${fixSuggestions}`,
        },
      }));
      return;
    }

    const typeCount = data.patterns[errors[0].type]?.count || 1;
    if (typeCount >= 3) {
      console.log(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `## Error Memory\n⚠️ ${errors[0].type} errors: ${typeCount} in this session. Consider a different approach.`,
        },
      }));
      return;
    }

    console.log(JSON.stringify({ continue: true }));
    return;
  }

  if (tool === 'Edit' || tool === 'Write') {
    const filePath = extractFileFromEdit(toolInput);

    if (data.lastError && data.lastError.errors.length > 0) {
      const newCode = toolInput.new_string || toolInput.newString || toolInput.content || '';
      const signature = extractCodeSignature(newCode);

      for (const error of data.lastError.errors) {
        const key = generateFixKey(error);

        if (!data.fixes[key]) {
          data.fixes[key] = {
            fix: signature || 'code modification',
            file: filePath ? basename(filePath) : 'unknown',
            timestamp: new Date().toISOString(),
            successCount: 1,
          };
        } else {
          data.fixes[key].successCount++;
          data.fixes[key].lastUsed = new Date().toISOString();
        }
      }

      const fixKeys = Object.keys(data.fixes);
      if (fixKeys.length > MAX_FIXES) {
        const sorted = fixKeys.sort((a, b) =>
          (data.fixes[b].successCount || 0) - (data.fixes[a].successCount || 0)
        );
        const toKeep = sorted.slice(0, MAX_FIXES);
        const newFixes = {};
        for (const k of toKeep) {
          newFixes[k] = data.fixes[k];
        }
        data.fixes = newFixes;
      }

      data.lastError = null;
    }

    if (filePath) {
      const fileKey = basename(filePath);
      const hotspot = data.hotspots[fileKey] || { edits: 0, errors: 0 };
      hotspot.edits++;
      hotspot.lastEdit = new Date().toISOString();
      data.hotspots[fileKey] = hotspot;

      const hotspotKeys = Object.keys(data.hotspots);
      if (hotspotKeys.length > MAX_HOTSPOTS) {
        const sorted = hotspotKeys.sort((a, b) =>
          (data.hotspots[b].errors || 0) - (data.hotspots[a].errors || 0)
        );
        const toKeep = sorted.slice(0, MAX_HOTSPOTS);
        const newHotspots = {};
        for (const k of toKeep) {
          newHotspots[k] = data.hotspots[k];
        }
        data.hotspots = newHotspots;
      }
    }

    saveMemory(data);
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
