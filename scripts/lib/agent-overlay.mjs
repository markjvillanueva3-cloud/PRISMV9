/**
 * agent-overlay.mjs — pure agent-status overlay logic for system-viz.
 *
 * OBSIDIAN-INTELLIGENCE-MS3 / G2 (U-AGENT-PIXEL-DEPT-OVERLAY).
 *
 * Classifies each occupied chat slot into one of four agent-activity
 * statuses — typing | parsing | idle | errored — from the slot's heartbeat
 * age (chat-slots.json) plus the latest matching AGENT_CHAT.jsonl entry.
 * `buildAgentOverlay` assembles the overlay JSON; generate-system-viz.mjs
 * writes it to its OWN sibling file (state/shared/system-viz/agent-overlay.json)
 * — deliberately NOT into system-graph.json, so the live, time-varying overlay
 * never churns the canonical structural graph or its downstream consumers
 * (wiki-regen, master-index, GraphSAGE). The agent-overlay.js viewer loads
 * that sibling file and renders the color-coded subagent badges.
 *
 * Pure + side-effect-free: no fs, no module imports — so AgentOverlay.test.ts
 * can exercise every branch hermetically under vitest.
 *
 * TRUST NOTE: AGENT_CHAT.jsonl is an append-only multi-writer log — any chat
 * can post arbitrary text. The `lastMessage` field on each agent record is
 * therefore UNTRUSTED; control chars are stripped here, but the renderer
 * (agent-overlay.js) MUST insert it via textContent, never innerHTML.
 */

// ── Vendored heartbeat thresholds — KEEP-IN-SYNC ────────────────────────────
// Re-implemented here (NOT imported) because .claude/helpers/chat-slots.mjs is
// vitest-unloadable — importing it would break the AgentOverlay.test.ts suite.
// Same vendoring pattern as .claude/helpers/process-slot-map.mjs (FLEET-REAPER).
// Source of truth: H:/prism/.claude/helpers/chat-slots.mjs
//   STALE_TTL_MS = 2  * 60 * 1000  → agent-overlay ACTIVE_TTL_MS
//   CRASH_TTL_MS = 10 * 60 * 1000  → agent-overlay IDLE_TTL_MS
// AgentOverlay.test.ts re-reads chat-slots.mjs and asserts these still match.

/** Heartbeat younger than this → the agent is actively working. */
export const ACTIVE_TTL_MS = 2 * 60 * 1000;
/** Heartbeat older than this → the chat is dead (reaper-crashed). */
export const IDLE_TTL_MS = 10 * 60 * 1000;
/** A chat-entry timestamp beyond `now` + this much is implausible clock skew. */
export const FUTURE_GRACE_MS = 5 * 60 * 1000;
/** Hard cap on the embedded `lastMessage` length (a documented contract). */
export const MESSAGE_MAX_CHARS = 240;

/** The four agent-activity statuses, in render order. */
export const AGENT_STATUSES = Object.freeze(["typing", "parsing", "idle", "errored"]);

/** Overlay JSON schema version — bump on a breaking shape change. */
export const AGENT_OVERLAY_SCHEMA_VERSION = 1;

/**
 * Hex color token per status — carried in each agent record for JSON
 * consumers. agent-overlay.css mirrors these on `.agent-badge.status-*`
 * (KEEP-IN-SYNC: agent-overlay.css is the render-side copy; AgentOverlay.test.ts
 * re-reads the .css and asserts every hex below is present).
 */
export const STATUS_COLORS = Object.freeze({
  typing: "#22c55e", // green — actively producing output
  parsing: "#3b82f6", // blue  — active, mid-pipeline (reading / analyzing)
  idle: "#64748b", // slate — heartbeat present but no recent activity
  errored: "#ef4444", // red   — explicit error signal, or heartbeat dead
});

// AGENT_CHAT.jsonl `status` is free-form (agent-coordination.mjs enforces no
// enum). Treat only these exact tokens as an error signal — anchored so a long
// benign status string can never partial-match into a false `errored`.
const ERROR_STATUS_RE = /^(error|errored|failed|failing|fail|blocked|crashed|stuck)$/i;

/** Char codes strictly below this are C0 control chars; DEL is 0x7f. */
const CTRL_MAX = 0x20;
const DEL_CODE = 0x7f;

/**
 * Parse an ISO-8601 timestamp to epoch ms. Returns NaN for any non-string —
 * `Date.parse` otherwise coerces a number/object to a string and may misread
 * it as a bare year, silently producing a wrong (finite) time.
 * @param {unknown} v
 * @returns {number}
 */
function parseIsoMs(v) {
  return typeof v === "string" ? Date.parse(v) : NaN;
}

