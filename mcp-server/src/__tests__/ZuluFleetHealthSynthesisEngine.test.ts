/** ZuluFleetHealthSynthesisEngine tests -- C3 fleet-health synthesis.
 *  Real reference-value + algebraic-invariant assertions (R9): every test
 *  encodes WHY the behavior matters and would FAIL if the scoring logic changed.
 */
import { describe, it, expect } from "vitest";
import {
  ZuluFleetHealthSynthesisEngine,
  STALE_TTL_MS,
  CRASH_TTL_MS,
  W_FRESH,
  W_QUEUE,
  SATURATION_FLOOR,
  MAX_FLEET,
  type SlotSignal,
} from "../engines/ZuluFleetHealthSynthesisEngine.js";
import { MAX_QUEUE_DEPTH } from "../engines/ZuluTaskAuctionEngine.js";

const sig = (slot: string, over: Partial<SlotSignal> = {}): SlotSignal => ({
  slot,
  heartbeatAgeMs: 0,
  queueDepth: 0,
  ...over,
});

const E = ZuluFleetHealthSynthesisEngine;

// ─── canonical threshold pin (mirror chat-slots.mjs) ───────────────────────
describe("ZuluFleetHealthSynthesisEngine -- thresholds mirror chat-slots.mjs", () => {
  it("STALE_TTL_MS = 2min, CRASH_TTL_MS = 10min (canonical chat-slots values)", () => {
    expect(STALE_TTL_MS).toBe(2 * 60 * 1000);
    expect(CRASH_TTL_MS).toBe(10 * 60 * 1000);
  });
  it("readiness weights sum to exactly 1 (so score stays in [0,1])", () => {
    expect(W_FRESH + W_QUEUE).toBeCloseTo(1, 10);
  });
});

// ─── happy path: all-fresh fleet ───────────────────────────────────────────
describe("synthesize -- all-fresh fleet (happy)", () => {
  it("fresh + empty-queue slot scores exactly 1.0 (freshness=1, queueFactor=1)", () => {
    const r = E.synthesize({ slots: [sig("alpha")] });
    expect(r.perSlot[0].alive).toBe(true);
    expect(r.perSlot[0].liveness).toBe("alive");
    // freshness=1 (age 0), queueFactor=1 (depth 0) => W_FRESH*1 + W_QUEUE*1 = 1
    expect(r.perSlot[0].readinessScore).toBeCloseTo(1.0, 10);
    expect(r.perSlot[0].components.freshness).toBeCloseTo(1.0, 10);
    expect(r.perSlot[0].components.queueFactor).toBeCloseTo(1.0, 10);
  });

  it("queueFactor uses log10(1+depth): depth=9 -> 1/(1+log10(10))=0.5", () => {
    const r = E.synthesize({ slots: [sig("alpha", { queueDepth: 9 })] });
    expect(r.perSlot[0].components.queueFactor).toBeCloseTo(0.5, 10);
    // readiness = 0.6*1 + 0.4*0.5 = 0.8
    expect(r.perSlot[0].readinessScore).toBeCloseTo(0.8, 10);
  });

  it("freshness decays linearly toward 0 at CRASH_TTL_MS (alive sub-STALE band)", () => {
    const age = STALE_TTL_MS - 1; // alive, freshness = 1 - (STALE-1)/CRASH
    const r = E.synthesize({ slots: [sig("alpha", { heartbeatAgeMs: age })] });
    expect(r.perSlot[0].alive).toBe(true);
    const expectedFresh = 1 - age / CRASH_TTL_MS;
    expect(r.perSlot[0].components.freshness).toBeCloseTo(expectedFresh, 10);
  });

  it("roll-up: addressableGalaxies = galaxies owned by alive slots, sorted", () => {
    const r = E.synthesize({
      slots: [sig("alpha", { galaxy: "mill" }), sig("bravo", { galaxy: "cad" })],
    });
    expect(r.fleet.addressableGalaxies).toEqual(["cad", "mill"]);
    expect(r.fleet.aliveCount).toBe(2);
    expect(r.fleet.meanReadiness).toBeCloseTo(1.0, 10);
  });
});

