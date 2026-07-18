/**
 * ZuluCapabilityRegistryEngine -- C6 (ZULU fleet, HZD-NEW-04).
 *
 * Live, runtime capability attestation per slot. The gap this fills:
 * ZuluTaskAuctionEngine bids using a slot's STATIC soul-YAML domain_filter -- it cannot
 * tell a just-/compact'd cold slot from one that has been warm for 2 hours. This engine
 * aggregates the RUNTIME signals already present (chat-slots.json heartbeats + claimedAt,
 * slot-task-claims queue depth) into a per-slot CapabilityAttestation the auctioneer (or
 * any orchestrator) can read to prefer a warm, live, low-queue slot.
 *
 * SAFETY -- READ-ONLY aggregation. This engine NEVER mutates slot state, never writes a
 * store, never spawns. It only reads existing chat-slots.json + slot-task-claims.json and
 * derives a point-in-time snapshot. No durable store (unlike C2/C4/C5) -- the attestation
 * is live/ephemeral by definition (a 2-minutes-ago warmth reading is the stale thing we are
 * trying to avoid, so we never persist it).
 *
 * R12 honesty: `active_models` cannot be reliably sourced from the slot files alone, so the
 * pure core accepts it as an optional caller-supplied input and the snapshot defaults it to
 * [] with `active_models_source: "unavailable"` -- the field is never a fabricated stub; its
 * provenance is always flagged.
 *
 * Pure-core (heavily tested, no IO): buildAttestation() + buildRegistry(). The snapshot()
 * instance method reads the two JSON files (paths overridable for hermetic tests).
 *
 * @module engines/ZuluCapabilityRegistryEngine
 * @unit ZULU/C6-CAPABILITY-REGISTRY
 */

import * as fs from "fs";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SLOTS_PATH = "H:/prism/state/shared/chat-slots.json";
const DEFAULT_CLAIMS_PATH = "H:/prism/state/shared/slot-task-claims.json";
/** Liveness thresholds -- mirror the chat-slots.mjs classification (alive/stale/crashed). */
const ALIVE_MAX_MS = 180_000; // < 3 min since last heartbeat
const STALE_MAX_MS = 1_800_000; // < 30 min -> stale; else crashed

// ============================================================================
// Types (exported for dispatcher + tests)
// ============================================================================

export type SlotLiveness = "alive" | "stale" | "crashed" | "idle";

/** The runtime slot record shape we read from chat-slots.json (subset we use). */
export interface SlotRuntimeRecord {
  chatId?: string;
  claimedAt?: string;
  lastHeartbeat?: string;
  branch?: string;
  topic?: string | null;
  activity?: string;
}

export interface CapabilityAttestation {
  slot: string;
  /** Best-effort domain affinity from the slot's live topic/branch (NOT the static soul). */
  domain_affinity: string;
  /** When the slot became warm (claimedAt), or null if never claimed / idle. */
  warm_since: string | null;
  /** ms the slot has been warm (0 if idle/unknown). */
  warm_ms: number;
  liveness: SlotLiveness;
  heartbeat_age_ms: number;
  /** Active task-claim count for the slot (queue depth proxy). */
  queue_depth: number;
  /** Best-effort; [] when not caller-supplied (see active_models_source). */
  active_models: string[];
  active_models_source: "provided" | "unavailable";
  attested_at: string;
}

export interface BuildRegistryInput {
  /** slot-name -> runtime record (from chat-slots.json `slots`). */
  slots: Record<string, SlotRuntimeRecord | null | undefined>;
  /** slot-name -> active claim count. */
  claimCounts?: Record<string, number>;
  /** slot-name -> caller-known active models (optional; flagged "provided" when present). */
  activeModelsBySlot?: Record<string, string[]>;
}

interface SnapshotResult {
  ok: boolean;
  attested_at: string;
  count: number;
  attestations: CapabilityAttestation[];
  /** Set when a source file was unreadable (degraded snapshot). */
  degraded?: boolean;
  reason?: string;
}

// ============================================================================
// Engine
// ============================================================================

class ZuluCapabilityRegistryEngine {
  private static instance: ZuluCapabilityRegistryEngine;
  private readonly slotsPath: string;
  private readonly claimsPath: string;

  private constructor(slotsPath?: string, claimsPath?: string) {
    this.slotsPath = slotsPath || process.env.PRISM_CHAT_SLOTS_FILE || DEFAULT_SLOTS_PATH;
    this.claimsPath = claimsPath || process.env.PRISM_SLOT_TASK_CLAIMS_FILE || DEFAULT_CLAIMS_PATH;
  }

