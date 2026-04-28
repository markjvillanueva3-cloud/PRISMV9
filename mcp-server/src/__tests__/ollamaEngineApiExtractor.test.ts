/**
 * ollama-engine-api-extractor — synthetic-input tests for U-AF06.
 *
 * Tests the 4 pure functions exposed for the extractor hook:
 *   - isEngineSourceFile(path) — engine-file detection
 *   - parseOllamaEngineContract(raw) — Ollama-response → contract
 *   - mergeContractCache(prev, path, contract) — cache write semantics
 *   - decideExtractRun(input) — when to call Ollama vs skip
 *
 * @milestone AUTONOMOUS-FOOLPROOF-MS0
 * @unit U-AF06
 */

import { describe, it, expect } from "vitest";
// @ts-expect-error - importing pure logic from .mjs lib (no shebang, vitest-safe)
import {
  isEngineSourceFile,
  parseOllamaEngineContract,
  mergeContractCache,
  decideExtractRun,
} from "../../../.claude/hooks/lib/autonomous-foolproof-logic.mjs";

const NOW = new Date("2026-04-29T09:00:00Z").getTime();
const ONE_HOUR_MS = 60 * 60 * 1000;
const HALF_HOUR_MS = 30 * 60 * 1000;
const FIVE_MIN_MS = 5 * 60 * 1000;

describe("U-AF06 isEngineSourceFile", () => {
  it("matches conventional engine paths", () => {
    expect(isEngineSourceFile("H:/prism/mcp-server/src/engines/AwarenessQueryEngine.ts")).toBe(true);
    expect(isEngineSourceFile("src/engines/KienzleForceEngine.ts")).toBe(true);
    expect(isEngineSourceFile("/abs/src/engines/A1B2C3Engine.ts")).toBe(true);
  });

  it("matches Windows backslash paths", () => {
    expect(isEngineSourceFile("H:\\prism\\src\\engines\\FooEngine.ts")).toBe(true);
  });

  it("rejects non-engine source files", () => {
    expect(isEngineSourceFile("src/engines/foo.ts")).toBe(false);
    expect(isEngineSourceFile("src/engines/foo-bar-engine.ts")).toBe(false);
    expect(isEngineSourceFile("src/dispatchers/AwarenessQueryEngine.ts")).toBe(false);
    expect(isEngineSourceFile("src/engines/MyEngine.test.ts")).toBe(false);
    expect(isEngineSourceFile("MyEngine.ts")).toBe(false);
  });

  it("rejects non-string / empty input", () => {
    expect(isEngineSourceFile("")).toBe(false);
    expect(isEngineSourceFile(null)).toBe(false);
    expect(isEngineSourceFile(undefined)).toBe(false);
    expect(isEngineSourceFile(42)).toBe(false);
  });
});

