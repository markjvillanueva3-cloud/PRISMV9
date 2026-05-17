#!/usr/bin/env node
/**
 * claude-md-weight.mjs — re-runnable CLAUDE.md token-weight measurement.
 *
 * META artifact of the 2026-05-17 /forge-audit-v2 "high-ROI quick fixes"
 * audit (slot bravo, claude-339c8ff7). A one-shot audit rots in 30 days; this
 * compounds — re-run it to confirm a compression actually landed and to catch
 * CLAUDE.md re-bloating past its own stated thresholds.
 *
 * CLAUDE.md is auto-loaded into EVERY chat, EVERY session, fleet-wide (up to
 * 13 concurrent). Its own RULES section states compliance COLLAPSES past ~200
 * lines. Dated `- YYYY-MM-DD |` log/regression lines are append-only history
 * that belongs in git + wiki, not in every context window.
 *
 * Usage:
 *   node scripts/claude-md-weight.mjs            # human-readable
 *   node scripts/claude-md-weight.mjs --json     # machine-readable
 * Exit: 0 = both files within budget · 1 = at least one over a threshold.
 */

import { readFileSync } from "node:fs";

// Files audited. Project CLAUDE.md is the heavy hitter (in-repo, per-chat).
const TARGETS = [
  { label: "project", path: "H:/prism/CLAUDE.md" },
  { label: "global", path: "C:/Users/wompu/.claude/CLAUDE.md" },
];
// CLAUDE.md's own doctrine: compliance collapses past ~200 lines. Treat 200
// as the line budget; bytes budget is a derived ~40KB soft ceiling (200 lines
// of dense pointer prose ≈ 40KB).
const LINE_BUDGET = 200;
const BYTE_BUDGET = 40960;
// A dated log line: `- 2026-05-17 | ...` — append-only history, not doctrine.
const DATED_LOG_RE = /^- 20\d\d-\d\d-\d\d \|/;

function analyze(path) {
  let text;
  try { text = readFileSync(path, "utf8"); }
  catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
  const lines = text.split(/\r?\n/);
  const totalBytes = Buffer.byteLength(text, "utf8");
  let datedLogLines = 0, datedLogBytes = 0;
  for (const ln of lines) {
    if (DATED_LOG_RE.test(ln)) { datedLogLines++; datedLogBytes += Buffer.byteLength(ln, "utf8") + 1; }
  }
  // Section weights (## / # headed blocks).
  const sections = [];
  let cur = { name: "(preamble)", bytes: 0, lines: 0 };
  for (const ln of lines) {
    if (/^#{1,2} /.test(ln)) { sections.push(cur); cur = { name: ln.slice(0, 64), bytes: 0, lines: 0 }; }
    cur.bytes += Buffer.byteLength(ln, "utf8") + 1;
    cur.lines++;
  }
  sections.push(cur);
  sections.sort((a, b) => b.bytes - a.bytes);
  return {
    ok: true,
    path,
    totalBytes,
    totalLines: lines.length,
    lineBudget: LINE_BUDGET,
    byteBudget: BYTE_BUDGET,
    overLineBudget: lines.length > LINE_BUDGET,
    overByteBudget: totalBytes > BYTE_BUDGET,
    datedLogLines,
    datedLogBytes,
    datedLogPct: totalBytes > 0 ? datedLogBytes / totalBytes : 0,
    topSections: sections.slice(0, 8).map((s) => ({ name: s.name, bytes: s.bytes, lines: s.lines })),
  };
}

function main() {
  const asJson = process.argv.includes("--json");
  const results = TARGETS.map((t) => ({ label: t.label, ...analyze(t.path) }));
  const anyOver = results.some((r) => r.ok && (r.overLineBudget || r.overByteBudget));

  if (asJson) {
    process.stdout.write(JSON.stringify({ generatedAt: new Date().toISOString(), anyOver, results }, null, 2));
  } else {
    process.stdout.write("CLAUDE.md token-weight audit\n" + "=".repeat(48) + "\n");
    for (const r of results) {
      if (!r.ok) { process.stdout.write(`  ${r.label}: ERROR ${r.error}\n`); continue; }
      const flag = r.overLineBudget || r.overByteBudget ? " ⚠ OVER BUDGET" : " ✓";
      process.stdout.write(
        `\n[${r.label}] ${r.path}${flag}\n` +
        `  ${r.totalBytes} B / ${r.totalLines} lines (budget ${r.byteBudget} B / ${r.lineBudget} ln)\n` +
        `  dated log lines: ${r.datedLogLines} = ${r.datedLogBytes} B (${(r.datedLogPct * 100).toFixed(1)}% of file — belongs in git/wiki)\n` +
        `  heaviest sections:\n` +
        r.topSections.map((s) => `    ${String(s.bytes).padStart(7)} B / ${String(s.lines).padStart(3)} ln  ${s.name}`).join("\n") + "\n"
      );
    }
  }
  process.exit(anyOver ? 1 : 0);
}

main();
