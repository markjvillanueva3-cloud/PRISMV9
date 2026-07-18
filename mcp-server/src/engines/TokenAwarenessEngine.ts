/**
 * TOKEN-AWARENESS-MS0 / U-TA06 — TokenAwarenessEngine
 *
 * MCP-accessible facade over the sidecar produced by
 * `.claude/hooks/token-awareness-sidecar.mjs`. Wraps the pure libs in
 * `scripts/lib/token-awareness-{state,transcript-token-counter}.mjs` so MCP
 * consumers (and the `prism_context:token_awareness_*` dispatcher actions) can
 * query token / quota / context-pressure state without re-implementing the
 * 4-source merge.
 *
 * Read-only. Sidecar writes happen in the .mjs hook layer; this engine reads
 * the canonical artifact and decorates it with staleness + recommended action.
 *
 * @module TokenAwarenessEngine
 */
import * as fs from "fs";
import * as path from "path";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SIDECAR_DIR = `${PRISM_ROOT}/state/shared`;
const SLOTS_FILE = `${PRISM_ROOT}/state/shared/chat-slots.json`;
const DEFAULT_STALE_TTL_MS = 60_000;

export type Zone = "GREEN" | "YELLOW" | "RED" | "CRITICAL";

export interface TokenAwarenessState {
  schemaVersion: string;
  capturedAt: string;
  sources: {
    statusline?: boolean;
    rateLimits?: boolean;
    transcript?: boolean;
    offload?: boolean;
  };
  ctx: { tokens: number | null; maxTokens: number | null; pct: number | null };
  quota: {
    fiveHour: { pct: number | null; resetsAt: string | null };
    sevenDay: { pct: number | null; resetsAt: string | null };
  } | null;
  cumulative: {
    input: number;
    cache_read: number;
    cache_creation: number;
    output: number;
  } | null;
  offload: { offloaded: number; kept: number; ratio: number | null } | null;
  zone: Zone;
  worstPct: number;
  worstSource: "ctx" | "5h" | "7d" | "unknown";
  stale: boolean;
  ageMs: number;
  action: string;
  reasoning: string;
  slot?: string;
  sessionId?: string;
  host?: string;
  hook?: string;
}

export interface ZoneSummary {
  zone: Zone;
  worstPct: number;
  worstSource: string;
  action: string;
  reasoning: string;
  stale: boolean;
}

export interface ShouldCompactDecision {
  shouldCompact: boolean;
  reason: string;
  zone: Zone;
  worstPct: number;
}

function safeJson<T = unknown>(p: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as T;
  } catch {
    return null;
  }
}

function bumpZoneForStale(zone: Zone | undefined): Zone {
  if (zone === "GREEN" || !zone) return "YELLOW";
  return zone;
}

function applyStaleness(
  state: TokenAwarenessState,
  nowMs: number,
  ttlMs = DEFAULT_STALE_TTL_MS,
): TokenAwarenessState {
  const t = Date.parse(state.capturedAt || "");
  if (!Number.isFinite(t)) {
    return { ...state, stale: true, ageMs: Number.POSITIVE_INFINITY, zone: bumpZoneForStale(state.zone) };
  }
  const ageMs = Math.max(0, nowMs - t);
  const stale = ageMs > ttlMs;
  return {
    ...state,
    stale,
    ageMs,
    zone: stale ? bumpZoneForStale(state.zone) : state.zone,
  };
}

function resolveSlotFromSession(sessionId: string | undefined): string {
  if (!sessionId) return "unknown";
  const slotsDoc = safeJson<{ slots: Record<string, { chatId?: string }> }>(SLOTS_FILE);
  if (!slotsDoc || !slotsDoc.slots) return "unknown";
  for (const [name, data] of Object.entries(slotsDoc.slots)) {
    if (!data) continue;
    if (data.chatId === sessionId) return name;
    if (data.chatId && sessionId.includes(data.chatId.replace(/^claude-/, ""))) return name;
  }
  return "unknown";
}

/**
 * Read the per-slot token-awareness sidecar. Returns null if the file is
 * missing or unreadable (R12: callers must distinguish "no data" from
 * "fresh data"). Decorates with staleness flag.
 */
