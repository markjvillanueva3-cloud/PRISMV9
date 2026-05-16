#!/usr/bin/env node
// tier: T2
// matcher: PostToolUse Bash|Edit|Write|MultiEdit
// purpose: Inject learning-keyword nudge when tool output contains mistake/bug/error/fix patterns
/**
 * mistake-keyword-flag.mjs — PostToolUse advisory hook
 *
 * MISTAKE-LEARNING-LOOP: fires on Bash|Edit|Write|MultiEdit tool RESULTS
 * (PostToolUse) when the tool output or the content the chat just wrote
 * contains learning-trigger keywords (mistake/error/bug/fix/regression/
 * P0/P1/FAIL/HOSTILE/EXPLOITABLE/footgun/oops/etc.) AND we don't already
 * have a recent memo capturing the pattern.
 *
 * Output: hookSpecificOutput.additionalContext — a tiny nudge to capture
 * the lesson. Non-blocking by design.
 *
 * KNOBS:
 *   PRISM_MISTAKE_FLAG_DISABLE=1 — silence entirely
 *   PRISM_MISTAKE_FLAG_MIN_SEVERITY=critical|warn|info — default 'warn'
 *   PRISM_MISTAKE_FLAG_COOLDOWN_SEC=N — per-keyword cooldown (default 600)
 *
 * SAFETY: always exit 0; never throws; never blocks.
 * Reads stdin (Claude hook protocol JSON), prints empty JSON on no-op,
 * or { hookSpecificOutput: { additionalContext: ... } } on hit.
 *
 * SCRUTINY: per-file gate (2 reviewer arms).
 */

import fs from "node:fs";
import path from "node:path";

const DISABLED = process.env.PRISM_MISTAKE_FLAG_DISABLE === "1";
const MIN_SEVERITY = (process.env.PRISM_MISTAKE_FLAG_MIN_SEVERITY || "warn").toLowerCase();
const COOLDOWN_SEC = Number(process.env.PRISM_MISTAKE_FLAG_COOLDOWN_SEC || 600);
const SEVERITY_ORDER = { info: 0, warn: 1, critical: 2 };

// Lightweight keyword catalog (subset of scan script — hook stays self-contained
// to avoid module-load overhead on hot path). Severity = info|warn|critical.
const HOT_KEYWORDS = [
  { re: /\bP0\b/,                    sev: "critical", why: "P0 — capture root cause" },
  { re: /\bP1\b/,                    sev: "warn",     why: "P1 — capture if surprising" },
  { re: /\bFAIL(ED)?\b/i,            sev: "warn",     why: "explicit failure" },
  { re: /\bHOSTILE\b/i,              sev: "critical", why: "hostile-payload class" },
  { re: /\bEXPLOITABLE\b/i,          sev: "critical", why: "security gap" },
  { re: /\bVULNERABLE\b/i,           sev: "critical", why: "security gap" },
  { re: /\bcorrupt(ed|ion)?\b/i,     sev: "warn",     why: "state corruption" },
  { re: /\bregression\b/i,           sev: "warn",     why: "regression" },
  { re: /\bhijack(ed)?\b/i,          sev: "warn",     why: "hijack pattern" },
  { re: /\bfootgun\b/i,              sev: "warn",     why: "footgun observed" },
  { re: /\bgot burned\b/i,           sev: "warn",     why: "expensive lesson" },
  { re: /\bfalse[- ]positive\b/i,    sev: "warn",     why: "false-positive — adjust detector" },
  { re: /\bfalse[- ]negative\b/i,    sev: "warn",     why: "false-negative — coverage gap" },
];

const COOLDOWN_FILE = path.join(process.env.TEMP || "/tmp", "prism-mistake-flag-cooldown.json");

function readCooldown() {
  try { return JSON.parse(fs.readFileSync(COOLDOWN_FILE, "utf8")); }
  catch { return {}; }
}

function writeCooldown(state) {
  try { fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(state)); }
  catch { /* fail-silent */ }
}

function readStdin() {
  try { return fs.readFileSync(0, "utf8"); }
  catch { return ""; }
}

