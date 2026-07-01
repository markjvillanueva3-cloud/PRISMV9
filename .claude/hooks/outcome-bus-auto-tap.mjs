#!/usr/bin/env node
// tier: T2
// PER-SLOT-CLOSED-LOOP-INTEGRATION/U-PSCL03 — outcome-bus-auto-tap (india #1).
//
// PostToolUse hook that taps every Edit/Write/Bash/MultiEdit outcome across
// the fleet into the OutcomeFeedbackBus as labeled RL training rows. Per
// `state/shared/specs/PER-SLOT-SKILL-RECOMMENDATIONS-2026-05-28.json` india
// recommendation #1: the meta-fix that unlocks closed-loop learning for EVERY
// other slot the moment it ships.
//
// Before this hook: each closed-loop slot's india-wire ("publish outcomes via
// xproc_outcome_publish") was doctrinal-only — required manual instrumentation
// per dispatch site. Result: ~5000 outcomes/day silently discarded across the
// fleet, every model trains on starved sample (visible in 0.096 AUROC GNN
// heterophily collapse).
//
// After this hook: every Edit/Write/Bash/MultiEdit auto-publishes a labeled
// row to state/shared/outcome-bus.jsonl with {slot, domain, tool, success,
// timestamp, session_id, contextual_hint}. The india-side consumers
// (OutcomeFeedbackBus, NN-GRAPH retrain lifecycle, RAG features, calibration
// monitor) pick up the rows on their normal cadence without any per-slot
// engineering work.
//
// Architecture:
//   - PostToolUse fires AFTER the tool result is known
//   - We read stdin JSON for {tool_name, tool_input, tool_response, session_id}
//   - Resolve slot from chat-slots.json by session_id (same pattern as
//     stop-auto-capture-per-slot.mjs)
//   - Determine domain from the slot via SLOT_GALAXY_MAP (alpha→token-optimization,
//     foxtrot→mill, etc.) — same source as slot-context-bundle-inject.mjs
//   - Append a single line to state/shared/outcome-bus.jsonl
//   - Throttle: max 1 publish per (slot, tool, success) per 200ms to prevent
//     log spam under rapid /loop iterations
//
// Knobs:
//   PRISM_OUTCOME_BUS_AUTO_TAP_DISABLE=1   kill switch
//   PRISM_OUTCOME_BUS_AUTO_TAP_DRY_RUN=1   log to stderr only, don't append
//   PRISM_OUTCOME_BUS_AUTO_TAP_THROTTLE_MS=N  default 200
//
// Performance: pure fs.appendFileSync — no exec, no network, no module loads
// beyond node:fs. Target latency <2ms per call so it doesn't add to
// PostToolUse chain budget.
//
// Failure mode: NEVER throws. Empty signal → silent skip. Malformed input →
// silent skip. The hook should NEVER block a PostToolUse chain.

import fs from "node:fs";

const DISABLE = process.env.PRISM_OUTCOME_BUS_AUTO_TAP_DISABLE === "1";
const DRY_RUN = process.env.PRISM_OUTCOME_BUS_AUTO_TAP_DRY_RUN === "1";
const THROTTLE_MS = Number(process.env.PRISM_OUTCOME_BUS_AUTO_TAP_THROTTLE_MS ?? "200");
const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const OUTCOME_BUS_FILE = `${PRISM_ROOT}/state/shared/outcome-bus.jsonl`;
const THROTTLE_SIDECAR = `${PRISM_ROOT}/state/shared/.outcome-bus-auto-tap-throttle.json`;
const CHAT_SLOTS_FILE = `${PRISM_ROOT}/state/shared/chat-slots.json`;

// Slot → galaxy/domain map (canonical — must match slot-context-bundle-inject.mjs).
// Adding a new galaxy? Update this AND slot-context-bundle-inject.mjs in lockstep.
const SLOT_GALAXY_MAP = {
  alpha: "token-optimization",
  bravo: "hermes-zebra",
  charlie: "quoting",
  delta: "cad",
  echo: "post-processor",
  foxtrot: "mill",
  golf: "fleet-reaper",
  hotel: "business",
  india: "ai-training",
  juliett: "database",
  kilo: "cam",
  lima: "academy",
  mike: "wedm",
  november: "u-dea",
  oscar: "speed-feed",
  papa: "backend-helper",
  quebec: "frontend",
  romeo: "wiring",
  sierra: "system-viz",
  tango: "discovery",
  uniform: "bug-hunting",
  victor: "dormant-data",
  whiskey: "lathe",
  xray: "blueprint-vision",
  zebra: "hermes-zebra",     // shared with bravo per operator-canonical galaxy buildout brief (2026-05-28)
  zulu: "u-dea",
};

