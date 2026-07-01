#!/usr/bin/env node
// tier: T3  (PostToolUse advisory — auto-lint lathe G-code writes)
// lathe-gcode-lint-guard.mjs  (WHISKEY-LATHE-LINT, operator 2026-05-29, slot:whiskey)
//
// Auto-runs the whiskey lathe physics/safety linter on any lathe NC file the chat
// Writes/Edits. ADVISORY + fail-soft + NON-BLOCKING (always exit 0) — it surfaces
// ERROR/WARN findings as additionalContext, never blocks the write. Mirrors the
// delta cad-step-lint-guard pattern (PostToolUse, advisory, delegates to a pure lib).
//
// Gates (avoid firing on mill programs / unrelated files):
//   1. tool ∈ {Write, Edit, MultiEdit}
//   2. file extension ∈ {.nc,.min,.eia,.ssb,.cnc,.ncl,.tap}
//   3. content carries a turning marker (G96/G97/G50 S/G70/G71/G75/G76)
//
// The linter lib resolves from <PRISM_ROOT>/scripts/lib/lathe-gcode-lint.mjs.
// Before slot/whiskey merges to the shared tree the lib is not at that path → the
// dynamic import fails → graceful silent no-op (R12-honest: it activates on merge).
// Test pre-merge with PRISM_ROOT=H:/prism-slot-whiskey.
//
// Disable: PRISM_LATHE_LINT_GUARD_DISABLE=1
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const LATHE_EXT = new Set([".nc", ".min", ".eia", ".ssb", ".cnc", ".ncl", ".tap"]);
const TURN_MARKER = /\bG96\b|\bG97\b|\bG50\s*S|\bG70\b|\bG71\b|\bG75\b|\bG76\b/;

async function main() {
  if (process.env.PRISM_LATHE_LINT_GUARD_DISABLE === "1") return;

  let raw = "";
  try { raw = fs.readFileSync(0, "utf8"); } catch { return; }
  let j = {};
  try { j = JSON.parse(raw || "{}"); } catch { return; }

  const tool = String(j.tool_name || "");
  if (!/^(Write|Edit|MultiEdit)$/.test(tool)) return;

  const inp = j.tool_input || {};
  const fp = String(inp.file_path || "");
  if (!fp) return;
  if (!LATHE_EXT.has(path.extname(fp).toLowerCase())) return;

  // Prefer the post-write file on disk (final content); fall back to the tool payload.
  // Size cap mirrors the CLI's 8MB guard — never read a runaway file into the hook.
  let content = "";
  try { if (fs.statSync(fp).size <= 8 * 1024 * 1024) content = fs.readFileSync(fp, "utf8"); } catch { /* not on disk — use payload */ }
  if (!content) {
    if (typeof inp.content === "string") content = inp.content;
    else if (typeof inp.new_string === "string") content = inp.new_string;
    else if (Array.isArray(inp.edits)) content = inp.edits.map((e) => (e && e.new_string) || "").join("\n");
  }
  if (!content || !TURN_MARKER.test(content.toUpperCase())) return;

  const root = process.env.PRISM_ROOT || "H:/prism";
  const libPath = path.join(root, "scripts", "lib", "lathe-gcode-lint.mjs");
  let lib;
  try { lib = await import(pathToFileURL(libPath).href); } catch { return; } // pre-merge → no-op

  let findings = [];
  try { findings = lib.lintLatheGcode(content, {}); } catch { return; }
  const errs = findings.filter((f) => f.severity === "ERROR");
  const warns = findings.filter((f) => f.severity === "WARN");
  if (!errs.length && !warns.length) return; // only INFO (or clean) → stay quiet

  const lines = findings
    .filter((f) => f.severity !== "INFO")
    .slice(0, 6)
    .map((f) => `- **${f.severity}** [${f.rule}] ${f.msg}`);
  const ctx = [
    `## 🪛 Lathe-program lint — ${path.basename(fp)} (${errs.length} ERROR · ${warns.length} WARN)`,
    ...lines,
    `_Full report: \`node scripts/lathe-program-lint.mjs ${fp}\` · skill \`/lathe-lint\` · advisory (non-blocking) · disable \`PRISM_LATHE_LINT_GUARD_DISABLE=1\`_`,
  ].join("\n");

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: ctx },
  }));
}

main().then(() => process.exit(0)).catch(() => process.exit(0));
