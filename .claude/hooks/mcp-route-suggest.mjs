#!/usr/bin/env node
// tier: T4
/**
 * mcp-route-suggest.mjs
 * ---------------------
 * Compact PreToolUse router that nudges PRISM work toward existing MCP, helper,
 * and audit-chain surfaces before broad shell churn expands token cost.
 * Uses local Ollama for intelligent suggestions (zero Claude API tokens).
 * Falls back to regex-based suggestions when Ollama unavailable.
 */

import { shouldSkipHook as _hp_shouldSkip } from "../helpers/hook-profile.mjs";
import { dirname, join as _pathJoin } from 'path';
import { fileURLToPath } from 'url';
import _fs from 'node:fs';
import _os from 'node:os';
import { readMcpState, isMcpDown } from "../../scripts/lib/mcp-state-check.mjs";
import { isRouteSuggestDecaySuppressed, logDecaySuppression } from "../../scripts/lib/route-suggest-decay.mjs"; // ROUTE-DECAY-SPLICE

const __dirname = dirname(fileURLToPath(import.meta.url));

// SLOT-DRIFT-FIX-MS0/U-SDF11 (2026-05-17): per-(session,file) rate-limiter
// for the "Doctrine/command surface" reminder. The reminder was firing on
// EVERY Read of a .claude/hooks/ file (~50 fires/session for the kinds of
// audit work that touches the hook stack). Same message, same advice, no
// new information after the first impression — pure context burn. Keep a
// per-file stamp; skip if seen within 30 minutes for the same session.
// U-MRS-DOCTRINE-TTL-FIX (2026-05-25, slot:alpha): bump 30min → 24h.
// Per U-HOOK-INJECT-ROI: 45 fires/9.6K despite 30min rate-limit because the
// per-(session, file) key gets re-tripped on long /loop sessions. The
// doctrine block is identical every fire; 24h ≈ per-session for the same
// doctrine target. Companion to slot-soul + comp-build + MRI TTL bumps.
const _DOCTRINE_RATE_WINDOW_MS = 24 * 60 * 60 * 1000;
// Env-overridable (PRISM_DOCTRINE_RATE_FILE) so a test can isolate the rate file
// per-process — the shared default is written by every fleet slot, so a test
// asserting strict gating must NOT share it (the 3-of-3 caught this: a concurrent
// fleet/parallel-test write clobbers a peer's session key → false re-emit).
const _DOCTRINE_RATE_FILE = process.env.PRISM_DOCTRINE_RATE_FILE ||
  _pathJoin(_os.tmpdir(), "prism-hook-state", "mcp-route-doctrine-seen.json");
// HIGHVALUE-DISCOVERY #4 (2026-06-09, slot:alpha): per-SESSION rate-limit
// sentinels. The doctrine reminder + take-rate footer are identical every fire
// and teach nothing new on repetition; keying them per-(session,file) re-fired
// the doctrine block once PER FILE (measured live: doctrineSurface=25 in one
// /loop session that Read 25 distinct .claude/hooks/ files). Using a fixed
// sentinel as the "filePath" arg collapses the key to ${sessionId}:<sentinel>
// → at most once per session (24h window). Reuses the existing rate-limit
// machinery (R11 — no new dep).
const _DOCTRINE_SESSION_KEY = "__doctrine_session__";
const _BACKEND_AUDIT_SESSION_KEY = "__backend_audit_session__";
const _FOOTER_SESSION_KEY = "__takerate_footer_session__";
function _loadDoctrineSeen() {
  try { return JSON.parse(_fs.readFileSync(_DOCTRINE_RATE_FILE, "utf8")); }
  catch { return {}; }
}
function _saveDoctrineSeen(state) {
  try {
    const dir = dirname(_DOCTRINE_RATE_FILE);
    if (!_fs.existsSync(dir)) _fs.mkdirSync(dir, { recursive: true });
    // Atomic per-PID temp + rename (mirrors the telemetry sidecar below, R11) so
    // a concurrent fleet write never yields a TORN read. Lost-update of a peer's
    // key is still possible under heavy concurrency but is bounded + harmless for
    // a best-effort dedup — worst case one extra doctrine fire, still ~25x fewer
    // than the pre-#4 per-file behavior. (Same tradeoff the sidecar documents.)
    const tmp = `${_DOCTRINE_RATE_FILE}.tmp-${process.pid}`;
    _fs.writeFileSync(tmp, JSON.stringify(state));
    _fs.renameSync(tmp, _DOCTRINE_RATE_FILE);
  } catch { /* ignore — best-effort */ }
}
function _doctrineRecentlySeen(sessionId, filePath) {
  if (!sessionId || !filePath) return false;
  const state = _loadDoctrineSeen();
  const key = `${sessionId}:${filePath}`;
  const last = state[key];
  if (typeof last !== "number") return false;
  return (Date.now() - last) < _DOCTRINE_RATE_WINDOW_MS;
}
function _markDoctrineSeen(sessionId, filePath) {
  if (!sessionId || !filePath) return;
  const state = _loadDoctrineSeen();
  state[`${sessionId}:${filePath}`] = Date.now();
  // Trim entries older than 2 windows to keep the file small.
  const cutoff = Date.now() - 2 * _DOCTRINE_RATE_WINDOW_MS;
  for (const [k, t] of Object.entries(state)) {
    if (typeof t !== "number" || t < cutoff) delete state[k];
  }
  _saveDoctrineSeen(state);
}

