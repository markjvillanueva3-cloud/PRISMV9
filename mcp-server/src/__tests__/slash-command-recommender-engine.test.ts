/**
 * Tests for SlashCommandRecommenderEngine (Phase 0.17 U-PLG2)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  SlashCommandRecommenderEngine,
  slashCommandRecommenderEngine,
  type CommandEntry,
} from "../engines/SlashCommandRecommenderEngine.js";

function cmd(overrides: Partial<CommandEntry> = {}): CommandEntry {
  return {
    command: overrides.command ?? "/dedup",
    description: overrides.description ?? "Check for duplicates before creating",
    triggers: overrides.triggers ?? ["dedup", "duplicate"],
    tags: overrides.tags,
    invocationCount: overrides.invocationCount,
  };
}

describe("SlashCommandRecommenderEngine", () => {
  let e: SlashCommandRecommenderEngine;

  beforeEach(() => {
    e = new SlashCommandRecommenderEngine();
  });

  describe("register()", () => {
    it("adds leading slash if missing", () => {
      const stored = e.register(cmd({ command: "dedup" }));
      expect(stored.command).toBe("/dedup");
    });

    it("normalizes triggers to lowercase and dedupes", () => {
      const stored = e.register(cmd({ triggers: ["Dedup", "DEDUP", "duplicate"] }));
      expect(stored.triggers.sort()).toEqual(["dedup", "duplicate"]);
    });

    it("rejects empty command", () => {
      expect(() => e.register(cmd({ command: "" }))).toThrow(/command/);
    });

    it("rejects empty triggers", () => {
      expect(() => e.register(cmd({ triggers: [] }))).toThrow(/triggers/);
    });

    it("rejects negative invocationCount", () => {
      expect(() => e.register(cmd({ invocationCount: -1 }))).toThrow(/invocationCount/);
    });

    it("registerAll stores multiple commands", () => {
      e.registerAll([cmd({ command: "/a", triggers: ["a-word"] }), cmd({ command: "/b", triggers: ["b-word"] })]);
      expect(e.size()).toBe(2);
    });
  });

  describe("get() / list()", () => {
    it("get tolerates missing leading slash", () => {
      e.register(cmd({ command: "/dedup" }));
      expect(e.get("dedup")?.command).toBe("/dedup");
    });

    it("list returns all commands", () => {
      e.registerAll([cmd({ command: "/a", triggers: ["aa"] }), cmd({ command: "/b", triggers: ["bb"] })]);
      expect(e.list().map((c) => c.command).sort()).toEqual(["/a", "/b"]);
    });
  });

  describe("recommend() — matching", () => {
    beforeEach(() => {
      e.registerAll([
        cmd({ command: "/dedup", triggers: ["dedup", "duplicate"] }),
        cmd({ command: "/wire-edm-studio", triggers: ["wire edm", "wedm", "mitsubishi"] }),
        cmd({ command: "/pdf-learn", triggers: ["pdf", "document", "manual"] }),
      ]);
    });

    it("returns empty when prompt has no matching tokens", () => {
      expect(e.recommend("hello world")).toEqual([]);
    });

    it("matches single-word triggers", () => {
      const recs = e.recommend("check for duplicate engines");
      expect(recs[0].command).toBe("/dedup");
      expect(recs[0].matchedTriggers).toContain("duplicate");
    });

    it("matches multi-word triggers as substrings", () => {
      const recs = e.recommend("need to run a wire edm analysis");
      expect(recs[0].command).toBe("/wire-edm-studio");
      expect(recs[0].matchedTriggers).toContain("wire edm");
    });

    it("respects limit", () => {
      const recs = e.recommend("dedup pdf wire edm", { limit: 2 });
      expect(recs).toHaveLength(2);
    });

    it("limit=0 returns all matches", () => {
      const recs = e.recommend("dedup pdf wire edm", { limit: 0 });
      expect(recs.length).toBeGreaterThanOrEqual(3);
    });

    it("excludes commands in excludeCommands", () => {
      const recs = e.recommend("dedup duplicate", { excludeCommands: ["/dedup"] });
      expect(recs.find((r) => r.command === "/dedup")).toBeUndefined();
    });

    it("excludeCommands tolerates missing leading slash", () => {
      const recs = e.recommend("dedup duplicate", { excludeCommands: ["dedup"] });
      expect(recs.find((r) => r.command === "/dedup")).toBeUndefined();
    });
  });

  describe("recommend() — confidence + rationale", () => {
    it("applies popularity boost based on invocationCount", () => {
      e.register(cmd({ command: "/popular", triggers: ["foo"], invocationCount: 500 }));
      e.register(cmd({ command: "/unknown", triggers: ["foo"], invocationCount: 0 }));
      const recs = e.recommend("foo");
      expect(recs[0].command).toBe("/popular");
      expect(recs[0].confidence).toBeGreaterThan(recs[1].confidence);
    });

    it("caps confidence at 1.0", () => {
      e.register(cmd({ command: "/a", triggers: ["xray", "yankee"], invocationCount: 1_000_000 }));
      const recs = e.recommend("xray yankee");
      expect(recs[0].confidence).toBeLessThanOrEqual(1.0);
    });

    it("filters by minConfidence", () => {
      e.register(cmd({ command: "/low", triggers: ["foo", "bar", "baz", "qux"] })); // only 1/4 match
      const recs = e.recommend("foo", { minConfidence: 0.5 });
      expect(recs).toEqual([]);
    });

    it("rationale mentions the matched trigger and command", () => {
      e.register(cmd({ command: "/dedup", triggers: ["dedup"] }));
      const recs = e.recommend("need to dedup");
      expect(recs[0].rationale).toContain("dedup");
      expect(recs[0].rationale).toContain("/dedup");
    });

    it("breaks ties by command name ascending", () => {
      e.clear();
      e.registerAll([
        cmd({ command: "/zulu", triggers: ["match"] }),
        cmd({ command: "/alpha", triggers: ["match"] }),
      ]);
      expect(e.recommend("match")[0].command).toBe("/alpha");
    });

    it("rejects out-of-range minConfidence", () => {
      expect(() => e.recommend("x", { minConfidence: -0.1 })).toThrow(/minConfidence/);
      expect(() => e.recommend("x", { minConfidence: 1.1 })).toThrow(/minConfidence/);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      slashCommandRecommenderEngine.clear();
      slashCommandRecommenderEngine.register(cmd({ command: "/test", triggers: ["test-cmd"] }));
      expect(slashCommandRecommenderEngine.size()).toBe(1);
      slashCommandRecommenderEngine.clear();
    });
  });
});
