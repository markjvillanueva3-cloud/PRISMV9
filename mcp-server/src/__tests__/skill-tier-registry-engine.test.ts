/**
 * Tests for SkillTierRegistryEngine (Phase 0.25.6 U-UX1)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  SkillTierRegistryEngine,
  skillTierRegistryEngine,
  type SkillRecord,
} from "../engines/SkillTierRegistryEngine.js";

function skill(overrides: Partial<SkillRecord> = {}): SkillRecord {
  return {
    command: overrides.command ?? "/test",
    description: overrides.description ?? "a test skill",
    triggers: overrides.triggers ?? ["test"],
    tags: overrides.tags,
    explicitTier: overrides.explicitTier,
    invocationCount: overrides.invocationCount,
  };
}

describe("SkillTierRegistryEngine", () => {
  let e: SkillTierRegistryEngine;

  beforeEach(() => {
    e = new SkillTierRegistryEngine();
  });

  describe("register()", () => {
    it("prefixes leading slash if missing", () => {
      const s = e.register(skill({ command: "navigate" }));
      expect(s.command).toBe("/navigate");
    });

    it("rejects missing command/description/triggers", () => {
      expect(() => e.register(skill({ command: "" }))).toThrow(/command/);
      expect(() => e.register(skill({ description: "" }))).toThrow(/description/);
      expect(() => e.register({ ...skill(), triggers: undefined as unknown as string[] })).toThrow(/triggers/);
    });

    it("rejects invalid explicitTier", () => {
      expect(() => e.register(skill({ explicitTier: "expert" as "advanced" }))).toThrow(/explicitTier/);
    });

    it("rejects negative invocationCount", () => {
      expect(() => e.register(skill({ invocationCount: -1 }))).toThrow(/invocationCount/);
    });

    it("lowercases and dedupes triggers/tags", () => {
      const s = e.register(skill({ triggers: ["Foo", "foo"], tags: ["Bar", "BAR"] }));
      expect(s.triggers).toEqual(["foo"]);
      expect(s.tags).toEqual(["bar"]);
    });
  });

  describe("assign() — keyword-based tier", () => {
    it("classifies /dedup as essential", () => {
      e.register(skill({ command: "/dedup", triggers: ["dedup"] }));
      expect(e.assign("/dedup").tier).toBe("essential");
    });

    it("classifies WEDM-related commands as intermediate", () => {
      e.register(skill({ command: "/wedm-program", triggers: ["wedm"] }));
      expect(e.assign("/wedm-program").tier).toBe("intermediate");
    });

    it("classifies unknown commands as advanced", () => {
      e.register(skill({ command: "/obscure-thing", triggers: ["obscure"] }));
      expect(e.assign("/obscure-thing").tier).toBe("advanced");
    });

    it("tolerates missing leading slash", () => {
      e.register(skill({ command: "/foo", triggers: ["dedup"] }));
      expect(e.assign("foo").tier).toBe("essential");
    });

    it("explicitTier overrides keyword classification", () => {
      e.register(skill({ command: "/wedm-x", triggers: ["wedm"], explicitTier: "advanced" }));
      expect(e.assign("/wedm-x").tier).toBe("advanced");
    });

    it("throws on unknown command", () => {
      expect(() => e.assign("/ghost")).toThrow(/unknown skill/);
    });

    it("matches keyword against command string itself", () => {
      e.register(skill({ command: "/boot-stuff", triggers: ["unrelated"] }));
      expect(e.assign("/boot-stuff").tier).toBe("essential");
    });

    it("matches keyword against tags", () => {
      e.register(skill({ command: "/x", triggers: ["y"], tags: ["wedm"] }));
      expect(e.assign("/x").tier).toBe("intermediate");
    });
  });

  describe("classifyAll() + listByTier()", () => {
    it("counts entries per tier", () => {
      e.registerAll([
        skill({ command: "/dedup", triggers: ["dedup"] }),
        skill({ command: "/wedm-x", triggers: ["wedm"] }),
        skill({ command: "/arcane", triggers: ["arcane"] }),
      ]);
      const r = e.classifyAll();
      expect(r.byTier.essential).toBe(1);
      expect(r.byTier.intermediate).toBe(1);
      expect(r.byTier.advanced).toBe(1);
      expect(r.total).toBe(3);
    });

    it("sorts assignments tier-first then alphabetically", () => {
      e.registerAll([
        skill({ command: "/zz", triggers: ["wedm"] }),
        skill({ command: "/aa", triggers: ["wedm"] }),
        skill({ command: "/boot", triggers: ["boot"] }),
      ]);
      const names = e.classifyAll().assignments.map((a) => a.command);
      expect(names[0]).toBe("/boot");
      expect(names.indexOf("/aa")).toBeLessThan(names.indexOf("/zz"));
    });

    it("listByTier returns only matching tier", () => {
      e.registerAll([
        skill({ command: "/dedup", triggers: ["dedup"] }),
        skill({ command: "/arcane", triggers: ["arcane"] }),
      ]);
      expect(e.listByTier("essential").map((a) => a.command)).toEqual(["/dedup"]);
    });
  });

  describe("lifecycle", () => {
    it("clear empties the registry", () => {
      e.register(skill());
      e.clear();
      expect(e.size()).toBe(0);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      skillTierRegistryEngine.clear();
      skillTierRegistryEngine.register(skill({ command: "/singleton", triggers: ["singleton"] }));
      expect(skillTierRegistryEngine.size()).toBe(1);
      skillTierRegistryEngine.clear();
    });
  });
});