function exit(payload) {
  // PostToolUse hooks ALWAYS allow continue. Decisions to block are
  // PreToolUse's role; we're purely observational.
  process.stdout.write(JSON.stringify(payload ?? { continue: true }));
  process.exit(0);
}

if (DISABLE) exit();

// ─── stdin JSON ────────────────────────────────────────────────────────────
let stdin = "";
try {
  for await (const chunk of process.stdin) stdin += chunk;
} catch { /* no stdin */ }

let env;
try { env = stdin ? JSON.parse(stdin) : {}; } catch { env = {}; }

const toolName = env.tool_name || env.toolName || "";
const sessionId = env.session_id || env.sessionId || "";
const toolResponse = env.tool_response || env.toolResponse || {};
const toolInput = env.tool_input || env.toolInput || {};

// Only tap meaningful tools — skip status reads, low-signal calls.
const TAPPED_TOOLS = new Set([
  "Edit", "Write", "MultiEdit", "NotebookEdit",
  "Bash", "BashOutput",
  "TodoWrite",
]);
if (!TAPPED_TOOLS.has(toolName)) exit();

// ─── slot resolution (same pattern as stop-auto-capture-per-slot.mjs) ──────
function resolveSlot() {
  try {
    if (!sessionId) return null;
    const raw = JSON.parse(fs.readFileSync(CHAT_SLOTS_FILE, "utf8"));
    const slots = raw.slots || raw;
    for (const [slot, state] of Object.entries(slots)) {
      if (state && (state.chatId || "").includes(sessionId.slice(0, 8))) return slot;
    }
  } catch { /* silent */ }
  return null;
}
const slot = resolveSlot();
if (!slot) exit();

const domain = SLOT_GALAXY_MAP[slot] || `${slot}-unknown`;

// ─── success detection ────────────────────────────────────────────────────
// Tool-specific success heuristics. Edit/Write/MultiEdit succeed when the
// tool_response has no error field. Bash succeeds on exit_code 0 (sometimes
// reported as 'exitCode' or absent — assume success if no explicit error).
function detectSuccess() {
  if (!toolResponse || typeof toolResponse !== "object") return true;
  if (toolResponse.error || toolResponse.is_error) return false;
  if ("exit_code" in toolResponse) return toolResponse.exit_code === 0;
  if ("exitCode" in toolResponse) return toolResponse.exitCode === 0;
  // For Bash: stderr presence alone isn't failure (warnings, info lines).
  // The harness reports a non-zero exit code separately; we trust that.
  return true;
}
const success = detectSuccess();

// ─── throttle (anti-spam) ─────────────────────────────────────────────────
// Single-file throttle ledger keyed by (slot, tool, success). Concurrent
// hooks may race on the read-modify-write — accept the race; worst case is
// a few extra publishes (still net win vs spam).
function withinThrottle() {
  if (!Number.isFinite(THROTTLE_MS) || THROTTLE_MS <= 0) return false;
  let ledger;
  try { ledger = JSON.parse(fs.readFileSync(THROTTLE_SIDECAR, "utf8")); } catch { ledger = {}; }
  const key = `${slot}::${toolName}::${success ? "ok" : "fail"}`;
  const now = Date.now();
  const last = Number(ledger[key]) || 0;
  if (now - last < THROTTLE_MS) return true;
  ledger[key] = now;
  // Bounded — keep at most ~200 keys to prevent unbounded growth on long sessions.
  const keys = Object.keys(ledger);
  if (keys.length > 200) {
    const sorted = keys.sort((a, b) => Number(ledger[b]) - Number(ledger[a])).slice(0, 100);
    const trimmed = {};
    for (const k of sorted) trimmed[k] = ledger[k];
    try { fs.writeFileSync(THROTTLE_SIDECAR, JSON.stringify(trimmed)); } catch { /* swallow */ }
  } else {
    try { fs.writeFileSync(THROTTLE_SIDECAR, JSON.stringify(ledger)); } catch { /* swallow */ }
  }
  return false;
}
if (withinThrottle()) exit();

