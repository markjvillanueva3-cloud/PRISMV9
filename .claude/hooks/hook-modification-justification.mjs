#!/usr/bin/env node
// tier: T0
/**
 * hook-modification-justification.mjs — PreToolUse:Edit|Write|MultiEdit gate.
 *
 * BLOCKS edits to any file under `.claude/hooks/`, `.claude/helpers/`, or
 * `.claude/settings.json` unless the change carries a justification:
 *
 *   1. The Edit's `new_string` (or Write's `content`) contains a `WHY:` block
 *      with at least 6 words explaining the reason for the change. Acceptable
 *      forms: `// WHY: <reason>`, `/* WHY: <reason> *\/`, `# WHY: <reason>`,
 *      or any line starting with `WHY:`.
 *
 *   2. OR a corresponding entry exists in
 *      state/shared/HOOK_CHANGE_JUSTIFICATIONS.jsonl written within the last
 *      JUSTIFICATION_WINDOW_MIN minutes (matched by file basename).
 *
 *   3. OR HOOK_LOCK_OVERRIDE=1 is set (audited to ledger as override).
 *
 * The intent is anti-thrash: hooks get repeatedly toggled on/off without a
 * clear reason, then we forget why and reintroduce the same bug. This gate
 * forces a forcing function — name the reason in writing, every time.
 *
 * Pure additive Edits/Writes that keep the file’s existing logic intact
 * (e.g. comment-only edits) still need the WHY: line — opting out is the
 * whole point.
 *
 * Override always logs to the ledger, so an audit trail exists even when
 * the gate is bypassed.
 *
 * INFRA-FIX scope.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const LEDGER = "H:/prism/state/shared/HOOK_CHANGE_JUSTIFICATIONS.jsonl";
const JUSTIFICATION_WINDOW_MIN = 5;
const MIN_WHY_WORDS = 6;
const MAX_LEDGER_BYTES = 2 * 1024 * 1024;

// Paths under these prefixes (project-relative) are gated.
const GATED_PREFIXES = [
  ".claude/hooks/",
  ".claude/helpers/",
];
// Specific files (also gated even if not under prefixes).
const GATED_FILES = new Set([
  ".claude/settings.json",
  "settings.json", // user-level $CLAUDE_HOME/settings.json
]);

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}

function emit(obj) { process.stdout.write(JSON.stringify(obj)); }

function normalize(p) {
  if (typeof p !== "string") return "";
  return p.replace(/\\/g, "/").toLowerCase();
}

function isGatedPath(rawPath) {
  const p = normalize(rawPath);
  if (!p) return false;
  for (const f of GATED_FILES) {
    if (p.endsWith("/" + f.toLowerCase()) || p.endsWith(f.toLowerCase())) return true;
  }
  for (const pre of GATED_PREFIXES) {
    if (p.includes(pre.toLowerCase())) return true;
  }
  return false;
}

function whyLineCount(text) {
  if (typeof text !== "string") return 0;
  // Match `WHY:` (case-insensitive) at start of line or after comment marker.
  const re = /(?:^|[\/\*\#\s])WHY:\s*(.+?)(?:$|\*\/)/gim;
  let total = 0;
  for (const m of text.matchAll(re)) {
    const reason = (m[1] ?? "").trim();
    const words = reason.split(/\s+/).filter(Boolean).length;
    if (words >= MIN_WHY_WORDS) total++;
  }
  return total;
}

function recentLedgerMatch(targetPath) {
  try {
    if (!fs.existsSync(LEDGER)) return null;
    const lines = fs.readFileSync(LEDGER, "utf8").split("\n").filter(Boolean);
    const cutoff = Date.now() - JUSTIFICATION_WINDOW_MIN * 60 * 1000;
    const targetBase = path.basename(normalize(targetPath));
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const r = JSON.parse(lines[i]);
        if (!r.ts) continue;
        if (new Date(r.ts).getTime() < cutoff) break; // older than window
        const ledgerBase = path.basename(normalize(r.file ?? ""));
        if (ledgerBase && ledgerBase === targetBase) return r;
      } catch { /* skip */ }
    }
    return null;
  } catch { return null; }
}

function appendLedger(record) {
  try {
    fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
    if (!fs.existsSync(LEDGER)) fs.writeFileSync(LEDGER, "");
    fs.appendFileSync(LEDGER, JSON.stringify(record) + "\n", "utf8");
    rotateIfNeeded();
  } catch { /* best-effort */ }
}