/**
 * A chat slot is "mid-pipeline" when any pipeline tracking field is set —
 * i.e. it is grinding a multi-step task rather than in a quick exchange.
 * @param {Record<string, unknown>|null|undefined} slot
 */
function isMidPipeline(slot) {
  return (
    slot != null &&
    (slot.pipelineStep != null ||
      slot.pipelineIter != null ||
      slot.pipelineTarget != null)
  );
}

/**
 * Recover a numeric pid from an AGENT_CHAT entry. Entries key by `session_key`
 * ("pid-57676") or `agent_instance` ("Claude@HOST/pid-57676"); chat-slots keys
 * by numeric `pid`. Returns null when no pid can be parsed.
 * @param {Record<string, unknown>|null|undefined} entry
 * @returns {number|null}
 */
export function chatEntryPid(entry) {
  if (!entry || typeof entry !== "object") return null;
  for (const field of [entry.session_key, entry.agent_instance]) {
    if (typeof field !== "string") continue;
    const m = field.match(/pid-(\d+)/);
    if (m) return Number(m[1]);
  }
  return null;
}

/**
 * The latest AGENT_CHAT entry attributable to `slot`. Match rule:
 *   - pid must equal slot.pid;
 *   - when slot.host is set, entry.machine MUST equal it (strict — a torn
 *     entry missing `machine` is rejected rather than risk a cross-host
 *     pid-collision match);
 *   - entry timestamps beyond `now` + FUTURE_GRACE_MS are skipped as
 *     implausible clock skew (so a far-future torn entry cannot win "latest").
 * Returns null when the slot has no pid or nothing matches.
 *
 * @param {Record<string, unknown>|null|undefined} slot
 * @param {Array<Record<string, unknown>>} chatEntries
 * @param {number} [now] — ms epoch, for the future-skew clamp
 * @returns {Record<string, unknown>|null}
 */
export function matchChatEntry(slot, chatEntries, now = Date.now()) {
  if (!slot || typeof slot.pid !== "number" || !Array.isArray(chatEntries)) {
    return null;
  }
  const ts = Number.isFinite(now) ? now : Date.now();
  const futureCutoff = ts + FUTURE_GRACE_MS;
  let best = null;
  let bestMs = -Infinity;
  for (const e of chatEntries) {
    if (chatEntryPid(e) !== slot.pid) continue;
    // Strict host match: when the slot names a host, the entry must name the
    // same one. Defeats cross-host pid collision; rejects host-less entries.
    if (slot.host && (!e || e.machine !== slot.host)) continue;
    const ms = parseIsoMs(e && e.timestamp);
    if (!Number.isFinite(ms)) continue;
    if (ms > futureCutoff) continue; // implausible future — clock skew
    if (ms > bestMs) {
      bestMs = ms;
      best = e;
    }
  }
  return best;
}

/**
 * Classify one OCCUPIED slot into typing | parsing | idle | errored.
 * The caller must pass a non-null slot — empty slots produce no agent node.
 *
 * Precedence (first match wins):
 *   1. explicit error status in the matched AGENT_CHAT entry → errored
 *   2. missing / unparseable heartbeat                       → errored
 *   3. heartbeat age >= IDLE_TTL_MS  (dead — reaper-crashed)  → errored
 *   4. heartbeat age >= ACTIVE_TTL_MS (stale, not yet dead)   → idle
 *   5. active + mid-pipeline (pipelineStep/Iter/Target set)   → parsing
 *   6. active, no pipeline in flight                          → typing
 *
 * @param {Record<string, unknown>|null} slot
 * @param {Record<string, unknown>|null} chatEntry — matched AGENT_CHAT entry
 * @param {number} now — ms epoch
 * @returns {"typing"|"parsing"|"idle"|"errored"}
 */
export function classifyAgentStatus(slot, chatEntry, now = Date.now()) {
  if (
    chatEntry &&
    typeof chatEntry.status === "string" &&
    ERROR_STATUS_RE.test(chatEntry.status.trim())
  ) {
    return "errored";
  }
  const ts = Number.isFinite(now) ? now : Date.now();
  const lastMs = slot ? parseIsoMs(slot.lastHeartbeat) : NaN;
  if (!Number.isFinite(lastMs)) return "errored";
  const ageMs = ts - lastMs;
  if (ageMs >= IDLE_TTL_MS) return "errored";
  if (ageMs >= ACTIVE_TTL_MS) return "idle";
  return isMidPipeline(slot) ? "parsing" : "typing";
}

/**
 * Parse AGENT_CHAT.jsonl text into entry objects, skipping malformed lines.
 * `tailLines > 0` keeps only the last N lines — the log is append-only so the
 * tail carries the freshest per-slot state.
 * @param {string} text
 * @param {number} [tailLines]
 * @returns {Array<Record<string, unknown>>}
 */
