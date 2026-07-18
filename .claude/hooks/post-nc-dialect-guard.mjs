#!/usr/bin/env node
// tier: T2
/**
 * post-nc-dialect-guard.mjs — PostToolUse hook (Edit|Write|MultiEdit)
 *
 * When an emitted NC / G-code file (.nc/.min/.eia/.tap/.ngc/.h/.htc/.gcode/.pgm)
 * is written or edited, auto-runs the static dialect/safety linter
 * (scripts/post-nc-dialect-lint.mjs) and surfaces any findings as advisory
 * additionalContext. Catches controller-dialect mismatches — the post-processor
 * domain's #1 prove-out failure — at emit time, before NC reaches a machine.
 *
 * DISTINCT from auto-lint-post-edit.mjs (that runs TS eslint on .ts source).
 * This lints NC TEXT against G-code dialect rules. A `.cps` (Fusion post
 * definition / JavaScript) is intentionally NOT matched — it is not emitted NC.
 *
 * Advisory only — ALWAYS exits 0, never blocks an edit. Bounded: linter timeout,
 * stdin cap, top-N findings shown.
 *
 * Disable: PRISM_POST_NC_DIALECT_GUARD_DISABLE=1
 *
 * Authored 2026-05-29 by slot:echo (claude-223d9a61).
 */

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const LINTER = "H:/prism/scripts/post-nc-dialect-lint.mjs";
const NC_EXT = /\.(nc|min|eia|tap|ngc|gcode|pgm|h|htc)$/i;
const MAX_FINDINGS = 12;
const LINT_TIMEOUT_MS = 2500;
const MAX_STDIN_BYTES = 262144;

function done(obj) {
  try { process.stdout.write(JSON.stringify(obj)); } catch { /* ignore */ }
  process.exit(0); // never block
}
const quiet = () => done({ continue: true, suppressOutput: true });

if (process.env.PRISM_POST_NC_DIALECT_GUARD_DISABLE === "1") quiet();

// bounded stdin read
let input = {};
try {
  const raw = readFileSync(0, "utf8");
  if (raw && raw.length <= MAX_STDIN_BYTES) input = JSON.parse(raw);
} catch { quiet(); }

const ti = input.tool_input || {};
const filePath = ti.file_path || ti.filePath || input.file_path || "";
if (!filePath || !NC_EXT.test(filePath)) quiet();      // not an NC file → silent
if (!existsSync(LINTER)) quiet();                       // linter missing → silent
const abs = path.resolve(filePath);
if (!existsSync(abs)) quiet();                          // file gone → silent

let parsed;
try {
  const out = execFileSync(process.execPath, [LINTER, abs, "--json"], { windowsHide: true,
    encoding: "utf8", timeout: LINT_TIMEOUT_MS, stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: 8 * 1024 * 1024,
  });
  parsed = JSON.parse(out);
} catch (e) {
  // execFileSync throws on non-zero exit (ERROR findings present) — its stdout
  // still holds the JSON report; recover it. Any other failure → silent.
  try { parsed = JSON.parse(e.stdout || ""); } catch { quiet(); }
}

const res = parsed && parsed.results && parsed.results[0];
if (!res || !Array.isArray(res.findings) || res.findings.length === 0) quiet();

const errN = (res.counts && res.counts.ERROR) || 0;
const warnN = (res.counts && res.counts.WARN) || 0;
if (errN === 0 && warnN === 0) quiet(); // only INFO → don't nag

const base = path.basename(abs);
const shown = res.findings
  .filter((f) => f.severity === "ERROR" || f.severity === "WARN")
  .slice(0, MAX_FINDINGS);
const lines = shown.map((f) => `  • L${f.line} [${f.severity}] ${f.rule} — ${f.message}`);
const more = (errN + warnN) > shown.length ? `\n  …and ${(errN + warnN) - shown.length} more` : "";

const ctx =
  `## 🛠 NC dialect lint — ${base} (dialect=${res.dialect}${res.dialectKnown ? "" : " · unknown"})\n` +
  `${errN} error · ${warnN} warn\n` +
  lines.join("\n") + more +
  `\n_Full: \`node H:/prism/scripts/post-nc-dialect-lint.mjs ${JSON.stringify(filePath)} --dialect ${res.dialect}\` · /post-nc-lint · disable PRISM_POST_NC_DIALECT_GUARD_DISABLE=1_`;

done({
  continue: true,
  suppressOutput: true,
  hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: ctx },
});