  static getInstance(): ZuluCapabilityRegistryEngine {
    if (!ZuluCapabilityRegistryEngine.instance) {
      ZuluCapabilityRegistryEngine.instance = new ZuluCapabilityRegistryEngine();
    }
    return ZuluCapabilityRegistryEngine.instance;
  }

  /** Isolated instance bound to specific source paths. Tests only. */
  static __forTests(slotsPath: string, claimsPath: string): ZuluCapabilityRegistryEngine {
    return new ZuluCapabilityRegistryEngine(slotsPath, claimsPath);
  }

  // --------------------------------------------------------------------------
  // PURE CORE (no IO)
  // --------------------------------------------------------------------------

  /** Classify liveness from heartbeat age (ms). Pure. */
  static classifyLiveness(heartbeatAgeMs: number, hasChat: boolean): SlotLiveness {
    if (!hasChat) return "idle";
    if (!Number.isFinite(heartbeatAgeMs) || heartbeatAgeMs < 0) return "crashed";
    if (heartbeatAgeMs < ALIVE_MAX_MS) return "alive";
    if (heartbeatAgeMs < STALE_MAX_MS) return "stale";
    return "crashed";
  }

  /**
   * Build a single slot's attestation from its runtime record. Pure.
   * @param slot       slot name.
   * @param record     chat-slots runtime record (or null/undefined -> idle).
   * @param extra      {claimCount, activeModels} -- optional runtime augmentation.
   * @param nowMs      current epoch ms (injected for hermetic tests).
   */
  static buildAttestation(
    slot: string,
    record: SlotRuntimeRecord | null | undefined,
    extra: { claimCount?: number; activeModels?: string[] } = {},
    nowMs: number = Date.now(),
  ): CapabilityAttestation {
    const r = record && typeof record === "object" ? record : {};
    const hasChat = typeof r.chatId === "string" && r.chatId.length > 0;
    const attestedAt = new Date(Number.isFinite(nowMs) ? nowMs : Date.now()).toISOString();

    const hbMs = typeof r.lastHeartbeat === "string" ? Date.parse(r.lastHeartbeat) : NaN;
    const heartbeatAge = hasChat && Number.isFinite(hbMs) ? Math.max(0, nowMs - hbMs) : (hasChat ? Number.POSITIVE_INFINITY : -1);
    const liveness = ZuluCapabilityRegistryEngine.classifyLiveness(hasChat ? heartbeatAge : -1, hasChat);

    const claimedMs = typeof r.claimedAt === "string" ? Date.parse(r.claimedAt) : NaN;
    const warmSince = hasChat && Number.isFinite(claimedMs) ? new Date(claimedMs).toISOString() : null;
    const warmMs = warmSince ? Math.max(0, nowMs - claimedMs) : 0;

    const domainAffinity = ZuluCapabilityRegistryEngine.domainAffinity(r);

    const activeModels = Array.isArray(extra.activeModels) ? extra.activeModels.filter((m) => typeof m === "string") : [];
    const claimCount = Number.isFinite(extra.claimCount) && (extra.claimCount as number) >= 0 ? Math.floor(extra.claimCount as number) : 0;

    return {
      slot,
      domain_affinity: domainAffinity,
      warm_since: warmSince,
      warm_ms: warmMs,
      liveness,
      heartbeat_age_ms: hasChat && Number.isFinite(heartbeatAge) ? heartbeatAge : -1,
      queue_depth: claimCount,
      active_models: activeModels,
      active_models_source: Array.isArray(extra.activeModels) ? "provided" : "unavailable",
      attested_at: attestedAt,
    };
  }

  /** Derive a best-effort domain affinity from the live record (topic > branch slot-name). Pure. */
  private static domainAffinity(r: SlotRuntimeRecord): string {
    if (typeof r.topic === "string" && r.topic.trim()) return r.topic.trim();
    if (typeof r.branch === "string" && r.branch.startsWith("slot/")) return r.branch.slice("slot/".length);
    if (typeof r.branch === "string" && r.branch.trim()) return r.branch.trim();
    return "unknown";
  }

  /**
   * Build the full registry from runtime inputs. Pure. Sorted: alive first, then by
   * warmth desc (a warm live slot ranks above a cold or stale one).
   */
  static buildRegistry(input: BuildRegistryInput, nowMs: number = Date.now()): CapabilityAttestation[] {
    const safe = input && typeof input === "object" ? input : ({} as BuildRegistryInput);
    const slots = safe.slots && typeof safe.slots === "object" ? safe.slots : {};
    const claims = safe.claimCounts || {};
    const models = safe.activeModelsBySlot || {};
    const rows = Object.keys(slots).map((slot) =>
      ZuluCapabilityRegistryEngine.buildAttestation(
        slot,
        slots[slot],
        { claimCount: claims[slot], activeModels: models[slot] },
        nowMs,
      ),
    );
    const rank = (a: CapabilityAttestation) => (a.liveness === "alive" ? 0 : a.liveness === "stale" ? 1 : a.liveness === "crashed" ? 2 : 3);
    rows.sort((a, b) => rank(a) - rank(b) || b.warm_ms - a.warm_ms);
    return rows;
  }

