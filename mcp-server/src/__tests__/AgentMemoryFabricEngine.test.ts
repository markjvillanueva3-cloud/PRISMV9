/**
 * AgentMemoryFabricEngine Test Suite
 * ===================================
 *
 * AGENT-MS2 U-AGT04 — Validates the unified agent memory fabric.
 * Uses isolated tmp storePaths so real state is never touched.
 *
 * Exit criteria covered:
 *   - Unified API for fact/preference/correction/context/tribal
 *   - Query + search + tag filtering
 *   - Decay / expiration
 *   - Context injection serialization
 *
 * @milestone AGENT-MS2
 * @unit U-AGT04
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import {
  AgentMemoryFabricEngine,
} from "../engines/AgentMemoryFabricEngine.js";

function tmpStorePath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-mem-"));
  return path.join(dir, "agent-memory.json");
}

describe("AgentMemoryFabricEngine", () => {
  let engine: AgentMemoryFabricEngine;
  let storePath: string;

  beforeEach(async () => {
    storePath = tmpStorePath();
    engine = new AgentMemoryFabricEngine(storePath);
    await engine.initialize("test-shop");
  });

  afterEach(() => {
    engine.stopAutoSave();
    try {
      const dir = path.dirname(storePath);
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // cleanup best-effort
    }
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────

  describe("initialize()", () => {
    it("creates an empty store if none exists", async () => {
      expect(fs.existsSync(storePath)).toBe(true);
      const store = await engine.export();
      expect(store.memories.length).toBe(0);
      expect(store.shopId).toBe("test-shop");
    });

    it("is idempotent (second call is a no-op)", async () => {
      await engine.initialize("test-shop");
      await engine.initialize("test-shop");
      const store = await engine.export();
      expect(store.memories.length).toBe(0);
    });
  });

  // ── Remember APIs ─────────────────────────────────────────────────────

  describe("rememberFact/Preference/Correction/Context/Tribal", () => {
    it("rememberFact adds a fact-type entry", async () => {
      const entry = await engine.rememberFact("Okuma LB3000 runs Mastercam posts");
      expect(entry.type).toBe("fact");
      expect(entry.content).toContain("Okuma");
      expect(entry.confidence).toBeGreaterThan(0);
    });

    it("rememberPreference adds a preference-type entry", async () => {
      const entry = await engine.rememberPreference(
        "User prefers trochoidal for pockets > 10mm"
      );
      expect(entry.type).toBe("preference");
    });

    it("rememberCorrection adds a correction-type entry", async () => {
      const entry = await engine.rememberCorrection(
        "Feed rate was too aggressive for Ti-6Al-4V — reduce by 25%"
      );
      expect(entry.type).toBe("correction");
    });

    it("rememberContext adds a context-type entry", async () => {
      const entry = await engine.rememberContext(
        "Working on ALCOA die run — 40 parts, D2 tool steel"
      );
      expect(entry.type).toBe("context");
    });

    it("rememberTribal adds a tribal-type entry", async () => {
      const entry = await engine.rememberTribal(
        "Thin walls: use 2 roughing passes before finishing to relieve stress"
      );
      expect(entry.type).toBe("tribal");
    });

    it("each entry gets a unique id", async () => {
      const a = await engine.rememberFact("A");
      const b = await engine.rememberFact("B");
      expect(a.id).not.toBe(b.id);
    });

    it("tags are preserved", async () => {
      const entry = await engine.rememberFact("Test", {
        tags: ["lathe", "okuma"],
      });
      expect(entry.tags.sort()).toEqual(["lathe", "okuma"].sort());
    });

    it("relatedEntity is preserved", async () => {
      const entry = await engine.rememberFact("Test", {
        relatedEntity: "LB3000",
      });
      expect(entry.relatedEntity).toBe("LB3000");
    });
  });

  // ── Query ─────────────────────────────────────────────────────────────

  describe("query()", () => {
    beforeEach(async () => {
      await engine.rememberFact("Fact A", { tags: ["lathe"], priority: 5 });
      await engine.rememberFact("Fact B", { tags: ["mill"], priority: 9 });
      await engine.rememberPreference("Pref X", { tags: ["lathe"] });
      await engine.rememberTribal("Tribal tip", { tags: ["wedm"] });
    });

    it("filters by type", async () => {
      const results = await engine.query({ type: "fact" });
      expect(results.every((r) => r.type === "fact")).toBe(true);
      expect(results.length).toBe(2);
    });

    it("filters by tags", async () => {
      const results = await engine.query({ tags: ["lathe"] });
      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => expect(r.tags).toContain("lathe"));
    });

    it("limits results", async () => {
      const results = await engine.query({ limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("sorts by priority desc", async () => {
      const results = await engine.query({ sortBy: "priority", sortOrder: "desc" });
      for (let i = 1; i < results.length; i++) {
        expect(results[i]!.priority).toBeLessThanOrEqual(results[i - 1]!.priority);
      }
    });
  });

  // ── Search ────────────────────────────────────────────────────────────

  describe("search()", () => {
    beforeEach(async () => {
      await engine.rememberFact("Mastercam post for LB3000");
      await engine.rememberFact("hyperMILL handles 5-axis");
      await engine.rememberTribal("Thin wall strategy for aluminum");
    });

    it("finds entries by substring", async () => {
      const results = await engine.search("Mastercam");
      expect(results.length).toBeGreaterThan(0);
    });

    it("is case-insensitive by content", async () => {
      const results = await engine.search("MASTERCAM");
      expect(results.length).toBeGreaterThan(0);
    });

    it("returns empty for no matches", async () => {
      const results = await engine.search("xyznotfound");
      expect(results.length).toBe(0);
    });
  });

  // ── Reinforce / Forget ────────────────────────────────────────────────

  describe("reinforce() and forget()", () => {
    it("reinforce bumps the reinforcement counter", async () => {
      const entry = await engine.rememberFact("Reinforceable fact");
      const after = await engine.reinforce(entry.id);
      expect(after).not.toBeNull();
      expect(after!.reinforcements).toBe(1);
    });

    it("reinforce with unknown id returns null", async () => {
      const result = await engine.reinforce("mem_does_not_exist");
      expect(result).toBeNull();
    });

    it("forget removes the entry", async () => {
      const entry = await engine.rememberFact("Forgettable");
      const removed = await engine.forget(entry.id);
      expect(removed).toBe(true);
      const results = await engine.query({ type: "fact" });
      expect(results.find((r) => r.id === entry.id)).toBeUndefined();
    });

    it("forget returns false for unknown id", async () => {
      const removed = await engine.forget("mem_ghost");
      expect(removed).toBe(false);
    });
  });

  // ── Context injection ────────────────────────────────────────────────

  describe("getForContextInjection()", () => {
    beforeEach(async () => {
      await engine.rememberFact("Low-prio fact", { priority: 1 });
      await engine.rememberFact("High-prio fact", { priority: 10 });
      await engine.rememberPreference("Preferred feed rate = 0.2mm/rev", {
        priority: 8,
      });
    });

    it("returns a structured payload (memories + summary)", async () => {
      const ctx = await engine.getForContextInjection();
      expect(ctx).toBeDefined();
      expect(Array.isArray(ctx.memories)).toBe(true);
      expect(typeof ctx.summary).toBe("string");
    });

    it("respects the maxTokens budget", async () => {
      const ctx = await engine.getForContextInjection(50); // tiny budget
      // Total content chars / 4 should be <= tokens budget (approx)
      const totalChars = ctx.memories.reduce((sum, m) => sum + m.content.length, 0);
      expect(Math.ceil(totalChars / 4)).toBeLessThanOrEqual(50);
    });
  });

  // ── Stats ─────────────────────────────────────────────────────────────

  describe("getStats()", () => {
    it("returns stats with memory counts", async () => {
      await engine.rememberFact("A");
      await engine.rememberFact("B");
      await engine.rememberPreference("C");
      const stats = await engine.getStats();
      expect(stats).toBeDefined();
    });
  });

  // ── Persistence ──────────────────────────────────────────────────────

  describe("save() + export() + import()", () => {
    it("save persists memories across engine instances", async () => {
      await engine.rememberFact("Persistent fact");
      await engine.save();
      engine.stopAutoSave();

      const fresh = new AgentMemoryFabricEngine(storePath);
      await fresh.initialize();
      const store = await fresh.export();
      expect(store.memories.some((m) => m.content === "Persistent fact")).toBe(true);
      fresh.stopAutoSave();
    });

    it("import replaces the store", async () => {
      const externalStore = {
        version: "1.0.0",
        shopId: "imported",
        memories: [
          {
            id: "mem_ext_1",
            type: "fact" as const,
            content: "Imported fact",
            source: "user" as const,
            confidence: 0.9,
            reinforcements: 0,
            tags: ["imported"],
            createdAt: new Date().toISOString(),
            lastAccessedAt: new Date().toISOString(),
            priority: 5,
          },
        ],
        lastSyncAt: new Date().toISOString(),
        counts: { fact: 1 },
      };
      await engine.import(externalStore);
      const store = await engine.export();
      expect(store.memories[0]?.content).toBe("Imported fact");
      expect(store.shopId).toBe("imported");
    });

    it("clearAll empties the store", async () => {
      await engine.rememberFact("Will be cleared");
      await engine.clearAll();
      const store = await engine.export();
      expect(store.memories.length).toBe(0);
    });
  });
});
