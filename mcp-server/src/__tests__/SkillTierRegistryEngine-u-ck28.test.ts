/**
 * SkillTierRegistryEngine-u-ck28.test.ts — U-CK28 close-the-loop tests.
 *
 * Closes COMMAND-KERNEL-MS0/U-CK28 exit conditions:
 *   1. command-invocation telemetry drives auto skill-tier reclassification
 *   2. SkillTierRegistryEngine.classifyAllAndPersist writes tiers back (not read-only)
 *   3. progressive disclosure reflects real usage
 *   4. registry snapshot captured pre-classify for rollback
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  SkillTierRegistryEngine,
  type SkillRecord,
  type SkillTier,
} from "../engines/SkillTierRegistryEngine.js";

function record(overrides: Partial<SkillRecord> = {}): SkillRecord {
  return {
    command: "/example",
    description: "example skill",
    triggers: ["example"],
    ...overrides,
  };
}

describe("SkillTierRegistryEngine — snapshot / restore (U-CK28)", () => {
  let engine: SkillTierRegistryEngine;
  beforeEach(() => { engine = new SkillTierRegistryEngine(); });

  it("snapshot captures every registered skill with a deep copy", () => {
    engine.register(record({ command: "/a", triggers: ["dedup"] }));
    engine.register(record({ command: "/b", triggers: ["lathe"] }));
    const snap = engine.snapshot();
    expect(snap.size).toBe(2);
    expect(snap.skills.length).toBe(2);
    expect(snap.skills.map((s) => s.command).sort()).toEqual(["/a", "/b"]);
    // Deep copy — mutating the snapshot's triggers must not affect the
    // registry's live record. classifyAll on the engine still sees the
    // original (unpolluted) trigger list.
    snap.skills[0].triggers.push("polluted");
    const liveReport = engine.classifyAll();
    const liveA = liveReport.assignments.find((a) => a.command === "/a");
    expect(liveA?.reason).toMatch(/essential keyword 'dedup'/);
  });

  it("snapshot.takenAt is a parseable ISO timestamp", () => {
    engine.register(record({ command: "/a", triggers: ["dedup"] }));
    const before = Date.now();
    const snap = engine.snapshot();
    const after = Date.now();
    const t = Date.parse(snap.takenAt);
    expect(Number.isFinite(t)).toBe(true);
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(after);
  });

  it("restore replaces registry contents with snapshot's skills", () => {
    engine.register(record({ command: "/a", triggers: ["dedup"] }));
    const snap = engine.snapshot();
    engine.register(record({ command: "/b", triggers: ["lathe"] }));
    engine.register(record({ command: "/c", triggers: ["mill"] }));
    expect(engine.size()).toBe(3);
    const restored = engine.restore(snap);
    expect(restored).toBe(1);
    expect(engine.size()).toBe(1);
    expect(engine.assign("/a").tier).toBe<SkillTier>("essential");
    expect(() => engine.assign("/b")).toThrow(/unknown skill/);
    expect(() => engine.assign("/c")).toThrow(/unknown skill/);
  });

  it("restore throws a descriptive error on a malformed snapshot", () => {
    expect(() => engine.restore({ takenAt: "", size: 0, skills: null as unknown as SkillRecord[] }))
      .toThrow(/invalid snapshot: missing skills array/);
  });

  it("restore is reversible — snapshot then mutate then restore returns to the snapshotted state", () => {
    engine.register(record({ command: "/a", triggers: ["dedup"], invocationCount: 5 }));
    const snap = engine.snapshot();
    engine.register(record({ command: "/b", triggers: ["lathe"] }));
    expect(engine.classifyAll().total).toBe(2);
    engine.restore(snap);
    const after = engine.classifyAll();
    expect(after.total).toBe(1);
    expect(after.assignments[0].command).toBe("/a");
    expect(after.assignments[0].tier).toBe<SkillTier>("essential");
  });
});

describe("SkillTierRegistryEngine — classifyAllAndPersist (U-CK28)", () => {
  let engine: SkillTierRegistryEngine;
  beforeEach(() => { engine = new SkillTierRegistryEngine(); });

  it("writes the assigned tier back to each record as explicitTier", () => {
    engine.register(record({ command: "/dedup-thing", triggers: ["dedup"] }));
    engine.register(record({ command: "/lathe-thing", triggers: ["lathe"] }));
    engine.register(record({ command: "/obscure", triggers: ["nothing-matches"] }));
    const result = engine.classifyAllAndPersist();
    expect(result.persistedCount).toBe(3);
    expect(result.report.byTier).toEqual({ essential: 1, intermediate: 1, advanced: 1 });
    // Re-assigning after persist must hit the explicitTier short-circuit
    // (proves the write-back actually mutated the live record).
    const dedup = engine.assign("/dedup-thing");
    expect(dedup.tier).toBe<SkillTier>("essential");
    expect(dedup.reason).toBe("explicit tier set on registration");
    const lathe = engine.assign("/lathe-thing");
    expect(lathe.tier).toBe<SkillTier>("intermediate");
    expect(lathe.reason).toBe("explicit tier set on registration");
    const obscure = engine.assign("/obscure");
    expect(obscure.tier).toBe<SkillTier>("advanced");
    expect(obscure.reason).toBe("explicit tier set on registration");
  });

  it("overwriteExplicit=false preserves a pre-existing explicitTier", () => {
    engine.register(record({ command: "/a", triggers: ["dedup"], explicitTier: "advanced" }));
    engine.register(record({ command: "/b", triggers: ["lathe"] }));
    const r = engine.classifyAllAndPersist({ overwriteExplicit: false });
    expect(r.persistedCount).toBe(1);
    // /a kept its hand-set "advanced" tier despite matching "dedup" essential keyword.
    expect(engine.assign("/a").tier).toBe<SkillTier>("advanced");
    expect(engine.assign("/b").tier).toBe<SkillTier>("intermediate");
  });

  it("captures a pre-classify snapshot in the result for rollback", () => {
    engine.register(record({ command: "/a", triggers: ["dedup"] }));
    const r = engine.classifyAllAndPersist();
    expect(r.snapshot.size).toBe(1);
    expect(r.snapshot.skills[0].command).toBe("/a");
    // The snapshot must reflect PRE-persist state — no explicitTier yet.
    expect(r.snapshot.skills[0].explicitTier === undefined).toBe(true);
    // Live record after persist DOES carry the assigned tier.
    expect(engine.assign("/a").tier).toBe<SkillTier>("essential");
  });

  it("is idempotent — a second persist produces the same report shape", () => {
    engine.register(record({ command: "/a", triggers: ["dedup"] }));
    engine.register(record({ command: "/b", triggers: ["lathe"] }));
    engine.register(record({ command: "/c", triggers: ["nothing"] }));
    const first = engine.classifyAllAndPersist();
    const second = engine.classifyAllAndPersist();
    expect(second.report.byTier).toEqual(first.report.byTier);
    expect(second.report.assignments.map((a) => `${a.command}:${a.tier}`))
      .toEqual(first.report.assignments.map((a) => `${a.command}:${a.tier}`));
    // Second call now sees explicitTier on every record — every reason
    // must be the explicit-tier marker.
    for (const a of second.report.assignments) {
      expect(a.reason).toBe("explicit tier set on registration");
    }
  });

  it("rollback round-trip: snapshot then persist then restore returns to the keyword-classified state", () => {
    engine.register(record({ command: "/a", triggers: ["lathe"] }));
    const before = engine.assign("/a");
    expect(before.reason).toBe("matches intermediate keyword 'lathe'");
    const r = engine.classifyAllAndPersist();
    expect(engine.assign("/a").reason).toBe("explicit tier set on registration");
    engine.restore(r.snapshot);
    const after = engine.assign("/a");
    expect(after.reason).toBe("matches intermediate keyword 'lathe'");
    expect(after.tier).toBe<SkillTier>("intermediate");
  });
});

describe("SkillTierRegistryEngine — usage-driven classification (U-CK28)", () => {
  let engine: SkillTierRegistryEngine;
  beforeEach(() => { engine = new SkillTierRegistryEngine(); });

  it("promotes the highest-invoked skill to essential", () => {
    engine.register(record({ command: "/hot", triggers: ["nothing-matches"], invocationCount: 100 }));
    engine.register(record({ command: "/cold", triggers: ["nothing-matches"], invocationCount: 1 }));
    const r = engine.classifyAllAndPersist({
      useInvocationCount: true, essentialTop: 1, intermediateTop: 1,
    });
    expect(r.usageDriven).toBe(true);
    const hot = r.report.assignments.find((a) => a.command === "/hot");
    const cold = r.report.assignments.find((a) => a.command === "/cold");
    expect(hot?.tier).toBe<SkillTier>("essential");
    expect(hot?.reason).toBe("usage rank 1 of 2 (invocationCount=100)");
    expect(cold?.tier).toBe<SkillTier>("intermediate");
    expect(cold?.reason).toBe("usage rank 2 of 2 (invocationCount=1)");
  });

  it("usage ranking outranks keyword classification", () => {
    // /lathe-thing → would be intermediate by keyword.
    // /custom → would be advanced by keyword, but has more invocations.
    engine.register(record({ command: "/lathe-thing", triggers: ["lathe"], invocationCount: 0 }));
    engine.register(record({ command: "/custom", triggers: ["unique"], invocationCount: 50 }));
    const r = engine.classifyAllAndPersist({
      useInvocationCount: true, essentialTop: 1, intermediateTop: 0,
    });
    const custom = r.report.assignments.find((a) => a.command === "/custom");
    const lathe = r.report.assignments.find((a) => a.command === "/lathe-thing");
    expect(custom?.tier).toBe<SkillTier>("essential");
    // /lathe-thing has 0 invocations → defaults to advanced under usage path.
    expect(lathe?.tier).toBe<SkillTier>("advanced");
    expect(lathe?.reason).toBe("no recorded invocations — defaulted to advanced");
  });

  it("zero or absent invocationCount defaults to advanced", () => {
    engine.register(record({ command: "/a", triggers: ["t"], invocationCount: 0 }));
    engine.register(record({ command: "/b", triggers: ["t"] })); // undefined invocationCount
    const r = engine.classifyAllAndPersist({
      useInvocationCount: true, essentialTop: 5, intermediateTop: 5,
    });
    const a = r.report.assignments.find((x) => x.command === "/a");
    const b = r.report.assignments.find((x) => x.command === "/b");
    expect(a?.tier).toBe<SkillTier>("advanced");
    expect(b?.tier).toBe<SkillTier>("advanced");
    expect(a?.reason).toBe("no recorded invocations — defaulted to advanced");
    expect(b?.reason).toBe("no recorded invocations — defaulted to advanced");
  });

  it("clampTopN: negative essentialTop falls back to the default of 10", () => {
    for (let i = 0; i < 5; i++) {
      engine.register(record({ command: `/k${i}`, triggers: ["x"], invocationCount: 100 - i }));
    }
    const r = engine.classifyAllAndPersist({ useInvocationCount: true, essentialTop: -1 });
    // Default essentialTop=10 — all 5 high-invocation skills land essential.
    expect(r.report.byTier.essential).toBe(5);
    expect(r.report.byTier.intermediate).toBe(0);
    expect(r.report.byTier.advanced).toBe(0);
  });

  it("ties on invocationCount break by command name ascending", () => {
    engine.register(record({ command: "/b", triggers: ["x"], invocationCount: 10 }));
    engine.register(record({ command: "/a", triggers: ["x"], invocationCount: 10 }));
    const r = engine.classifyAllAndPersist({
      useInvocationCount: true, essentialTop: 1, intermediateTop: 1,
    });
    expect(r.report.assignments.find((a) => a.command === "/a")?.tier).toBe<SkillTier>("essential");
    expect(r.report.assignments.find((a) => a.command === "/b")?.tier).toBe<SkillTier>("intermediate");
  });

  it("usage-driven persist still writes explicitTier back for future calls", () => {
    engine.register(record({ command: "/hot", triggers: ["unique"], invocationCount: 50 }));
    engine.classifyAllAndPersist({
      useInvocationCount: true, essentialTop: 1, intermediateTop: 0,
    });
    const a = engine.assign("/hot");
    expect(a.tier).toBe<SkillTier>("essential");
    expect(a.reason).toBe("explicit tier set on registration");
  });
});