export function parseChatJsonl(text, tailLines = 0) {
  if (typeof text !== "string" || text.length === 0) return [];
  let lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (tailLines > 0 && lines.length > tailLines) lines = lines.slice(-tailLines);
  const out = [];
  for (const line of lines) {
    try {
      const e = JSON.parse(line);
      if (e && typeof e === "object" && !Array.isArray(e)) out.push(e);
    } catch {
      /* skip malformed line — append-only log can be torn mid-write */
    }
  }
  return out;
}

function pipelineSummary(slot) {
  if (!isMidPipeline(slot)) return null;
  return {
    step: slot.pipelineStep ?? null,
    iter: slot.pipelineIter ?? null,
    target: slot.pipelineTarget ?? null,
  };
}

/**
 * Replace C0 / DEL control chars with spaces. Authored as a codepoint scan
 * rather than a regex on purpose: a control-char escape sequence in source is
 * decoded to a raw control BYTE by the file writer, which makes git classify
 * the file as binary. Every character in this function is plain ASCII.
 * HTML metacharacters are intentionally LEFT intact — escaping them is the
 * renderer's job (agent-overlay.js uses textContent).
 */
function cleanText(s) {
  if (typeof s !== "string") return null;
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0);
    out += code < CTRL_MAX || code === DEL_CODE ? " " : ch;
  }
  return out;
}

function truncate(s, max) {
  if (typeof s !== "string") return null;
  return s.length > max ? s.slice(0, Math.max(0, max - 3)) + "..." : s;
}

function strOrNull(v) {
  return typeof v === "string" ? v : null;
}

/**
 * Build the agent-status overlay JSON from a parsed chat-slots.json object and
 * the parsed AGENT_CHAT.jsonl entries. Only occupied (non-null) slots become
 * agent records; empty slots are counted but not rendered.
 *
 * @param {Object}  input
 * @param {Object}  input.chatSlots    — parsed chat-slots.json ({schemaVersion,slots})
 * @param {Array}   [input.chatEntries] — parsed AGENT_CHAT.jsonl entries
 * @param {number}  [input.now]         — ms epoch (injectable for tests)
 * @returns {Object} overlay — {schemaVersion, generatedAt, source, counts, agents}
 */
export function buildAgentOverlay({ chatSlots, chatEntries = [], now = Date.now() } = {}) {
  const ts = Number.isFinite(now) ? now : Date.now();
  const slots =
    chatSlots && typeof chatSlots === "object" && chatSlots.slots && typeof chatSlots.slots === "object"
      ? chatSlots.slots
      : {};
  const entries = Array.isArray(chatEntries) ? chatEntries : [];

  const agents = [];
  const counts = { typing: 0, parsing: 0, idle: 0, errored: 0 };
  let occupied = 0;
  let empty = 0;

  for (const slotName of Object.keys(slots).sort()) {
    const slot = slots[slotName];
    if (!slot || typeof slot !== "object") {
      empty++;
      continue;
    }
    occupied++;
    const chatEntry = matchChatEntry(slot, entries, ts);
    const status = classifyAgentStatus(slot, chatEntry, ts);
    counts[status]++;
    const lastMs = parseIsoMs(slot.lastHeartbeat);
    agents.push({
      slot: slotName,
      nodeId: `agent.${slotName}`,
      status,
      color: STATUS_COLORS[status],
      chatId: strOrNull(slot.chatId),
      host: strOrNull(slot.host),
      pid: typeof slot.pid === "number" ? slot.pid : null,
      branch: strOrNull(slot.branch),
      topic: strOrNull(slot.topic),
      activity: strOrNull(slot.activity),
      // age clamped at 0 — a future heartbeat (cross-host clock skew) is "now".
      heartbeatAgeMs: Number.isFinite(lastMs) ? Math.max(0, Math.round(ts - lastMs)) : null,
      pipeline: pipelineSummary(slot),
      // UNTRUSTED — sourced from the multi-writer AGENT_CHAT.jsonl log. The
      // agent-overlay.js renderer MUST insert this via textContent, never
      // innerHTML. Control chars are stripped; HTML metachars are not.
      lastMessage: chatEntry ? truncate(cleanText(chatEntry.message ?? chatEntry.raw_message), MESSAGE_MAX_CHARS) : null,
      lastChatTs: chatEntry ? strOrNull(chatEntry.timestamp) : null,
    });
  }

  return {
    schemaVersion: AGENT_OVERLAY_SCHEMA_VERSION,
    generatedAt: new Date(ts).toISOString(),
    source: {
      chatSlotsSchemaVersion:
        chatSlots && typeof chatSlots.schemaVersion !== "undefined" ? chatSlots.schemaVersion : null,
      chatEntriesScanned: entries.length,
    },
    counts: { ...counts, occupied, empty },
    agents,
  };
}
