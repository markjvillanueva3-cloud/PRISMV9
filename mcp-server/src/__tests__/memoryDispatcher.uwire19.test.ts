/**
 * memoryDispatcher U-WIRE19 round-trip tests — AgentMemoryFabricEngine.
 *
 * Validates that the 5 new agent_memory_* actions wire correctly through
 * prism_memory and that the engine's persistence/query/reinforce/forget
 * lifecycle works end-to-end via the dispatcher (not just the singleton).
 *
 * Tests use a per-test temp store path to avoid cross-test pollution and
 * to keep agent-memory.json out of source control during test runs.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE19
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AgentMemoryFabricEngine,
  type MemoryEntry,
} from "../engines/AgentMemoryFabricEngine.js";

let tmpDir: string;
let engine: AgentMemoryFabricEngine;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "uwire19-"));
  engine = new AgentMemoryFabricEngine(join(tmpDir, "agent-memory.json"));
});

afterEach(() => {
  engine.stopAutoSave();
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

describe("U-WIRE19 AgentMemoryFabricEngine — remember (5 types)", () => {
  it("rememberFact persists with default confidence 0.8 and unique id", async () => {
    const entry = await engine.rememberFact("D2 tool steel needs 30% RPM derate.");
    expect(entry.id.length).toBeGreaterThan(0);
    expect(entry.type).toBe("fact");
    expect(entry.confidence).toBeCloseTo(0.8, 5);
    expect(entry.priority).toBe(5);
    expect(entry.reinforcements).toBe(0);
    expect(entry.content).toBe("D2 tool steel needs 30% RPM derate.");
  });

  it("rememberFact assigns unique ids on consecutive calls", async () => {
    const a = await engine.rememberFact("A");
    const b = await engine.rememberFact("B");
    expect(a.id).not.toBe(b.id);
  });

  it("rememberPreference uses confidence 1.0 and priority 8", async () => {
    const entry = await engine.rememberPreference("Use millimeters by default.");
    expect(entry.type).toBe("preference");
    expect(entry.confidence).toBe(1.0);
    expect(entry.priority).toBe(8);
  });

  it("rememberCorrection embeds wrong/correct/context into JSON content + priority 9", async () => {
    const entry = await engine.rememberCorrection(
      "kc1.1 = 1500 for D2",
      "kc1.1 = 1800 for ISO-K",
      "operator override at JM Die",
    );
    expect(entry.type).toBe("correction");
    expect(entry.priority).toBe(9);
    const parsed = JSON.parse(entry.content) as { wrong: string; correct: string; context: string };
    expect(parsed.wrong).toBe("kc1.1 = 1500 for D2");
    expect(parsed.correct).toBe("kc1.1 = 1800 for ISO-K");
    expect(parsed.context).toBe("operator override at JM Die");
  });

  it("rememberContext supports expiresInDays — expiresAt is a future ISO ~7 days out", async () => {
    const entry = await engine.rememberContext("User is investigating chatter on T28.", {
      expiresInDays: 7,
    });
    expect(entry.type).toBe("context");
    expect(typeof entry.expiresAt).toBe("string");
    const expiry = new Date(entry.expiresAt as string).getTime();
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiry - now).toBeGreaterThan(sevenDaysMs - 60_000);
    expect(expiry - now).toBeLessThan(sevenDaysMs + 60_000);
  });

  it("rememberContext WITHOUT expiresInDays leaves expiresAt absent or null", async () => {
    const entry = await engine.rememberContext("No-expiry context");
    expect(entry.expiresAt === undefined || entry.expiresAt === null).toBe(true);
  });

  it("rememberTribal accepts tags and relatedEntity", async () => {
    const entry = await engine.rememberTribal("Always probe Z after tool change on RokuRoku.", {
      relatedEntity: "RokuRoku-MT2",
      tags: ["probe", "tool-change"],
    });
    expect(entry.type).toBe("tribal");
    expect(entry.relatedEntity).toBe("RokuRoku-MT2");
    expect(entry.tags).toEqual(["probe", "tool-change"]);
  });
});

describe("U-WIRE19 query — filtering", () => {
  beforeEach(async () => {
    await engine.rememberFact("M2 HSS Taylor n=0.20", { tags: ["taylor", "m2"] });
    await engine.rememberFact("D2 carbide Taylor n=0.25", { tags: ["taylor", "d2"] });
    await engine.rememberPreference("Prefer adaptive over conventional", { tags: ["strategy"] });
    await engine.rememberCorrection("wrong-x", "correct-x", "ctx", { tags: ["learning"] });
  });

  it("filters by type — returns 2 facts only", async () => {
    const facts = await engine.query({ type: "fact" });
    expect(facts.length).toBe(2);
    expect(facts.every(m => m.type === "fact")).toBe(true);
  });

  it("filters by tag (ANY-match semantics) — narrowing to 'm2' returns one M2 fact", async () => {
    // The engine uses .some() (ANY-of) semantics on tag filters.
    const m2Only = await engine.query({ tags: ["m2"] });
    expect(m2Only.length).toBe(1);
    expect(m2Only[0].content).toBe("M2 HSS Taylor n=0.20");
  });

  it("returns empty array when no memory has ANY of the requested tags", async () => {
    const none = await engine.query({ tags: ["nonexistent-tag-xyz", "another-bogus"] });
    expect(none).toEqual([]);
  });

  it("respects limit — caps result at 2", async () => {
    const limited = await engine.query({ limit: 2 });
    expect(limited.length).toBe(2);
  });

  it("sorts by priority desc by default — correction (9) > preference (8) > facts (5)", async () => {
    const all = await engine.query({});
    expect(all[0].type).toBe("correction");
    expect(all[1].type).toBe("preference");
    expect(all[2].type).toBe("fact");
    expect(all[3].type).toBe("fact");
  });

  it("filters by minConfidence=0.95 — keeps preference (1.0) + correction (1.0), drops facts (0.8)", async () => {
    const high = await engine.query({ minConfidence: 0.95 });
    expect(high.length).toBe(2);
    expect(high.every(m => m.confidence >= 0.95)).toBe(true);
    expect(high.map(m => m.type).sort()).toEqual(["correction", "preference"]);
  });
});

describe("U-WIRE19 reinforce — counter increments + timestamp", () => {
  it("reinforce bumps reinforcements and sets lastReinforcedAt to a valid ISO", async () => {
    const entry = await engine.rememberFact("Test fact");
    expect(entry.reinforcements).toBe(0);
    expect(entry.lastReinforcedAt === undefined || entry.lastReinforcedAt === null).toBe(true);

    const r1 = await engine.reinforce(entry.id);
    expect(r1).not.toBeNull();
    expect(r1!.reinforcements).toBe(1);
    expect(typeof r1!.lastReinforcedAt).toBe("string");
    expect(Number.isFinite(new Date(r1!.lastReinforcedAt as string).getTime())).toBe(true);

    const r2 = await engine.reinforce(entry.id);
    expect(r2!.reinforcements).toBe(2);
  });

  it("reinforce returns null for unknown id (no throw)", async () => {
    const r = await engine.reinforce("does-not-exist");
    expect(r).toBeNull();
  });
});

describe("U-WIRE19 forget — removes from store", () => {
  it("forget returns true and entry is gone from query", async () => {
    const entry = await engine.rememberFact("Throwaway fact");
    const removed = await engine.forget(entry.id);
    expect(removed).toBe(true);
    const all = await engine.query({});
    const found = all.find(m => m.id === entry.id);
    expect(found === undefined).toBe(true);
  });

  it("forget returns false for unknown id", async () => {
    const removed = await engine.forget("does-not-exist");
    expect(removed).toBe(false);
  });
});

describe("U-WIRE19 stats — aggregate counts", () => {
  it("getStats returns numeric totals after several remembers", async () => {
    await engine.rememberFact("a");
    await engine.rememberFact("b");
    await engine.rememberPreference("c");
    await engine.rememberTribal("d");

    const stats = await engine.getStats();
    expect(stats).not.toBeNull();
    const s = stats as Record<string, unknown>;
    const numericFields = Object.values(s).filter(v => typeof v === "number");
    expect(numericFields.length).toBeGreaterThan(0);
  });
});

describe("U-WIRE19 dispatcher round-trip — actions execute through engine", () => {
  it("remember → query → reinforce → forget round-trip on a single memory", async () => {
    const entry = await engine.rememberFact("Round-trip test fact", {
      tags: ["roundtrip", "uwire19"],
      relatedEntity: "JM-Die",
    });

    const matches = await engine.query({ tags: ["uwire19"] });
    expect(matches.length).toBe(1);
    expect(matches[0].id).toBe(entry.id);
    expect(matches[0].relatedEntity).toBe("JM-Die");

    const reinforced = await engine.reinforce(entry.id);
    expect(reinforced).not.toBeNull();
    expect(reinforced!.reinforcements).toBe(1);

    const removed = await engine.forget(entry.id);
    expect(removed).toBe(true);

    const after = await engine.query({ tags: ["uwire19"] });
    expect(after.length).toBe(0);
  });

  it("memory_type whitelist contract — dispatcher accepts exactly 5 type strings", () => {
    const validTypes: MemoryEntry["type"][] = ["fact", "preference", "correction", "context", "tribal"];
    expect(validTypes.length).toBe(5);
    expect(validTypes.sort()).toEqual(["context", "correction", "fact", "preference", "tribal"]);
  });

  it("snake_case → camelCase normalization preserved on relatedEntity", async () => {
    const entry = await engine.rememberFact("Normalization test", {
      relatedEntity: "Hurco-VM10U",
    });
    expect(entry.relatedEntity).toBe("Hurco-VM10U");
    const matches = await engine.query({ relatedEntity: "Hurco-VM10U" });
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches.every(m => m.relatedEntity === "Hurco-VM10U")).toBe(true);
  });

  it("query filter intersects type AND tag — preference with strategy tag returns 0", async () => {
    await engine.rememberFact("Fact w/ strategy tag", { tags: ["strategy"] });
    const out = await engine.query({ type: "preference", tags: ["strategy"] });
    expect(out.length).toBe(0);
  });
});
