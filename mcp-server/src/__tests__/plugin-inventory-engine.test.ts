/**
 * Tests for PluginInventoryEngine (Phase 0.17 U-PLG3)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PluginInventoryEngine, pluginInventoryEngine, type PluginEntry } from "../engines/PluginInventoryEngine.js";

function entry(overrides: Partial<PluginEntry> = {}): Omit<PluginEntry, "health"> & { health?: PluginEntry["health"] } {
  return {
    id: overrides.id ?? "p1",
    name: overrides.name ?? "test-plugin",
    kind: overrides.kind ?? "mcp-server",
    version: overrides.version,
    description: overrides.description,
    health: overrides.health,
    lastHealthCheckAt: overrides.lastHealthCheckAt,
    lastUsedAt: overrides.lastUsedAt,
    toolCount: overrides.toolCount,
    tags: overrides.tags,
  };
}

describe("PluginInventoryEngine", () => {
  let e: PluginInventoryEngine;

  beforeEach(() => {
    e = new PluginInventoryEngine();
  });

  describe("register()", () => {
    it("stores a plugin and defaults health to unknown", () => {
      const stored = e.register(entry());
      expect(stored.health).toBe("unknown");
    });

    it("preserves supplied health", () => {
      const stored = e.register(entry({ health: "healthy" }));
      expect(stored.health).toBe("healthy");
    });

    it("lowercases and dedupes tags", () => {
      const stored = e.register(entry({ tags: ["MCP", "mcp", "tool"] }));
      expect(stored.tags?.sort()).toEqual(["mcp", "tool"]);
    });

    it("rejects empty id", () => {
      expect(() => e.register(entry({ id: "" }))).toThrow(/id/);
    });

    it("rejects empty name", () => {
      expect(() => e.register(entry({ name: "" }))).toThrow(/name/);
    });

    it("rejects unknown kind", () => {
      expect(() => e.register(entry({ kind: "alien" as "mcp-server" }))).toThrow(/kind/);
    });

    it("registerAll stores multiple entries", () => {
      e.registerAll([entry({ id: "a" }), entry({ id: "b" })]);
      expect(e.size()).toBe(2);
    });
  });

  describe("listByKind() / listByHealth()", () => {
    beforeEach(() => {
      e.registerAll([
        entry({ id: "a", kind: "mcp-server", health: "healthy" }),
        entry({ id: "b", kind: "agent-plugin", health: "degraded" }),
        entry({ id: "c", kind: "mcp-server", health: "healthy" }),
      ]);
    });

    it("filters by kind", () => {
      expect(e.listByKind("mcp-server").map((p) => p.id).sort()).toEqual(["a", "c"]);
    });

    it("filters by health", () => {
      expect(e.listByHealth("healthy").map((p) => p.id).sort()).toEqual(["a", "c"]);
      expect(e.listByHealth("degraded").map((p) => p.id)).toEqual(["b"]);
    });
  });

  describe("markHealth()", () => {
    it("updates status and stamps timestamp", () => {
      e.register(entry());
      const updated = e.markHealth({ id: "p1", status: "healthy", at: "2026-04-16T00:00:00.000Z" });
      expect(updated?.health).toBe("healthy");
      expect(updated?.lastHealthCheckAt).toBe("2026-04-16T00:00:00.000Z");
    });

    it("returns null for unknown id", () => {
      expect(e.markHealth({ id: "ghost", status: "healthy" })).toBeNull();
    });

    it("rejects unknown status", () => {
      e.register(entry());
      expect(() => e.markHealth({ id: "p1", status: "crashed" as "healthy" })).toThrow(/health/);
    });

    it("uses current ISO timestamp when `at` omitted", () => {
      e.register(entry());
      const updated = e.markHealth({ id: "p1", status: "healthy" });
      expect(updated?.lastHealthCheckAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("markUsed()", () => {
    it("stamps lastUsedAt", () => {
      e.register(entry());
      const updated = e.markUsed("p1", "2026-04-16T00:00:00.000Z");
      expect(updated?.lastUsedAt).toBe("2026-04-16T00:00:00.000Z");
    });

    it("returns null for unknown id", () => {
      expect(e.markUsed("ghost")).toBeNull();
    });
  });

  describe("summary()", () => {
    beforeEach(() => {
      e.registerAll([
        entry({ id: "a", kind: "mcp-server", health: "healthy" }),
        entry({ id: "b", kind: "mcp-server", health: "degraded" }),
        entry({ id: "c", kind: "agent-plugin", health: "unknown" }),
        entry({ id: "d", kind: "extension", health: "unreachable" }),
      ]);
    });

    it("counts total and by-kind", () => {
      const s = e.summary();
      expect(s.total).toBe(4);
      expect(s.byKind["mcp-server"]).toBe(2);
      expect(s.byKind["agent-plugin"]).toBe(1);
      expect(s.byKind["extension"]).toBe(1);
      expect(s.byKind["skill-pack"]).toBe(0);
    });

    it("counts by health", () => {
      const s = e.summary();
      expect(s.byHealth.healthy).toBe(1);
      expect(s.byHealth.degraded).toBe(1);
      expect(s.byHealth.unreachable).toBe(1);
      expect(s.byHealth.unknown).toBe(1);
    });

    it("ranks recentlyUsed by lastUsedAt descending, cap 5", () => {
      e.markUsed("a", "2026-04-16T01:00:00.000Z");
      e.markUsed("b", "2026-04-16T02:00:00.000Z");
      e.markUsed("c", "2026-04-16T03:00:00.000Z");
      const s = e.summary();
      expect(s.recentlyUsed.map((p) => p.id)).toEqual(["c", "b", "a"]);
    });

    it("handles empty inventory", () => {
      const empty = new PluginInventoryEngine();
      const s = empty.summary();
      expect(s.total).toBe(0);
      expect(s.recentlyUsed).toEqual([]);
    });
  });

  describe("lifecycle helpers", () => {
    it("unregister returns true when plugin existed", () => {
      e.register(entry());
      expect(e.unregister("p1")).toBe(true);
      expect(e.unregister("p1")).toBe(false);
    });

    it("clear empties the inventory", () => {
      e.registerAll([entry({ id: "a" }), entry({ id: "b" })]);
      e.clear();
      expect(e.size()).toBe(0);
    });

    it("get returns null for unknown id", () => {
      expect(e.get("nope")).toBeNull();
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      pluginInventoryEngine.clear();
      pluginInventoryEngine.register(entry({ id: "singleton" }));
      expect(pluginInventoryEngine.size()).toBe(1);
      pluginInventoryEngine.clear();
    });
  });
});
