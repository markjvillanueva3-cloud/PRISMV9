/**
 * LatheMasterPostRouterEngine Tests — LATHE-MASTER U-LTH25
 * ========================================================
 * Exit gate: Routes to correct sub-post for all 21 JM Die machines;
 * fallback path for unknown machines generates via P2 path.
 *
 * Coverage:
 * - Happy path: All 21 JM Die machines route correctly
 * - 3 failure modes: unknown machine, unknown controller, malformed input
 * - 2 adversarial inputs: empty string, special characters
 * - 3 controller variability: Okuma, Fanuc, Mitsubishi
 * - Dispatcher wiring verification
 *
 * @module __tests__/LatheMasterPostRouterEngine.test
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  latheMasterPostRouterEngine,
  LatheMasterPostRouterEngine,
  type JMDieMachine,
  type LatheControllerFamily,
} from "../engines/LatheMasterPostRouterEngine.js";

// ─── Machine Inventory Tests ─────────────────────────────────────────────

describe("LatheMasterPostRouterEngine machine inventory", () => {
  it("has exactly 21 JM Die machines", () => {
    const machines = LatheMasterPostRouterEngine.getMachineInventory();
    expect(machines).toHaveLength(21);
  });

  it("has 7 Okuma lathes", () => {
    const lathes = LatheMasterPostRouterEngine.getMachinesByType("lathe");
    const okumaLathes = lathes.filter(m => m.manufacturer === "Okuma");
    expect(okumaLathes.length).toBe(7);
  });

  it("has 5 mills (3 Okuma + 2 Haas)", () => {
    const mills = LatheMasterPostRouterEngine.getMachinesByType("mill");
    expect(mills).toHaveLength(5);
    expect(mills.filter(m => m.manufacturer === "Okuma")).toHaveLength(3);
    expect(mills.filter(m => m.manufacturer === "Haas")).toHaveLength(2);
  });

  it("has 4 Mitsubishi EDMs", () => {
    const edms = LatheMasterPostRouterEngine.getMachinesByType("edm");
    expect(edms).toHaveLength(4);
    expect(edms.every(m => m.manufacturer === "Mitsubishi")).toBe(true);
  });

  it("has 3 Swiss lathes", () => {
    const swiss = LatheMasterPostRouterEngine.getMachinesByType("swiss");
    expect(swiss).toHaveLength(3);
  });

  it("has 2 Fanuc-controlled lathes (Doosan + Mori)", () => {
    const fanucMachines = LatheMasterPostRouterEngine.getMachinesByControllerFamily("fanuc");
    expect(fanucMachines.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── Routing Happy Path Tests (All 21 machines) ─────────────────────────

describe("LatheMasterPostRouterEngine routing - all JM Die machines", () => {
  const machines = LatheMasterPostRouterEngine.getMachineInventory();

  it.each(machines.map(m => [m.id, m.name, m.controllerFamily]))(
    "routes %s (%s) to %s family",
    (machineId, _name, expectedFamily) => {
      const result = latheMasterPostRouterEngine.route({ machineId });
      expect(result.success).toBe(true);
      expect(result.controllerFamily).toBe(expectedFamily);
      expect(result.postPath).toBe("direct");
      expect(result.metadata.machineFound).toBe(true);
    }
  );

  it("routes by machine name (case-insensitive)", () => {
    const result = latheMasterPostRouterEngine.route({ machineId: "okuma lb3000 ex ii" });
    expect(result.success).toBe(true);
    expect(result.controllerFamily).toBe("okuma");
  });

  it("routes by model number", () => {
    const result = latheMasterPostRouterEngine.route({ machineId: "LB3000 EX II" });
    expect(result.success).toBe(true);
    expect(result.controllerFamily).toBe("okuma");
  });

  it("routes partial match", () => {
    const result = latheMasterPostRouterEngine.route({ machineId: "lb3000" });
    expect(result.success).toBe(true);
  });
});

// ─── Controller Variability Tests ────────────────────────────────────────

describe("LatheMasterPostRouterEngine controller variability", () => {
  it("generates Okuma-dialect G-code for Okuma machines", () => {
    const result = latheMasterPostRouterEngine.route({
      machineId: "okuma-lb3000",
      operation: "roughing",
    });
    expect(result.success).toBe(true);
    expect(result.dialect).toBe("okuma");
    expect(result.gcode).toBeDefined();
    expect(result.gcode?.some(line => line.includes("G10 L2"))).toBe(true);
  });

  it("generates Fanuc-dialect G-code for Fanuc machines", () => {
    const result = latheMasterPostRouterEngine.route({
      machineId: "doosan-puma-2600",
      operation: "roughing",
    });
    expect(result.success).toBe(true);
    expect(result.dialect).toBe("fanuc");
    expect(result.gcode?.some(line => line.includes("G50 S3000"))).toBe(true);
  });

  it("generates Mitsubishi-dialect G-code for Mitsubishi machines", () => {
    const result = latheMasterPostRouterEngine.route({
      machineId: "mitsubishi-mv1200",
      operation: "roughing",
    });
    expect(result.success).toBe(true);
    expect(result.dialect).toBe("mitsubishi");
  });

  it("generates Citizen-dialect G-code for Swiss machines", () => {
    const result = latheMasterPostRouterEngine.route({
      machineId: "citizen-l20",
      operation: "roughing",
    });
    expect(result.success).toBe(true);
    expect(result.dialect).toBe("citizen");
    expect(result.gcode?.some(line => line.includes("G112"))).toBe(true);
  });

  it("generates Haas-dialect G-code for Haas machines", () => {
    const result = latheMasterPostRouterEngine.route({
      machineId: "haas-vf2",
      operation: "roughing",
    });
    expect(result.success).toBe(true);
    expect(result.dialect).toBe("haas");
    expect(result.gcode?.some(line => line.includes("G50 S4000"))).toBe(true);
  });
});

// ─── Operation Type Tests ────────────────────────────────────────────────

describe("LatheMasterPostRouterEngine operation types", () => {
  const operations = [
    { op: "roughing", expect: "G71" },
    { op: "finishing", expect: "G70" },
    { op: "threading", expect: "G76" },
    { op: "grooving", expect: "G75" },
    { op: "drilling", expect: "G83" },
  ] as const;

  it.each(operations)("generates $op code with $expect cycle", ({ op, expect: expectedCode }) => {
    const result = latheMasterPostRouterEngine.route({
      machineId: "okuma-lb3000",
      operation: op,
    });
    expect(result.success).toBe(true);
    expect(result.gcode?.some(line => line.includes(expectedCode))).toBe(true);
  });
});

// ─── Fallback Path Tests ─────────────────────────────────────────────────

describe("LatheMasterPostRouterEngine fallback path", () => {
  it("uses fallback for unknown machine", () => {
    const result = latheMasterPostRouterEngine.route({
      machineId: "unknown-machine-xyz",
    });
    expect(result.success).toBe(true);
    expect(result.postPath).toBe("fallback");
    expect(result.controllerFamily).toBe("generic");
    expect(result.metadata.fallbackReason).toContain("not found");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("uses fallback for unknown controller override", () => {
    const result = latheMasterPostRouterEngine.route({
      machineId: "okuma-lb3000",
      controller: "unknown-controller-abc",
    });
    expect(result.success).toBe(true);
    expect(result.postPath).toBe("fallback");
    expect(result.metadata.fallbackReason).toContain("Unknown controller");
  });

  it("fallback G-code includes warning comment", () => {
    const result = latheMasterPostRouterEngine.route({
      machineId: "nonexistent",
    });
    expect(result.gcode?.some(line => line.includes("FALLBACK"))).toBe(true);
    expect(result.gcode?.some(line => line.includes("VERIFY BEFORE USE"))).toBe(true);
  });
});

// ─── Failure Mode Tests ──────────────────────────────────────────────────

describe("LatheMasterPostRouterEngine failure modes", () => {
  it("handles empty machine ID gracefully", () => {
    const result = latheMasterPostRouterEngine.route({ machineId: "" });
    // Empty string triggers fallback
    expect(result.postPath).toBe("fallback");
  });

  it("handles machine ID with only whitespace", () => {
    const result = latheMasterPostRouterEngine.route({ machineId: "   " });
    expect(result.postPath).toBe("fallback");
  });

  it("handles very long machine ID", () => {
    const result = latheMasterPostRouterEngine.route({
      machineId: "a".repeat(1000),
    });
    expect(result.postPath).toBe("fallback");
    expect(result.success).toBe(true); // Still succeeds via fallback
  });
});

// ─── Adversarial Input Tests ─────────────────────────────────────────────

describe("LatheMasterPostRouterEngine adversarial inputs", () => {
  it("handles special characters in machine ID", () => {
    const result = latheMasterPostRouterEngine.route({
      machineId: "<script>alert('xss')</script>",
    });
    expect(result.postPath).toBe("fallback");
    expect(result.success).toBe(true);
  });

  it("handles unicode in machine ID", () => {
    const result = latheMasterPostRouterEngine.route({
      machineId: "机床-001",
    });
    expect(result.postPath).toBe("fallback");
    expect(result.success).toBe(true);
  });

  it("handles newlines in machine ID", () => {
    const result = latheMasterPostRouterEngine.route({
      machineId: "okuma\nlb3000",
    });
    // Newlines break the match, triggers fallback
    expect(result.success).toBe(true);
  });

  it("handles SQL injection attempt", () => {
    const result = latheMasterPostRouterEngine.route({
      machineId: "'; DROP TABLE machines; --",
    });
    expect(result.postPath).toBe("fallback");
    expect(result.success).toBe(true);
  });
});

// ─── Static API Tests ────────────────────────────────────────────────────

describe("LatheMasterPostRouterEngine static API", () => {
  it("getSupportedControllers returns all controller IDs", () => {
    const controllers = LatheMasterPostRouterEngine.getSupportedControllers();
    expect(controllers).toContain("okuma-osp-p300l");
    expect(controllers).toContain("fanuc-31i-t");
    expect(controllers).toContain("mitsubishi-m80-l");
    expect(controllers).toContain("haas-ngc");
    expect(controllers.length).toBeGreaterThanOrEqual(10);
  });

  it("getDialectInfo returns correct info for known controller", () => {
    const info = LatheMasterPostRouterEngine.getDialectInfo("okuma-osp-p300l");
    expect(info).toBeDefined();
    expect(info?.dialect).toBe("okuma");
    expect(info?.family).toBe("okuma");
  });

  it("getDialectInfo returns undefined for unknown controller", () => {
    const info = LatheMasterPostRouterEngine.getDialectInfo("unknown");
    expect(info).toBeUndefined();
  });

  it("machineExists returns true for known machines", () => {
    expect(LatheMasterPostRouterEngine.machineExists("okuma-lb3000")).toBe(true);
    expect(LatheMasterPostRouterEngine.machineExists("Okuma LB3000 EX II")).toBe(true);
  });

  it("machineExists returns false for unknown machines", () => {
    expect(LatheMasterPostRouterEngine.machineExists("unknown-machine")).toBe(false);
  });

  it("getVersion returns version string", () => {
    expect(LatheMasterPostRouterEngine.getVersion()).toBe("1.0.0");
  });
});

// ─── G-code Output Structure Tests ───────────────────────────────────────

describe("LatheMasterPostRouterEngine G-code output", () => {
  it("includes program number", () => {
    const result = latheMasterPostRouterEngine.route({
      machineId: "okuma-lb3000",
      operation: "roughing",
    });
    expect(result.gcode?.some(line => line.startsWith("O"))).toBe(true);
  });

  it("includes safe start line (G28)", () => {
    const result = latheMasterPostRouterEngine.route({
      machineId: "okuma-lb3000",
      operation: "roughing",
    });
    expect(result.gcode?.some(line => line.includes("G28"))).toBe(true);
  });

  it("includes work offset (G54)", () => {
    const result = latheMasterPostRouterEngine.route({
      machineId: "okuma-lb3000",
      operation: "roughing",
    });
    expect(result.gcode?.some(line => line.includes("G54"))).toBe(true);
  });

  it("includes tool call", () => {
    const result = latheMasterPostRouterEngine.route({
      machineId: "okuma-lb3000",
      operation: "roughing",
    });
    expect(result.gcode?.some(line => line.includes("T0101"))).toBe(true);
  });

  it("ends with M30 and %", () => {
    const result = latheMasterPostRouterEngine.route({
      machineId: "okuma-lb3000",
      operation: "roughing",
    });
    const gcode = result.gcode ?? [];
    expect(gcode[gcode.length - 2]).toBe("M30");
    expect(gcode[gcode.length - 1]).toBe("%");
  });

  it("includes comments when enabled (default)", () => {
    const result = latheMasterPostRouterEngine.route({
      machineId: "okuma-lb3000",
      operation: "roughing",
    });
    expect(result.gcode?.some(line => line.includes("("))).toBe(true);
  });
});

// ─── Dispatcher Wiring Verification ──────────────────────────────────────

describe("camDispatcher lathe_master_post wiring", () => {
  const dispatcherSource = readFileSync(
    resolve(__dirname, "../tools/dispatchers/camDispatcher.ts"),
    "utf-8",
  );

  it("lathe_master_post_route exists in ACTIONS array", () => {
    expect(dispatcherSource).toContain('"lathe_master_post_route"');
  });

  it("lathe_master_post_machines exists in ACTIONS array", () => {
    expect(dispatcherSource).toContain('"lathe_master_post_machines"');
  });

  it("lathe_master_post_controllers exists in ACTIONS array", () => {
    expect(dispatcherSource).toContain('"lathe_master_post_controllers"');
  });

  it("route handler imports LatheMasterPostRouterEngine", () => {
    expect(dispatcherSource).toContain('case "lathe_master_post_route"');
    expect(dispatcherSource).toContain("LatheMasterPostRouterEngine");
  });

  it("machines handler calls getMachineInventory", () => {
    expect(dispatcherSource).toContain('case "lathe_master_post_machines"');
    expect(dispatcherSource).toContain("getMachineInventory");
  });

  it("controllers handler calls getSupportedControllers", () => {
    expect(dispatcherSource).toContain('case "lathe_master_post_controllers"');
    expect(dispatcherSource).toContain("getSupportedControllers");
  });
});

// ─── Schema Verification ─────────────────────────────────────────────────

describe("latheMasterPostActionSchemas", () => {
  it("exports all 3 action schemas", async () => {
    const { ACTION_LATHE_MASTER_POST_SCHEMAS } = await import(
      "../schemas/latheMasterPostActionSchemas.js"
    );
    const keys = Object.keys(ACTION_LATHE_MASTER_POST_SCHEMAS);
    expect(keys).toHaveLength(3);
    expect(keys).toContain("lathe_master_post_route");
    expect(keys).toContain("lathe_master_post_machines");
    expect(keys).toContain("lathe_master_post_controllers");
  });

  it("route schema validates correct input", async () => {
    const { ACTION_LATHE_MASTER_POST_SCHEMAS } = await import(
      "../schemas/latheMasterPostActionSchemas.js"
    );
    const schema = ACTION_LATHE_MASTER_POST_SCHEMAS.lathe_master_post_route;
    const result = schema.safeParse({
      machine_id: "okuma-lb3000",
      operation: "roughing",
    });
    expect(result.success).toBe(true);
  });

  it("route schema rejects empty machine_id", async () => {
    const { ACTION_LATHE_MASTER_POST_SCHEMAS } = await import(
      "../schemas/latheMasterPostActionSchemas.js"
    );
    const schema = ACTION_LATHE_MASTER_POST_SCHEMAS.lathe_master_post_route;
    const result = schema.safeParse({ machine_id: "" });
    expect(result.success).toBe(false);
  });

  it("machines schema accepts type filter", async () => {
    const { ACTION_LATHE_MASTER_POST_SCHEMAS } = await import(
      "../schemas/latheMasterPostActionSchemas.js"
    );
    const schema = ACTION_LATHE_MASTER_POST_SCHEMAS.lathe_master_post_machines;
    const result = schema.safeParse({ type: "lathe" });
    expect(result.success).toBe(true);
  });
});