function readSidecarForSlot(slot: string, nowMs = Date.now()): TokenAwarenessState | null {
  const fp = path.join(SIDECAR_DIR, `token-budget-${slot}.json`);
  const raw = safeJson<TokenAwarenessState>(fp);
  if (!raw) return null;
  return applyStaleness(raw, nowMs);
}

export class TokenAwarenessEngine {
  /**
   * Full state for a slot (or session). Returns null if no sidecar exists yet.
   */
  getState({
    slot,
    sessionId,
    nowMs,
  }: { slot?: string; sessionId?: string; nowMs?: number } = {}): TokenAwarenessState | null {
    const resolvedSlot = slot || resolveSlotFromSession(sessionId);
    return readSidecarForSlot(resolvedSlot, nowMs ?? Date.now());
  }

  /**
   * Compact zone summary: just zone + action + reasoning. Lightweight surface
   * for /loop pre-iteration check.
   */
  getZone({
    slot,
    sessionId,
    nowMs,
  }: { slot?: string; sessionId?: string; nowMs?: number } = {}): ZoneSummary | null {
    const s = this.getState({ slot, sessionId, nowMs });
    if (!s) return null;
    return {
      zone: s.zone,
      worstPct: s.worstPct,
      worstSource: s.worstSource,
      action: s.action,
      reasoning: s.reasoning,
      stale: s.stale,
    };
  }

  /**
   * Autonomous decision: should /loop voluntarily emit /compact this iteration?
   * Returns { shouldCompact, reason, zone, worstPct }.
   *
   * Rule: TRUE iff zone is RED or CRITICAL (action ∈ {compact, stop-and-compact}).
   * Stale data → if already RED+ stay TRUE (never downgrade); otherwise FALSE.
   */
  shouldCompact({
    slot,
    sessionId,
    nowMs,
  }: { slot?: string; sessionId?: string; nowMs?: number } = {}): ShouldCompactDecision {
    const s = this.getState({ slot, sessionId, nowMs });
    if (!s) {
      return {
        shouldCompact: false,
        reason: "no sidecar — token-awareness inactive",
        zone: "GREEN",
        worstPct: 0,
      };
    }
    const shouldCompact = s.zone === "RED" || s.zone === "CRITICAL";
    return {
      shouldCompact,
      reason: shouldCompact ? s.reasoning : "below compact threshold",
      zone: s.zone,
      worstPct: s.worstPct,
    };
  }

  /**
   * Pretty-print action recommendation (mirrors the inject hook's surface so
   * MCP callers get the same advisory text).
   */
  recommendAction({
    slot,
    sessionId,
    nowMs,
  }: { slot?: string; sessionId?: string; nowMs?: number } = {}): { action: string; reasoning: string; zone: Zone } {
    const s = this.getState({ slot, sessionId, nowMs });
    if (!s) {
      return { action: "proceed", reasoning: "no token-awareness data", zone: "GREEN" };
    }
    return { action: s.action, reasoning: s.reasoning, zone: s.zone };
  }

  /**
   * History: list all sidecars currently on disk (one per active slot).
   * Useful for cross-slot fleet view ("which chat is closest to RED?").
   */
  getHistory(): Array<{ slot: string; zone: Zone; worstPct: number; capturedAt: string; stale: boolean }> {
    if (!fs.existsSync(SIDECAR_DIR)) return [];
    const out: Array<{ slot: string; zone: Zone; worstPct: number; capturedAt: string; stale: boolean }> = [];
    const nowMs = Date.now();
    for (const f of fs.readdirSync(SIDECAR_DIR)) {
      const m = f.match(/^token-budget-([a-z0-9-]+)\.json$/);
      if (!m) continue;
      const slot = m[1];
      const s = readSidecarForSlot(slot, nowMs);
      if (!s) continue;
      out.push({
        slot,
        zone: s.zone,
        worstPct: s.worstPct,
        capturedAt: s.capturedAt,
        stale: s.stale,
      });
    }
    return out;
  }
}

export const tokenAwarenessEngine = new TokenAwarenessEngine();
