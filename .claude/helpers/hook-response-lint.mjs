#!/usr/bin/env node
/**
 * hook-response-lint.mjs — validates that every hook emits a Claude Code
 * compliant response for its wired event.
 *
 * Invocation:
 *   node H:/prism/.claude/helpers/hook-response-lint.mjs          # report + exit code
 *   node H:/prism/.claude/helpers/hook-response-lint.mjs --json   # machine-readable
 *   node H:/prism/.claude/helpers/hook-response-lint.mjs --fix-suggest  # show patch snippets
 *
 * Lint rules (all warn, none mutate):
 *   R1. Hook emits `{}` (empty JSON) — schema-invalid. Use {continue:true}.
 *   R2. Hook emits `{decision:"allow"}` — deprecated legacy shape. Use {continue:true}.
 *   R3. Hook emits `{decision:"allow", message: ...}` — `message` field is
 *       silently dropped. Use {continue:true, hookSpecificOutput:{hookEventName,
 *       additionalContext}}.
 *   R4. Hook emits top-level `message: ...` in {continue:true} form — `message`
 *       is silently dropped. Use hookSpecificOutput.additionalContext.
 *   R5. Hook emits top-level `additionalContext: ...` without hookSpecificOutput
 *       wrapper — not appended to context on newer Claude Code builds.
 *   R6. Hook has `require(` inside ESM (.mjs) — ReferenceError at runtime.
 *   R7. Hook has `await import` in a non-async function — SyntaxError at load.
 *
 * Also reports any file that fails node --check (syntax error).
 *
 * NOTE: false positives are possible. Rules fire when the pattern appears as
 * a hook OUTPUT, not as input parsing. Review suggestions before applying.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DIRS = [
  "H:/prism/.claude/hooks",
  "H:/prism/.claude/helpers",
];

const SETTINGS = "H:/.claude/settings.json";

const WIRED = new Set();
function loadWiredHooks() {
  try {
    const s = JSON.parse(fs.readFileSync(SETTINGS, "utf-8"));
    for (const event of Object.keys(s.hooks || {})) {
      for (const block of s.hooks[event] || []) {
        for (const h of block.hooks || []) {
          const m = (h.command || "").match(/([A-Za-z0-9_.-]+\.mjs)/);
          if (m) WIRED.add(m[1]);
        }
      }
    }
  } catch { /* ignore */ }
}