// TOKEN-SAVINGS-PIVOT iter-3 (2026-05-22, slot:alpha) — telemetry sidecar.
// Measures route-suggest ROI: every fire writes (toolName, classifier, sessionId)
// to state/shared/mcp-route-suggest-stats.json. Atomic per-PID-temp+rename
// pattern (mirrors scripts/lib/atomic-json.mjs); best-effort try/catch so the
// hook NEVER fails on telemetry IO. Bounded `recent[]` capped at 100 entries.
// 26-chat fleet: concurrent read-modify-write may lose one increment under
// race — acceptable for advisory telemetry, never corrupts the file (per-PID
// temp + rename ensures atomicity). Disable: PRISM_MCP_ROUTE_TELEMETRY_DISABLE=1.
const _ROUTE_STATS_FILE = "H:/prism/state/shared/mcp-route-suggest-stats.json";
function _classifierFromMessage(msg) {
  if (typeof msg !== "string") return null;
  if (msg.includes("broad Grep")) return "isBroadGrep";
  if (msg.includes("verbose Bash")) return "isVerboseBash";
  if (msg.includes("large digest/index")) return "isLargeRead";
  if (msg.includes("large Write")) return "isLargeWrite";
  if (msg.includes("broad Glob")) return "isBroadGlob";
  if (msg.includes("unbounded WebSearch")) return "isBroadWebSearch";
  if (msg.startsWith("🤖 Suggested route:")) return "ollama";
  if (msg.includes("Backend audit:")) return "backendAuditChain";
  if (msg.includes("Doctrine/command surface")) return "doctrineSurface";
  return null;
}
// iter-10 (2026-05-22): per-slot ROI breakdown. Resolve sessionId → slot by
// reading chat-slots.json once per fire (best-effort, never blocks). Adds
// `slot` to each recent[] entry + `bySlot` aggregate to the sidecar.
const _CHAT_SLOTS_FILE = "H:/prism/state/shared/chat-slots.json";
function _resolveSlotForSession(sessionId) {
  if (!sessionId) return null;
  try {
    const slots = JSON.parse(_fs.readFileSync(_CHAT_SLOTS_FILE, "utf8"));
    if (!slots || typeof slots !== "object") return null;
    const slotEntries = slots.slots && typeof slots.slots === "object" ? slots.slots : slots;
    for (const [name, state] of Object.entries(slotEntries)) {
      if (!state || typeof state !== "object") continue;
      const chatId = String(state.chatId || "");
      if (!chatId) continue;
      // chatId may be "claude-5b1fef86" or full uuid. sessionId is the full uuid.
      if (chatId === sessionId) return name;
      if (chatId.endsWith(sessionId.slice(0, 8))) return name;
      if (sessionId.startsWith(chatId.replace(/^claude-/, ""))) return name;
    }
  } catch { /* file missing / parse error → no slot resolved */ }
  return null;
}

function _recordRouteFires(sessionId, toolName, messages) {
  if (process.env.PRISM_MCP_ROUTE_TELEMETRY_DISABLE === "1") return;
  if (!messages || messages.length === 0) return;
  const classifiers = messages.map(_classifierFromMessage).filter(Boolean);
  if (classifiers.length === 0) return;
  try {
    let stats;
    try {
      stats = JSON.parse(_fs.readFileSync(_ROUTE_STATS_FILE, "utf8"));
    } catch {
      stats = {
        schemaVersion: "1.0.0",
        createdAt: new Date().toISOString(),
        totalFires: 0,
        byToolName: {},
        byClassifier: {},
        recent: [],
      };
    }
    const slot = _resolveSlotForSession(sessionId);
    stats.totalFires = (stats.totalFires || 0) + classifiers.length;
    stats.byToolName[toolName] = (stats.byToolName[toolName] || 0) + classifiers.length;
    stats.bySlot ??= {};
    if (slot) stats.bySlot[slot] = (stats.bySlot[slot] || 0) + classifiers.length;
    else stats.bySlot["_unresolved"] = (stats.bySlot["_unresolved"] || 0) + classifiers.length;
    for (const c of classifiers) {
      stats.byClassifier[c] = (stats.byClassifier[c] || 0) + 1;
    }
    stats.recent.unshift({
      ts: new Date().toISOString(),
      sessionId: (sessionId || "").toString().slice(0, 8),
      slot: slot || null,
      toolName,
      classifiers,
    });
    if (stats.recent.length > 100) stats.recent.length = 100;
    // iter14 defensive cap: bound takeups[] the same way recent[] is bounded.
    // (The takeup hook also caps at 100; double-belt is cheap and prevents
    // ever-growing files if either side drifts.) Same for byClassifier
    // / bySlot — entries can't grow past their natural keyset; only counts.
    if (Array.isArray(stats.takeups) && stats.takeups.length > 100) stats.takeups.length = 100;
    stats.lastFireAt = new Date().toISOString();
    const tmp = `${_ROUTE_STATS_FILE}.tmp-${process.pid}`;
    const body = JSON.stringify(stats, null, 2);
    // iter14: emergency size cap — sidecar JSON should never exceed 256KB.
    // Hard-truncate recent[] + takeups[] to 25 entries each and retry the
    // serialization. If still oversize, drop to 10. Final fail-safe: skip
    // the write entirely (next fire will re-attempt with smaller state).
    let finalBody = body;
    if (body.length > 256 * 1024) {
      if (Array.isArray(stats.recent))  stats.recent.length  = Math.min(stats.recent.length, 25);
      if (Array.isArray(stats.takeups)) stats.takeups.length = Math.min(stats.takeups.length, 25);
      finalBody = JSON.stringify(stats, null, 2);
      if (finalBody.length > 256 * 1024) {
        if (Array.isArray(stats.recent))  stats.recent.length  = Math.min(stats.recent.length, 10);
        if (Array.isArray(stats.takeups)) stats.takeups.length = Math.min(stats.takeups.length, 10);
        finalBody = JSON.stringify(stats, null, 2);
        if (finalBody.length > 256 * 1024) return; // bail — never write a runaway file
      }
    }
    _fs.writeFileSync(tmp, finalBody, "utf8");
    try {
      _fs.renameSync(tmp, _ROUTE_STATS_FILE);
    } catch {
      try { _fs.unlinkSync(tmp); } catch { /* temp already gone */ }
    }
  } catch {
    // Telemetry MUST never fail the hook. Swallow all errors silently —
    // a missing stats file is a deliberate disable signal, not an outage.
  }
}