function rotateIfNeeded() {
  try {
    const st = fs.statSync(LEDGER);
    if (st.size <= MAX_LEDGER_BYTES) return;
    const lines = fs.readFileSync(LEDGER, "utf8").split("\n").filter(Boolean);
    const keep = lines.slice(Math.floor(lines.length / 3));
    fs.writeFileSync(LEDGER, keep.join("\n") + "\n", "utf8");
  } catch { /* best-effort */ }
}

function block(reason, filePath) {
  const human = [
    "🔒 HOOK-MODIFICATION-JUSTIFICATION-GATE — edit blocked.",
    "",
    `File: ${filePath}`,
    `Reason: ${reason}`,
    "",
    "To proceed, choose ONE:",
    "",
    `  (1) Add a WHY: line in your edit content with ≥${MIN_WHY_WORDS} words explaining`,
    "      what changed and why. Example:",
    "        // WHY: extend timeout from 5s to 30s — vitest JSON write was racing",
    "",
    "  (2) Pre-record the change in the ledger:",
    `      echo '{"ts":"'$(date -Iseconds)'","file":"${path.basename(filePath)}","reason":"<≥${MIN_WHY_WORDS}-word reason>","actor":"claude-<id>"}' \\`,
    `        >> ${LEDGER}`,
    `      Then retry within ${JUSTIFICATION_WINDOW_MIN} minutes.`,
    "",
    "  (3) Set HOOK_LOCK_OVERRIDE=1 (logged to ledger as override).",
    "",
    "This gate exists to stop hook thrash. Hooks repeatedly toggled without",
    "a written reason re-introduce already-fixed bugs.",
  ].join("\n");

  emit({
    continue: false,
    decision: "block",
    reason: human,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: human,
    },
  });
}

function extractEditPayloads(stdin) {
  const tn = stdin.tool_name;
  const ti = stdin.tool_input ?? {};
  if (tn === "Edit") {
    return [{ file_path: ti.file_path, content: ti.new_string ?? "" }];
  }
  if (tn === "Write") {
    return [{ file_path: ti.file_path, content: ti.content ?? "" }];
  }
  if (tn === "MultiEdit") {
    const edits = Array.isArray(ti.edits) ? ti.edits : [];
    return edits.map((e) => ({ file_path: ti.file_path, content: e.new_string ?? "" }));
  }
  return [];
}

function main() {
  const stdin = readStdinSafe();
  const passthrough = () => emit({ continue: true });
  if (!stdin) return passthrough();
  const tn = stdin.tool_name;
  if (tn !== "Edit" && tn !== "Write" && tn !== "MultiEdit") return passthrough();

  const payloads = extractEditPayloads(stdin);
  if (payloads.length === 0) return passthrough();

  // Only fire if ANY payload targets a gated path.
  const gatedPayloads = payloads.filter((p) => isGatedPath(p.file_path));
  if (gatedPayloads.length === 0) return passthrough();

  const filePath = gatedPayloads[0].file_path;

  // Override path — always log, always allow.
  if (process.env.HOOK_LOCK_OVERRIDE === "1") {
    appendLedger({
      ts: new Date().toISOString(),
      file: filePath,
      reason: "HOOK_LOCK_OVERRIDE=1 (env override)",
      override: true,
      session_id: stdin.session_id ?? null,
      tool: tn,
    });
    return passthrough();
  }

  // WHY: block in any gated payload’s content.
  const totalWhy = gatedPayloads.reduce((acc, p) => acc + whyLineCount(p.content), 0);
  if (totalWhy >= 1) {
    appendLedger({
      ts: new Date().toISOString(),
      file: filePath,
      reason: "WHY: block detected in edit content",
      inline_why: true,
      session_id: stdin.session_id ?? null,
      tool: tn,
    });
    return passthrough();
  }

  // Recent ledger entry.
  const ledgerHit = recentLedgerMatch(filePath);
  if (ledgerHit) {
    appendLedger({
      ts: new Date().toISOString(),
      file: filePath,
      reason: `pre-recorded in ledger at ${ledgerHit.ts}`,
      ledger_match: true,
      session_id: stdin.session_id ?? null,
      tool: tn,
    });
    return passthrough();
  }

  return block("no WHY: line, no recent ledger entry, no override", filePath);
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
