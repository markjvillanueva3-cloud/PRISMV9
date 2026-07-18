/**
 * ZuluFleetHealthSynthesisEngine -- C3 fleet-health synthesis (HZP/HZD family).
 *
 * Pure-core: synthesizes three raw fleet signals -- chat-slot liveness
 * (heartbeat freshness), per-slot task-queue depth, and galaxy coverage --
 * into a single scored FleetHealthVector. This is the genuine gap the
 * watcher SCRIPTS (.claude/fleet-task-health.mjs, .claude/fleet-memory-monitor.mjs)
 * do NOT fill: those probe + alert, they do not produce a normalized,
 * comparable per-slot readiness score that downstream schedulers/auctioneers
 * can consume.
 *
 * The readiness score is the load-bearing output. It is fed (as a follow-up,
 * NOT built here) to ZuluTaskAuctionEngine's `queue_penalty` bid factor and to
 * a wave scheduler so the fleet preferentially routes new work to slots that
 * are both ALIVE and under-loaded.
 *
 * Design decisions (R8 / R7 -- read before write):
 *   - Liveness thresholds mirror chat-slots.mjs (STALE_TTL_MS=120_000,
 *     CRASH_TTL_MS=600_000). They are RE-DECLARED here as local constants (not
 *     imported) because chat-slots.mjs is a `.claude/helpers/*.mjs` Node helper
 *     OUTSIDE the mcp-server TS compilation root; importing it into a
 *     NodeNext-resolved engine would couple the physics build to the helper
 *     tree. The values are documented + tested against the canonical source so
 *     drift is caught. (Same isolation rationale chat-slots.mjs itself uses for
 *     not importing the SQLite store.)
 *   - queue_depth penalty uses the SAME log10(1+depth) shape as
 *     ZuluTaskAuctionEngine.W.queue_per_log10 so the readiness signal is
 *     dimensionally consistent with the consumer it feeds.
 *
 * Pure: no I/O, no clock read inside the formula (caller supplies `now`),
 * deterministic. Never throws on a single malformed slot row -- the row is
 * marked unhealthy (readinessScore=0) with a reason, so one bad record cannot
 * blank the whole vector (fail-soft per-row, fail-loud per-call on a
 * structurally-invalid request).
 *
 * @module engines/ZuluFleetHealthSynthesisEngine
 */

import { z } from "zod";
import { MAX_QUEUE_DEPTH } from "./ZuluTaskAuctionEngine.js";

// ─── Canonical liveness thresholds (mirror chat-slots.mjs) ─────────────────
// chat-slots.mjs: STALE_TTL_MS = 2 * 60 * 1000; CRASH_TTL_MS = 10 * 60 * 1000.
// A slot is "alive" if heartbeatAge < STALE, "stale" if < CRASH, else "crashed".
/** Heartbeat age (ms) below which a slot is fully fresh. */
export const STALE_TTL_MS = 2 * 60 * 1000;
/** Heartbeat age (ms) at/above which a slot is considered crashed (dead). */
export const CRASH_TTL_MS = 10 * 60 * 1000;

// ─── Readiness weights (documented; sum to 1 so score in [0,1]) ────────────
// readinessScore = alive ? (W_FRESH * freshness + W_QUEUE * queueFactor) : 0
//   freshness   = clamp(1 - heartbeatAgeMs / CRASH_TTL_MS, 0, 1)   (monotone DEC in age)
//   queueFactor = 1 / (1 + log10(1 + queueDepth))                  (monotone DEC in depth, in (0,1])
// Heartbeat freshness is weighted higher than queue head-room: a fresh-but-busy
// slot is still a better routing target than a stale-but-empty one (a stale slot
// may already be wedged). W_FRESH + W_QUEUE = 1.0.
export const W_FRESH = 0.6;
export const W_QUEUE = 0.4;

/** Hard upper bound on fleet size processed in one call (resource-exhaustion guard). */
export const MAX_FLEET = 256;

// ─── Input schemas ─────────────────────────────────────────────────────────