describe("U-AF06 parseOllamaEngineContract", () => {
  describe("happy paths", () => {
    it("parses a clean JSON object", () => {
      const raw = JSON.stringify({
        methods: [{ name: "compute", returns: "number" }],
        required_fields: ["material", "tool"],
        enums: { material: ["steel", "aluminum"] },
      });
      const r = parseOllamaEngineContract(raw);
      expect(r.ok).toBe(true);
      expect(r.contract.methods).toHaveLength(1);
      expect(r.contract.methods[0].name).toBe("compute");
      expect(r.contract.required_fields).toEqual(["material", "tool"]);
      expect(r.contract.enums.material).toEqual(["steel", "aluminum"]);
    });

    it("strips ```json markdown fences", () => {
      const raw =
        "Sure, here's the contract:\n" +
        "```json\n" +
        '{"methods":[],"required_fields":["x"],"enums":{}}\n' +
        "```\n" +
        "Hope that helps!";
      const r = parseOllamaEngineContract(raw);
      expect(r.ok).toBe(true);
      expect(r.contract.required_fields).toEqual(["x"]);
      expect(r.contract.methods).toEqual([]);
    });

    it("extracts JSON from prose-wrapped response", () => {
      const raw =
        'The engine exposes the following: {"methods":[{"name":"foo"}],"required_fields":[],"enums":{}}.';
      const r = parseOllamaEngineContract(raw);
      expect(r.ok).toBe(true);
      expect(r.contract.methods[0].name).toBe("foo");
      expect(r.contract.required_fields).toEqual([]);
    });

    it("normalizes missing top-level keys to empty defaults", () => {
      const raw = JSON.stringify({});
      const r = parseOllamaEngineContract(raw);
      expect(r.ok).toBe(true);
      expect(r.contract.methods).toEqual([]);
      expect(r.contract.required_fields).toEqual([]);
      expect(r.contract.enums).toEqual({});
    });

    it("normalizes wrong-typed fields (array enums) to empty objects", () => {
      const raw = JSON.stringify({ methods: "not-array", enums: ["wrong"] });
      const r = parseOllamaEngineContract(raw);
      expect(r.ok).toBe(true);
      expect(r.contract.methods).toEqual([]);
      expect(r.contract.enums).toEqual({});
    });
  });

  describe("rejection paths", () => {
    it("rejects empty string", () => {
      const r = parseOllamaEngineContract("");
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("empty-response");
    });

    it("rejects null/undefined as empty-response", () => {
      expect(parseOllamaEngineContract(null).ok).toBe(false);
      expect(parseOllamaEngineContract(null).reason).toBe("empty-response");
      expect(parseOllamaEngineContract(undefined).ok).toBe(false);
    });

    it("rejects response with no JSON object at all", () => {
      const r = parseOllamaEngineContract("Sorry, I cannot extract that.");
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("no-json-object");
    });

    it("rejects malformed JSON (balanced braces, broken syntax)", () => {
      // The braces match (so we extract a JSON candidate) but the contents
      // are syntactically broken → invalid-json, not no-json-object.
      const r = parseOllamaEngineContract('{"methods": [unclosed-array}');
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("invalid-json");
    });

    it("rejects array-only JSON (extractor wants object, not list)", () => {
      const r = parseOllamaEngineContract("[1,2,3]");
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("no-json-object");
    });
  });
});

describe("U-AF06 mergeContractCache", () => {
  it("creates a fresh cache when none exists", () => {
    const cache = mergeContractCache(
      null,
      "src/engines/A.ts",
      { methods: [], required_fields: [], enums: {} },
      NOW,
    );
    expect(cache.schemaVersion).toBe("1.0.0");
    expect(cache.entries["src/engines/A.ts"].extracted_at).toBe("2026-04-29T09:00:00.000Z");
    expect(cache.entries["src/engines/A.ts"].contract.methods).toEqual([]);
    expect(cache.last_updated).toBe("2026-04-29T09:00:00.000Z");
  });

  it("preserves existing entries when adding a new one", () => {
    const prior = mergeContractCache(null, "src/engines/A.ts", { methods: [{ name: "a" }] }, NOW - ONE_HOUR_MS);
    const after = mergeContractCache(prior, "src/engines/B.ts", { methods: [{ name: "b" }] }, NOW);
    expect(after.entries["src/engines/A.ts"].contract.methods[0].name).toBe("a");
    expect(after.entries["src/engines/B.ts"].contract.methods[0].name).toBe("b");
    expect(Object.keys(after.entries)).toHaveLength(2);
    expect(after.last_updated).toBe("2026-04-29T09:00:00.000Z");
  });

  it("overwrites existing entry for the same file path", () => {
    const prior = mergeContractCache(null, "src/engines/A.ts", { methods: [{ name: "old" }] }, NOW - ONE_HOUR_MS);
    const after = mergeContractCache(prior, "src/engines/A.ts", { methods: [{ name: "new" }] }, NOW);
    expect(after.entries["src/engines/A.ts"].contract.methods[0].name).toBe("new");
    expect(Object.keys(after.entries)).toHaveLength(1);
  });

  it("treats malformed prior cache as empty", () => {
    // @ts-expect-error - intentional wrong-type adversarial input
    const after = mergeContractCache("garbage", "src/engines/A.ts", { methods: [] }, NOW);
    expect(after.schemaVersion).toBe("1.0.0");
    expect(Object.keys(after.entries)).toEqual(["src/engines/A.ts"]);
  });
});