  // --------------------------------------------------------------------------
  // Read-only snapshot (reads chat-slots.json + slot-task-claims.json)
  // --------------------------------------------------------------------------

  /**
   * Live snapshot of every tracked slot's capability attestation. READ-ONLY.
   * Never throws: an unreadable source degrades gracefully (degraded:true + reason).
   */
  snapshot(opts: { now?: string; activeModelsBySlot?: Record<string, string[]> } = {}): SnapshotResult {
    const nowMs = this.parseNow(opts.now);
    const attestedAt = new Date(nowMs).toISOString();

    const slotsRead = this.readJson(this.slotsPath);
    const slots = (slotsRead.ok && slotsRead.value && typeof slotsRead.value === "object"
      ? (slotsRead.value as { slots?: Record<string, SlotRuntimeRecord> }).slots
      : undefined) || {};

    const claimsRead = this.readJson(this.claimsPath);
    const claimCounts = this.deriveClaimCounts(claimsRead.ok ? claimsRead.value : undefined);

    const attestations = ZuluCapabilityRegistryEngine.buildRegistry(
      { slots, claimCounts, activeModelsBySlot: opts.activeModelsBySlot },
      nowMs,
    );

    const out: SnapshotResult = { ok: true, attested_at: attestedAt, count: attestations.length, attestations };
    if (!slotsRead.ok) {
      out.degraded = true;
      out.reason = `chat-slots unreadable: ${slotsRead.reason}`;
    } else if (!claimsRead.ok) {
      out.degraded = true;
      out.reason = `slot-task-claims unreadable (queue_depth=0 fallback): ${claimsRead.reason}`;
    }
    return out;
  }

  /** Snapshot for a single slot. */
  attest(slot: string, opts: { now?: string; activeModels?: string[] } = {}): CapabilityAttestation {
    const nowMs = this.parseNow(opts.now);
    const slotsRead = this.readJson(this.slotsPath);
    const slots = (slotsRead.ok && slotsRead.value && typeof slotsRead.value === "object"
      ? (slotsRead.value as { slots?: Record<string, SlotRuntimeRecord> }).slots
      : undefined) || {};
    const claimsRead = this.readJson(this.claimsPath);
    const claimCounts = this.deriveClaimCounts(claimsRead.ok ? claimsRead.value : undefined);
    return ZuluCapabilityRegistryEngine.buildAttestation(
      slot,
      slots[slot],
      { claimCount: claimCounts[slot], activeModels: opts.activeModels },
      nowMs,
    );
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  /** Count active claims per slot from the slot-task-claims store (shape-tolerant). */
  private deriveClaimCounts(claimsValue: unknown): Record<string, number> {
    const counts: Record<string, number> = {};
    if (!claimsValue || typeof claimsValue !== "object") return counts;
    const claims = (claimsValue as { claims?: unknown }).claims;
    if (!claims || typeof claims !== "object") return counts;
    for (const entry of Object.values(claims as Record<string, unknown>)) {
      if (!entry || typeof entry !== "object") continue;
      const slot = (entry as { slot?: unknown }).slot;
      const released = (entry as { released?: unknown; phase?: unknown }).released;
      const phase = (entry as { phase?: unknown }).phase;
      // Count only un-released / active claims toward queue depth.
      if (typeof slot === "string" && released !== true && phase !== "released" && phase !== "done") {
        counts[slot] = (counts[slot] || 0) + 1;
      }
    }
    return counts;
  }

  private readJson(p: string): { ok: boolean; value?: unknown; reason?: string } {
    try {
      if (!fs.existsSync(p)) return { ok: false, reason: "file-not-found" };
      return { ok: true, value: JSON.parse(fs.readFileSync(p, "utf8")) };
    } catch (e) {
      return { ok: false, reason: (e as Error)?.message || "read/parse error" };
    }
  }

  private parseNow(now: unknown): number {
    if (typeof now === "string") {
      const ms = Date.parse(now);
      if (Number.isFinite(ms) && ms >= 0) return ms;
    }
    return Date.now();
  }
}

// ============================================================================
// Exports
// ============================================================================

export const zuluCapabilityRegistryEngine = ZuluCapabilityRegistryEngine.getInstance();
export { ZuluCapabilityRegistryEngine, ALIVE_MAX_MS as ZULU_CAP_ALIVE_MAX_MS, STALE_MAX_MS as ZULU_CAP_STALE_MAX_MS };