function safeJsonParse(s) {
  try { return JSON.parse(s); }
  catch { return null; }
}

function meetsMinSeverity(sev) {
  return (SEVERITY_ORDER[sev] ?? 0) >= (SEVERITY_ORDER[MIN_SEVERITY] ?? 1);
}

/**
 * Pure scan over arbitrary text. Returns the FIRST keyword hit at or above
 * MIN_SEVERITY (advisory hooks don't need to enumerate everything — one
 * nudge per tool-call is plenty).
 */
export function findFirstHit(text) {
  if (!text || typeof text !== "string") return null;
  for (const entry of HOT_KEYWORDS) {
    if (!meetsMinSeverity(entry.sev)) continue;
    const m = entry.re.exec(text);
    if (m) {
      const start = Math.max(0, m.index - 40);
      const end = Math.min(text.length, m.index + m[0].length + 80);
      return {
        match: m[0],
        sev: entry.sev,
        why: entry.why,
        context: text.slice(start, end).replace(/\s+/g, " ").trim(),
      };
    }
  }
  return null;
}

/**
 * Pure cooldown check — exposed for tests.
 * Returns true if this keyword fired within COOLDOWN_SEC seconds.
 */
export function isOnCooldown(cooldownState, keyword, nowMs = Date.now(), cooldownSec = COOLDOWN_SEC) {
  const lastMs = cooldownState[keyword];
  if (typeof lastMs !== "number") return false;
  return (nowMs - lastMs) < (cooldownSec * 1000);
}

/**
 * Extract the most-recently-emitted text payload from a Claude hook stdin
 * blob. PostToolUse delivers tool_result content; we sniff the common
 * fields without bombing on shape variance.
 */
export function extractScanText(payload) {
  if (!payload || typeof payload !== "object") return "";
  // Common shapes: tool_response.{content,output,stdout}, tool_input.{content,file_text},
  // or top-level message/result. Concatenate everything stringy.
  const parts = [];
  const candidates = [
    payload.tool_response?.content,
    payload.tool_response?.output,
    payload.tool_response?.stdout,
    payload.tool_response?.stderr,
    payload.tool_response?.error,
    payload.tool_input?.content,
    payload.tool_input?.file_text,
    payload.tool_input?.command,
    payload.tool_input?.new_string,
    payload.message,
    payload.result,
  ];
  for (const c of candidates) {
    if (typeof c === "string") parts.push(c);
  }
  return parts.join("\n");
}

function buildNudge(hit) {
  const sevLabel = hit.sev === "critical" ? "🚨 CRITICAL" : (hit.sev === "warn" ? "⚠ WARN" : "ℹ INFO");
  return [
    `─── 🧠 learn-from-mistake ─────────────────────────`,
    `${sevLabel} keyword detected: "${hit.match}"`,
    `  why: ${hit.why}`,
    `  context: "${hit.context.slice(0, 160)}"`,
    `  capture: /learn-from-mistake  OR  write memo at`,
    `           C:/Users/wompu/.claude/projects/H--prism/memory/`,
    `           feedback_<slug>.md (Why: + How to apply: structure)`,
    `─────────────────────────────────────────────────────`,
  ].join("\n");
}

function main() {
  if (DISABLED) {
    process.stdout.write("{}");
    process.exit(0);
  }
  const raw = readStdin();
  const payload = safeJsonParse(raw) || {};
  const text = extractScanText(payload);
  const hit = findFirstHit(text);
  if (!hit) {
    process.stdout.write("{}");
    process.exit(0);
  }

  // Cooldown — per keyword.
  const cd = readCooldown();
  const key = hit.match.toLowerCase();
  if (isOnCooldown(cd, key)) {
    process.stdout.write("{}");
    process.exit(0);
  }
  cd[key] = Date.now();
  writeCooldown(cd);

  const output = {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: buildNudge(hit),
    },
    continue: true,
    suppressOutput: false,
  };
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

// Run unless imported (for tests).
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
    process.argv[1]?.endsWith("mistake-keyword-flag.mjs")) {
  main();
}