// TOKEN-SAVINGS-PIVOT/U-NUDGE-SELF-AWARENESS (iter22, 2026-05-22, slot:alpha):
// iter20+iter21 closed the credit-route gap (~95% of fires now map to a take-
// up route via WebSearch/audit/doctrine surfaces). Despite that, the fleet
// take-rate sits at ~0.4% (1/284). Routes are wired but the model isn't
// acting on the PreToolUse nudges — because the nudge says "consider this
// route" without showing it that prior nudges have been ignored. This
// function appends a single-line measured-rate advisory to the nudge IFF
// the fleet has fired enough nudges to know the rate is bad (>=5) AND the
// rate is below the awareness floor (default 20%). Pure; exported for tests.
//
// Above-threshold sessions get silence (no positive-reinforcement noise).
// Below-threshold + low fire count gets silence (avoid misleading 0/0 alarm).
// TOKEN-SAVINGS-PIVOT/U-PSN-ACTION-HINT (iter22-followup, 2026-05-23, slot:alpha):
// Reverse of mcp-route-takeup's _ACTION_TO_CLASSIFIERS. iter22 added the
// take-rate advisory that says "prefer the MCP action it names" — but several
// classifiers (doctrineSurface, backendAuditChain, isBroadGlob) emit a nudge
// whose body does NOT actually name a concrete dispatcher:action. Operator (or
// the model) sees the advisory but can't follow it without re-deriving the
// route. This map closes the loop. PSN synergy across legs:
//   • PRISM OS (leg 2)        — dispatcher knowledge encoded here
//   • Wiki (leg 3) / Memory   — already injected upstream; this picks the action
//   • Tribal (leg 5)          — backendAuditChain maps to code_search which
//                                surfaces tribal hits server-side
//   • Take-up (telemetry)     — every action listed here is also in
//                                _ACTION_TO_CLASSIFIERS in mcp-route-takeup.mjs,
//                                so taking the hinted route gets credited.
//   • Awareness (iter22)      — concrete action under abstract advisory.
// Pure; exported for tests.
export const _PREFERRED_ACTION_FOR_CLASSIFIER = {
  isBroadGrep:       "prism_session:master_index_query",
  isVerboseBash:     "prism_session:action_search",
  isLargeRead:       "prism_session:dispatcher_map_compact",
  isLargeWrite:      "prism_dev:file_write",
  isBroadGlob:       "prism_session:master_index_query",
  isBroadWebSearch:  "prism_knowledge:search",
  doctrineSurface:   "prism_session:dispatcher_map_compact",
  backendAuditChain: "prism_dev:code_search",
  // `ollama` route messages already name the dispatcher inline ("🤖 Suggested
  // route: <dispatcher>:<action> — ..."), so we deliberately omit it here.
};

// TOKEN-SAVINGS-PIVOT/U-P1-U01-COMPANION-COVERED (COMBO-EFFICIENCY-MS0,
// 2026-05-25, slot:alpha) — take-rate-fix root cause.
//
// Baseline at spec time: 0/1774 take-rate (0.0%). Reading the data path:
// for 5 of 7 mapped classifiers, a sibling pre-fetch hook (pre-bash /
// pre-grep / pre-read / pre-write graph-inject) already INJECTED the same
// top-K master-index hits the nudged dispatcher would return. The
// `→ Take this route now: prism_session:master_index_query` advisory is
// therefore structurally redundant — "taking the route" is a no-op
// duplicate fetch. The 0% is a measurement artifact, not a behavioral
// failure, AND the nudge itself burns context for no signal.
//
// This set lists classifiers whose informational need is met by a sibling
// injector. They get the action hint SUPPRESSED + are excluded from the
// take-rate denominator so the metric reflects genuinely-unmet needs.
//
// Not in this set (genuinely uncovered — KEEP the nudge):
//   - doctrineSurface  — 24h-rate-limited; needs a separate doctrine
//                        snippet injector (separate unit)
//   - backendAuditChain — needs an audit-snippet injector
//   - isBroadWebSearch  — no companion web-fetch pre-injector exists
//
// v2 (separate unit): hard-dispatch the remaining 3 via direct import of
// the dispatcher module so the result lands in PreToolUse output. v2 needs
// a dispatcher-result→hookSpecificOutput marshaller — bigger surgery, not
// in scope for this unit.
//
// Knob: PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT=0 disables suppression (for
// A/B comparison + rollback). Default ON.
//
// Pure; exported for tests.
export const _REDUNDANT_CLASSIFIERS = new Set([
  "isBroadGrep",   // covered by pre-grep-graph-inject
  "isBroadGlob",   // covered by pre-grep-graph-inject (Glob → ripgrep under the hood)
  "isLargeRead",   // covered by pre-read-graph-inject
  "isLargeWrite",  // covered by pre-write-graph-inject
  "isVerboseBash", // covered by pre-bash-graph-inject (when shell verb is a file-search verb)
]);

export function isCompanionCovered(classifier) {
  if (typeof classifier !== "string") return false;
  return _REDUNDANT_CLASSIFIERS.has(classifier);
}

/**
 * Compute fires excluding companion-covered classifiers. Used to rebase the
 * take-rate denominator so it reflects only the genuinely-unmet need.
 * Defensive: missing/invalid byClassifier → returns totalFires unchanged
 * (no double-penalty for upstream data gaps).
 */
export function nonRedundantFires(stats) {
  if (!stats || typeof stats !== "object") return 0;
  const totalFires = typeof stats.totalFires === "number" && Number.isFinite(stats.totalFires)
    ? stats.totalFires : 0;
  const byClassifier = stats.byClassifier && typeof stats.byClassifier === "object"
    ? stats.byClassifier : {};
  let redundantFires = 0;
  for (const c of _REDUNDANT_CLASSIFIERS) {
    const n = byClassifier[c];
    if (typeof n === "number" && Number.isFinite(n) && n > 0) redundantFires += n;
  }
  return Math.max(0, totalFires - redundantFires);
}

export function formatActionHint(classifier) {
  if (typeof classifier !== "string") return null;
  const action = _PREFERRED_ACTION_FOR_CLASSIFIER[classifier];
  if (!action) return null;
  return `→ Take this route now: \`${action}\``;
}

// INTERIM LOW-TAKE SUPPRESS (2026-06-20, slot:alpha, U-MCP-ROUTE-SUPPRESS-ISVERBOSEBASH).
// Classifiers the take-rate audit (scripts/audit-mcp-route-takerate.mjs) flagged
// `suppress-candidate` -- >=30% fire-share + 0 takes + credit-path PROVEN LIVE
// (the `genuine-low-take-rate` health signal) -- that the route-suggest-decay actor
// deliberately will NOT auto-mute (it requires the exact `suppress` verdict AND
// takes>0 as a measurement-gap guard, so it ignores a 0-take suppress-candidate).
// Per feedback_low_take_rate_nudges_are_net_negative: act on the data-backed
// recommendation NOW with a reversible operator-decided interim static drop, while
// the comprehensive fix (the decay actor consuming `suppress-candidate` when the
// credit path is proven live) stays queued. The fire is still recorded
// (_recordRouteFires runs BEFORE this filter in main), so the audit keeps measuring
// the would-be need and this can be revisited if a future change raises the take-rate.
// Audit baseline 2026-06-20: isVerboseBash = 417 fires / 0 takes / 51.4% fire-share
// (the dominant noise generator after backendAuditChain). Knob:
// PRISM_MCP_ROUTE_INTERIM_SUPPRESS=0 restores the nudge.
export const _INTERIM_LOW_TAKE_SUPPRESS = new Set(["isVerboseBash"]);