/** One raw chat-slot liveness row (subset of chat-slots.mjs SlotState we score). */
export const SlotSignalSchema = z.object({
  slot: z.string().min(1).max(60),
  /** ms since last heartbeat. Caller computes `now - Date.parse(lastHeartbeat)`. */
  heartbeatAgeMs: z.number().finite(),
  /** Number of units this slot currently holds claimed (from slot-task-claim). */
  queueDepth: z.number().finite(),
  /** Optional: galaxy/domain this slot owns (for coverage roll-up). */
  galaxy: z.string().max(60).optional(),
});
export type SlotSignal = z.infer<typeof SlotSignalSchema>;

export const FleetHealthRequestSchema = z.object({
  slots: z.array(SlotSignalSchema).max(MAX_FLEET),
  /** Optional fleet-wide list of galaxies that SHOULD be covered. */
  galaxyCoverage: z.array(z.string().min(1).max(60)).max(1024).optional(),
});
export type FleetHealthRequest = z.infer<typeof FleetHealthRequestSchema>;

// ─── Output types ──────────────────────────────────────────────────────────

export type SlotLiveness = "alive" | "stale" | "crashed";

export interface PerSlotHealth {
  slot: string;
  alive: boolean;
  liveness: SlotLiveness;
  heartbeatAgeMs: number;
  queueDepth: number;
  galaxy: string | null;
  /** [0,1]; 0 when dead OR malformed. Higher = better routing target. */
  readinessScore: number;
  /** Non-null when the row was malformed/unscorable; readinessScore forced to 0. */
  degraded: string | null;
  components: {
    freshness: number;
    queueFactor: number;
  };
}

export interface FleetRollup {
  /** Galaxies addressable RIGHT NOW (owned by at least one ALIVE slot). */
  addressableGalaxies: string[];
  /** Galaxies in galaxyCoverage that NO alive slot owns. Empty when no coverage list given. */
  uncoveredGalaxies: string[];
  /** Slots whose readiness is at/below the saturation floor (deep queue or stale). */
  saturatedSlots: string[];
  /** Slots classified crashed (heartbeat >= CRASH_TTL_MS) or malformed. */
  deadSlots: string[];
  /** Count of alive slots. */
  aliveCount: number;
  /** Mean readinessScore across ALL rows (dead included as 0). */
  meanReadiness: number;
  /** Total slot rows processed. */
  totalSlots: number;
}

export interface FleetHealthVector {
  perSlot: PerSlotHealth[];
  fleet: FleetRollup;
}

/** A slot at/below this readiness is "saturated" (poor routing target). */
export const SATURATION_FLOOR = 0.35;

// ─── Engine ──────────────────────────────────────────────────────────────

export class ZuluFleetHealthSynthesisEngine {
  /**
   * Synthesize raw fleet signals into a scored FleetHealthVector.
   *
   * @param req - validated request { slots, galaxyCoverage? }
   * @param now - injectable clock for determinism in tests (default Date.now()).
   *              Only used for liveness CLASSIFICATION when a heartbeatAgeMs is
   *              non-finite is impossible (schema rejects); `now` is reserved for
   *              future absolute-timestamp inputs and kept in the signature for
   *              caller symmetry with chat-slots.classifySlot(slot, now).
   * @returns FleetHealthVector with per-slot readiness + fleet roll-up.
   * @throws on a structurally-invalid request (non-array slots, oversize fleet,
   *         non-finite numbers) -- fail loud per R12; a single malformed ROW is
   *         fail-soft (degraded, score 0).
   */
  static synthesize(req: FleetHealthRequest, now: number = Date.now()): FleetHealthVector {
    if (!req || typeof req !== "object") {
      throw new Error("ZuluFleetHealthSynthesis.synthesize: request object required");
    }
    if (!Number.isFinite(now)) {
      throw new Error("ZuluFleetHealthSynthesis.synthesize: now must be a finite epoch ms");
    }
    const v = FleetHealthRequestSchema.parse(req);

    const seen = new Set<string>();
    const perSlot: PerSlotHealth[] = [];
    const coverageList = (v.galaxyCoverage ?? []).map((g) => g.trim()).filter((g) => g.length > 0);

    for (const raw of v.slots) {
      // Duplicate slot rows are a structural error -- two health verdicts for one
      // slot would make the roll-up ambiguous (which one feeds the auction?).
      if (seen.has(raw.slot)) {
        throw new Error(`ZuluFleetHealthSynthesis: duplicate slot row '${raw.slot}'`);
      }
      seen.add(raw.slot);
      perSlot.push(ZuluFleetHealthSynthesisEngine.scoreSlot(raw));
    }

    const fleet = ZuluFleetHealthSynthesisEngine.rollup(perSlot, coverageList);
    return { perSlot, fleet };
  }

