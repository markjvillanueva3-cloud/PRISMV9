#!/usr/bin/env node
// tier: T3
/**
 * error-pattern-learner.mjs — dual-mode hook.
 *
 * MODE A — PostToolUse:* (capture)
 *   When a tool_response signals an error/block/failure, classify the root cause
 *   into a coarse pattern (regex-mismatch, magic-number, json-shape, type-error,
 *   permission-denied, hook-blocked, test-failure, schema-violation, etc.) and
 *   append a JSONL record to state/shared/ERROR_LEDGER.jsonl with keyword bag
 *   for cheap recall.
 *
 * MODE B — UserPromptSubmit (recall)
 *   Extract keywords from the prompt, scan recent ledger entries (last 14 days,
 *   cap 500), score by keyword overlap, inject the top 3 matches as
 *   additionalContext so the model is reminded of past mistakes BEFORE making
 *   the same one.
 *
 * Mode is selected by --mode flag OR by inferring from stdin shape:
 *   - {tool_name, tool_response} → capture
 *   - {prompt} → recall
 *
 * Why this exists: every session we re-discover the same bugs (heredoc parens,
 * vitest JSON shape, magic-number assumptions, mtime cache invalidation gotchas).
 * Cheap permanent memory beats re-learning at $$$ per token.
 *
 * INFRA-FIX scope.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const LEDGER = "H:/prism/state/shared/ERROR_LEDGER.jsonl";
const MAX_LEDGER_BYTES = 4 * 1024 * 1024; // 4MB rolling cap; oldest dropped on overflow
const RECALL_WINDOW_DAYS = 14;
const RECALL_TOP_K = 3;
const MIN_KEYWORD_LEN = 4;

// --- Common ----------------------------------------------------------------

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}

function emit(obj) { process.stdout.write(JSON.stringify(obj)); }

function ensureLedger() {
  try {
    fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
    if (!fs.existsSync(LEDGER)) fs.writeFileSync(LEDGER, "");
  } catch { /* best-effort */ }
}

function tokenize(text) {
  if (typeof text !== "string") return [];
  const stop = new Set([
    "this","that","with","from","have","been","were","they","then","than","when","what",
    "where","which","while","there","here","into","over","under","also","just","only",
    "some","more","most","like","such","very","much","null","true","false","undefined",
    "function","const","return","await","async","class","import","export","module",
  ]);
  return [...new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9_-]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= MIN_KEYWORD_LEN && !stop.has(w))
  )].slice(0, 40);
}

// --- MODE A: capture -------------------------------------------------------

const FAILURE_PATTERNS = [
  { pattern: "type-error",        re: /\berror\s+TS\d+\b/i },
  { pattern: "test-failure",      re: /Tests?\s+\d+\s+failed|^\s*FAIL\s+\S+|AssertionError/m },
  { pattern: "permission-denied", re: /permission\s+denied|EACCES|EPERM/i },
  { pattern: "hook-blocked",      re: /permissionDecision.*deny|decision.*block|hook\s+blocked/i },
  { pattern: "schema-violation",  re: /zod|invalid_type|expected.*received|schema\s+(?:error|violation)/i },
  { pattern: "json-shape",        re: /unexpected\s+(?:token|end\s+of\s+json)|JSON\.parse|cannot\s+read\s+propert/i },
  { pattern: "regex-mismatch",    re: /regex|regular\s+expression|pattern.*not\s+found|0\s+matches/i },
  { pattern: "module-not-found",  re: /cannot\s+find\s+module|MODULE_NOT_FOUND|no\s+such\s+file/i },
  { pattern: "build-failure",     re: /^npm\s+ERR!|build\s+failed|compile\s+error/im },
  { pattern: "timeout",           re: /timed?\s*out|ETIMEDOUT/i },
  { pattern: "git-conflict",      re: /merge\s+conflict|both\s+(?:added|modified)|fix\s+conflicts/i },
];

function looksFailed(toolResponse) {
  if (!toolResponse) return { failed: false };
  const exitCode = toolResponse.exit_code ?? toolResponse.exitCode ?? toolResponse.exit;
  if (typeof exitCode === "number" && exitCode !== 0) return { failed: true, signal: `exit=${exitCode}` };
  const out = toolResponse.output ?? toolResponse.stdout ?? toolResponse.stderr ?? toolResponse.content ?? "";
  if (typeof out !== "string" || out.length === 0) {
    if (toolResponse.is_error === true) return { failed: true, signal: "is_error" };
    return { failed: false };
  }
  if (toolResponse.is_error === true) return { failed: true, signal: "is_error", output: out };
  return { failed: false, output: out };
}

function classify(text) {
  if (typeof text !== "string") return null;
  for (const { pattern, re } of FAILURE_PATTERNS) {
    const m = text.match(re);
    if (m) return { pattern, hit: m[0].slice(0, 80) };
  }
  return { pattern: "unknown", hit: text.slice(0, 80) };
}