// Drop the BASE message (not just the action-hint suffix that appendActionHints
// trims) for interim-suppressed classifiers. Pure; honors the knob; telemetry is
// recorded upstream so a drop here cuts output tokens without losing the fire count.
// A message with no recognized classifier passes through untouched.
export function applyInterimSuppress(messages) {
  if (!Array.isArray(messages)) return messages;
  if (process.env.PRISM_MCP_ROUTE_INTERIM_SUPPRESS === "0") return messages;
  return messages.filter((msg) => {
    if (typeof msg !== "string") return true;
    const c = _classifierFromMessage(msg);
    return !(c && _INTERIM_LOW_TAKE_SUPPRESS.has(c));
  });
}

export function appendActionHints(messages) {
  if (!Array.isArray(messages)) return messages;
  const suppressRedundant = process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT !== "0";
  return messages.map((msg) => {
    if (typeof msg !== "string") return msg;
    const classifier = _classifierFromMessage(msg);
    if (!classifier) return msg;
    // U-P1-U01: skip redundant nudges (sibling pre-fetch hook already covers them).
    if (suppressRedundant && isCompanionCovered(classifier)) return msg;
    const hint = formatActionHint(classifier);
    return hint ? `${msg}\n${hint}` : msg;
  });
}

export function formatTakeRateAdvisory(stats, threshold = 0.20, minFires = 5) {
  if (!stats || typeof stats !== "object") return null;
  // U-P1-U01: compute fires excluding companion-covered classifiers — they're
  // structurally unactionable (data already injected), so including them in
  // the denominator misleads the rate. Knob defaults ON; =0 restores legacy.
  const useFilter = process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT !== "0";
  const fires = useFilter ? nonRedundantFires(stats) : stats.totalFires;
  if (typeof fires !== "number" || !Number.isFinite(fires) || fires < minFires) return null;
  const tt = stats.takeupTotals && typeof stats.takeupTotals === "object" ? stats.takeupTotals : {};
  const takeupsRaw = tt.totalTakeups;
  const takeups = typeof takeupsRaw === "number" && Number.isFinite(takeupsRaw) ? takeupsRaw : 0;
  const rate = takeups / fires;
  if (rate >= threshold) return null;
  const pct = (rate * 100).toFixed(1);
  return `_Fleet take-rate: ${takeups}/${fires} (${pct}%) — route nudges are firing but largely unactioned. For THIS nudge, prefer the MCP action it names._`;
}

const PRISM_ROOT = "H:/PRISM";
const MCP_ROOT = "H:/PRISM/mcp-server";
const AUDIT_CHAIN_CMD =
  "npx tsx H:/PRISM/mcp-server/scripts/run-dev-audit-chain.ts --edited-file <path>";

// Lazy-load Ollama bridge (don't fail if missing)
let queryOllama = null;
try {
  const bridge = await import('./lib/ollama-hook-bridge.mjs');
  queryOllama = bridge.queryOllama;
} catch {
  // Ollama bridge not available — will use regex fallback
}

function readStdin() {
  return new Promise((resolve) => {
    let buffer = "";
    process.stdin.on("data", (chunk) => {
      buffer += chunk;
    });
    process.stdin.on("end", () => {
      try {
        resolve(JSON.parse(buffer || "{}"));
      } catch {
        resolve({});
      }
    });
    setTimeout(() => resolve({}), 200);
  });
}

function normalize(value) {
  return String(value || "").replace(/\\/g, "/");
}

function getFilePath(toolInput) {
  return normalize(toolInput?.file_path || toolInput?.filePath || "");
}

function getBashCommand(toolInput) {
  return String(toolInput?.command || toolInput?.cmd || "").trim();
}

// TOKEN-SAVINGS-GREP-ROUTE (2026-05-22, slot:alpha): the built-in Grep tool
// returns full match lines when `output_mode='content'` — a wide pattern
// against the prism tree can pull KB-MB into the context. master_index_query +
// prism_dev:code_search run server-side, dedupe by file, and return ranked
// top-K — slim. We nudge ONLY when the grep is genuinely "broad": content
// mode + no glob/type narrowing + prism-scope path. Narrowed greps (glob/type
// set) and files-only mode are already cheap and pass through silently.
function getGrepInput(toolInput) {
  return {
    pattern: String(toolInput?.pattern || ""),
    path: String(toolInput?.path || ""),
    glob: String(toolInput?.glob || ""),
    type: String(toolInput?.type || ""),
    output_mode: String(toolInput?.output_mode || "files_with_matches"),
  };
}

export function isBroadGrep(g) {
  if (!g || typeof g !== "object" || !g.pattern) return false;
  // Cheap by default (files_with_matches) — not "broad" in token-cost terms.
  if (g.output_mode !== "content") return false;
  // Narrowing filter present → already efficient.
  if (g.glob || g.type) return false;
  // No path = defaults to cwd (prism repo). With explicit path, only flag prism scope.
  if (g.path) {
    const path = g.path.replace(/\\/g, "/").toLowerCase();
    if (!path.includes("prism")) return false;
  }
  return true;
}

// TOKEN-SAVINGS-PIVOT iter-2 (2026-05-22, slot:alpha): the 4 remaining tool
// classes — Bash, Read, Write, Search — each get a per-class classifier here.
// Pure functions, all exported for unit-testability. The hook's regex
// suggestion path consumes them.

// Bash — known verbose-output commands that routinely return KB-MB.
// rtk wraps most of these but a direct `cat`/`git log --all` slips through.
export function isVerboseBash(cmd) {
  if (!cmd || typeof cmd !== "string") return false;
  const lower = cmd.toLowerCase().trim().replace(/^(rtk|time|env\s+\w+=\S+)\s+/i, "");
  return /^cat\s+\S/.test(lower)
    || /^(git log --all|git log -p|git log --stat)/.test(lower)
    || /^(find\s+\/|find\s+\.\s+-(?:name|type|path))/.test(lower)
    || /^(npm ls( |$)|pip list|docker ps -a|docker logs|kubectl get|tail -f)/.test(lower);
}