  /**
   * Score a single slot row. Pure + total: a negative/absurd heartbeat age is
   * clamped (a clock-skew negative age means "very fresh" -> freshness 1), a
   * negative queueDepth is treated as malformed (degraded, score 0) because a
   * negative claim count cannot be a real signal.
   *
   * @param raw - one SlotSignal
   * @returns PerSlotHealth
   */
  static scoreSlot(raw: SlotSignal): PerSlotHealth {
    const galaxy = typeof raw.galaxy === "string" && raw.galaxy.length > 0 ? raw.galaxy : null;

    // Malformed-row gate: a negative queue depth is not a physical signal.
    // (heartbeatAgeMs<0 is allowed -- it is benign clock skew meaning "just
    // heartbeated", scored as maximally fresh.)
    let degraded: string | null = null;
    if (raw.queueDepth < 0) {
      degraded = `negative queueDepth ${raw.queueDepth}`;
    }

    const liveness = ZuluFleetHealthSynthesisEngine.classify(raw.heartbeatAgeMs);

    if (degraded) {
      // A degraded row carries an unscorable signal -> it is NOT a valid routing
      // target regardless of how fresh its heartbeat looks. Force alive=false so
      // the "dead -> 0" + deadSlots roll-up invariants hold uniformly: a degraded
      // slot needs remediation (like a crashed one), not new work routed to it.
      return {
        slot: raw.slot,
        alive: false,
        liveness,
        heartbeatAgeMs: raw.heartbeatAgeMs,
        queueDepth: raw.queueDepth,
        galaxy,
        readinessScore: 0,
        degraded,
        components: { freshness: 0, queueFactor: 0 },
      };
    }

    const alive = liveness === "alive";

    // freshness: 1 at age<=0, linearly decaying to 0 at CRASH_TTL_MS, 0 beyond.
    const freshness = clamp01(1 - Math.max(0, raw.heartbeatAgeMs) / CRASH_TTL_MS);
    // queueFactor: 1 at depth 0, decaying via log10(1+depth); always in (0,1].
    const queueFactor = 1 / (1 + Math.log10(1 + Math.max(0, raw.queueDepth)));

    // A non-alive slot is NOT a routing target -> readiness forced to 0, even if
    // its (stale) freshness/queue would otherwise compute positive. This makes
    // the "dead -> 0" and "stale -> 0" invariants hold by construction.
    const readinessScore = alive ? clamp01(W_FRESH * freshness + W_QUEUE * queueFactor) : 0;

    return {
      slot: raw.slot,
      alive,
      liveness,
      heartbeatAgeMs: raw.heartbeatAgeMs,
      queueDepth: raw.queueDepth,
      galaxy,
      readinessScore,
      degraded: null,
      components: { freshness, queueFactor },
    };
  }

  /**
   * Classify liveness from heartbeat age, mirroring chat-slots.classifySlot.
   * age < STALE -> alive; age < CRASH -> stale; else crashed. A negative age
   * (clock skew) is fresher-than-fresh -> alive.
   *
   * @param heartbeatAgeMs - ms since last heartbeat
   * @returns SlotLiveness
   */
  static classify(heartbeatAgeMs: number): SlotLiveness {
    if (!Number.isFinite(heartbeatAgeMs)) return "crashed";
    if (heartbeatAgeMs < STALE_TTL_MS) return "alive";
    if (heartbeatAgeMs < CRASH_TTL_MS) return "stale";
    return "crashed";
  }

