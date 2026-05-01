/**
 * cadDispatcher.cadFunctionIndex.test.ts — U-CAD-FIDX-AUDIT-01
 *
 * Dispatcher-level drift tests for the CAD Function Index discovery surface
 * exposed by `prism_cad`:
 *   - hyperCAD-S trio: cad_hypercad_summary / cad_hypercad_total_parameter_count /
 *     cad_hypercad_load_errors (shipped in U-CAD-FIDX-HCAD-DISCOVERY)
 *   - Fusion 360 trio: cad_fusion360_summary / cad_fusion360_total_parameter_count /
 *     cad_fusion360_load_errors (shipped in U-CAD-FIDX-AUDIT-02 for parity)
 *
 * Engine-level coverage already exists at:
 *   - HyperCADCADFunctionIndexEngine.test.ts (207 cases, all green)
 *   - Fusion360CADFunctionIndexEngine.test.ts (sister coverage)
 *
 * This file pins the **dispatcher contract**: each discovery action, when
 * invoked through the registered `prism_cad` tool with normalized empty
 * params, returns the shape its case branch produces — and that shape stays
 * in sync with the underlying engine getter return values.
 *
 * Drift catch: if a refactor changes a getter's return shape but forgets to
 * update the dispatcher case branch (or vice versa), one of the parity
 * assertions below will fail on first run.
 */

import { describe, it, expect, beforeAll } from "vitest";

