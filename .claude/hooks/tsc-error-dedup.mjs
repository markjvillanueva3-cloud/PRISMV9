#!/usr/bin/env node
// tier: T3
/**
 * tsc-error-dedup.mjs — PostToolUse Bash hook.
 *
 * Detects TypeScript compiler output and emits a CONDENSED summary as
 * additionalContext. Original output still appears in the transcript, but
 * the summary gives Claude a digested view that's easier to act on.
 *
 * Detection: stdout contains lines matching `(file):(line):(col) - error TS\d+:`
 * which is the canonical tsc error format.
 *
 * Condensing strategy:
 *   - Count total errors
 *   - Group by file (top 5)
 *   - Group by error code (top 5 unique signatures with first occurrence)
 *   - Emit summary, omit any error after the 10th unique signature
 *
 * No-op cases (pass-through, no inject):
 *   - Not a Bash tool
 *   - Output has zero TS errors
 *   - Output already small (< 800 chars — Claude will read it all anyway)
 *
 * Exit: always {continue: true}; never blocks.
 *
 * @hook PostToolUse:Bash
 */

import * as fs from "node:fs";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}

function emit(obj) { process.stdout.write(JSON.stringify(obj)); }

function main() {
  const stdin = readStdinSafe();
  // Default: pass through
  const passthrough = () => emit({ continue: true });

  if (!stdin) return passthrough();
  if (stdin.tool_name !== "Bash") return passthrough();
  // tool_response shape varies across Claude Code versions; try common keys.
  const out = stdin.tool_response?.output
    ?? stdin.tool_response?.stdout
    ?? stdin.tool_response?.content
    ?? stdin.tool_use_result
    ?? "";
  if (typeof out !== "string" || out.length < 800) return passthrough();

  // Two canonical tsc error formats:
  //   parens style: `path(line,col): error TSnnnn: message`
  //   colon style:  `path:line:col - error TSnnnn: message`
  // Lazy `+?` with `(?:^|\n)` anchor backtracks pathologically — separate
  // regexes are simpler and faster than a unified greedy one.
  const errors = [];
  const HARD_CAP = 5000;
  const parensRe = /([^\n(]+?)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)/g;
  let m;
  while ((m = parensRe.exec(out)) !== null) {
    errors.push({ file: m[1].trim(), line: +m[2], col: +m[3], code: m[4], msg: m[5].trim() });
    if (errors.length > HARD_CAP) break;
  }
  const colonRe = /([^\n:]+?):(\d+):(\d+)\s*-\s*error\s+(TS\d+):\s*(.+)/g;
  while ((m = colonRe.exec(out)) !== null) {
    errors.push({ file: m[1].trim(), line: +m[2], col: +m[3], code: m[4], msg: m[5].trim() });
    if (errors.length > HARD_CAP) break;
  }
  if (errors.length === 0) return passthrough();

  // Group by file
  const byFile = new Map();
  for (const e of errors) byFile.set(e.file, (byFile.get(e.file) ?? 0) + 1);
  const topFiles = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Group by error code (signature)
  const bySig = new Map();
  for (const e of errors) {
    if (!bySig.has(e.code)) bySig.set(e.code, { count: 0, sample: e });
    bySig.get(e.code).count++;
  }
  const topSigs = [...bySig.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5);

  const lines = [
    `TSC summary: ${errors.length} error(s) across ${byFile.size} file(s).`,
    `Top files:`,
    ...topFiles.map(([f, n]) => `  ${n.toString().padStart(4)} × ${f}`),
    `Top error codes:`,
    ...topSigs.map(([code, info]) =>
      `  ${info.count.toString().padStart(4)} × ${code} — eg. ${info.sample.file}:${info.sample.line} ${info.sample.msg.slice(0, 100)}`,
    ),
  ];

  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: lines.join("\n"),
    },
  });
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