  /**
   * Roll per-slot health up into fleet-level aggregates.
   * @param perSlot - scored slot rows
   * @param coverage - galaxies that SHOULD be covered (may be empty)
   * @returns FleetRollup
   */
  static rollup(perSlot: PerSlotHealth[], coverage: string[]): FleetRollup {
    const addressable = new Set<string>();
    const saturatedSlots: string[] = [];
    const deadSlots: string[] = [];
    let aliveCount = 0;
    let readinessSum = 0;

    for (const s of perSlot) {
      readinessSum += s.readinessScore;
      if (s.alive) {
        aliveCount++;
        if (s.galaxy) addressable.add(s.galaxy);
      }
      // Saturated = alive but a poor routing target (deep queue / drifting heartbeat).
      // A dead slot is reported under deadSlots, not saturatedSlots (different remedy).
      if (s.alive && s.readinessScore <= SATURATION_FLOOR) saturatedSlots.push(s.slot);
      if (!s.alive && (s.liveness === "crashed" || s.degraded)) deadSlots.push(s.slot);
    }

    const uncovered = coverage.filter((g) => !addressable.has(g));

    return {
      addressableGalaxies: [...addressable].sort(),
      uncoveredGalaxies: [...new Set(uncovered)].sort(),
      saturatedSlots: saturatedSlots.sort(),
      deadSlots: deadSlots.sort(),
      aliveCount,
      meanReadiness: perSlot.length > 0 ? readinessSum / perSlot.length : 0,
      totalSlots: perSlot.length,
    };
  }

  /**
   * Return the per-slot readiness scores as a slot->score map, sorted high->low
   * by score. This is the shape the ZuluTaskAuctionEngine queue_penalty follow-up
   * consumes: higher readiness == lower effective queue_penalty.
   *
   * @param vector - a FleetHealthVector from synthesize()
   * @returns array of { slot, readinessScore } sorted desc, ties by slot asc
   */
  static slotReadiness(vector: FleetHealthVector): Array<{ slot: string; readinessScore: number; alive: boolean }> {
    if (!vector || !Array.isArray(vector.perSlot)) {
      throw new Error("ZuluFleetHealthSynthesis.slotReadiness: FleetHealthVector required");
    }
    return vector.perSlot
      .map((s) => ({ slot: s.slot, readinessScore: s.readinessScore, alive: s.alive }))
      .sort((a, b) => (b.readinessScore !== a.readinessScore ? b.readinessScore - a.readinessScore : a.slot.localeCompare(b.slot)));
  }

  /**
   * C3 -> auction bridge: the LIVE queue_penalty source (the clause the engine docstring
   * flags as "feeds NOT built here"). Maps each per-slot row to the ZuluTaskAuctionEngine
   * bidder `queue_depth` input, clamped to the auction's int [0, MAX_QUEUE_DEPTH] contract,
   * so the auction's queue_penalty reflects CURRENT fleet saturation instead of a static
   * caller value. Liveness-based EXCLUSION is the caller's concern -- read
   * `vector.fleet.deadSlots` to drop crashed slots from the bidder set (the
   * `zulu_auction_live` dispatcher action does this by default).
   *
   * @param vector - a FleetHealthVector from synthesize()
   * @returns slot -> live queue_depth (non-negative int, clamped to the auction contract)
   */
  static auctionQueueDepths(vector: FleetHealthVector): Record<string, number> {
    if (!vector || !Array.isArray(vector.perSlot)) {
      throw new Error("ZuluFleetHealthSynthesis.auctionQueueDepths: FleetHealthVector required");
    }
    const out: Record<string, number> = {};
    for (const row of vector.perSlot) {
      const depth = Number.isFinite(row.queueDepth) ? Math.round(row.queueDepth) : 0;
      out[row.slot] = Math.max(0, Math.min(MAX_QUEUE_DEPTH, depth));
    }
    return out;
  }

  /** One-line operator render of the fleet roll-up. */
  static renderVector(vector: FleetHealthVector): string {
    const f = vector.fleet;
    return (
      `[FLEET-HEALTH] slots=${f.totalSlots} alive=${f.aliveCount} dead=${f.deadSlots.length} ` +
      `saturated=${f.saturatedSlots.length} addressable=${f.addressableGalaxies.length} ` +
      `uncovered=${f.uncoveredGalaxies.length} meanReadiness=${f.meanReadiness.toFixed(3)}`
    );
  }
}

/** Clamp x into [0,1]. NaN -> 0 (defensive; schema already rejects NaN inputs). */
function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

export const zuluFleetHealthSynthesisEngine = ZuluFleetHealthSynthesisEngine;