function appendRecord(record) {
  try {
    ensureLedger();
    fs.appendFileSync(LEDGER, JSON.stringify(record) + "\n", "utf8");
    rotateIfNeeded();
  } catch { /* best-effort */ }
}

function rotateIfNeeded() {
  try {
    const st = fs.statSync(LEDGER);
    if (st.size <= MAX_LEDGER_BYTES) return;
    const lines = fs.readFileSync(LEDGER, "utf8").split("\n").filter(Boolean);
    const keep = lines.slice(Math.floor(lines.length / 3)); // drop oldest third
    fs.writeFileSync(LEDGER, keep.join("\n") + "\n", "utf8");
  } catch { /* best-effort */ }
}

function modeCapture(stdin) {
  const toolName = stdin.tool_name ?? "unknown";
  const { failed, signal, output } = looksFailed(stdin.tool_response);
  if (!failed) return emit({ continue: true });

  const text = output ?? JSON.stringify(stdin.tool_response ?? {}).slice(0, 2000);
  const classification = classify(text);
  if (!classification) return emit({ continue: true });

  // Extract command/file context for keywords
  const cmd = stdin.tool_input?.command ?? "";
  const filePath = stdin.tool_input?.file_path ?? "";
  const keywords = tokenize([toolName, classification.pattern, classification.hit, cmd, filePath].join(" "));

  appendRecord({
    schema: "1.0.0",
    ts: new Date().toISOString(),
    tool: toolName,
    pattern: classification.pattern,
    signal: signal ?? null,
    hit: classification.hit,
    file: filePath || null,
    cmd_head: cmd ? cmd.slice(0, 120) : null,
    keywords,
    session_id: stdin.session_id ?? null,
  });

  emit({ continue: true });
}

// --- MODE B: recall --------------------------------------------------------

function readLedger() {
  try {
    if (!fs.existsSync(LEDGER)) return [];
    const raw = fs.readFileSync(LEDGER, "utf8");
    const cutoff = Date.now() - RECALL_WINDOW_DAYS * 24 * 3600 * 1000;
    const out = [];
    for (const line of raw.split("\n")) {
      if (!line) continue;
      try {
        const r = JSON.parse(line);
        if (!r.ts) continue;
        if (new Date(r.ts).getTime() < cutoff) continue;
        out.push(r);
      } catch { /* skip malformed */ }
    }
    return out.slice(-500); // cap recall corpus
  } catch { return []; }
}

function score(promptKw, recordKw) {
  if (!recordKw || recordKw.length === 0) return 0;
  const set = new Set(recordKw);
  let hits = 0;
  for (const k of promptKw) if (set.has(k)) hits++;
  return hits;
}

function dedupePatterns(records) {
  const seen = new Set();
  const out = [];
  for (const r of records) {
    if (seen.has(r.pattern)) continue;
    seen.add(r.pattern);
    out.push(r);
    if (out.length >= RECALL_TOP_K) break;
  }
  return out;
}

function modeRecall(stdin) {
  const prompt = stdin.prompt ?? "";
  if (typeof prompt !== "string" || prompt.length < 8) return emit({ continue: true });

  const promptKw = tokenize(prompt);
  if (promptKw.length === 0) return emit({ continue: true });

  const ledger = readLedger();
  if (ledger.length === 0) return emit({ continue: true });

  const scored = ledger
    .map((r) => ({ r, s: score(promptKw, r.keywords) }))
    .filter(({ s }) => s >= 2) // need at least 2 keyword overlap
    .sort((a, b) => b.s - a.s)
    .map(({ r }) => r);

  const top = dedupePatterns(scored);
  if (top.length === 0) return emit({ continue: true });

  const lines = top.map((r) => {
    const when = r.ts.slice(0, 10);
    const where = r.file ? path.basename(r.file) : (r.cmd_head ? r.cmd_head.slice(0, 60) : r.tool);
    return `- [${when}] ${r.pattern} in ${where} — ${r.hit.slice(0, 100)}`;
  });

  const ctx = [
    "🧠 ERROR-PATTERN-RECALL — past errors matching this prompt:",
    ...lines,
    "",
    "These were YOUR mistakes before. Avoid repeating them. (ledger: state/shared/ERROR_LEDGER.jsonl)",
  ].join("\n");

  emit({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: ctx },
  });
}

// --- Main ------------------------------------------------------------------

function main() {
  const stdin = readStdinSafe();
  const passthrough = () => emit({ continue: true });
  if (!stdin) return passthrough();

  // Explicit mode flag wins
  const mode = process.argv.includes("--capture") ? "capture"
    : process.argv.includes("--recall") ? "recall"
    : (stdin.tool_name && stdin.tool_response) ? "capture"
    : (typeof stdin.prompt === "string") ? "recall"
    : null;

  if (mode === "capture") return modeCapture(stdin);
  if (mode === "recall") return modeRecall(stdin);
  return passthrough();
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