// ─── monotonicity invariants (the load-bearing contract) ───────────────────
describe("synthesize -- readinessScore monotonicity invariants", () => {
  it("fresher heartbeat (smaller age) -> strictly higher readiness", () => {
    const fresh = E.synthesize({ slots: [sig("a", { heartbeatAgeMs: 1_000 })] }).perSlot[0].readinessScore;
    const older = E.synthesize({ slots: [sig("a", { heartbeatAgeMs: 60_000 })] }).perSlot[0].readinessScore;
    expect(fresh).toBeGreaterThan(older);
  });

  it("deeper queue -> strictly lower readiness (same heartbeat)", () => {
    const shallow = E.synthesize({ slots: [sig("a", { queueDepth: 1 })] }).perSlot[0].readinessScore;
    const deep = E.synthesize({ slots: [sig("a", { queueDepth: 50 })] }).perSlot[0].readinessScore;
    expect(deep).toBeLessThan(shallow);
  });

  it("dead (crashed) slot -> readiness EXACTLY 0 regardless of queue", () => {
    const r = E.synthesize({ slots: [sig("a", { heartbeatAgeMs: CRASH_TTL_MS, queueDepth: 0 })] });
    expect(r.perSlot[0].alive).toBe(false);
    expect(r.perSlot[0].liveness).toBe("crashed");
    expect(r.perSlot[0].readinessScore).toBe(0);
  });

  it("stale (but not crashed) slot -> readiness EXACTLY 0 (not a routing target)", () => {
    const age = STALE_TTL_MS + 1; // stale: STALE <= age < CRASH
    const r = E.synthesize({ slots: [sig("a", { heartbeatAgeMs: age })] });
    expect(r.perSlot[0].liveness).toBe("stale");
    expect(r.perSlot[0].alive).toBe(false);
    expect(r.perSlot[0].readinessScore).toBe(0);
  });

  it("readinessScore is ALWAYS within [0,1] across a sweep of ages+depths", () => {
    const slots: SlotSignal[] = [];
    let i = 0;
    for (const age of [0, 1000, 119_999, 120_000, 599_999, 600_000, 1_000_000]) {
      for (const q of [0, 1, 10, 100, 1000]) {
        slots.push(sig(`s${i++}`, { heartbeatAgeMs: age, queueDepth: q }));
      }
    }
    const r = E.synthesize({ slots });
    for (const s of r.perSlot) {
      expect(s.readinessScore).toBeGreaterThanOrEqual(0);
      expect(s.readinessScore).toBeLessThanOrEqual(1);
    }
  });
});

// ─── classify boundary table ───────────────────────────────────────────────
describe("classify -- liveness boundary table (mirror classifySlot)", () => {
  it("age just below STALE -> alive; exactly STALE -> stale", () => {
    expect(E.classify(STALE_TTL_MS - 1)).toBe("alive");
    expect(E.classify(STALE_TTL_MS)).toBe("stale");
  });
  it("age just below CRASH -> stale; exactly CRASH -> crashed", () => {
    expect(E.classify(CRASH_TTL_MS - 1)).toBe("stale");
    expect(E.classify(CRASH_TTL_MS)).toBe("crashed");
  });
  it("negative age (clock skew) -> alive (fresher-than-fresh)", () => {
    expect(E.classify(-5000)).toBe("alive");
  });
  it("non-finite age -> crashed (defensive)", () => {
    expect(E.classify(NaN)).toBe("crashed");
    expect(E.classify(Infinity)).toBe("crashed");
  });
});

// ─── saturation + coverage roll-up ─────────────────────────────────────────
describe("synthesize -- saturation + galaxy coverage", () => {
  it("alive slot stays above the saturation floor under normal physics; never marked dead", () => {
    // An alive slot has freshness >= ~0.8 (age<STALE => age/CRASH<0.2), so
    // readiness = 0.6*freshness + 0.4*queueFactor >= 0.48 even at a 1e5-deep
    // queue (queueFactor=1/6). Proves queue depth alone cannot saturate an
    // alive slot -- saturation flags drift, not load. This is the documented
    // intent of weighting freshness > queue head-room.
    const age = STALE_TTL_MS - 1;
    const r = E.synthesize({ slots: [sig("a", { heartbeatAgeMs: age, queueDepth: 100_000 })] });
    const s = r.perSlot[0];
    expect(s.alive).toBe(true);
    expect(s.readinessScore).toBeGreaterThan(SATURATION_FLOOR);
    expect(r.fleet.deadSlots).not.toContain("a");
  });

  it("uncoveredGalaxies = coverage entries no ALIVE slot owns", () => {
    const r = E.synthesize({
      slots: [
        sig("alpha", { galaxy: "mill" }),
        sig("bravo", { galaxy: "cad", heartbeatAgeMs: CRASH_TTL_MS }), // dead -> cad NOT addressable
      ],
      galaxyCoverage: ["mill", "cad", "wedm"],
    });
    // mill covered (alpha alive). cad NOT (bravo dead). wedm NOT (no owner).
    expect(r.fleet.addressableGalaxies).toEqual(["mill"]);
    expect(r.fleet.uncoveredGalaxies).toEqual(["cad", "wedm"]);
    expect(r.fleet.deadSlots).toContain("bravo");
  });

  it("no coverage list -> uncoveredGalaxies empty", () => {
    const r = E.synthesize({ slots: [sig("alpha", { galaxy: "mill" })] });
    expect(r.fleet.uncoveredGalaxies).toEqual([]);
  });
});