describe("U-AF06 decideExtractRun", () => {
  describe("non-engine files", () => {
    it("does NOT run on dispatcher files", () => {
      const r = decideExtractRun({
        filePath: "src/tools/dispatchers/aiReasoningDispatcher.ts",
        isAutonomous: true,
        cache: null,
      });
      expect(r.run).toBe(false);
      expect(r.reason).toBe("not-an-engine-file");
    });

    it("does NOT run on test files", () => {
      const r = decideExtractRun({
        filePath: "src/__tests__/Foo.test.ts",
        isAutonomous: true,
        cache: null,
      });
      expect(r.run).toBe(false);
      expect(r.reason).toBe("not-an-engine-file");
    });
  });

  describe("autonomy gate", () => {
    it("does NOT run in non-autonomous mode (skip Ollama in manual)", () => {
      const r = decideExtractRun({
        filePath: "src/engines/AwarenessQueryEngine.ts",
        isAutonomous: false,
        cache: null,
      });
      expect(r.run).toBe(false);
      expect(r.reason).toBe("non-autonomous");
    });
  });

  describe("cache freshness", () => {
    it("RUNS on cache miss", () => {
      const r = decideExtractRun({
        filePath: "src/engines/AwarenessQueryEngine.ts",
        isAutonomous: true,
        cache: { entries: {} },
        nowMs: NOW,
      });
      expect(r.run).toBe(true);
      expect(r.reason).toBe("cache-miss");
    });

    it("RUNS when cache is older than 1h TTL", () => {
      const stale = new Date(NOW - 2 * ONE_HOUR_MS).toISOString();
      const r = decideExtractRun({
        filePath: "src/engines/AwarenessQueryEngine.ts",
        isAutonomous: true,
        cache: {
          entries: { "src/engines/AwarenessQueryEngine.ts": { extracted_at: stale, contract: {} } },
        },
        nowMs: NOW,
      });
      expect(r.run).toBe(true);
      expect(r.reason).toBe("cache-stale");
      expect(r.age_ms).toBe(2 * ONE_HOUR_MS);
    });

    it("does NOT run when cache is fresh (<1h)", () => {
      const fresh = new Date(NOW - HALF_HOUR_MS).toISOString();
      const r = decideExtractRun({
        filePath: "src/engines/AwarenessQueryEngine.ts",
        isAutonomous: true,
        cache: {
          entries: { "src/engines/AwarenessQueryEngine.ts": { extracted_at: fresh, contract: {} } },
        },
        nowMs: NOW,
      });
      expect(r.run).toBe(false);
      expect(r.reason).toBe("cache-fresh");
      expect(r.age_ms).toBe(HALF_HOUR_MS);
    });

    it("RUNS when cache entry has bad timestamp", () => {
      const r = decideExtractRun({
        filePath: "src/engines/AwarenessQueryEngine.ts",
        isAutonomous: true,
        cache: {
          entries: { "src/engines/AwarenessQueryEngine.ts": { extracted_at: "garbage", contract: {} } },
        },
        nowMs: NOW,
      });
      expect(r.run).toBe(true);
      expect(r.reason).toBe("cache-bad-timestamp");
    });
  });

  describe("contract guarantees", () => {
    it("never runs on non-engine files even when autonomous + cache-miss", () => {
      const r = decideExtractRun({
        filePath: "README.md",
        isAutonomous: true,
        cache: null,
      });
      expect(r.run).toBe(false);
      expect(r.reason).toBe("not-an-engine-file");
    });

    it("returns ms age when cache hit", () => {
      const fresh = new Date(NOW - FIVE_MIN_MS).toISOString();
      // Engine path must match the PascalCase + Engine.ts convention.
      const path = "src/engines/AwarenessQueryEngine.ts";
      const r = decideExtractRun({
        filePath: path,
        isAutonomous: true,
        cache: { entries: { [path]: { extracted_at: fresh, contract: {} } } },
        nowMs: NOW,
      });
      expect(r.run).toBe(false);
      expect(r.age_ms).toBe(FIVE_MIN_MS);
    });
  });
});
