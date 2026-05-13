/**
 * SkillTierRegistryEngine.test.ts — real-behavior tests for skill tier classification.
 *
 * Covers: register validation, keyword-based classification (essential/intermediate/advanced),
 * explicit-tier override, assign-unknown-skill error, classifyAll sort + per-tier counts,
 * listByTier filtering, command canonicalization (auto-prefix `/`), size/clear lifecycle,
 * trigger and tag deduplication + lowercasing, partial-match command-name matching.
 *
 * Wired by HOOK-SYNERGY-MS0 follow-up (engine was orphaned — added to prism_skill_script
 * with 5 actions: skill_tier_{register,assign,classify_all,list,size}).
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

describe("SkillTierRegistryEngine — registration", () => {
  let engine: SkillTierRegistryEngine;
  beforeEach(() => {
    engine = new SkillTierRegistryEngine();
  });

  it("auto-prefixes commands without a leading slash", () => {
    const canon = engine.register(record({ command: "noslash" }));
    expect(canon.command).toBe("/noslash");
  });

  it("preserves commands that already start with a slash", () => {
    const canon = engine.register(record({ command: "/already" }));
    expect(canon.command).toBe("/already");
  });

  it("lowercases triggers and removes duplicates", () => {
    const canon = engine.register(record({ triggers: ["Foo", "FOO", "bar", "BAR", "foo"] }));
    expect(canon.triggers).toEqual(["foo", "bar"]);
  });

  it("lowercases tags and removes duplicates when provided", () => {
    const canon = engine.register(record({ tags: ["Build", "BUILD", "Test"] }));
    expect(canon.tags).toEqual(["build", "test"]);
  });

  it("leaves tags undefined when not provided", () => {
    const canon = engine.register(record());
    expect(canon.tags).toBe(undefined);
  });

  it("preserves an empty triggers array unchanged", () => {
    // Empty-triggers signal must survive canonicalization — a future bug
    // that injects defaults would mask the operator's "no trigger" intent.
    const canon = engine.register(record({ triggers: [] }));
    expect(canon.triggers.length).toBe(0);
  });

  it("rejects an empty command", () => {
    expect(() => engine.register(record({ command: "" }))).toThrow(/command required/);
  });

  it("rejects an all-whitespace command", () => {
    expect(() => engine.register(record({ command: "   " }))).toThrow(/command required/);
  });

  it("rejects an empty description", () => {
    expect(() => engine.register(record({ description: "" }))).toThrow(/description required/);
  });

  it("rejects non-array triggers", () => {
    expect(() => engine.register(record({ triggers: "string-not-array" as unknown as string[] }))).toThrow(/triggers must be array/);
  });

  it("rejects an invalid explicit tier value", () => {
    expect(() => engine.register(record({ explicitTier: "expert" as unknown as SkillTier })))
      .toThrow(/explicitTier invalid/);
  });

  it("rejects a negative invocationCount", () => {
    expect(() => engine.register(record({ invocationCount: -5 }))).toThrow(/invocationCount must be/);
  });

  it("accepts invocationCount of 0", () => {
    const canon = engine.register(record({ invocationCount: 0 }));
    expect(canon.invocationCount).toBe(0);
  });

  it("registerAll inserts every skill in the array", () => {
    engine.registerAll([
      record({ command: "/a" }),
      record({ command: "/b" }),
      record({ command: "/c" }),
    ]);
    expect(engine.size()).toBe(3);
  });
});

describe("SkillTierRegistryEngine — classification by keyword", () => {
  let engine: SkillTierRegistryEngine;
  beforeEach(() => {
    engine = new SkillTierRegistryEngine();
  });

  it("classifies as essential when command contains 'dedup'", () => {
    engine.register(record({ command: "/dedup", triggers: [] }));
    expect(engine.assign("/dedup").tier).toBe("essential");
  });

  it("classifies as essential when trigger keyword matches 'boot'", () => {
    engine.register(record({ command: "/anything", triggers: ["boot"] }));
    expect(engine.assign("/anything").tier).toBe("essential");
  });

  it("classifies as essential when tag matches 'scrutinize'", () => {
    engine.register(record({ command: "/anything", triggers: [], tags: ["scrutinize"] }));
    expect(engine.assign("/anything").tier).toBe("essential");
  });

  it("classifies as intermediate when trigger matches 'wedm'", () => {
    engine.register(record({ command: "/anything", triggers: ["wedm"] }));
    expect(engine.assign("/anything").tier).toBe("intermediate");
  });

  it("classifies as intermediate when command contains 'lathe'", () => {
    engine.register(record({ command: "/lathe-prep", triggers: [] }));
    expect(engine.assign("/lathe-prep").tier).toBe("intermediate");
  });

  it("matches keyword substrings anywhere in the command (substring semantics, by design)", () => {
    // Pins intentional behavior: `command.toLowerCase().includes(kw)` matches
    // 'lathe' anywhere in '/sublathe-mode' — 'lathe' starts at offset 3.
    // A future tightening to word-boundaries would correctly fail this —
    // flag it as a deliberate API change.
    engine.register(record({ command: "/sublathe-mode", triggers: [] }));
    expect(engine.assign("/sublathe-mode").tier).toBe("intermediate");
  });

  it("classifies as intermediate when tag matches 'shop'", () => {
    engine.register(record({ command: "/anything", triggers: [], tags: ["shop"] }));
    expect(engine.assign("/anything").tier).toBe("intermediate");
  });

  it("falls back to advanced when no keyword matches", () => {
    engine.register(record({ command: "/zzz-obscure", triggers: ["xenon"] }));
    expect(engine.assign("/zzz-obscure").tier).toBe("advanced");
  });

  it("prefers essential over intermediate when both keyword sets match", () => {
    engine.register(record({ command: "/anything", triggers: ["boot", "wedm"] }));
    expect(engine.assign("/anything").tier).toBe("essential");
  });

  it("explains the chosen tier with a reason string", () => {
    engine.register(record({ command: "/dedup-it", triggers: [] }));
    expect(engine.assign("/dedup-it").reason).toBe("matches essential keyword 'dedup'");
  });

  it("uses an explanatory reason for the advanced fallback", () => {
    engine.register(record({ command: "/zzz-obscure", triggers: ["xenon"] }));
    expect(engine.assign("/zzz-obscure").reason).toBe("no tier keywords matched");
  });
});

describe("SkillTierRegistryEngine — explicit tier override", () => {
  it("honours explicit essential tier even when keywords say advanced", () => {
    const engine = new SkillTierRegistryEngine();
    engine.register(record({ command: "/zzz-obscure", triggers: ["xenon"], explicitTier: "essential" }));
    const a = engine.assign("/zzz-obscure");
    expect(a.tier).toBe("essential");
    expect(a.reason).toBe("explicit tier set on registration");
  });

  it("honours explicit advanced tier even when keywords say essential", () => {
    const engine = new SkillTierRegistryEngine();
    engine.register(record({ command: "/dedup-it", triggers: ["boot"], explicitTier: "advanced" }));
    const a = engine.assign("/dedup-it");
    expect(a.tier).toBe("advanced");
    expect(a.reason).toBe("explicit tier set on registration");
  });
});

describe("SkillTierRegistryEngine — assign lookup", () => {
  it("throws when assigning an unknown command", () => {
    const engine = new SkillTierRegistryEngine();
    expect(() => engine.assign("/ghost")).toThrow(/unknown skill/);
  });

  it("accepts an unprefixed command for lookup", () => {
    const engine = new SkillTierRegistryEngine();
    engine.register(record({ command: "/dedup-x", triggers: [] }));
    expect(engine.assign("dedup-x").tier).toBe("essential");
  });
});

describe("SkillTierRegistryEngine — classifyAll report", () => {
  it("returns total, per-tier counts, and assignments sorted essential → advanced", () => {
    const engine = new SkillTierRegistryEngine();
    engine.register(record({ command: "/zzz-obscure", triggers: [] }));        // advanced
    engine.register(record({ command: "/dedup-fast", triggers: [] }));         // essential
    engine.register(record({ command: "/lathe-prep", triggers: [] }));         // intermediate
    engine.register(record({ command: "/dedup-slow", triggers: [] }));         // essential

    const r = engine.classifyAll();

    expect(r.total).toBe(4);
    expect(r.byTier.essential).toBe(2);
    expect(r.byTier.intermediate).toBe(1);
    expect(r.byTier.advanced).toBe(1);

    expect(r.assignments[0].tier).toBe("essential");
    expect(r.assignments[1].tier).toBe("essential");
    expect(r.assignments[2].tier).toBe("intermediate");
    expect(r.assignments[3].tier).toBe("advanced");

    // Within the essential tier, commands are sorted alphabetically.
    expect(r.assignments[0].command).toBe("/dedup-fast");
    expect(r.assignments[1].command).toBe("/dedup-slow");
  });

  it("returns zero counts when no skills are registered", () => {
    const engine = new SkillTierRegistryEngine();
    const r = engine.classifyAll();
    expect(r.total).toBe(0);
    expect(r.byTier.essential).toBe(0);
    expect(r.byTier.intermediate).toBe(0);
    expect(r.byTier.advanced).toBe(0);
    expect(r.assignments.length).toBe(0);
  });
});

describe("SkillTierRegistryEngine — listByTier", () => {
  it("returns only the requested tier", () => {
    const engine = new SkillTierRegistryEngine();
    engine.register(record({ command: "/dedup-x", triggers: [] }));    // essential
    engine.register(record({ command: "/lathe-x", triggers: [] }));    // intermediate
    engine.register(record({ command: "/foo-x", triggers: [] }));      // advanced

    const ess = engine.listByTier("essential");
    expect(ess.length).toBe(1);
    expect(ess[0].command).toBe("/dedup-x");

    const adv = engine.listByTier("advanced");
    expect(adv.length).toBe(1);
    expect(adv[0].command).toBe("/foo-x");
  });

  it("returns an empty list when no skills are in the tier", () => {
    const engine = new SkillTierRegistryEngine();
    engine.register(record({ command: "/dedup-x", triggers: [] }));
    expect(engine.listByTier("advanced").length).toBe(0);
  });
});

describe("SkillTierRegistryEngine — lifecycle", () => {
  it("size starts at 0 and grows with each register call", () => {
    const engine = new SkillTierRegistryEngine();
    expect(engine.size()).toBe(0);
    engine.register(record({ command: "/a" }));
    expect(engine.size()).toBe(1);
    engine.register(record({ command: "/b" }));
    expect(engine.size()).toBe(2);
  });

  it("re-registering the same command overwrites rather than appending", () => {
    const engine = new SkillTierRegistryEngine();
    engine.register(record({ command: "/x", triggers: ["original"] }));
    engine.register(record({ command: "/x", triggers: ["updated"] }));
    expect(engine.size()).toBe(1);
    // The replacement now drives classification — "updated" doesn't match any
    // tier keyword, so the second registration should land in advanced.
    expect(engine.assign("/x").tier).toBe("advanced");
  });

  it("re-register actively switches tier when the new triggers change the classification", () => {
    // Stronger than the overwrite test — proves the SECOND value drives
    // classification when the FIRST would have placed the skill in a
    // different tier. Guards against merge-semantics regressions.
    const engine = new SkillTierRegistryEngine();
    engine.register(record({ command: "/y", triggers: ["dedup"] }));        // essential via trigger
    expect(engine.assign("/y").tier).toBe("essential");
    engine.register(record({ command: "/y", triggers: ["xenon"] }));        // advanced fallback
    expect(engine.assign("/y").tier).toBe("advanced");
  });

  it("clear empties the registry", () => {
    const engine = new SkillTierRegistryEngine();
    engine.register(record({ command: "/a" }));
    engine.register(record({ command: "/b" }));
    expect(engine.size()).toBe(2);
    engine.clear();
    expect(engine.size()).toBe(0);
    expect(() => engine.assign("/a")).toThrow(/unknown skill/);
  });
});

describe("SkillTierRegistryEngine — module singleton", () => {
  it("exports a default singleton that operates independently of per-test instances", async () => {
    const mod = await import("../engines/SkillTierRegistryEngine.js");
    // Clear in case other tests left state behind, then verify we can register.
    mod.skillTierRegistryEngine.clear();
    mod.skillTierRegistryEngine.register({
      command: "/singleton-dedup",
      description: "singleton smoke",
      triggers: [],
    });
    expect(mod.skillTierRegistryEngine.size()).toBe(1);
    expect(mod.skillTierRegistryEngine.assign("/singleton-dedup").tier).toBe("essential");
    mod.skillTierRegistryEngine.clear();
  });
});
