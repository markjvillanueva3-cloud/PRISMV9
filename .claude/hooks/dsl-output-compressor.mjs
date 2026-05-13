#!/usr/bin/env node
// tier: T3
/**
 * dsl-output-compressor.mjs — PostToolUse hook (any tool).
 *
 * Quantifies how much of a tool's output is predictable boilerplate noise
 * vs actionable signal. Emits a noise-summary so Claude knows the signal-
 * to-noise ratio and can choose to ignore the boilerplate sections.
 *
 * Patterns considered noise:
 *   - rtk no-hook installation banner
 *   - Shell-cwd-reset notices
 *   - Git LF/CRLF working-copy warnings
 *   - Husky pre-commit v10.0.0 deprecation notice
 *   - Lines repeated ≥ 3× (banner spam)
 *
 * Only fires when output is large enough AND noise ratio is non-trivial
 * (else the inject would itself be noise).
 *
 * @hook PostToolUse:*
 */

import * as fs from "node:fs";

const MIN_OUTPUT_SIZE = 500;
const MIN_NOISE_PCT = 15; // skip inject if noise < 15% of output
const REPEAT_THRESHOLD = 3;

const NOISE_PATTERNS = [
  { name: "rtk-banner", re: /^\[rtk\] \/!\\ No hook installed.*$/m },
  { name: "shell-cwd-reset", re: /^Shell cwd was reset to .*$/m },
  { name: "git-lf-crlf", re: /^warning: in the working copy of '.*', LF will be replaced by CRLF.*$/m },
  { name: "husky-v10-deprecation", re: /^Please remove the following two lines from H:\\prism\\.husky\/pre-commit/m },
];

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
  const passthrough = () => emit({ continue: true });
  if (!stdin) return passthrough();

  const out = stdin.tool_response?.output
    ?? stdin.tool_response?.stdout
    ?? stdin.tool_response?.content
    ?? "";
  if (typeof out !== "string" || out.length < MIN_OUTPUT_SIZE) return passthrough();

  const totalBytes = out.length;
  const noiseCounts = {};
  // Track which line indexes have been claimed by a noise pattern so the
  // repeat-line tally below doesn't double-count (rtk-banner appearing 6×
  // would otherwise be counted by both the named-pattern AND repeat-line
  // accountants — yielded 168% noise in initial testing).
  const lines = out.split("\n");
  const claimed = new Array(lines.length).fill(false);
  let noiseBytes = 0;

  // Per-pattern noise accounting: walk lines once, mark claimed.
  for (let i = 0; i < lines.length; i++) {
    for (const { name, re } of NOISE_PATTERNS) {
      // Use single-line variant: re was multiline-anchored, but here we test
      // each line independently.
      const lineRe = new RegExp(re.source.replace(/^\^|\$$/g, ""));
      if (lineRe.test(lines[i])) {
        claimed[i] = true;
        noiseBytes += lines[i].length + 1;
        noiseCounts[name] = (noiseCounts[name] ?? 0) + 1;
        break;
      }
    }
  }

  // Repeat-line spam — only count UNCLAIMED lines, savings = (count-1) * len
  const lineFirstIdx = new Map();
  const lineCount = new Map();
  for (let i = 0; i < lines.length; i++) {
    if (claimed[i]) continue;
    const t = lines[i];
    if (t.trim().length < 4) continue; // skip blanks/dividers
    if (!lineFirstIdx.has(t)) lineFirstIdx.set(t, i);
    lineCount.set(t, (lineCount.get(t) ?? 0) + 1);
  }
  let repeatDistinct = 0;
  for (const [t, n] of lineCount) {
    if (n >= REPEAT_THRESHOLD) {
      noiseBytes += (n - 1) * (t.length + 1);
      repeatDistinct++;
    }
  }
  if (repeatDistinct > 0) noiseCounts["repeated-lines"] = repeatDistinct;

  const noisePct = (noiseBytes / totalBytes) * 100;
  if (noisePct < MIN_NOISE_PCT) return passthrough();

  const breakdown = Object.entries(noiseCounts)
    .map(([name, n]) => `${name}×${n}`)
    .join(", ");

  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: `dsl-output-compressor: ~${noisePct.toFixed(0)}% boilerplate (${noiseBytes}/${totalBytes} bytes) — ${breakdown}. Focus on signal lines.`,
    },
  });
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
