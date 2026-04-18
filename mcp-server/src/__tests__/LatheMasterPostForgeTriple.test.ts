/**
 * LatheMasterPostForgeTriple Tests
 *
 * U-LTH32: Tests for Forge-Triple components:
 *   - Hook: masterpost-unknown-machine-guard
 *   - Dispatcher: latheMasterPostDispatcher
 *   - (Skill: /lathe-masterpost - defined in commands/)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  masterPostUnknownMachineGuardHook,
  type MasterPostHookContext,
} from "../hooks/MasterPostUnknownMachineGuardHook.js";
import {
  dispatchLatheMasterPost,
  LatheMasterPostAction,
  LATHE_MASTERPOST_DISPATCHER_ACTIONS,
} from "../dispatchers/latheMasterPostDispatcher.js";
import type { MasterPostRouteRequest } from "../engines/LatheMasterPostRouterEngine.js";

describe("MasterPostUnknownMachineGuardHook", () => {
  beforeEach(() => {
    masterPostUnknownMachineGuardHook.clearLog();
  });

  const createContext = (machineId: string): MasterPostHookContext => ({
    request: {
      machine_id: machineId,
      operation: "turning",
      moves: [{ type: "rapid", x: 100, z: 5 }],
      tool_number: 1,
      spindle_rpm: 1500,
      feed_rate_mmmin: 200,
    },
    timestamp: new Date().toISOString(),
  });

  describe("execute()", () => {
    it("allows known machine", () => {
      const context = createContext("LTH-01");

      const result = masterPostUnknownMachineGuardHook.execute(context);

      expect(result.action).toBe("allow");
      expect(result.reason).toContain("found in registry");
    });

    it("redirects unknown machine to generator", () => {
      const context = createContext("UNKNOWN-99");

      const result = masterPostUnknownMachineGuardHook.execute(context);

      expect(result.action).toBe("redirect");
      expect(result.redirect_to).toBe("LathePostGeneratorEngine");
      expect(result.metadata?.fallback_post).toBe("generic_turning");
    });

    it("logs unknown machine encounters", () => {
      const context = createContext("MYSTERY-MACHINE");

      masterPostUnknownMachineGuardHook.execute(context);

      const log = masterPostUnknownMachineGuardHook.getUnknownMachineLog();
      expect(log.length).toBe(1);
      expect(log[0].machine_id).toBe("MYSTERY-MACHINE");
      expect(log[0].resolved).toBe(false);
    });
  });

  describe("shouldTrigger()", () => {
    it("triggers for requests with machine_id", () => {
      const request: MasterPostRouteRequest = {
        machine_id: "LTH-01",
        operation: "turning",
        moves: [],
        tool_number: 1,
        spindle_rpm: 1500,
        feed_rate_mmmin: 200,
      };

      expect(masterPostUnknownMachineGuardHook.shouldTrigger(request)).toBe(true);
    });
  });

  describe("getMetadata()", () => {
    it("returns hook metadata", () => {
      const metadata = masterPostUnknownMachineGuardHook.getMetadata();

      expect(metadata.id).toBe("masterpost-unknown-machine-guard");
      expect(metadata.trigger_point).toBe("pre_route");
      expect(metadata.priority).toBe(100);
    });
  });

  describe("Unknown Machine Log", () => {
    it("tracks multiple unknown machines", () => {
      masterPostUnknownMachineGuardHook.execute(createContext("UNKNOWN-1"));
      masterPostUnknownMachineGuardHook.execute(createContext("UNKNOWN-2"));
      masterPostUnknownMachineGuardHook.execute(createContext("UNKNOWN-1"));

      const log = masterPostUnknownMachineGuardHook.getUnknownMachineLog();
      expect(log.length).toBe(3);
    });

    it("marks machines as resolved", () => {
      masterPostUnknownMachineGuardHook.execute(createContext("TO-RESOLVE"));
      masterPostUnknownMachineGuardHook.execute(createContext("TO-RESOLVE"));

      const count = masterPostUnknownMachineGuardHook.markResolved("TO-RESOLVE");

      expect(count).toBe(2);
      const log = masterPostUnknownMachineGuardHook.getUnknownMachineLog();
      expect(log.every(e => e.resolved)).toBe(true);
    });

    it("clears log", () => {
      masterPostUnknownMachineGuardHook.execute(createContext("UNKNOWN"));

      masterPostUnknownMachineGuardHook.clearLog();

      expect(masterPostUnknownMachineGuardHook.getUnknownMachineLog().length).toBe(0);
    });
  });

  describe("getStatistics()", () => {
    it("returns statistics about unknown machines", () => {
      masterPostUnknownMachineGuardHook.execute(createContext("A"));
      masterPostUnknownMachineGuardHook.execute(createContext("A"));
      masterPostUnknownMachineGuardHook.execute(createContext("B"));

      const stats = masterPostUnknownMachineGuardHook.getStatistics();

      expect(stats.total_unknown_encounters).toBe(3);
      expect(stats.unique_unknown_machines).toBe(2);
      expect(stats.most_common_unknown).toBe("A");
      expect(stats.unresolved_count).toBe(3);
    });
  });
});

describe("latheMasterPostDispatcher", () => {
  const createRouteParams = () => ({
    machine_id: "LTH-01",
    operation: "turning",
    program_name: "TEST",
    program_number: 1001,
    moves: [
      { type: "rapid", x: 100, z: 5 },
      { type: "linear", x: 50, z: 0, feed: 200 },
    ],
    tool_number: 1,
    spindle_rpm: 1500,
    feed_rate_mmmin: 200,
  });

  describe("dispatchLatheMasterPost()", () => {
    it("dispatches masterpost_route action", async () => {
      const result = await dispatchLatheMasterPost(
        "masterpost_route",
        createRouteParams()
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe("masterpost_route");
      expect(result.data).toBeDefined();
    });

    it("dispatches masterpost_emit action", async () => {
      const result = await dispatchLatheMasterPost(
        "masterpost_emit",
        createRouteParams()
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe("masterpost_emit");
    });

    it("dispatches masterpost_validate action", async () => {
      const result = await dispatchLatheMasterPost(
        "masterpost_validate",
        { gcode: "O1001\nG28 U0 W0\nM30" }
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe("masterpost_validate");
    });

    it("dispatches masterpost_audit action", async () => {
      const result = await dispatchLatheMasterPost(
        "masterpost_audit",
        { scope: "full" }
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe("masterpost_audit");
    });

    it("dispatches masterpost_regression action", async () => {
      const result = await dispatchLatheMasterPost(
        "masterpost_regression",
        { machines: ["LTH-01"] }
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe("masterpost_regression");
    });

    it("dispatches masterpost_full action", async () => {
      const result = await dispatchLatheMasterPost(
        "masterpost_full",
        createRouteParams()
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe("masterpost_full");
      const data = result.data as Record<string, unknown>;
      expect(data.route_result).toBeDefined();
      expect(data.emit_result).toBeDefined();
      expect(data.validate_result).toBeDefined();
      expect(data.explain_result).toBeDefined();
    });

    it("tracks execution time", async () => {
      const result = await dispatchLatheMasterPost(
        "masterpost_route",
        createRouteParams()
      );

      expect(result.execution_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("handles errors gracefully", async () => {
      const result = await dispatchLatheMasterPost(
        "masterpost_validate",
        {} // Missing required gcode
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("handles unknown action", async () => {
      const result = await dispatchLatheMasterPost(
        "unknown_action" as any,
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown action");
    });
  });

  describe("masterpost_cross_check action", () => {
    it("dispatches cross-check with candidates", async () => {
      const result = await dispatchLatheMasterPost(
        "masterpost_cross_check",
        {
          route_request: createRouteParams(),
          candidate_posts: ["okuma_turning", "fanuc_turning"],
        }
      );

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.posts_executed).toBeDefined();
    });
  });

  describe("LatheMasterPostAction enum", () => {
    it("includes all 8 actions", () => {
      const actions = LatheMasterPostAction.options;

      expect(actions).toContain("masterpost_full");
      expect(actions).toContain("masterpost_route");
      expect(actions).toContain("masterpost_emit");
      expect(actions).toContain("masterpost_validate");
      expect(actions).toContain("masterpost_explain");
      expect(actions).toContain("masterpost_cross_check");
      expect(actions).toContain("masterpost_audit");
      expect(actions).toContain("masterpost_regression");
    });
  });

  describe("LATHE_MASTERPOST_DISPATCHER_ACTIONS", () => {
    it("defines all action schemas", () => {
      const actions = Object.keys(LATHE_MASTERPOST_DISPATCHER_ACTIONS);

      expect(actions.length).toBe(8);
      for (const action of actions) {
        const def = LATHE_MASTERPOST_DISPATCHER_ACTIONS[action as keyof typeof LATHE_MASTERPOST_DISPATCHER_ACTIONS];
        expect(def.description.length).toBeGreaterThan(0);
        expect(def.schema).toBeDefined();
      }
    });
  });
});

describe("Forge-Triple Integration", () => {
  it("hook integrates with dispatcher", async () => {
    // Unknown machine should trigger hook redirect
    const result = await dispatchLatheMasterPost(
      "masterpost_route",
      {
        machine_id: "FORGE-TEST-UNKNOWN",
        operation: "turning",
        moves: [{ type: "rapid", x: 100, z: 5 }],
        tool_number: 1,
        spindle_rpm: 1500,
        feed_rate_mmmin: 200,
      }
    );

    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.redirected).toBe(true);
    expect(data.redirect_to).toBe("LathePostGeneratorEngine");
  });

  it("known machine flows through normally", async () => {
    const result = await dispatchLatheMasterPost(
      "masterpost_route",
      {
        machine_id: "LTH-01",
        operation: "turning",
        moves: [{ type: "rapid", x: 100, z: 5 }],
        tool_number: 1,
        spindle_rpm: 1500,
        feed_rate_mmmin: 200,
      }
    );

    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.redirected).toBeUndefined();
    expect(data.success).toBe(true);
  });

  it("full flow works end-to-end", async () => {
    const result = await dispatchLatheMasterPost(
      "masterpost_full",
      {
        machine_id: "LTH-01",
        operation: "turning",
        program_name: "E2E_TEST",
        program_number: 9999,
        moves: [
          { type: "rapid", x: 100, z: 5 },
          { type: "linear", x: 50, z: 0, feed: 200 },
          { type: "linear", x: 50, z: -30, feed: 180 },
        ],
        tool_number: 1,
        spindle_rpm: 1500,
        feed_rate_mmmin: 200,
      }
    );

    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;

    // Check all four results present
    expect(data.route_result).toBeDefined();
    expect(data.emit_result).toBeDefined();
    expect(data.validate_result).toBeDefined();
    expect(data.explain_result).toBeDefined();

    // Check route success
    const routeResult = data.route_result as Record<string, unknown>;
    expect(routeResult.success).toBe(true);

    // Check G-code generated
    const emitResult = data.emit_result as Record<string, unknown>;
    expect((emitResult.gcode as string).length).toBeGreaterThan(100);

    // Check explanation has steps
    const explainResult = data.explain_result as Record<string, unknown>;
    expect((explainResult.steps as unknown[]).length).toBeGreaterThanOrEqual(4);
  });
});
