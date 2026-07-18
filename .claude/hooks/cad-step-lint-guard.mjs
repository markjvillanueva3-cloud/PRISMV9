#!/usr/bin/env node
// tier: T3
// cad-step-lint-guard.mjs — PostToolUse (Write|Edit|MultiEdit)
// DELTA-CAD-GALAXY-SYNERGY/U-DELTA-STEP-LINT (slot:delta)
//
// When a *.step file is written/edited, auto-run cad-step-lint over it and
// surface any errors/warnings as an advisory. Catches delta's documented
// silent-failure modes (periodic B-spline, mm-not-inch unit, dangling refs,
// degenerate topology) at WRITE time instead of as a blank Fusion doc later.
//
// Advisory ONLY — never blocks (a lint finding is a heads-up, not a veto; the
// emitter may be mid-iteration). Fail-safe: any error → silent approve.
// Knob: PRISM_CAD_STEP_LINT_GUARD_DISABLE=1.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DISABLE = process.env.PRISM_CAD_STEP_LINT_GUARD_DISABLE === "1";

function approve(extra) {
  try { process.stdout.write(JSON.stringify({ continue: true, ...(extra || {}) })); } catch { /* fail-safe */ }
}

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = readFileSync(0, "utf8");
    if (!raw || !raw.trim()) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

// Resolve cad-step-lint.mjs across the slot worktree + main tree (the script
// lands in main only after golf merges slot/delta — until then it lives in the
// worktree). Returns the first existing candidate, or null.
function resolveLintScript() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "../../scripts/lib/cad-step-lint.mjs"),
    "H:/prism/scripts/lib/cad-step-lint.mjs",
    "H:/prism-slot-delta/scripts/lib/cad-step-lint.mjs",
  ];
  for (const c of candidates) {
    try { if (existsSync(c)) return c; } catch { /* keep trying */ }
  }
  return null;
}

function extractFilePath(input) {
  const ti = input && input.tool_input;
  if (!ti || typeof ti !== "object") return null;
  const fp = ti.file_path || ti.path || ti.notebook_path;
  return typeof fp === "string" ? fp : null;
}

async function main() {
  if (DISABLE) { approve(); return; }
  const input = readStdin();
  if (!input) { approve(); return; }

  const fp = extractFilePath(input);
  if (!fp || !/\.step$/i.test(fp)) { approve(); return; }     // only .step writes
  if (!existsSync(fp)) { approve(); return; }                  // file gone — nothing to lint

  const scriptPath = resolveLintScript();
  if (!scriptPath) { approve(); return; }                      // linter not present (pre-merge) → no-op

  let lintStep;
  try {
    ({ lintStep } = await import(pathToFileURL(scriptPath).href));
  } catch { approve(); return; }
  if (typeof lintStep !== "function") { approve(); return; }

  let res;
  try {
    res = lintStep(readFileSync(fp, "utf8"), { expectUnit: "inch" });
  } catch { approve(); return; }

  const findings = [...(res.errors || []), ...(res.warnings || [])];
  if (findings.length === 0) { approve(); return; }            // clean → silent

  const base = path.basename(fp);
  const head = res.ok
    ? `🔶 cad-step-lint: ${base} — ${res.warnings.length} warning(s) (advisory)`
    : `🔶 cad-step-lint: ${base} — ${res.errors.length} ERROR(s) — likely a silent-failure regression`;
  const body = findings.slice(0, 5).map((f) => `  • ${f}`).join("\n");
  approve({ systemMessage: `${head}\n${body}\n  (delta failure-mode guard; disable: PRISM_CAD_STEP_LINT_GUARD_DISABLE=1)` });
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]).replace(/\\/g, "/"))) {
  main().catch(() => approve());
}

export { resolveLintScript, extractFilePath };
