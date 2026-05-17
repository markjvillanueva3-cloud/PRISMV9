/**
 * dispatcher.machineDataAudit.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-MDA dispatcher wiring.
 *
 * Drives 6 READ-ONLY actions through real `prism_dev`:
 *
 *   - mda_report           → generateAuditReport()
 *   - mda_summary          → getAuditSummary()
 *   - mda_critical_gaps    → getCriticalFieldGaps()
 *   - mda_by_layer         → getMachinesByLayer(layer)
 *   - mda_by_manufacturer  → getMachinesByManufacturer(name)
 *   - mda_by_type          → getMachinesByType(type)
 *
 * Complex-input audit methods DEFERRED (auditMachineFields,
 * calculateCompleteness, validatePackage, generateCanonicalPackage) —
 * they take a full CanonicalMachinePackage which is a deeply nested
 * type that needs a follow-up wire to surface safely.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { MachineDataAuditEngine } from "../engines/MachineDataAuditEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

let devHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MDA — Zod schemas", () => {
  it("mda_report / mda_summary / mda_critical_gaps accept {}", () => {
    expect(ACTION_DEV_SCHEMAS["mda_report"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["mda_summary"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["mda_critical_gaps"].safeParse({}).success).toBe(true);
  });

  it("mda_by_layer requires layer enum value", () => {
    expect(ACTION_DEV_SCHEMAS["mda_by_layer"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mda_by_layer"].safeParse({ layer: "not_a_layer" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mda_by_layer"].safeParse({ layer: "BASIC" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["mda_by_layer"].safeParse({ layer: "CORE" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["mda_by_layer"].safeParse({ layer: "ENHANCED" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["mda_by_layer"].safeParse({ layer: "LEVEL5" }).success).toBe(true);
  });

  it("mda_by_manufacturer requires non-empty manufacturer", () => {
    expect(ACTION_DEV_SCHEMAS["mda_by_manufacturer"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mda_by_manufacturer"].safeParse({ manufacturer: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mda_by_manufacturer"].safeParse({ manufacturer: "HAAS" }).success).toBe(true);
  });

  it("mda_by_type requires non-empty type", () => {
    expect(ACTION_DEV_SCHEMAS["mda_by_type"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mda_by_type"].safeParse({ type: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mda_by_type"].safeParse({ type: "mill" }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MDA — prism_dev :: mda_summary", () => {
  it("returns a non-empty text summary", async () => {
    const r = await invokeHandler(devHandler, "mda_summary", {});
    const summary = (r as { summary: string }).summary;
    expect(typeof summary).toBe("string");
    expect(summary.length).toBeGreaterThan(0);
  });

  it("ROUTING PROOF — wire summary byte-equals engine-direct getAuditSummary()", async () => {
    const r = await invokeHandler(devHandler, "mda_summary", {});
    const wire = (r as { summary: string }).summary;
    const direct = MachineDataAuditEngine.getAuditSummary();
    expect(wire).toBe(direct);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MDA — prism_dev :: mda_report", () => {
  it("returns audit report with byLayer / byManufacturer / byType maps", async () => {
    const r = await invokeHandler(devHandler, "mda_report", {});
    const report = (r as { report: { byLayer?: Record<string, unknown>; byManufacturer?: Record<string, number>; byType?: Record<string, number> } }).report;
    expect(typeof report.byLayer).toBe("object");
    expect(typeof report.byManufacturer).toBe("object");
    expect(typeof report.byType).toBe("object");
  });

  it("byLayer contains all 4 layer keys (BASIC, CORE, ENHANCED, LEVEL5)", async () => {
    const r = await invokeHandler(devHandler, "mda_report", {});
    const byLayer = (r as { report: { byLayer: Record<string, unknown> } }).report.byLayer;
    expect(Object.keys(byLayer).sort()).toEqual(["BASIC", "CORE", "ENHANCED", "LEVEL5"]);
  });

  it("ROUTING PROOF — wire report keys are a subset of engine-direct (slimResponse may strip empty arrays)", async () => {
    const r = await invokeHandler(devHandler, "mda_report", {});
    const wireKeys = new Set(Object.keys((r as { report: Record<string, unknown> }).report));
    const directKeys = new Set(Object.keys(MachineDataAuditEngine.generateAuditReport()));
    // Every wire key must exist on direct (slimResponse can only REMOVE, never ADD)
    for (const k of wireKeys) {
      expect(directKeys.has(k)).toBe(true);
    }
    // Load-bearing keys must survive even if some of {criticalGaps, recommendations} are stripped when empty
    for (const required of ["auditDate", "byLayer", "byManufacturer", "byType", "totalMachines"]) {
      expect(wireKeys.has(required)).toBe(true);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MDA — prism_dev :: mda_critical_gaps", () => {
  it("returns gaps array with count", async () => {
    const r = await invokeHandler(devHandler, "mda_critical_gaps", {});
    const data = r as { gaps?: unknown[]; count?: number };
    expect(Array.isArray(data.gaps ?? [])).toBe(true);
    expect((data.count as number | undefined) ?? 0).toBe((data.gaps ?? []).length);
  });

  it("ROUTING PROOF — wire gap count parity with engine-direct getCriticalFieldGaps()", async () => {
    const r = await invokeHandler(devHandler, "mda_critical_gaps", {});
    const wireCount = ((r as { count?: number }).count) ?? 0;
    const direct = MachineDataAuditEngine.getCriticalFieldGaps();
    expect(wireCount).toBe(direct.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MDA — prism_dev :: mda_by_layer", () => {
  it("BASIC → returns array with the requested layer echoed", async () => {
    const r = await invokeHandler(devHandler, "mda_by_layer", { layer: "BASIC" });
    const data = r as { machines?: unknown[]; count?: number; layer?: string };
    expect(Array.isArray(data.machines ?? [])).toBe(true);
    expect(data.layer).toBe("BASIC");
    expect((data.count as number | undefined) ?? 0).toBe((data.machines ?? []).length);
  });

  it("CORE → variability cross-check (≥3 layers exercised across this suite)", async () => {
    const r = await invokeHandler(devHandler, "mda_by_layer", { layer: "CORE" });
    const data = r as { machines?: unknown[]; layer?: string };
    expect(Array.isArray(data.machines ?? [])).toBe(true);
    expect(data.layer).toBe("CORE");
  });

  it("ENHANCED → coverage", async () => {
    const r = await invokeHandler(devHandler, "mda_by_layer", { layer: "ENHANCED" });
    const data = r as { layer?: string };
    expect(data.layer).toBe("ENHANCED");
  });

  it("LEVEL5 → coverage", async () => {
    const r = await invokeHandler(devHandler, "mda_by_layer", { layer: "LEVEL5" });
    const data = r as { layer?: string };
    expect(data.layer).toBe("LEVEL5");
  });

  it("ROUTING PROOF — wire BASIC count parity with engine-direct", async () => {
    const r = await invokeHandler(devHandler, "mda_by_layer", { layer: "BASIC" });
    const wireCount = ((r as { count?: number }).count) ?? 0;
    const direct = MachineDataAuditEngine.getMachinesByLayer("BASIC");
    expect(wireCount).toBe(direct.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MDA — prism_dev :: mda_by_manufacturer", () => {
  it("manufacturer='HAAS' → request echoed in response", async () => {
    const r = await invokeHandler(devHandler, "mda_by_manufacturer", { manufacturer: "HAAS" });
    const data = r as { manufacturer?: string };
    expect(data.manufacturer).toBe("HAAS");
  });

  it("ROUTING PROOF — wire count parity with engine-direct getMachinesByManufacturer()", async () => {
    const r = await invokeHandler(devHandler, "mda_by_manufacturer", { manufacturer: "HAAS" });
    const wireCount = ((r as { count?: number }).count) ?? 0;
    const direct = MachineDataAuditEngine.getMachinesByManufacturer("HAAS");
    expect(wireCount).toBe(direct.length);
  });

  it("unknown manufacturer → 0 count, empty machines", async () => {
    const r = await invokeHandler(devHandler, "mda_by_manufacturer", {
      manufacturer: "NONEXISTENT_MFR_" + Date.now(),
    });
    const data = r as { machines?: unknown[]; count?: number };
    expect((data.machines ?? []).length).toBe(0);
    expect((data.count as number | undefined) ?? 0).toBe(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MDA — prism_dev :: mda_by_type", () => {
  it("type='mill' → request echoed in response", async () => {
    const r = await invokeHandler(devHandler, "mda_by_type", { type: "mill" });
    const data = r as { type?: string };
    expect(data.type).toBe("mill");
  });

  it("ROUTING PROOF — wire count parity with engine-direct getMachinesByType()", async () => {
    const r = await invokeHandler(devHandler, "mda_by_type", { type: "mill" });
    const wireCount = ((r as { count?: number }).count) ?? 0;
    const direct = MachineDataAuditEngine.getMachinesByType("mill");
    expect(wireCount).toBe(direct.length);
  });

  it("unknown type → 0 count, empty machines", async () => {
    const r = await invokeHandler(devHandler, "mda_by_type", {
      type: "nonexistent_type_xyz_" + Date.now(),
    });
    const data = r as { machines?: unknown[]; count?: number };
    expect((data.machines ?? []).length).toBe(0);
    expect((data.count as number | undefined) ?? 0).toBe(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MDA — error envelope", () => {
  it("mda_by_layer without layer → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "mda_by_layer", {});
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });

  it("mda_by_layer with invalid layer → schema rejects with mention of 'layer'", async () => {
    const r = await invokeHandler(devHandler, "mda_by_layer", { layer: "totally_bogus" });
    const data = r as { error?: string; details?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
    expect(`${data.error ?? ""} ${data.details ?? ""}`).toMatch(/layer|enum|invalid/i);
  });

  it("mda_by_manufacturer without manufacturer → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "mda_by_manufacturer", {});
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });

  it("mda_by_type without type → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "mda_by_type", {});
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });
});