import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";
import { HyperCADCADFunctionIndexEngine } from "../engines/HyperCADCADFunctionIndexEngine.js";
import { Fusion360CADFunctionIndexEngine } from "../engines/Fusion360CADFunctionIndexEngine.js";
import { InventorCADFunctionIndexEngine } from "../engines/InventorCADFunctionIndexEngine.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): { tools: CapturedTool[]; tool: (n: string, d: string, s: unknown, h: CapturedTool["handler"]) => void } {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, description, schema, handler) {
      tools.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (res && Array.isArray((res as { content?: unknown[] }).content)) {
    const arr = (res as { content: Array<{ text?: string }> }).content;
    const text = arr[0]?.text ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

beforeAll(() => {
  const server = makeStubServer();
  registerCadDispatcher(server);
  const tool = server.tools.find((t) => t.name === "prism_cad");
  if (!tool) throw new Error("prism_cad tool was not registered");
  handler = tool.handler;
});

// ─── hyperCAD-S discovery surface ─────────────────────────────────────────

describe("cadDispatcher — hyperCAD-S discovery actions", () => {
  it("cad_hypercad_summary returns aggregated index summary", async () => {
    const out = await invoke("cad_hypercad_summary");
    expect(out.success).toBe(true);
    expect(out.system_id).toBe("hypercad_s");
    expect(typeof out.module_name).toBe("string");
    expect(typeof out.total_modules).toBe("number");
    expect(typeof out.total_operations).toBe("number");
    expect(typeof out.total_parameters).toBe("number");
    expect(typeof out.estimated_parameter_total).toBe("number");
    expect(typeof out.coverage_state).toBe("string");
    expect(Array.isArray(out.modules)).toBe(true);
    expect((out.modules as unknown[]).length).toBe(out.total_modules);
  });

  it("cad_hypercad_summary parity with engine getters (drift guard)", async () => {
    const out = await invoke("cad_hypercad_summary");
    const index = HyperCADCADFunctionIndexEngine.getIndex();
    const allOps = HyperCADCADFunctionIndexEngine.listAllOperations();
    const totalParams = HyperCADCADFunctionIndexEngine.getTotalParameterCount();
    expect(out.system_id).toBe(index.system_id);
    expect(out.module_name).toBe(index.module_name);
    expect(out.total_modules).toBe(index.coverage_summary.total_modules);
    expect(out.total_operations).toBe(allOps.length);
    expect(out.total_parameters).toBe(totalParams);
    expect(out.estimated_parameter_total).toBe(index.coverage_summary.estimated_parameter_total);
  });

  it("cad_hypercad_total_parameter_count exposes drift between live + declared", async () => {
    const out = await invoke("cad_hypercad_total_parameter_count");
    expect(out.success).toBe(true);
    expect(typeof out.total_parameters).toBe("number");
    expect(typeof out.declared_total).toBe("number");
    expect(typeof out.drift).toBe("number");
    expect(out.drift).toBe(
      (out.total_parameters as number) - (out.declared_total as number),
    );
  });

  it("cad_hypercad_total_parameter_count matches engine getter", async () => {
    const out = await invoke("cad_hypercad_total_parameter_count");
    expect(out.total_parameters).toBe(HyperCADCADFunctionIndexEngine.getTotalParameterCount());
    expect(out.declared_total).toBe(
      HyperCADCADFunctionIndexEngine.getIndex().coverage_summary.estimated_parameter_total,
    );
  });

  it("cad_hypercad_load_errors returns error array (empty when healthy)", async () => {
    const out = await invoke("cad_hypercad_load_errors");
    expect(out.success).toBe(true);
    expect(typeof out.count).toBe("number");
    // slimResponse strips empty arrays — `errors` field is omitted when count===0.
    const errors = (out.errors as unknown[] | undefined) ?? [];
    expect(Array.isArray(errors)).toBe(true);
    expect(errors.length).toBe(out.count);
    // Healthy state: zero load errors. If non-zero, the catalog has a real bug.
    expect(out.count).toBe(HyperCADCADFunctionIndexEngine.getLoadErrors().length);
  });
});

// ─── Fusion 360 discovery surface (parity mirror) ─────────────────────────

describe("cadDispatcher — Fusion 360 discovery actions (U-CAD-FIDX-AUDIT-02 parity)", () => {
  it("cad_fusion360_summary returns aggregated index summary", async () => {
    const out = await invoke("cad_fusion360_summary");
    expect(out.success).toBe(true);
    expect(out.system_id).toBe("fusion360");
    expect(typeof out.module_name).toBe("string");
    expect(typeof out.total_modules).toBe("number");
    expect(typeof out.total_operations).toBe("number");
    expect(typeof out.total_parameters).toBe("number");
    expect(typeof out.estimated_parameter_total).toBe("number");
    expect(typeof out.coverage_state).toBe("string");
    expect(Array.isArray(out.modules)).toBe(true);
    expect((out.modules as unknown[]).length).toBe(out.total_modules);
  });

  it("cad_fusion360_summary parity with engine getters (drift guard)", async () => {
    const out = await invoke("cad_fusion360_summary");
    const index = Fusion360CADFunctionIndexEngine.getIndex();
    const allOps = Fusion360CADFunctionIndexEngine.listAllOperations();
    const totalParams = Fusion360CADFunctionIndexEngine.getTotalParameterCount();
    expect(out.system_id).toBe(index.system_id);
    expect(out.module_name).toBe(index.module_name);
    expect(out.total_modules).toBe(index.coverage_summary.total_modules);
    expect(out.total_operations).toBe(allOps.length);
    expect(out.total_parameters).toBe(totalParams);
    expect(out.estimated_parameter_total).toBe(index.coverage_summary.estimated_parameter_total);
  });

  it("cad_fusion360_total_parameter_count exposes drift between live + declared", async () => {
    const out = await invoke("cad_fusion360_total_parameter_count");
    expect(out.success).toBe(true);
    expect(typeof out.total_parameters).toBe("number");
    expect(typeof out.declared_total).toBe("number");
    expect(typeof out.drift).toBe("number");
    expect(out.drift).toBe(
      (out.total_parameters as number) - (out.declared_total as number),
    );
  });

  it("cad_fusion360_total_parameter_count matches engine getter", async () => {
    const out = await invoke("cad_fusion360_total_parameter_count");
    expect(out.total_parameters).toBe(Fusion360CADFunctionIndexEngine.getTotalParameterCount());
    expect(out.declared_total).toBe(
      Fusion360CADFunctionIndexEngine.getIndex().coverage_summary.estimated_parameter_total,
    );
  });

  it("cad_fusion360_load_errors returns error array (empty when healthy)", async () => {
    const out = await invoke("cad_fusion360_load_errors");
    expect(out.success).toBe(true);
    expect(typeof out.count).toBe("number");
    const errors = (out.errors as unknown[] | undefined) ?? [];
    expect(Array.isArray(errors)).toBe(true);
    expect(errors.length).toBe(out.count);
    expect(out.count).toBe(Fusion360CADFunctionIndexEngine.getLoadErrors().length);
  });
});

// ─── Inventor discovery surface (U-CAD-FIDX-INV-01 — full discovery from day 1) ──

describe("cadDispatcher — Autodesk Inventor discovery actions (U-CAD-FIDX-INV-01)", () => {
  it("cad_inventor_summary returns aggregated index summary", async () => {
    const out = await invoke("cad_inventor_summary");
    expect(out.success).toBe(true);
    expect(out.system_id).toBe("inventor");
    expect(typeof out.module_name).toBe("string");
    expect(typeof out.total_modules).toBe("number");
    expect(typeof out.total_operations).toBe("number");
    expect(typeof out.total_parameters).toBe("number");
    expect(typeof out.estimated_parameter_total).toBe("number");
    expect(typeof out.coverage_state).toBe("string");
    expect(Array.isArray(out.modules)).toBe(true);
    expect((out.modules as unknown[]).length).toBe(out.total_modules);
  });

  it("cad_inventor_summary parity with engine getters (drift guard)", async () => {
    const out = await invoke("cad_inventor_summary");
    const index = InventorCADFunctionIndexEngine.getIndex();
    const allOps = InventorCADFunctionIndexEngine.listAllOperations();
    const totalParams = InventorCADFunctionIndexEngine.getTotalParameterCount();
    expect(out.system_id).toBe(index.system_id);
    expect(out.module_name).toBe(index.module_name);
    expect(out.total_modules).toBe(index.coverage_summary.total_modules);
    expect(out.total_operations).toBe(allOps.length);
    expect(out.total_parameters).toBe(totalParams);
    expect(out.estimated_parameter_total).toBe(index.coverage_summary.estimated_parameter_total);
  });

  it("cad_inventor_total_parameter_count exposes drift between live + declared", async () => {
    const out = await invoke("cad_inventor_total_parameter_count");
    expect(out.success).toBe(true);
    expect(typeof out.total_parameters).toBe("number");
    expect(typeof out.declared_total).toBe("number");
    expect(typeof out.drift).toBe("number");
    expect(out.drift).toBe(
      (out.total_parameters as number) - (out.declared_total as number),
    );
  });

  it("cad_inventor_total_parameter_count matches engine getter", async () => {
    const out = await invoke("cad_inventor_total_parameter_count");
    expect(out.total_parameters).toBe(InventorCADFunctionIndexEngine.getTotalParameterCount());
    expect(out.declared_total).toBe(
      InventorCADFunctionIndexEngine.getIndex().coverage_summary.estimated_parameter_total,
    );
  });

  it("cad_inventor_load_errors returns error array (empty when healthy)", async () => {
    const out = await invoke("cad_inventor_load_errors");
    expect(out.success).toBe(true);
    expect(typeof out.count).toBe("number");
    const errors = (out.errors as unknown[] | undefined) ?? [];
    expect(Array.isArray(errors)).toBe(true);
    expect(errors.length).toBe(out.count);
    expect(out.count).toBe(InventorCADFunctionIndexEngine.getLoadErrors().length);
  });

  it("cad_inventor_list_modules surfaces all shipped Inventor modules", async () => {
    const out = await invoke("cad_inventor_list_modules");
    expect(out.success).toBe(true);
    expect(out.modules).toEqual([
      "sketch_operations",
      "part_operations",
      "surface_operations",
      "sheet_metal_operations",
    ]);
    expect(out.count).toBe(4);
  });

  it("cad_inventor_get_operation('sketch_operations','LINE') returns the LINE op", async () => {
    const out = await invoke("cad_inventor_get_operation", {
      module_id: "sketch_operations",
      operation_id: "LINE",
    });
    expect(out.success).toBe(true);
    expect(out.module_id).toBe("sketch_operations");
    expect(out.operation_id).toBe("LINE");
    const op = out.operation as { category?: string; python_api?: string };
    expect(op.category).toBe("Sketch_Primitive_Line");
    expect(op.python_api).toContain("AddByTwoPoints");
  });

  it("cad_inventor_find_parameter requires module_id, operation_id, parameter_name", async () => {
    const out = await invoke("cad_inventor_find_parameter", {});
    expect(out.success).toBe(false);
    expect(typeof out.error).toBe("string");
    expect(out.error as string).toContain("module_id");
  });
});

// ─── Cross-system parity ──────────────────────────────────────────────────

describe("cadDispatcher — cross-system discovery parity", () => {
  it("hyperCAD-S, Fusion 360, and Inventor expose the same discovery action triplet", async () => {
    const hcadKeys = Object.keys(await invoke("cad_hypercad_summary")).sort();
    const f360Keys = Object.keys(await invoke("cad_fusion360_summary")).sort();
    const invKeys = Object.keys(await invoke("cad_inventor_summary")).sort();
    expect(hcadKeys).toEqual(f360Keys);
    expect(hcadKeys).toEqual(invKeys);
  });

  it("all three systems' total_parameter_count return the same shape", async () => {
    const hcadKeys = Object.keys(await invoke("cad_hypercad_total_parameter_count")).sort();
    const f360Keys = Object.keys(await invoke("cad_fusion360_total_parameter_count")).sort();
    const invKeys = Object.keys(await invoke("cad_inventor_total_parameter_count")).sort();
    expect(hcadKeys).toEqual(f360Keys);
    expect(hcadKeys).toEqual(invKeys);
    expect(hcadKeys).toEqual(["declared_total", "drift", "success", "total_parameters"]);
  });

  it("all three systems' load_errors return the same shape", async () => {
    const hcadKeys = Object.keys(await invoke("cad_hypercad_load_errors")).sort();
    const f360Keys = Object.keys(await invoke("cad_fusion360_load_errors")).sort();
    const invKeys = Object.keys(await invoke("cad_inventor_load_errors")).sort();
    expect(hcadKeys).toEqual(f360Keys);
    expect(hcadKeys).toEqual(invKeys);
    // slimResponse strips empty `errors` arrays — when all systems are
    // healthy, key set is ["count", "success"]; when any has loaded
    // errors, key set is ["count", "errors", "success"]. Either is valid as
    // long as the systems agree.
    const allowed = [
      ["count", "success"],
      ["count", "errors", "success"],
    ];
    expect(allowed).toContainEqual(hcadKeys);
  });
});

// ─── Adversarial input ────────────────────────────────────────────────────

describe("cadDispatcher — discovery action adversarial input", () => {
  it("ignores extra params on cad_hypercad_summary (idempotent read)", async () => {
    const a = await invoke("cad_hypercad_summary");
    const b = await invoke("cad_hypercad_summary", { unrelated: "value", n: 42 });
    expect(b.success).toBe(true);
    expect(b.system_id).toBe(a.system_id);
    expect(b.total_parameters).toBe(a.total_parameters);
  });

  it("ignores extra params on cad_fusion360_summary (idempotent read)", async () => {
    const a = await invoke("cad_fusion360_summary");
    const b = await invoke("cad_fusion360_summary", { unrelated: "value", n: 42 });
    expect(b.success).toBe(true);
    expect(b.system_id).toBe(a.system_id);
    expect(b.total_parameters).toBe(a.total_parameters);
  });
});
