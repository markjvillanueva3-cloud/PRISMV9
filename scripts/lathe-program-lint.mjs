#!/usr/bin/env node
/**
 * lathe-program-lint.mjs — CLI for the whiskey lathe PHYSICS/SAFETY linter (slot:whiskey)
 *
 * Static, MCP-independent. Lints turning G-code TEXT (.nc/.MIN/.eia/.ssb) — or a
 * turning program-PLAN JSON (--plan) — against the 8 validated lathe gotchas. Runs
 * in milliseconds when the MCP server (port 3100) is down, so it is the cheap
 * pre-flight before the heavier MCP `lathe_validate_program` round-trip.
 *
 * Brain: scripts/lib/lathe-gcode-lint.mjs (pure, tested). Sibling: post-nc-dialect-lint.mjs
 * (slot:echo) lints DIALECT SYNTAX — run both; they compose.
 *
 * Usage:
 *   node scripts/lathe-program-lint.mjs <file.nc ...> [--json] [--strict] [--quiet] [--controller <name>]
 *   cat program.nc | node scripts/lathe-program-lint.mjs
 *   node scripts/lathe-program-lint.mjs --plan plan.json [--json] [--strict]
 *
 * Exit: 0 = no ERROR · 1 = ≥1 ERROR (or any finding with --strict) · 2 = bad invocation
 *
 * Authored 2026-05-29 by slot:whiskey (claude-57dfea65).
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  lintLatheGcode, lintLathePlan, formatFindings, maxSeverity, SEVERITY_RANK,
} from "./lib/lathe-gcode-lint.mjs";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB read cap — guards a runaway read

function readStdin() {
  try { return readFileSync(0, "utf8"); } catch { return ""; }
}

function usage() {
  process.stderr.write([
    "lathe-program-lint — turning-program PHYSICS/SAFETY linter (slot:whiskey)",
    "Usage:",
    "  node scripts/lathe-program-lint.mjs <file.nc ...> [--json] [--strict] [--quiet] [--controller <name>]",
    "  cat program.nc | node scripts/lathe-program-lint.mjs",
    "  node scripts/lathe-program-lint.mjs --plan plan.json [--json] [--strict]",
    "Exit: 0 = no ERROR · 1 = >=1 ERROR (or any finding with --strict) · 2 = bad invocation",
  ].join("\n") + "\n");
}

export function main(argv) {
  const args = argv.slice(2);
  const opts = { json: false, strict: false, quiet: false, plan: null, controller: "fanuc" };
  const files = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--json") opts.json = true;
    else if (a === "--strict") opts.strict = true;
    else if (a === "--quiet") opts.quiet = true;
    else if (a === "--plan") opts.plan = args[++i];
    else if (a === "--controller") opts.controller = args[++i];
    else if (a === "-h" || a === "--help") { usage(); return 0; }
    else if (a.startsWith("--")) { process.stderr.write(`unknown flag: ${a}\n`); return 2; }
    else files.push(a);
  }

  const all = []; // [{ file, findings }]
  try {
    if (opts.plan) {
      if (!existsSync(opts.plan)) { process.stderr.write(`plan not found: ${opts.plan}\n`); return 2; }
      let plan;
      try { plan = JSON.parse(readFileSync(opts.plan, "utf8")); }
      catch (e) { process.stderr.write(`invalid plan JSON: ${e.message}\n`); return 2; }
      all.push({ file: opts.plan, findings: lintLathePlan(plan) });
    }
    for (const f of files) {
      if (!existsSync(f)) { process.stderr.write(`file not found: ${f}\n`); return 2; }
      if (statSync(f).size > MAX_BYTES) { process.stderr.write(`file too large (>8MB): ${f}\n`); return 2; }
      all.push({ file: f, findings: lintLatheGcode(readFileSync(f, "utf8"), { controller: opts.controller }) });
    }
    if (!opts.plan && !files.length) {
      const text = readStdin();
      if (!text.trim()) { usage(); return 2; }
      all.push({ file: "<stdin>", findings: lintLatheGcode(text, { controller: opts.controller }) });
    }
  } catch (e) {
    process.stderr.write(`lint error: ${e.message}\n`); return 2;
  }

  const flat = all.flatMap((r) => r.findings);
  const fail = maxSeverity(flat) >= SEVERITY_RANK.ERROR || (opts.strict && flat.length > 0);

  if (opts.json) {
    process.stdout.write(JSON.stringify({
      ok: !fail,
      total: flat.length,
      errors: flat.filter((f) => f.severity === "ERROR").length,
      warnings: flat.filter((f) => f.severity === "WARN").length,
      infos: flat.filter((f) => f.severity === "INFO").length,
      results: all,
    }, null, 2) + "\n");
  } else {
    for (const r of all) {
      const out = formatFindings(r.findings, { quiet: opts.quiet, file: r.file });
      if (out) process.stdout.write(out + "\n");
    }
  }
  return fail ? 1 : 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) process.exit(main(process.argv));
