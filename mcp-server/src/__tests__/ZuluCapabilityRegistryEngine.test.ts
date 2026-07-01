/**
 * ZuluCapabilityRegistryEngine (C6) tests -- pure attestation core + read-only snapshot.
 *
 * Pure: deterministic with injected nowMs + explicit records. Snapshot: hermetic via
 * __forTests(tmpSlots, tmpClaims) with tmp JSON files; read-only (no store mutation).
 */
import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  ZuluCapabilityRegistryEngine,
  type SlotRuntimeRecord,
} from "../engines/ZuluCapabilityRegistryEngine.js";

const E = ZuluCapabilityRegistryEngine;
const NOW_ISO = "2026-06-15T12:00:00.000Z";
const NOW = Date.parse(NOW_ISO);

function rec(over: Partial<SlotRuntimeRecord> = {}): SlotRuntimeRecord {
  return {
    chatId: "claude-abc123",
    claimedAt: "2026-06-15T10:00:00.000Z", // 2h warm
    lastHeartbeat: "2026-06-15T11:59:00.000Z", // 1 min ago -> alive
    branch: "slot/bravo",
    topic: null,
    activity: "build",
    ...over,
  };
}

const tmp: string[] = [];
function tmpPath(tag: string): string {
  const p = path.join(os.tmpdir(), `zulu-cap-${tag}-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
  tmp.push(p);
  return p;
}
afterEach(() => {
  for (const p of tmp.splice(0)) { try { fs.rmSync(p, { force: true }); } catch { /* best-effort */ } }
});

// ---- PURE ---------------------------------------------------------------------

describe("classifyLiveness (pure)", () => {
  it("alive < 3min, stale < 30min, crashed beyond, idle when no chat", () => {
    expect(E.classifyLiveness(1000, true)).toBe("alive");
    expect(E.classifyLiveness(179_000, true)).toBe("alive");
    expect(E.classifyLiveness(200_000, true)).toBe("stale");
    expect(E.classifyLiveness(1_700_000, true)).toBe("stale");
    expect(E.classifyLiveness(2_000_000, true)).toBe("crashed");
    expect(E.classifyLiveness(1000, false)).toBe("idle");
    expect(E.classifyLiveness(-1, true)).toBe("crashed");
  });
});

describe("buildAttestation (pure)", () => {
  it("warm + recently-heartbeated slot -> alive, warm_since=claimedAt, warm_ms=2h", () => {
    const a = E.buildAttestation("bravo", rec(), { claimCount: 2 }, NOW);
    expect(a.liveness).toBe("alive");
    expect(a.warm_since).toBe("2026-06-15T10:00:00.000Z");
    expect(a.warm_ms).toBe(2 * 3600_000);
    expect(a.queue_depth).toBe(2);
    expect(a.domain_affinity).toBe("bravo"); // from branch slot/bravo
    expect(a.attested_at).toBe(NOW_ISO);
  });

  it("idle slot (no chatId) -> idle, warm_since null, queue 0, heartbeat_age -1", () => {
    const a = E.buildAttestation("zulu", { chatId: "" }, {}, NOW);
    expect(a.liveness).toBe("idle");
    expect(a.warm_since).toBe(null);
    expect(a.warm_ms).toBe(0);
    expect(a.queue_depth).toBe(0);
    expect(a.heartbeat_age_ms).toBe(-1);
  });

  it("stale + crashed by heartbeat age", () => {
    expect(E.buildAttestation("a", rec({ lastHeartbeat: "2026-06-15T11:50:00.000Z" }), {}, NOW).liveness).toBe("stale"); // 10m
    expect(E.buildAttestation("a", rec({ lastHeartbeat: "2026-06-15T11:00:00.000Z" }), {}, NOW).liveness).toBe("crashed"); // 60m
  });

  it("domain_affinity precedence: topic > branch-slot-name > branch > unknown", () => {
    expect(E.buildAttestation("a", rec({ topic: "mill-work" }), {}, NOW).domain_affinity).toBe("mill-work");
    expect(E.buildAttestation("a", rec({ topic: null, branch: "slot/charlie" }), {}, NOW).domain_affinity).toBe("charlie");
    expect(E.buildAttestation("a", rec({ topic: null, branch: "feature-x" }), {}, NOW).domain_affinity).toBe("feature-x");
    expect(E.buildAttestation("a", rec({ topic: null, branch: undefined }), {}, NOW).domain_affinity).toBe("unknown");
  });

  it("active_models: provided -> source 'provided'; absent -> [] + 'unavailable' (R12 honest)", () => {
    const withM = E.buildAttestation("a", rec(), { activeModels: ["qwen2.5-coder:32b"] }, NOW);
    expect(withM.active_models).toEqual(["qwen2.5-coder:32b"]);
    expect(withM.active_models_source).toBe("provided");
    const without = E.buildAttestation("a", rec(), {}, NOW);
    expect(without.active_models).toEqual([]);
    expect(without.active_models_source).toBe("unavailable");
  });

  it("queue_depth clamps negative/NaN to 0, floors fractional", () => {
    expect(E.buildAttestation("a", rec(), { claimCount: -5 }, NOW).queue_depth).toBe(0);
    expect(E.buildAttestation("a", rec(), { claimCount: NaN }, NOW).queue_depth).toBe(0);
    expect(E.buildAttestation("a", rec(), { claimCount: 3.9 }, NOW).queue_depth).toBe(3);
  });

  it("adversarial: null/garbage record never throws -> idle / crashed", () => {
    const fromNull = E.buildAttestation("a", null, {}, NOW);
    expect(fromNull.liveness).toBe("idle");
    expect(fromNull.queue_depth).toBe(0);
    expect(E.buildAttestation("a", { chatId: "x", claimedAt: "garbage", lastHeartbeat: "garbage" }, {}, NOW).liveness).toBe("crashed");
  });
});

describe("buildRegistry (pure)", () => {
  it("sorts alive-first then warmth-desc", () => {
    const reg = E.buildRegistry({
      slots: {
        cold: rec({ chatId: "c1", claimedAt: "2026-06-15T11:55:00.000Z", lastHeartbeat: "2026-06-15T11:59:30.000Z" }), // alive, 5m warm
        warm: rec({ chatId: "c2", claimedAt: "2026-06-15T08:00:00.000Z", lastHeartbeat: "2026-06-15T11:59:30.000Z" }), // alive, 4h warm
        dead: rec({ chatId: "c3", lastHeartbeat: "2026-06-15T10:00:00.000Z" }), // crashed
        empty: { chatId: "" }, // idle
      },
      claimCounts: { warm: 1 },
    }, NOW);
    expect(reg.map((a) => a.slot)).toEqual(["warm", "cold", "dead", "empty"]); // alive(warm>cold), crashed, idle
    expect(reg[0].queue_depth).toBe(1);
  });

  it("empty / null input -> empty registry (no throw)", () => {
    expect(E.buildRegistry({ slots: {} }, NOW)).toEqual([]);
    expect(E.buildRegistry(null as never, NOW)).toEqual([]);
  });
});

// ---- READ-ONLY snapshot (hermetic) -------------------------------------------

describe("snapshot + attest (read-only, hermetic)", () => {
  function writeFixtures(slots: object, claims: object): ZuluCapabilityRegistryEngine {
    const sp = tmpPath("slots"); const cp = tmpPath("claims");
    fs.writeFileSync(sp, JSON.stringify(slots), "utf8");
    fs.writeFileSync(cp, JSON.stringify(claims), "utf8");
    return ZuluCapabilityRegistryEngine.__forTests(sp, cp);
  }

  it("snapshot aggregates slots + active claim counts (read-only)", () => {
    const eng = writeFixtures(
      { slots: { bravo: rec({ topic: "hermes-build" }), oscar: rec({ chatId: "o1", branch: "slot/oscar" }) } },
      { schemaVersion: 1, claims: { "U-1": { slot: "bravo", phase: "building" }, "U-2": { slot: "bravo", phase: "testing" }, "U-3": { slot: "oscar", released: true } } },
    );
    const snap = eng.snapshot({ now: NOW_ISO });
    expect(snap.ok).toBe(true);
    expect(snap.count).toBe(2);
    const bravo = snap.attestations.find((a) => a.slot === "bravo")!;
    expect(bravo.queue_depth).toBe(2); // 2 active claims
    expect(bravo.domain_affinity).toBe("hermes-build");
    const oscar = snap.attestations.find((a) => a.slot === "oscar")!;
    expect(oscar.queue_depth).toBe(0); // U-3 released -> not counted
    expect(snap.degraded === true).toBe(false); // not degraded when both files read
  });

  it("degrades (never throws) when chat-slots file is missing", () => {
    const eng = ZuluCapabilityRegistryEngine.__forTests(tmpPath("nonexistent-slots"), tmpPath("nonexistent-claims"));
    const snap = eng.snapshot({ now: NOW_ISO });
    expect(snap.ok).toBe(true);
    expect(snap.count).toBe(0);
    expect(snap.degraded).toBe(true);
    expect(snap.reason).toContain("chat-slots unreadable");
  });

  it("attest(slot) returns a single live attestation", () => {
    const eng = writeFixtures({ slots: { whiskey: rec({ branch: "slot/whiskey" }) } }, { claims: { "U-9": { slot: "whiskey", phase: "claimed" } } });
    const a = eng.attest("whiskey", { now: NOW_ISO });
    expect(a.slot).toBe("whiskey");
    expect(a.queue_depth).toBe(1);
    expect(a.liveness).toBe("alive");
  });
});