function lintFile(fp) {
  const issues = [];
  const src = fs.readFileSync(fp, "utf-8");

  // Syntax check
  const check = spawnSync(process.execPath, ["--check", fp], { windowsHide: true, encoding: "utf-8" });
  if (check.status !== 0) {
    issues.push({ rule: "SYNTAX", severity: "error", snippet: (check.stderr || "").split("\n").slice(0, 2).join(" | ") });
    return issues;
  }

  // R1: stdout.write("{}") or console.log("{}")
  if (/stdout\.write\(\s*["']\{\}["']\s*\)|console\.log\(\s*["']\{\}["']\s*\)/.test(src)) {
    issues.push({ rule: "R1", severity: "error", snippet: "emits literal '{}' — should be JSON.stringify({continue:true})" });
  }
  // Also JSON.stringify({}) followed by write/log
  if (/(?:stdout\.write|console\.log)\(\s*JSON\.stringify\(\s*\{\s*\}\s*\)/.test(src)) {
    issues.push({ rule: "R1", severity: "error", snippet: "emits JSON.stringify({}) — should include continue:true" });
  }

  // R2: {decision: "allow"} alone (not wrapping reason for block / internal state)
  //     Only flag if it's emitted via stdout.write or console.log
  const emitContext = src.match(/(?:stdout\.write|console\.log)\([^)]*decision:\s*["']allow["'][^)]*\)/g) || [];
  for (const m of emitContext) {
    if (!m.includes("hookSpecificOutput") && !m.includes("continue")) {
      issues.push({ rule: "R2", severity: "warn", snippet: m.slice(0, 120) });
    }
  }

  // R3: {decision:"allow", message:} — emitted
  if (/(?:stdout\.write|console\.log)\([^)]*decision:\s*["']allow["'][^)]*message\s*:/.test(src)) {
    issues.push({ rule: "R3", severity: "error", snippet: "emits {decision:'allow', message: …} — message is silently dropped" });
  }

  // R4: {continue:true, message:} at stdout write
  if (/(?:stdout\.write|console\.log)\([^)]*continue:\s*true[^)]*,\s*message\s*:/.test(src)) {
    issues.push({ rule: "R4", severity: "error", snippet: "emits {continue:true, message: …} — use hookSpecificOutput.additionalContext instead" });
  }

  // R5: top-level additionalContext without hookSpecificOutput wrapper — emitted
  const topLevelCtx = src.match(/(?:stdout\.write|console\.log)\([^)]*\{[^}]*additionalContext[^}]*\}\s*\)/g) || [];
  for (const m of topLevelCtx) {
    if (!m.includes("hookSpecificOutput")) {
      issues.push({ rule: "R5", severity: "warn", snippet: "emits top-level additionalContext — wrap in hookSpecificOutput" });
    }
  }

  // R6: require( in .mjs
  if (fp.endsWith(".mjs") && /\brequire\(/.test(src)) {
    // Allow createRequire pattern
    if (!/createRequire/.test(src)) {
      issues.push({ rule: "R6", severity: "warn", snippet: "uses require() in .mjs — ReferenceError at runtime" });
    }
  }

  // R7: await import in non-async function (heuristic — any `function X() {` followed by await import before next function)
  const fnMatches = src.matchAll(/function\s+\w+\s*\([^)]*\)\s*\{/g);
  for (const m of fnMatches) {
    const start = m.index;
    const end = src.indexOf("\n}", start);
    const body = src.slice(start, end > 0 ? end : start + 500);
    if (/await\s+import\(/.test(body) && !/async\s+function|async\s*\(/.test(m[0])) {
      issues.push({ rule: "R7", severity: "error", snippet: "await import in non-async function — SyntaxError at load" });
      break;
    }
  }

  return issues;
}

function main() {
  loadWiredHooks();
  const argv = new Set(process.argv.slice(2));
  const jsonMode = argv.has("--json");

  const results = [];
  for (const dir of DIRS) {
    if (!fs.existsSync(dir)) continue;
    const walk = (d) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        if (entry.name.startsWith("_")) continue;
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        if (!entry.name.endsWith(".mjs")) continue;
        const issues = lintFile(full);
        if (issues.length > 0) {
          results.push({
            file: full,
            name: entry.name,
            wired: WIRED.has(entry.name),
            issues,
          });
        }
      }
    };
    walk(dir);
  }

  // Count
  const errCount = results.reduce((a, r) => a + r.issues.filter(i => i.severity === "error").length, 0);
  const warnCount = results.reduce((a, r) => a + r.issues.filter(i => i.severity === "warn").length, 0);

  if (jsonMode) {
    process.stdout.write(JSON.stringify({ errors: errCount, warnings: warnCount, files: results }, null, 2) + "\n");
  } else {
    console.log(`Hook response lint — ${results.length} files with issues`);
    console.log(`Errors: ${errCount}  |  Warnings: ${warnCount}`);
    console.log("");
    for (const r of results) {
      const wiredTag = r.wired ? "[WIRED]" : "[unused]";
      console.log(`  ${r.name} ${wiredTag}`);
      for (const iss of r.issues) {
        const icon = iss.severity === "error" ? "✗" : "⚠";
        console.log(`    ${icon} ${iss.rule}: ${iss.snippet.replace(/\s+/g, " ").slice(0, 140)}`);
      }
      console.log("");
    }
    if (errCount > 0) console.log(`Run with --json for machine-readable output. Errors block tool calls in strict Claude Code builds.`);
  }

  process.exit(errCount > 0 ? 1 : 0);
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
