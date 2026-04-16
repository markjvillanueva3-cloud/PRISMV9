/**
 * Tests for HookOrchestratorEngine (Phase 0.16 U-OP2)
 */

import { describe, it, expect } from "vitest";
import {
  HookOrchestratorEngine,
  hookOrchestratorEngine,
  type HookDefinition,
} from "../engines/HookOrchestratorEngine.js";

function hook(id: string, overrides: Partial<HookDefinition> = {}): HookDefinition {
  return {
    id,
    phase: overrides.phase ?? "PreTool",
    priority: overrides.priority ?? 100,
    dependsOn: overrides.dependsOn,
    mutex: overrides.mutex,
    handler: overrides.handler ?? (() => ({})),
  };
}

describe("HookOrchestratorEngine", () => {
  describe("register() / unregister() / list()", () => {
    it("registers a new hook", () => {
      const e = new HookOrchestratorEngine();
      e.register(hook("a"));
      expect(e.list().map((h) => h.id)).toEqual(["a"]);
    });

    it("rejects duplicate ids", () => {
      const e = new HookOrchestratorEngine();
      e.register(hook("a"));
      expect(() => e.register(hook("a"))).toThrow(/already registered/);
    });

    it("rejects hooks with empty id", () => {
      const e = new HookOrchestratorEngine();
      expect(() => e.register(hook(""))).toThrow(/id required/);
    });

    it("rejects non-finite priority", () => {
      const e = new HookOrchestratorEngine();
      expect(() => e.register(hook("a", { priority: NaN }))).toThrow(/priority/);
    });

    it("rejects non-function handler", () => {
      const e = new HookOrchestratorEngine();
      expect(() =>
        e.register({ id: "a", phase: "PreTool", priority: 1, handler: "not a function" as unknown as () => { block: boolean } })
      ).toThrow(/handler/);
    });

    it("unregister returns true when hook existed", () => {
      const e = new HookOrchestratorEngine();
      e.register(hook("a"));
      expect(e.unregister("a")).toBe(true);
      expect(e.unregister("a")).toBe(false);
    });
  });

  describe("plan() — ordering", () => {
    it("orders by priority within a phase", () => {
      const e = new HookOrchestratorEngine();
      e.register(hook("a", { priority: 200 }));
      e.register(hook("b", { priority: 100 }));
      e.register(hook("c", { priority: 300 }));
      expect(e.plan("PreTool").order).toEqual(["b", "a", "c"]);
    });

    it("breaks ties by id ascending", () => {
      const e = new HookOrchestratorEngine();
      e.register(hook("z", { priority: 100 }));
      e.register(hook("a", { priority: 100 }));
      expect(e.plan("PreTool").order).toEqual(["a", "z"]);
    });

    it("filters by phase", () => {
      const e = new HookOrchestratorEngine();
      e.register(hook("a", { phase: "PreTool" }));
      e.register(hook("b", { phase: "PostTool" }));
      expect(e.plan("PreTool").order).toEqual(["a"]);
      expect(e.plan("PostTool").order).toEqual(["b"]);
    });

    it("honors dependsOn", () => {
      const e = new HookOrchestratorEngine();
      e.register(hook("a", { priority: 100, dependsOn: ["b"] }));
      e.register(hook("b", { priority: 200 }));
      expect(e.plan("PreTool").order).toEqual(["b", "a"]);
    });

    it("throws on unknown dependency", () => {
      const e = new HookOrchestratorEngine();
      e.register(hook("a", { dependsOn: ["ghost"] }));
      expect(() => e.plan("PreTool")).toThrow(/unknown hook ghost/);
    });

    it("throws on dependency cycle", () => {
      const e = new HookOrchestratorEngine();
      e.register(hook("a", { dependsOn: ["b"] }));
      e.register(hook("b", { dependsOn: ["a"] }));
      expect(() => e.plan("PreTool")).toThrow(/cycle/);
    });
  });

  describe("plan() — mutex diagnostics", () => {
    it("reports co-scheduled mutex hooks", () => {
      const e = new HookOrchestratorEngine();
      e.register(hook("a", { mutex: ["b"] }));
      e.register(hook("b"));
      const p = e.plan("PreTool");
      expect(p.diagnostics.join(" ")).toContain("mutex conflict");
    });

    it("does not report mutex conflict when partner is not in the phase", () => {
      const e = new HookOrchestratorEngine();
      e.register(hook("a", { phase: "PreTool", mutex: ["b"] }));
      e.register(hook("b", { phase: "PostTool" }));
      expect(e.plan("PreTool").diagnostics).toEqual([]);
    });
  });

  describe("run() — execution", () => {
    it("runs hooks in planned order and collects decisions", async () => {
      const e = new HookOrchestratorEngine();
      const calls: string[] = [];
      e.register(hook("a", { priority: 200, handler: () => { calls.push("a"); return {}; } }));
      e.register(hook("b", { priority: 100, handler: () => { calls.push("b"); return {}; } }));
      const r = await e.run("PreTool", { tool: "Write" });
      expect(r.order).toEqual(["b", "a"]);
      expect(calls).toEqual(["b", "a"]);
      expect(r.executed).toHaveLength(2);
      expect(r.blockedBy).toBeNull();
    });

    it("short-circuits on the first blocking decision", async () => {
      const e = new HookOrchestratorEngine();
      const calls: string[] = [];
      e.register(hook("a", { priority: 100, handler: () => { calls.push("a"); return { block: true, reason: "stop" }; } }));
      e.register(hook("b", { priority: 200, handler: () => { calls.push("b"); return {}; } }));
      const r = await e.run("PreTool", {});
      expect(calls).toEqual(["a"]);
      expect(r.blockedBy).toBe("a");
      expect(r.executed[0].decision.reason).toBe("stop");
    });

    it("supports async handlers", async () => {
      const e = new HookOrchestratorEngine();
      e.register(
        hook("a", {
          handler: async () => {
            await new Promise((r) => setTimeout(r, 1));
            return { data: 42 };
          },
        })
      );
      const r = await e.run("PreTool", {});
      expect(r.executed[0].decision.data).toBe(42);
    });

    it("measures duration per hook", async () => {
      const e = new HookOrchestratorEngine();
      e.register(hook("a", { handler: () => ({}) }));
      const r = await e.run("PreTool", {});
      expect(r.executed[0].durationMs).toBeGreaterThanOrEqual(0);
    });

    it("passes phase + tool + correlationId into handlers", async () => {
      const e = new HookOrchestratorEngine();
      let seen: unknown = null;
      e.register(hook("a", { handler: (ctx) => { seen = ctx; return {}; } }));
      await e.run("PreTool", { tool: "Edit", correlationId: "corr-1" });
      expect(seen).toMatchObject({ phase: "PreTool", tool: "Edit", correlationId: "corr-1" });
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      // Each test can register fresh; the singleton persists across but we only inspect it
      expect(hookOrchestratorEngine).toBeInstanceOf(HookOrchestratorEngine);
    });
  });
});