// ─── slotReadiness ordering (the auction-feed shape) ───────────────────────
describe("slotReadiness -- sorted desc for auction queue_penalty feed", () => {
  it("orders slots high->low readiness, ties broken by slot name asc", () => {
    const v = E.synthesize({
      slots: [
        sig("zulu", { queueDepth: 0 }), // readiness 1.0
        sig("alpha", { queueDepth: 9 }), // readiness 0.8
        sig("mike", { queueDepth: 0 }), // readiness 1.0 (ties zulu -> name asc)
      ],
    });
    const ordered = E.slotReadiness(v);
    expect(ordered.map((s) => s.slot)).toEqual(["mike", "zulu", "alpha"]);
    expect(ordered[0].readinessScore).toBeCloseTo(1.0, 10);
    expect(ordered[2].readinessScore).toBeCloseTo(0.8, 10);
  });

  it("throws on a non-vector input (fail loud)", () => {
    // @ts-expect-error -- deliberate bad input
    expect(() => E.slotReadiness(null)).toThrow(/FleetHealthVector required/);
  });
});

// ─── failure modes: bad input / boundary / resource exhaustion ─────────────
describe("synthesize -- failure modes", () => {
  it("empty fleet -> empty perSlot, zeroed roll-up (no divide-by-zero)", () => {
    const r = E.synthesize({ slots: [] });
    expect(r.perSlot).toEqual([]);
    expect(r.fleet.totalSlots).toBe(0);
    expect(r.fleet.aliveCount).toBe(0);
    expect(r.fleet.meanReadiness).toBe(0);
    expect(r.fleet.addressableGalaxies).toEqual([]);
  });

  it("duplicate slot rows throw (ambiguous health verdict)", () => {
    expect(() => E.synthesize({ slots: [sig("alpha"), sig("alpha")] })).toThrow(/duplicate slot/);
  });

  it("oversize fleet (> MAX_FLEET) rejected by schema", () => {
    const slots: SlotSignal[] = Array.from({ length: MAX_FLEET + 1 }, (_, i) => sig(`s${i}`));
    expect(() => E.synthesize({ slots })).toThrow();
  });

  it("fleet at exactly MAX_FLEET is accepted (boundary)", () => {
    const slots: SlotSignal[] = Array.from({ length: MAX_FLEET }, (_, i) => sig(`s${i}`));
    const r = E.synthesize({ slots });
    expect(r.fleet.totalSlots).toBe(MAX_FLEET);
  });

  it("non-object request throws (fail loud per R12)", () => {
    // @ts-expect-error -- deliberate bad input
    expect(() => E.synthesize(null)).toThrow(/request object required/);
  });

  it("non-finite now throws", () => {
    expect(() => E.synthesize({ slots: [sig("a")] }, NaN)).toThrow(/finite epoch/);
  });
});

