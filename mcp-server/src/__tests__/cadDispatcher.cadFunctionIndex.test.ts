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

// ─── Cross-system parity ──────────────────────────────────────────────────

describe("cadDispatcher — cross-system discovery parity", () => {
  it("hyperCAD-S and Fusion 360 expose the same discovery action triplet", async () => {
    const hcadKeys = Object.keys(await invoke("cad_hypercad_summary")).sort();
    const f360Keys = Object.keys(await invoke("cad_fusion360_summary")).sort();
    expect(hcadKeys).toEqual(f360Keys);
  });

  it("both systems' total_parameter_count return the same shape", async () => {
    const hcadKeys = Object.keys(await invoke("cad_hypercad_total_parameter_count")).sort();
    const f360Keys = Object.keys(await invoke("cad_fusion360_total_parameter_count")).sort();
    expect(hcadKeys).toEqual(f360Keys);
    expect(hcadKeys).toEqual(["declared_total", "drift", "success", "total_parameters"]);
  });

  it("both systems' load_errors return the same shape", async () => {
    const hcadKeys = Object.keys(await invoke("cad_hypercad_load_errors")).sort();
    const f360Keys = Object.keys(await invoke("cad_fusion360_load_errors")).sort();
    expect(hcadKeys).toEqual(f360Keys);
    // slimResponse strips empty `errors` arrays — when both systems are
    // healthy, key set is ["count", "success"]; when either has loaded
    // errors, key set is ["count", "errors", "success"]. Either is valid as
    // long as the two systems agree.
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
