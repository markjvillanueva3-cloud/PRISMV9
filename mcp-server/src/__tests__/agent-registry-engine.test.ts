/**
 * Tests for AgentRegistryEngine (Phase 0.17 U-PLG1)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AgentRegistryEngine, agentRegistryEngine, type AgentEntry } from "../engines/AgentRegistryEngine.js";

function entry(overrides: Partial<AgentEntry> = {}): AgentEntry {
  return {
    name: overrides.name ?? "test-agent",
    category: overrides.category ?? "prism",
    description: overrides.description ?? "A test agent",
    triggers: overrides.triggers ?? ["test"],
    exampleInvocations: overrides.exampleInvocations,
    costTier: overrides.costTier ?? "medium",
  };
}

describe("AgentRegistryEngine", () => {
  let e: AgentRegistryEngine;

  beforeEach(() => {
    e = new AgentRegistryEngine();
  });

  describe("register()", () => {
    it("stores a valid agent", () => {
      e.register(entry());
      expect(e.size()).toBe(1);
      expect(e.get("test-agent")?.name).toBe("test-agent");
    });

    it("normalizes trigger keywords to lowercase and dedupes", () => {
      const stored = e.register(entry({ triggers: ["Kienzle", "kienzle", "TAYLOR"] }));
      expect(stored.triggers.sort()).toEqual(["kienzle", "taylor"]);
    });

    it("rejects empty name", () => {
      expect(() => e.register(entry({ name: "" }))).toThrow(/name/);
    });

    it("rejects empty description", () => {
      expect(() => e.register(entry({ description: "" }))).toThrow(/description/);
    });

    it("rejects empty triggers array", () => {
      expect(() => e.register(entry({ triggers: [] }))).toThrow(/triggers/);
    });

    it("rejects invalid cost tier", () => {
      expect(() => e.register(entry({ costTier: "extreme" as "high" }))).toThrow(/costTier/);
    });

    it("registerAll stores multiple entries", () => {
      e.registerAll([entry({ name: "a" }), entry({ name: "b" })]);
      expect(e.size()).toBe(2);
    });
  });

  describe("unregister() / clear() / get()", () => {
    it("unregister returns true when agent existed", () => {
      e.register(entry());
      expect(e.unregister("test-agent")).toBe(true);
      expect(e.unregister("test-agent")).toBe(false);
    });

    it("clear empties the registry", () => {
      e.registerAll([entry({ name: "a" }), entry({ name: "b" })]);
      e.clear();
      expect(e.size()).toBe(0);
    });

    it("get returns null for unknown agent", () => {
      expect(e.get("ghost")).toBeNull();
    });
  });

  describe("listByCategory()", () => {
    it("filters agents by category", () => {
      e.registerAll([
        entry({ name: "a", category: "prism" }),
        entry({ name: "b", category: "sparc" }),
        entry({ name: "c", category: "prism" }),
      ]);
      expect(e.listByCategory("prism").map((a) => a.name).sort()).toEqual(["a", "c"]);
      expect(e.listByCategory("sparc").map((a) => a.name)).toEqual(["b"]);
    });
  });

  describe("match() — scoring", () => {
    beforeEach(() => {
      e.registerAll([
        entry({ name: "dispatcher-wirer", triggers: ["dispatcher", "wire"], costTier: "low" }),
        entry({ name: "physics-reviewer", triggers: ["physics", "kienzle", "taylor"], costTier: "medium" }),
        entry({ name: "code-reviewer", triggers: ["review", "code"], costTier: "low" }),
      ]);
    });

    it("returns an empty list when prompt has no matching tokens", () => {
      expect(e.match("hello world")).toEqual([]);
    });

    it("scores by proportion of matched triggers", () => {
      const matches = e.match("check the kienzle model");
      expect(matches[0].agent.name).toBe("physics-reviewer");
      expect(matches[0].matchedTriggers).toContain("kienzle");
    });

    it("respects limit", () => {
      const matches = e.match("dispatcher physics review", 2);
      expect(matches).toHaveLength(2);
    });

    it("limit=0 returns all matches", () => {
      const matches = e.match("dispatcher physics review", 0);
      expect(matches.length).toBeGreaterThanOrEqual(3);
    });

    it("breaks ties by cost tier (low first)", () => {
      e.clear();
      e.registerAll([
        entry({ name: "high-agent", triggers: ["foo"], costTier: "high" }),
        entry({ name: "low-agent", triggers: ["foo"], costTier: "low" }),
      ]);
      const matches = e.match("foo");
      expect(matches[0].agent.name).toBe("low-agent");
    });

    it("breaks cost ties by agent name ascending", () => {
      e.clear();
      e.registerAll([
        entry({ name: "zebra", triggers: ["xenon"], costTier: "low" }),
        entry({ name: "alpha", triggers: ["xenon"], costTier: "low" }),
      ]);
      expect(e.match("xenon")[0].agent.name).toBe("alpha");
    });

    it("matches multi-word triggers as substrings", () => {
      e.clear();
      e.register(entry({ name: "wire-edm", triggers: ["wire edm", "mitsubishi"], costTier: "low" }));
      const matches = e.match("I need to set up a wire edm program");
      expect(matches).toHaveLength(1);
      expect(matches[0].matchedTriggers).toContain("wire edm");
    });

    it("ignores 1-character tokens in the prompt", () => {
      e.clear();
      e.register(entry({ name: "a-agent", triggers: ["a"], costTier: "low" }));
      expect(e.match("a b c")).toEqual([]);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      agentRegistryEngine.clear();
      agentRegistryEngine.register(entry({ name: "singleton" }));
      expect(agentRegistryEngine.size()).toBe(1);
      agentRegistryEngine.clear();
    });
  });
});
