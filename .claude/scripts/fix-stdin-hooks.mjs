#!/usr/bin/env node
/**
 * fix-stdin-hooks.mjs — Batch fix hooks using unsafe stdin pattern
 *
 * Problem: `for await (const chunk of process.stdin)` can hang indefinitely
 * if stdin isn't properly closed.
 *
 * Solution: Replace with safe synchronous `fs.readFileSync(0, "utf-8")`
 * wrapped in try/catch.
 *
 * Also fixes: `.catch(() => process.exit(0))` → `.catch(() => { console.log(...); })`
 */

import fs from "node:fs";
import path from "node:path";

const HOOKS_DIR = "H:/prism/.claude/hooks";
const DRY_RUN = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

// Hooks to fix (using unsafe async stdin pattern)
const HOOKS_WITH_UNSAFE_STDIN = [
  "anti-pattern-detector.mjs",
  "api-contract-enforcer.mjs",
  "async-pattern-checker.mjs",
  "chat-bus-inject.mjs",
  "code-completeness-gate.mjs",
  "complexity-gate.mjs",
  "consistent-return-checker.mjs",
  "discipline-expert-inject.mjs",
  "error-pattern-memory.mjs",
  "expert-role-inject.mjs",
  "file-claim-commit-guard.mjs",
  "file-claim-guard.mjs",
  "h-drive-audit.mjs",
  "import-verifier.mjs",
  "ingestion-cache-root-guard.mjs",
  "inventory-on-write.mjs",
  "jm-die-provenance-guard.mjs",
  "lathe-master-post-quality-gate.mjs",
  "magic-number-detector.mjs",
  "master-coder-protocol.mjs",
  "naming-convention-enforcer.mjs",
  "performance-pattern-detector.mjs",
  "physics-canonical-constants-guard.mjs",
  "posttool-bayesian-update.mjs",
  "posttool-curiosity-tick.mjs",
  "posttool-emergence-scan.mjs",
  "pretool-causal-trace.mjs",
  "pretool-world-simulator.mjs",
  "reference-inject.mjs",
  "reference-value-injector.mjs",
  "self-awareness-auto-inject.mjs",
  "sparc-optin-gate.mjs",
  "stop-index-sync.mjs",
  "stop_on_open_claim.mjs",
  "terminal-title-update.mjs",
  "test-coverage-enforcer.mjs",
  "test-legitimacy.mjs",
  "type-safety-checker.mjs",
  "work-claim.mjs",
  "lib/night-mode-guard.mjs",
];

// The safe stdin reading function to inject
const SAFE_STDIN_FUNC = `
function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}
`;

function fixHook(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  let fixed = content;
  const fixes = [];

  // Fix 1: Replace async stdin iteration with safe synchronous read
  // Pattern: `for await (const chunk of process.stdin) input += chunk;`
  const asyncStdinPattern = /let\s+(\w+)\s*=\s*"";?\s*\n\s*for\s+await\s*\(\s*const\s+\w+\s+of\s+process\.stdin\s*\)\s*\1\s*\+=\s*\w+;?/g;
  if (asyncStdinPattern.test(fixed)) {
    // Need to replace with readStdinSafe() call and add the function
    fixed = fixed.replace(asyncStdinPattern, (match, varName) => {
      fixes.push(`Replaced async stdin loop with readStdinSafe() for ${varName}`);
      return `const ${varName} = readStdinSafe();`;
    });

    // Add the readStdinSafe function if not present
    if (!fixed.includes("readStdinSafe")) {
      // Find a good insertion point (after imports, before first function)
      const importEnd = fixed.lastIndexOf("import ");
      if (importEnd > -1) {
        const nextNewline = fixed.indexOf("\n", fixed.indexOf(";", importEnd));
        fixed = fixed.slice(0, nextNewline + 1) + SAFE_STDIN_FUNC + fixed.slice(nextNewline + 1);
        fixes.push("Added readStdinSafe() function");
      }
    }
  }

  // Also check for the raw form that doesn't use += pattern
  const rawAsyncPattern = /for\s+await\s*\(\s*const\s+(\w+)\s+of\s+process\.stdin\s*\)\s*\{?\s*\n?\s*(\w+)\s*\+=\s*\1;?\s*\}?/g;
  if (rawAsyncPattern.test(fixed)) {
    fixed = fixed.replace(rawAsyncPattern, (match, chunkVar, accVar) => {
      fixes.push(`Replaced async stdin loop (raw form) for ${accVar}`);
      return `const ${accVar} = readStdinSafe();`;
    });

    if (!fixed.includes("readStdinSafe")) {
      const importEnd = fixed.lastIndexOf("import ");
      if (importEnd > -1) {
        const nextNewline = fixed.indexOf("\n", fixed.indexOf(";", importEnd));
        fixed = fixed.slice(0, nextNewline + 1) + SAFE_STDIN_FUNC + fixed.slice(nextNewline + 1);
        fixes.push("Added readStdinSafe() function");
      }
    }
  }

  // Fix 2: Replace silent exit with JSON output
  // Pattern: `.catch(() => process.exit(0))`
  const silentExitPattern = /\.catch\s*\(\s*\(\s*\)\s*=>\s*\{?\s*process\.exit\s*\(\s*0\s*\)\s*;?\s*\}?\s*\)/g;
  if (silentExitPattern.test(fixed)) {
    fixed = fixed.replace(silentExitPattern, `.catch(() => {
  console.log(JSON.stringify({ continue: true }));
})`);
    fixes.push("Fixed silent exit to output JSON");
  }

  // Fix 3: Make sure fs is imported if we added readStdinSafe
  if (fixed.includes("readStdinSafe") && !fixed.includes('import fs from') && !fixed.includes('import * as fs from')) {
    fixed = `import fs from "node:fs";\n` + fixed;
    fixes.push("Added fs import");
  }

  return { fixed, fixes, changed: fixes.length > 0 };
}

function main() {
  console.log(`Hook stdin safety fixer\n`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE (will modify files)"}\n`);

  let totalFixed = 0;
  let totalSkipped = 0;

  for (const hookFile of HOOKS_WITH_UNSAFE_STDIN) {
    const filePath = path.join(HOOKS_DIR, hookFile);

    if (!fs.existsSync(filePath)) {
      console.log(`SKIP: ${hookFile} (not found)`);
      totalSkipped++;
      continue;
    }

    try {
      const { fixed, fixes, changed } = fixHook(filePath);

      if (changed) {
        if (!DRY_RUN) {
          fs.writeFileSync(filePath, fixed);
        }
        console.log(`${DRY_RUN ? "WOULD FIX" : "FIXED"}: ${hookFile}`);
        if (VERBOSE) {
          fixes.forEach(f => console.log(`  - ${f}`));
        }
        totalFixed++;
      } else {
        console.log(`OK: ${hookFile} (no changes needed or pattern not matched)`);
      }
    } catch (err) {
      console.log(`ERROR: ${hookFile} - ${err.message}`);
    }
  }

  console.log(`\nSummary: ${totalFixed} fixed, ${totalSkipped} skipped, ${HOOKS_WITH_UNSAFE_STDIN.length - totalFixed - totalSkipped} unchanged`);
}

main();