// Read — known large digest/index files where master_index_query is slimmer.
// The wiki/* path is intentionally NOT here; wiki-read-offload-advisory.mjs
// already nudges /route-to-obsidian on wiki ≥500 lines (don't double-fire).
export function isLargeRead(filePath) {
  if (!filePath || typeof filePath !== "string") return false;
  const p = filePath.replace(/\\/g, "/");
  return /(?:^|\/)(?:ENGINE_DIGEST|DISPATCHER_DIGEST|DIRECTORY_DIGEST|PRISM-INVENTORY-LATEST|BASELINE_INVENTORY|CODE_SYSTEM_INDEX|MEMORY|CLAUDE)\.(?:md|json)$/i.test(p)
    || /(?:^|\/)knowledge\/wiki\/index\.md$/i.test(p);
}

// Write/Edit — large content that may duplicate already-stored material.
// Threshold 50KB ≈ 12-15K output tokens — worth a "dedup-check first?" nudge.
export function isLargeWrite(content) {
  if (!content || typeof content !== "string") return false;
  return content.length > 50_000;
}

// Glob/WebSearch/WebFetch — broad-search heuristic.
// Glob: `**/...` with no path narrowing → wide. WebSearch: query without
// allowed_domains → unbounded. WebFetch: present but excluded (most fetches
// are intentional + URL-specific; nudging adds noise).
export function isBroadSearch(toolName, input) {
  if (!input || typeof input !== "object") return false;
  if (toolName === "Glob") {
    const pattern = String(input.pattern || "");
    if (!pattern) return false;
    // **/* with no path or path = cwd → broad. **/*.{ext} without path → still broad.
    if (/^\*\*\//.test(pattern) && !input.path) return true;
    return false;
  }
  if (toolName === "WebSearch") {
    const query = String(input.query || "");
    if (!query) return false;
    // allowed_domains scopes the search — broad without it.
    return !Array.isArray(input.allowed_domains) || input.allowed_domains.length === 0;
  }
  // WebFetch — pass through; URL+prompt is already specific enough.
  return false;
}

// 2026-05-26 (U-C1-BACKEND-AUDIT-CHAIN-RETUNE, slot:alpha): narrowed from 7 dirs to 3.
// Pre-retune the classifier fired on 73.6% of all route-suggest events (1681/2277 fires)
// with 0.3% take-rate — well under the 30% target. Underlying cause was over-firing:
// edits to `routes/`, `hooks/`, `services/`, `utils/` rarely warrant the full audit
// chain (test_smoke -> auto_wiring_analyze -> schema_gap_scan -> quality_dashboard ->
// build_guard_chain). Narrowing to `engines|tools/dispatchers|schemas` covers the
// cases where the audit chain IS load-bearing (engine wiring, dispatcher contract,
// schema migration) without nagging on every trivial helper-edit. Expected: ~50-60%
// fewer fires; remaining take-rate should reflect real signal.
// Knob: PRISM_BACKEND_AUDIT_BROAD=1 restores the pre-retune wide pattern for ops
// who want maximum nagging during deep refactors.
const BACKEND_FILE_PATTERN_NARROW = /^h:\/prism\/mcp-server\/src\/(?:engines|tools\/dispatchers|schemas)\/.+\.(?:ts|js)$/i;
const BACKEND_FILE_PATTERN_BROAD = /^h:\/prism\/mcp-server\/src\/(?:engines|tools\/dispatchers|schemas|routes|hooks|services|utils)\/.+\.(?:ts|js)$/i;
function isBackendFile(filePath) {
  const pattern = process.env.PRISM_BACKEND_AUDIT_BROAD === "1"
    ? BACKEND_FILE_PATTERN_BROAD
    : BACKEND_FILE_PATTERN_NARROW;
  return pattern.test(filePath);
}

function isDoctrineFile(filePath) {
  return /^h:\/(?:prism\/)?\.claude\/(?:commands|hooks|helpers)\/.+/i.test(filePath) ||
    /^h:\/prism\/state\/shared\/.+/i.test(filePath) ||
    /^h:\/(?:prism\/)?\.claude\/settings\.json$/i.test(filePath) ||
    /^h:\/prism\/\.claude\/settings\.json$/i.test(filePath);
}

function isBroadShell(command) {
  const lower = command.toLowerCase();
  return [
    "get-childitem",
    "select-string",
    "findstr",
    "git diff",
    "git status",
    "npm run build",
    "npm run test",
    "npx vitest",
    "npx tsc",
    "ls ",
    "dir ",
  ].some((token) => lower.includes(token));
}

// DEV-VELOCITY-AUTOTRIGGER-MS0/U-C1 (2026-05-12): smarter classifier — suppress
// route-first nudges where no dispatcher actually fits. Was firing on every
// git/ls/grep against H:/prism (the false-positive everyone learned to ignore).
//
// A command is dispatcher-routable when it's exploring ENGINE / DISPATCHER /
// ACTION / SCHEMA surfaces — not when it's:
//   - git/gh metadata (git log, git show, git diff, git status, gh pr/run/issue)
//   - settings.json / .claude config edits
//   - hook source navigation (.claude/hooks/*.mjs, .claude/helpers/*.mjs)
//   - skill/command file navigation (.claude/commands/*.md)
//   - state/shared JSON read-only inspection (audit + handoff surfaces)
//   - node/python script invocations (already programmatic, no further route)
//   - npm/build/test (dev cycle commands — prism_dev exposes them but the nudge
//     is unhelpful here; the operator just typed it intentionally)
//   - cd / pushd / popd / pwd (navigation primitives)
//   - rm / mv / cp / mkdir / touch / chmod (file operations, no route)
function hasNoDispatcherRoute(command) {
  if (!command) return true;
  const lower = command.toLowerCase().trim();
  // Strip common prefixes (rtk, time, env VAR=val, etc.) before classification
  const stripped = lower
    .replace(/^(rtk|time|env\s+\w+=\S+)\s+/i, "")
    .replace(/^&\s+/, "");

  // git / gh metadata — none of these has a dispatcher route
  if (/^(git|gh)\b/.test(stripped)) {
    // exception: `git grep <pattern>` could be replaced by action_search for code patterns
    if (/^git\s+grep\b/.test(stripped)) return false;
    return true;
  }

  // node / python / npx script execution — no further routing
  if (/^(node|python|python3|npx|tsx|deno|bun)\b/.test(stripped)) return true;

  // npm / pnpm / yarn — dev cycle commands, operator-intentional
  if (/^(npm|pnpm|yarn)\b/.test(stripped)) return true;

  // File system primitives — no route
  if (/^(cd|pushd|popd|pwd|rm|mv|cp|mkdir|touch|chmod|ln|stat)\b/.test(stripped)) return true;

  // Pure navigation (ls / dir alone — but only when the path is non-engine)
  if (/^(ls|dir)\b/.test(stripped)) {
    // ls under .claude/, state/shared/, mcp-server/data/state/ → no route
    if (/(\.claude|state\/shared|mcp-server\/data\/state)/.test(stripped)) return true;
    // ls on engine/dispatcher dirs → route-able (action_search / dispatcher_map_compact)
    return false;
  }

  // grep / select-string targeting non-engine surfaces → no route
  if (/^(grep|select-string|findstr|rg)\b/.test(stripped)) {
    if (/(\.claude|state\/shared|mcp-server\/data\/state|state\/handoffs)/.test(stripped)) return true;
    // grep over engines/dispatchers — route-able
    return false;
  }

  // Default: assume the command might be route-able (preserve existing behavior
  // for commands not explicitly classified above)
  return false;
}

// U-RTK-NUDGE-FALSE-POSITIVE (2026-06-09, slot:alpha): isVerboseBash STRIPS a leading
// `rtk ` (the prefix-strip at the top of isVerboseBash) to detect the bare verb, so an
// ALREADY-rtk-prefixed verbose command (`rtk cat x`, `rtk git log -p`) still classifies
// as verbose -> the "use `rtk <cmd>`" nudge below fired on a command that ALREADY uses
// rtk (pure noise; isVerboseBash is the top spend-summary classifier). This guard lets
// the nudge suppress when the command is already rtk-wrapped -- it has already captured
// the 60-99% reduction, so the rtk recommendation is redundant.
export function isAlreadyRtk(cmd) {
  if (!cmd || typeof cmd !== "string") return false;
  // Strip leading time/env wrappers (any number), then require an rtk VERB at the head
  // (`rtk <something>`, not a bare `rtk`). `rtkfoo` is NOT rtk (the \s+ after rtk guards it).
  const head = cmd.toLowerCase().trim().replace(/^((time|env\s+\w+=\S+)\s+)+/i, "");
  return /^rtk\s+\S/.test(head);
}

async function getRegexSuggestions(toolName, filePath, bashCommand, sessionId, toolInput) {
  const messages = [];
  const normalizedCommand = normalize(bashCommand);

  if (
    toolName === "Bash" &&
    isBroadShell(bashCommand) &&
    (normalizedCommand.toLowerCase().includes("/prism") ||
      normalizedCommand.toLowerCase().includes("/mcp-server") ||
      normalizedCommand.toLowerCase().includes("h:/")) &&
    // U-C1 (2026-05-12): suppress when classifier says no dispatcher fits.
    // Eliminates the false-positive nudge on git/.claude/state-shared/script-runs
    // that was teaching operators to tune out the hook.
    !hasNoDispatcherRoute(bashCommand)
  ) {
    messages.push(
      "Route first: prefer prism_session:dispatcher_map_compact, prism_session:action_search, and prism_session:tool_route_best before broad shell exploration.",
    );
  }

  if (isBackendFile(filePath)) {
    // U-OBS-BACKEND-AUDIT-SESSION-GATE (2026-06-09, slot:alpha): per-SESSION
    // rate-limit (twin of the doctrineSurface fix at :679). The message is
    // STATIC — AUDIT_CHAIN_CMD ends in a literal "<path>", never interpolated —
    // so re-pushing it on every backend-file edit re-injects byte-identical text.
    // Telemetry: 4052 fires / 3 takeups (0.07%). Fire at most once per session;
    // zero info lost (the Stop defer-queue surfaces it once regardless).
    if (!_doctrineRecentlySeen(sessionId, _BACKEND_AUDIT_SESSION_KEY)) {
      messages.push(
        `Backend audit: after meaningful edits use ${AUDIT_CHAIN_CMD} or the equivalent prism_dev chain (test_smoke -> auto_wiring_analyze -> schema_gap_scan -> quality_dashboard -> build_guard_chain).`,
      );
      _markDoctrineSeen(sessionId, _BACKEND_AUDIT_SESSION_KEY);
    }
  }

  // TOKEN-SAVINGS-GREP-ROUTE: broad Grep against prism with content mode + no
  // narrowing → suggest the MCP-routed search. Only nudges; the model decides.
  if (toolName === "Grep") {
    const g = getGrepInput(toolInput);
    if (isBroadGrep(g)) {
      messages.push(
        "TOKEN-SAVE — broad Grep (output_mode='content', no glob/type, prism scope) returns full match lines for every file. Cheaper alternatives: `prism_session:master_index_query` (ranked top-K across the 110K-node graph + wiki + memory) or `prism_dev:code_search`. Or narrow with `glob`/`type` and `output_mode:'files_with_matches'` to get just file paths.",
      );
    }
  }

  // TOKEN-SAVINGS-PIVOT iter-2: the remaining 4 tool classes.
  // Bash — verbose-output commands route through MCP-server compact paths.
  if (toolName === "Bash" && isVerboseBash(bashCommand) && !isAlreadyRtk(bashCommand)) {
    messages.push(
      "TOKEN-SAVE — verbose Bash (cat/git log --all/git log -p/find/docker logs/kubectl get/tail -f) returns KB-MB raw. Use `rtk <cmd>` for 60-99% output reduction (the canonical answer — no MCP action wraps shell). For `cat`, prefer Read tool with `offset`/`limit`. For `git log`, `prism_session:action_search` returns code-level history (slimmer). For `find`/`grep`, `prism_session:master_index_query`.",
    );
  }
  // Read — large digest/index file → master_index_query is slimmer.
  if (toolName === "Read" && isLargeRead(filePath)) {
    messages.push(
      "TOKEN-SAVE — large digest/index file. Prefer `prism_session:master_index_query` (ranked top-K against the 110K-node graph + wiki + memory) for what you actually need, or Read with explicit `offset`/`limit` for a targeted slice. ENGINE_DIGEST/DISPATCHER_DIGEST/PRISM-INVENTORY-LATEST/MEMORY.md/CLAUDE.md routinely return 10-50K tokens raw.",
    );
  }
  // Write/Edit/MultiEdit — large new content. Nudge dedup + server-side store.
  // iter12: MultiEdit was previously slipping past — its content lives in
  // edits[].new_string, NOT a top-level field. Sum across all edits.
  if (toolName === "Write" || toolName === "Edit" || toolName === "MultiEdit") {
    let content = String(toolInput?.content || toolInput?.new_string || "");
    if (toolName === "MultiEdit" && Array.isArray(toolInput?.edits)) {
      content = toolInput.edits
        .map((e) => String(e?.new_string || ""))
        .join("");
    }
    if (isLargeWrite(content)) {
      messages.push(
        "TOKEN-SAVE — large Write (>50KB ≈ 12-15K output tokens). If this content is generated/derivable, consider `prism_dev:file_write` (server-side dedup check against the asset registry) or splitting into smaller logical files. duplicationGuardEngine.mustCheckBeforeCreating() for any new asset.",
      );
    }
  }
  // Glob / WebSearch — broad-search route through MCP.
  if ((toolName === "Glob" || toolName === "WebSearch" || toolName === "WebFetch") && isBroadSearch(toolName, toolInput)) {
    if (toolName === "Glob") {
      messages.push(
        "TOKEN-SAVE — broad Glob (`**/*` with no `path`) returns every file. Narrow with `path` to a specific dir, or use `prism_session:master_index_query` for ranked symbol/file lookups across the 110K-node graph.",
      );
    } else if (toolName === "WebSearch") {
      // TOKEN-SAVINGS-PIVOT/U-WEBSEARCH-KB-ROUTE (2026-05-23): if query looks
      // internal (PRISM concepts), route to prism_knowledge:search FIRST —
      // external WebSearch can't find internal engine/dispatcher/wiki content.
      // Keep "unbounded WebSearch" substring so _classifierFromMessage still
      // returns isBroadWebSearch.
      const q = String(toolInput.query || "").toLowerCase();
      const internalHit = /\b(prism_|engine|dispatcher|action|skill|hook|wiki|tribal|kienzle|taylor|jm[\s-]?die|roadmap|milestone|mcp-server|atomic-roadmap|claude\.md|master[\s-]?index)\b/.test(q);
      if (internalHit) {
        messages.push(
          "TOKEN-SAVE — unbounded WebSearch query looks INTERNAL. PRISM concepts (engines/dispatchers/wiki/tribal) live in `prism_knowledge:search` and `prism_session:master_index_query` — external web won't find them. Use those FIRST; fall back to WebSearch with `allowed_domains` only if internal returns nothing.",
        );
      } else {
        messages.push(
          "TOKEN-SAVE — unbounded WebSearch (no `allowed_domains`). Scope with `allowed_domains:['site.com']` to slim the result set, or pre-summarize via Ollama (zero Claude tokens) — `prism_intelligence:ollama_*` chains.",
        );
      }
    }
  }

  if (isDoctrineFile(filePath)) {
    // U-SDF11 + HIGHVALUE #4 (2026-06-09, slot:alpha): per-SESSION rate-limit
    // (was per-(session,file) → re-fired once per distinct doctrine file Read;
    // a /loop Reading 25 .claude/hooks/ files fired the IDENTICAL reminder 25×).
    // Keyed on a fixed sentinel so it fires at most once per session.
    if (!_doctrineRecentlySeen(sessionId, _DOCTRINE_SESSION_KEY)) {
      messages.push(
        "Doctrine/command surface: verify the command bridge and MCP directive before teaching a new manual workflow.",
      );
      _markDoctrineSeen(sessionId, _DOCTRINE_SESSION_KEY);
    }
  }

  return messages;
}

async function getOllamaSuggestions(toolName, filePath, bashCommand) {
  if (!queryOllama) return null;

  // Only query Ollama for Bash commands that look like exploration
  if (toolName !== "Bash" || !isBroadShell(bashCommand)) {
    return null;
  }

  // SUBSTRATE-UTIL (2026-06-29, slot:sierra, audit w0yjhqcp9 graph-x-ollama): the hardcoded
  // 3-dispatcher stub ("Available MCP dispatchers: prism_session/dev/calc ...") was REMOVED from
  // the prompt body -- it narrowed the model's visible surface to 3 of the 123 real dispatchers and
  // biased routing toward them. The relevant top-N manifest now ships in the SYSTEM prompt via
  // resolveSystemPrompt (Gap 4) grounded on the bash command (Gap 4 P2), so the body needs no list.
  const prompt = `Task: User is running "${bashCommand}" in PRISM codebase.

What's the best MCP action to use instead? Reply with just: dispatcher:action -- reason (10 words max)`;

  try {
    const result = await queryOllama(prompt, {
      hookType: 'mcp_route',
      timeoutMs: 300,
      maxTokens: 40,
      // SUBSTRATE-UTIL Gap 4 P2: ground the dispatcher manifest on the RAW bash command, not the
      // full templated prompt above (which embeds a static "Available MCP dispatchers: ..." list
      // whose boilerplate tokens pollute the ranking). The model still SEES the full prompt.
      groundingQuery: bashCommand,
    });

    if (result.success && result.response) {
      return [`🤖 Suggested route: ${result.response}`];
    }
  } catch {
    // Ollama failed — fall through to regex
  }

  return null;
}

async function main() {
  if (_hp_shouldSkip("mcp-route-suggest")) { console.log(JSON.stringify({ continue: true })); return; }
  const input = await readStdin();
  const toolName = input.tool_name || input.toolName || "";
  const toolInput = input.tool_input || input.input || {};
  // U-SDF11: extract sessionId for per-session doctrine rate-limiting.
  const sessionId = (input.session_id || input.sessionId || "").toString().slice(0, 36);

  if (!["Bash", "Read", "Edit", "Write", "MultiEdit", "Grep", "Glob", "WebSearch", "WebFetch"].includes(toolName)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // U-PMDS01 (2026-05-24, slot:alpha) — suppress route-suggest noise when MCP
  // daemon is unreachable. Every dispatcher nudge points at prism_* actions
  // that will fail. Honest fail-safe: stale state → don't suppress.
  // Knob: PRISM_ROUTE_SUGGEST_HONOR_MCP_DOWN=0 disables this gate.
  if (process.env.PRISM_ROUTE_SUGGEST_HONOR_MCP_DOWN !== "0") {
    const mcpStatus = isMcpDown(readMcpState());
    if (mcpStatus.down) {
      process.stdout.write(JSON.stringify({ continue: true }));
      return;
    }
  }

  const filePath = getFilePath(toolInput);
  const bashCommand = getBashCommand(toolInput);

  // Try Ollama first for Bash commands
  let messages = await getOllamaSuggestions(toolName, filePath, bashCommand);

  // Fall back to regex-based suggestions
  if (!messages || messages.length === 0) {
    messages = await getRegexSuggestions(toolName, filePath, bashCommand, sessionId, toolInput);
  }

  if (messages.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // iter-3 telemetry: record which classifiers fired (best-effort, atomic-write).
  // Recorded BEFORE appendActionHints so classifier substring-matching stays
  // pristine (the hint suffix doesn't change classification but order is clear).
  _recordRouteFires(sessionId, toolName, messages);

  // U-PSN-DEFER-QUEUE (iter15, 2026-05-23, slot:alpha): for the dominant 90%
  // of nudges (backendAuditChain + doctrineSurface) that fire mid-edit and
  // can't be acted on in the moment, also write to the deferred-action queue.
  // The Stop hook stop-defer-queue-drain.mjs surfaces them at session-end as
  // a consolidated wind-down checklist (operator-actionable then). Best-
  // effort IO; never blocks the nudge emit. Knob: PRISM_DEFER_QUEUE_DISABLE=1.
  if (process.env.PRISM_DEFER_QUEUE_DISABLE !== "1") {
    try {
      const { isDeferrable, pushToQueue, readQueueFromFile, writeQueueToFile } =
        await import("../../scripts/lib/defer-queue.mjs");
      let queue = null;
      for (const msg of messages) {
        const cls = _classifierFromMessage(msg);
        if (!cls || !isDeferrable(cls)) continue;
        if (!queue) queue = readQueueFromFile();
        queue = pushToQueue(queue, {
          sessionId,
          classifier: cls,
          filePath: filePath || undefined,
          command: bashCommand || undefined,
          hint: msg.slice(0, 200),
        });
      }
      if (queue) writeQueueToFile(queue);
    } catch { /* defer-queue IO is best-effort; nudge emission must not fail */ }
  }

  // U-PSN-ACTION-HINT (iter22-followup): surface the preferred MCP action
  // per classifier inline. Closes the iter22 advisory gap where nudges said
  // "prefer the MCP action it names" without actually naming one (doctrine
  // surface, isBroadGlob, backendAuditChain were the worst offenders).
  if (process.env.PRISM_MCP_ROUTE_ACTION_HINT_DISABLE !== "1") {
    messages = appendActionHints(messages);
  }

  // INTERIM LOW-TAKE SUPPRESS (U-MCP-ROUTE-SUPPRESS-ISVERBOSEBASH, 2026-06-20):
  // drop base messages for audit-flagged `suppress-candidate` classifiers the
  // decay actor below can't auto-mute (0-take guard). The fire was already counted
  // by _recordRouteFires above, so telemetry/audit still measure the would-be need.
  // Reversible: PRISM_MCP_ROUTE_INTERIM_SUPPRESS=0.
  messages = applyInterimSuppress(messages);
  if (messages.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // ROUTE-DECAY-SPLICE (2026-06-12, slot:alpha): consume the take-rate audit
  // 'suppress' verdict via golf's keystone (scripts/lib/route-suggest-decay.mjs).
  // Drops classifiers proven to be net-negative noise (>=30% fire-share + <5%
  // take, with verify-wiring + fires>0&&takes>0 + 7d-freshness safety guards all
  // baked into the lib -- it mutes NOTHING on empty/stale/0-take data). This is
  // the LAST filter before emission; each drop is logged so savings are measured,
  // not asserted. Reversible: PRISM_ROUTE_DECAY_DISABLE=1.
  if (process.env.PRISM_ROUTE_DECAY_DISABLE !== "1") {
    messages = messages.filter((msg) => {
      const _dc = _classifierFromMessage(msg);
      if (_dc && isRouteSuggestDecaySuppressed(_dc)) {
        logDecaySuppression(_dc, sessionId);
        return false;
      }
      return true;
    });
    if (messages.length === 0) {
      process.stdout.write(JSON.stringify({ continue: true }));
      return;
    }
  }

  // iter22 (U-NUDGE-SELF-AWARENESS): if the fleet take-rate is below the
  // awareness floor, append a single-line measured-rate footer so the model
  // sees the gap inline before deciding whether to act on the nudge.
  // Read-after-write: _recordRouteFires already updated the sidecar above.
  // HIGHVALUE #4 (2026-06-09, slot:alpha): the take-rate footer rode EVERY fire
  // (identical awareness line, numbers barely changing). Gate it once-per-session
  // via the same rate-limit machinery so it surfaces the take-rate gap once, not
  // on every Read/Edit. Only mark-seen when a footer is actually produced
  // (formatTakeRateAdvisory returns null for above-threshold sessions — those
  // stay un-marked so the footer can still fire later if the rate drops).
  let advisory = null;
  if (process.env.PRISM_MCP_ROUTE_AWARENESS_DISABLE !== "1" &&
      !_doctrineRecentlySeen(sessionId, _FOOTER_SESSION_KEY)) {
    try {
      const stats = JSON.parse(_fs.readFileSync(_ROUTE_STATS_FILE, "utf8"));
      advisory = formatTakeRateAdvisory(stats);
      if (advisory) _markDoctrineSeen(sessionId, _FOOTER_SESSION_KEY);
    } catch { /* no sidecar / parse error → silent passthrough */ }
  }
  const finalContext = advisory ? `${messages.join("\n")}\n${advisory}` : messages.join("\n");

  process.stdout.write(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: finalContext,
      },
    }),
  );
}

// U-PSN-TAKEUP-MAP-EXPORT (iter6, 2026-05-23, slot:alpha): guard main() so the
// module is safely importable for tests without firing stdin-read + stdout-
// write side-effects. Same pattern as the iter4/5 guard on the Ollama
// injector. Without this, `node --test` runs that import this module get a
// stray `{"continue":true}` injected into the TAP stream + the runner's
// summary emission breaks (false exit-255 even when all individual tests pass).
if (process.argv[1] && process.argv[1].endsWith("mcp-route-suggest.mjs")) {
  main().catch(() => {
    process.stdout.write(JSON.stringify({ continue: true }));
  });
}