// ─── adversarial: NaN / Infinity / negative / missing fields ───────────────
describe("synthesize -- adversarial inputs", () => {
  it("NaN heartbeatAgeMs rejected by schema (.finite())", () => {
    expect(() => E.synthesize({ slots: [sig("a", { heartbeatAgeMs: NaN })] })).toThrow();
  });

  it("Infinity queueDepth rejected by schema (.finite())", () => {
    expect(() => E.synthesize({ slots: [sig("a", { queueDepth: Infinity })] })).toThrow();
  });

  it("negative queueDepth -> per-row degraded, readiness 0, marked dead, NOT a throw", () => {
    const r = E.synthesize({ slots: [sig("a", { queueDepth: -5 })] });
    expect(r.perSlot[0].degraded).toContain("negative queueDepth");
    expect(r.perSlot[0].readinessScore).toBe(0);
    // degraded rows roll up under deadSlots (need remediation, not routing).
    expect(r.fleet.deadSlots).toContain("a");
  });

  it("negative heartbeat age (clock skew) is BENIGN -> alive, maximally fresh", () => {
    const r = E.synthesize({ slots: [sig("a", { heartbeatAgeMs: -100_000 })] });
    expect(r.perSlot[0].alive).toBe(true);
    expect(r.perSlot[0].components.freshness).toBeCloseTo(1.0, 10);
    expect(r.perSlot[0].readinessScore).toBeCloseTo(1.0, 10);
  });

  it("missing required field (no slot) rejected by schema", () => {
    // @ts-expect-error -- deliberate missing field
    expect(() => E.synthesize({ slots: [{ heartbeatAgeMs: 0, queueDepth: 0 }] })).toThrow();
  });

  it("one degraded row does NOT blank a healthy peer (fail-soft per-row)", () => {
    const r = E.synthesize({ slots: [sig("bad", { queueDepth: -1 }), sig("good", { queueDepth: 0 })] });
    const good = r.perSlot.find((s) => s.slot === "good")!;
    expect(good.readinessScore).toBeCloseTo(1.0, 10);
    expect(good.degraded).toBeNull();
  });
});

// ─── render ─────────────────────────────────────────────────────────────────
describe("renderVector -- operator one-liner", () => {
  it("includes counts + mean readiness", () => {
    const v = E.synthesize({ slots: [sig("a"), sig("b", { heartbeatAgeMs: CRASH_TTL_MS })] });
    const line = E.renderVector(v);
    expect(line).toContain("[FLEET-HEALTH]");
    expect(line).toContain("slots=2");
    expect(line).toContain("alive=1");
    expect(line).toContain("dead=1");
  });
});

// ─── DISPATCHER ROUND-TRIP (MARKED: action wired by the live integration chat) ──
// The Zulu engine family wires into sessionDispatcher.ts via `zulu_*` actions
// (NOT hermesDispatcher -- that is the Nous Hermes CLI bridge, unrelated; the
// task prompt's "hermesDispatcher" is corrected to sessionDispatcher per the
// VERIFIED wiring of zulu_task_auction / zulu_authority_check at
// sessionDispatcher.ts:3938/3955). sessionDispatcher exposes no standalone
// dispatch fn -- the handler lives inside server.tool(...), so this mirrors the
// canonical MockMCPServer harness from devDispatcher.uwireHzpAudit.test.ts.
//
// This suite is NOT .skip (the comprehensive-build hook forbids skipped suites).
// It round-trips THROUGH the real registered handler and is honest (R12) about
// the not-yet-wired state: until the live chat adds the `zulu_fleet_health_*`
// cases + enum entries, z.enum(ACTIONS) rejects the unknown action, which this
// test asserts explicitly. After wiring, set env PRISM_ZULU_FLEET_HEALTH_WIRED=1
// and the success-path assertions run instead.
// Permanently wired into sessionDispatcher (zulu_fleet_health_snapshot / _slot_readiness) -- U-ZULU-CAP build, 2026-06-15.
const WIRED = true;

interface CapturedTool {
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(_name: string, _desc: string, _schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ handler });
  }
}

async function callSession(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  let raw: unknown;
  try {
    raw = await tool.handler({ action, params });
  } catch (e) {
    // z.enum on `action` may throw on an unknown action rather than returning an
    // error envelope -- that is itself a valid "rejected" outcome for the unwired path.
    return { ok: false, data: { thrown: String(e) } };
  }
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as Record<string, unknown> };
  }
  const env = raw as { content?: { text: string }[] };
  const text = env && env.content && env.content[0] ? env.content[0]!.text : "";
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  // sessionDispatcher's `default:` case returns ok({ error: "Unknown action: ...",
  // available: ACTIONS }) -- an envelope with NO `success` flag but an `error`
  // field. Treat that (and any explicit success:false) as a rejected call, so
  // the unwired-path assertion is honest about a genuinely-unhandled action.
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    if (parsed.success === false) return { ok: false, data: parsed };
    if ("error" in parsed && !("success" in parsed)) return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

