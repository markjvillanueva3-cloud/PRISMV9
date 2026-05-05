/**
 * Round-trip dispatcher tests for blueprint_to_all_cads action group
 * (CAD-COMPLETE-MS0/U-CADC-BPRINT-OCR-ORCH-01)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";
import type { BlueprintAnalysis, ExtractedDimension } from "../engines/BlueprintOCREngine.js";

const ALL_TARGETS = 6;

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (res && res.success === false) return res;
  const content = res.content as Array<{ type: string; text: string }> | undefined;
  const text = content?.[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { __raw: text } as Record<string, unknown>;
  }
}

beforeAll(() => {
  const server = makeStubServer();
  registerCadDispatcher(server as unknown as Parameters<typeof registerCadDispatcher>[0]);
  const tool = server.tools.find((t) => t.name === "prism_cad");
  if (!tool) throw new Error("prism_cad tool was not registered");
  handler = tool.handler;
});

function dim(type: ExtractedDimension["type"], n: number): ExtractedDimension {
  return {
    id: `${type}-${Math.random().toString(36).slice(2, 7)}`,
    type, nominal: n, unit: "mm", raw_text: `${n}mm`, confidence: 0.9,
  };
}

function plate(): BlueprintAnalysis {
  return {
    dimensions: [dim("linear", 50), dim("linear", 30), dim("linear", 5)],
    gdt_frames: [],
    title_block: { part_number: "P-1", units: "mm", confidence: 0.9, material: "Al 6061" },
    notes: [],
    summary: {
      total_dimensions: 3, total_gdt: 0, total_notes: 0,
      tightest_tolerance_mm: 0.05, critical_features: [], material: "Al 6061", has_gdt: false,
    },
  };
}

describe("cadDispatcher — blueprint_to_all_cads round-trip (analysis mode)", () => {
  it("dispatches analysis-mode call and returns 6 succeeded CADs", async () => {
    const res = await invoke("blueprint_to_all_cads", { analysis: plate() });
    expect(res.success).toBe(true);
    expect(res.mode).toBe("analysis");
    // ocr may serialize as null or be stripped — both prove "no OCR ran"
    expect(res.ocr ?? null).toBeNull();
    const cads = res.cads as { summary: { targetsRequested: number; succeeded: number; failed: number } };
    expect(cads.summary.targetsRequested).toBe(ALL_TARGETS);
    expect(cads.summary.succeeded).toBe(ALL_TARGETS);
    expect(cads.summary.failed ?? 0).toBe(0);
  });

  it("accepts snake_case param aliases (output_dir, default_depth, part_name)", async () => {
    const res = await invoke("blueprint_to_all_cads", {
      analysis: plate(),
      default_depth: 8,
      part_name: "Custom",
      output_dir: "/tmp/x",
    });
    expect(res.success).toBe(true);
    const cads = res.cads as { summary: { succeeded: number } };
    expect(cads.summary.succeeded).toBe(ALL_TARGETS);
  });

  it("respects targets subset", async () => {
    const res = await invoke("blueprint_to_all_cads", {
      analysis: plate(),
      targets: ["fusion360", "esprit"],
    });
    expect(res.success).toBe(true);
    const cads = res.cads as { results: Array<{ target: string }> };
    expect(cads.results.map((r) => r.target)).toEqual(["fusion360", "esprit"]);
  });
});

describe("cadDispatcher — blueprint_to_all_cads_validate", () => {
  it("validates a valid analysis input as ok", async () => {
    const res = await invoke("blueprint_to_all_cads_validate", { analysis: plate() });
    expect(res.success).toBe(true);
    expect(res.valid).toBe(true);
    expect((res.errors as string[] | undefined) ?? []).toEqual([]);
  });

  it("validates missing image+analysis as invalid", async () => {
    const res = await invoke("blueprint_to_all_cads_validate", {});
    expect(res.success).toBe(true);
    expect(res.valid).toBe(false);
    expect((res.errors as string[]).join(" ")).toMatch(/exactly one of/);
  });

  it("validates double-supply (image+analysis) as invalid", async () => {
    const res = await invoke("blueprint_to_all_cads_validate", {
      image: { type: "base64", data: "x" },
      analysis: plate(),
    });
    expect(res.success).toBe(true);
    expect(res.valid).toBe(false);
    expect((res.errors as string[]).join(" ")).toMatch(/must NOT supply BOTH/);
  });
});

describe("cadDispatcher — blueprint_to_all_cads_capabilities", () => {
  it("returns engine capabilities (modes, maxTargets, version)", async () => {
    const res = await invoke("blueprint_to_all_cads_capabilities", {});
    expect(res.success).toBe(true);
    expect(res.version).toBe("1.0.0");
    expect([...(res.modes as string[])]).toEqual(["vision", "analysis"]);
    expect(res.maxTargets).toBe(ALL_TARGETS);
    expect(res.visionRequiresApiKey).toBe(true);
  });
});