// ─── contextual hint (a few bytes of input/output for downstream training) ─
// We capture a small fingerprint of what the tool did — file path for Edit/Write,
// first-line of command for Bash, etc. Keeps the row useful for training without
// blowing up the JSONL size or leaking secrets.
function contextualHint() {
  try {
    if (toolName === "Edit" || toolName === "Write" || toolName === "MultiEdit" || toolName === "NotebookEdit") {
      const fp = toolInput.file_path || toolInput.notebook_path || "";
      return fp ? `path:${String(fp).slice(0, 200)}` : "";
    }
    if (toolName === "Bash" || toolName === "BashOutput") {
      const cmd = toolInput.command || toolInput.description || "";
      return cmd ? `cmd:${String(cmd).slice(0, 200)}` : "";
    }
    if (toolName === "TodoWrite") {
      const tasks = Array.isArray(toolInput.todos) ? toolInput.todos.length : 0;
      return `todos:${tasks}`;
    }
  } catch { /* swallow */ }
  return "";
}

// ─── failure→success pair detection (2026-05-28 slot:alpha — closes the
// dead-letter gap). Consumer (stop-auto-capture-per-slot.mjs:109) filters
// rows on `success===true && previously_failed===true`. Publisher must
// stamp that flag for the consumer to fire. We tail the last N lines of
// the outcome-bus and look for a prior matching (slot, tool, success=false)
// within the lookback window — if found AND current is success, stamp the
// flag. Bounded read (last 16KB) keeps this cheap (<5ms) on long sessions.
const LOOKBACK_BYTES = 16 * 1024;
const LOOKBACK_WINDOW_MS = 30 * 60 * 1000;     // 30 minutes
const LOOKBACK_HINT_PREFIX_MATCH = 96;          // hint must agree in first 96 chars (path/cmd prefix).
// 32 was too short (per reviewer B 2026-05-28 P1-B): every `cmd:rtk grep -n "`
// Bash row shared the same 32-char prefix → unrelated failures falsely paired.
// 96 captures full `cmd:rtk <subcmd> <pattern>` or `path:H:/prism/<long-dir>/<file>`
// while staying under the 200-char hint truncation cap, so we can't over-shoot.
function previouslyFailed(currentHint) {
  if (!success) return false;     // only stamp on success rows
  try {
    const stat = fs.statSync(OUTCOME_BUS_FILE);
    const start = Math.max(0, stat.size - LOOKBACK_BYTES);
    const fd = fs.openSync(OUTCOME_BUS_FILE, "r");
    const buf = Buffer.alloc(stat.size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    fs.closeSync(fd);
    const lines = buf.toString("utf8").split("\n").filter(Boolean);
    const now = Date.now();
    const hintPrefix = String(currentHint || "").slice(0, LOOKBACK_HINT_PREFIX_MATCH);
    // Walk newest-first; first matching prior failure for same (slot,tool) wins.
    for (let i = lines.length - 1; i >= 0; i--) {
      let r;
      try { r = JSON.parse(lines[i]); } catch { continue; }
      if (!r || typeof r !== "object") continue;
      if (r.slot !== slot || r.tool !== toolName) continue;
      const ts = r.ts ? Date.parse(r.ts) : 0;
      if (!ts || now - ts > LOOKBACK_WINDOW_MS) return false;     // window expired
      if (r.success === false) {
        // Same target? Path/cmd prefix tightens the pair so cross-file failures
        // don't get falsely paired with unrelated successes.
        if (!hintPrefix) return true;
        const priorHint = String(r.hint || "").slice(0, LOOKBACK_HINT_PREFIX_MATCH);
        return priorHint === hintPrefix;
      }
      if (r.success === true) return false;     // a prior success breaks the pair
    }
  } catch { /* swallow — never block on detection */ }
  return false;
}

// ─── publish (single JSON line append, atomic-ish under fs.appendFileSync) ─
const hintValue = contextualHint();
const taskValue = hintValue || `${toolName}@${slot}`;     // consumer uses this for memory naming
const row = {
  ts: new Date().toISOString(),
  source: "outcome-bus-auto-tap",
  session_id: sessionId,
  slot,
  domain,
  tool: toolName,
  success,
  hint: hintValue,
  task: taskValue,
  previously_failed: previouslyFailed(hintValue),
};

if (DRY_RUN) {
  process.stderr.write(`[outcome-bus-auto-tap DRY] ${JSON.stringify(row)}\n`);
  exit({
    continue: true,
    systemMessage: `📊 outcome-bus-auto-tap [DRY] would publish ${slot}/${toolName}/${success ? "ok" : "fail"}`,
  });
}

try {
  fs.appendFileSync(OUTCOME_BUS_FILE, JSON.stringify(row) + "\n");
} catch (e) {
  // Never block PostToolUse chain on a write failure (e.g. disk full).
  // Log to stderr so the hook-health auditor sees it.
  process.stderr.write(`[outcome-bus-auto-tap] append failed: ${e && e.message}\n`);
}

exit();