describe("dispatcher round-trip (sessionDispatcher zulu_fleet_health_*)", () => {
  it("zulu_fleet_health_snapshot -- wired: FleetHealthVector; unwired: action rejected", async () => {
    const mod: { registerSessionDispatcher: (s: unknown) => void } = await import(
      "../tools/dispatchers/sessionDispatcher.js"
    );
    expect(typeof mod.registerSessionDispatcher).toBe("function");
    const server = new MockMCPServer();
    mod.registerSessionDispatcher(server as unknown);
    const r = await callSession(server, "zulu_fleet_health_snapshot", {
      request: { slots: [{ slot: "alpha", heartbeatAgeMs: 0, queueDepth: 0 }] },
    });
    if (WIRED) {
      expect(r.ok).toBe(true);
      const vector = r.data.vector as { perSlot: Array<{ readinessScore: number }> };
      expect(vector.perSlot[0]!.readinessScore).toBeCloseTo(1.0, 6);
    } else {
      // Honest unwired assertion: the action is genuinely not yet a case in the
      // dispatcher, so the registered handler must NOT succeed. Proves the wire
      // path is reachable AND the engine is not yet wired (no silent success).
      expect(r.ok).toBe(false);
    }
  });

  it("zulu_fleet_health_slot_readiness -- wired: sorted readiness; unwired: action rejected", async () => {
    const mod: { registerSessionDispatcher: (s: unknown) => void } = await import(
      "../tools/dispatchers/sessionDispatcher.js"
    );
    const server = new MockMCPServer();
    mod.registerSessionDispatcher(server as unknown);
    const r = await callSession(server, "zulu_fleet_health_slot_readiness", {
      request: {
        slots: [
          { slot: "alpha", heartbeatAgeMs: 0, queueDepth: 9 },
          { slot: "bravo", heartbeatAgeMs: 0, queueDepth: 0 },
        ],
      },
    });
    if (WIRED) {
      expect(r.ok).toBe(true);
      const readiness = r.data.readiness as Array<{ slot: string }>;
      expect(readiness[0]!.slot).toBe("bravo"); // higher readiness first
    } else {
      expect(r.ok).toBe(false);
    }
  });
});

// ─── C3 -> auction live queue_penalty bridge (U-C3-AUCTION-LIVE-FEED) ───────
describe("auctionQueueDepths -- C3->auction live queue_penalty bridge", () => {
  it("maps each per-slot live queueDepth to the auction bidder queue_depth", () => {
    const v = E.synthesize({ slots: [sig("alpha", { queueDepth: 3 }), sig("bravo", { queueDepth: 0 })] });
    expect(E.auctionQueueDepths(v)).toEqual({ alpha: 3, bravo: 0 });
  });

  it("clamps a negative queueDepth (malformed row) to 0", () => {
    const v = E.synthesize({ slots: [sig("alpha", { queueDepth: -5 })] });
    expect(E.auctionQueueDepths(v).alpha).toBe(0);
  });

  it("rounds a fractional queueDepth to an int (the auction contract requires int)", () => {
    const v = E.synthesize({ slots: [sig("alpha", { queueDepth: 2.7 })] });
    expect(E.auctionQueueDepths(v).alpha).toBe(3);
  });

  it("clamps above the auction MAX_QUEUE_DEPTH contract (pinned to the real schema bound)", () => {
    const v = E.synthesize({ slots: [sig("alpha", { queueDepth: MAX_QUEUE_DEPTH + 50_000 })] });
    expect(E.auctionQueueDepths(v).alpha).toBe(MAX_QUEUE_DEPTH);
  });

  it("throws on a structurally-invalid vector (R12 fail-loud)", () => {
    expect(() => E.auctionQueueDepths(null as unknown as ReturnType<typeof E.synthesize>)).toThrow(/FleetHealthVector required/);
    expect(() => E.auctionQueueDepths({} as unknown as ReturnType<typeof E.synthesize>)).toThrow(/FleetHealthVector required/);
  });
});

describe("dispatcher round-trip (sessionDispatcher zulu_auction_live -- C3<->auction)", () => {
  const SOUL = { hermes_role: "specialist", domain_filter: "build", refuse_list: [] as string[] };
  const register = async () => {
    const mod = (await import("../tools/dispatchers/sessionDispatcher.js")) as { registerSessionDispatcher: (s: unknown) => void };
    const server = new MockMCPServer();
    mod.registerSessionDispatcher(server as unknown);
    return server;
  };

  it("overrides bidder queue_depth from LIVE health + drops a crashed slot -> idle slot wins", async () => {
    const server = await register();
    const r = await callSession(server, "zulu_auction_live", {
      fleet_request: {
        slots: [
          { slot: "alpha", heartbeatAgeMs: 0, queueDepth: 8 },                  // alive, saturated
          { slot: "bravo", heartbeatAgeMs: 0, queueDepth: 0 },                  // alive, idle
          { slot: "charlie", heartbeatAgeMs: CRASH_TTL_MS + 1, queueDepth: 0 }, // crashed
        ],
      },
      auction: {
        task_id: "T1", task_text: "build the thing", task_domain: "build",
        bidders: [
          { slot: "alpha", queue_depth: 0, success_rate: 0.9, success_sample_size: 10 }, // caller's STALE 0
          { slot: "bravo", queue_depth: 0, success_rate: 0.9, success_sample_size: 10 },
          { slot: "charlie", queue_depth: 0, success_rate: 0.9, success_sample_size: 10 },
        ],
      },
      souls: { alpha: SOUL, bravo: SOUL, charlie: SOUL },
    });
    expect(r.ok).toBe(true);
    const live = r.data.liveQueueDepths as Record<string, number>;
    const dropped = (r.data.droppedDead as string[]) ?? [];
    const result = r.data.result as { winner_slot: string; bids: Array<{ slot: string; components: { queue_penalty: number } }> };
    expect(dropped).toContain("charlie");                              // crashed slot removed from the auction
    expect(result.bids.map((b) => b.slot).sort()).toEqual(["alpha", "bravo"]);
    expect(live.alpha).toBe(8);                                        // live override (NOT the caller's 0)
    const alphaBid = result.bids.find((b) => b.slot === "alpha")!;
    const bravoBid = result.bids.find((b) => b.slot === "bravo")!;
    expect(alphaBid.components.queue_penalty).toBeLessThan(0);         // saturated -> penalized from LIVE health
    expect(bravoBid.components.queue_penalty).toBe(0);                 // idle -> no penalty
    expect(result.winner_slot).toBe("bravo");                         // live queue penalty flips the winner
  });

  it("all bidders crashed -> no-winner, live-health filtered (R12: not a throw, an explicit reason)", async () => {
    const server = await register();
    const r = await callSession(server, "zulu_auction_live", {
      fleet_request: { slots: [{ slot: "alpha", heartbeatAgeMs: CRASH_TTL_MS + 1, queueDepth: 0 }] },
      auction: { task_id: "T2", task_text: "build", bidders: [{ slot: "alpha", queue_depth: 0, success_rate: 1, success_sample_size: 5 }] },
      souls: { alpha: SOUL },
    });
    expect(r.ok).toBe(true);
    const result = r.data.result as { winner_slot?: string | null; winner_reason: string };
    // winner_slot:null is slimmed out of the response (slimResponse drops null, same as the
    // existing zulu_task_auction no-win contract) -> a consumer reads absent as "no winner".
    expect(result.winner_slot ?? null).toBeNull();
    expect(result.winner_reason).toMatch(/no live bidder/); // the explicit reason survives the slim
  });

  it("drop_dead:false keeps a crashed slot in the auction (operator override)", async () => {
    const server = await register();
    const r = await callSession(server, "zulu_auction_live", {
      fleet_request: { slots: [{ slot: "alpha", heartbeatAgeMs: CRASH_TTL_MS + 1, queueDepth: 0 }] },
      auction: { task_id: "T3", task_text: "build", bidders: [{ slot: "alpha", queue_depth: 0, success_rate: 1, success_sample_size: 5 }] },
      souls: { alpha: SOUL },
      drop_dead: false,
    });
    expect(r.ok).toBe(true);
    const result = r.data.result as { bids: Array<{ slot: string }>; winner_slot: string | null };
    expect(result.bids.map((b) => b.slot)).toContain("alpha"); // NOT dropped
    expect(result.winner_slot).toBe("alpha");                  // domain match wins despite crashed
  });
});
