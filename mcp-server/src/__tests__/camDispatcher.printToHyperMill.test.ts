/**
 * Round-trip dispatcher tests for print_to_hypermill action group
 * (CAD-COMPLETE-MS0/U-CADC-HM-PRINT-01)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";
import type { BlueprintAnalysis, ExtractedDimension } from "../engines/BlueprintOCREngine.js";
import type { ExtractedProfile } from "../engines/BlueprintVisionOCREngine.js";

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
  registerCamDispatcher(server as unknown as Parameters<typeof registerCamDispatcher>[0]);
  const tool = server.tools.find((t) => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam tool was not registered");
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
    title_block: { part_number: "JM-X", units: "mm", confidence: 0.9, material: "1018 steel" },
    notes: [],
    summary: {
      total_dimensions: 3, total_gdt: 0, total_notes: 0,
      tightest_tolerance_mm: 0.05, critical_features: [], material: "1018 steel", has_gdt: false,
    },
  };
}

function holeProfile(d = 8): ExtractedProfile {
  return {
    id: `hole-${d}`, name: "Hole", type: "hole",
    points: [{ x: 0, y: 0 }], is_closed: true, diameter_mm: d, confidence: 0.95,
  };
}

describe("camDispatcher — print_to_hypermill round-trip", () => {
  it("dispatches profiles input and emits 1 drilling op", async () => {
    const res = await invoke("print_to_hypermill", { profiles: [holeProfile(10)] });
    expect(res.success).toBe(true);
    expect(res.opsEmitted).toBe(1);
    const summary = res.operationSummary as Array<{ type: string; tool: number }>;
    expect(summary[0]?.type).toBe("drilling");
    expect(summary[0]?.tool).toBe(1);
  });

  it("dimensions-only fallback through dispatcher path", async () => {
    const res = await invoke("print_to_hypermill", { analysis: plate() });
    expect(res.success).toBe(true);
    expect(res.opsEmitted).toBe(2);
    const summary = res.operationSummary as Array<{ type: string }>;
    const types = summary.map(s => s.type);
    expect(types).toContain("hpc_roughing");
    expect(types).toContain("z_level_finishing");
    const provenance = res.provenance as { source: string };
    expect(provenance.source).toBe("dimensions_only");
  });

  it("snake_case alias normalized (default_depth, part_name, post_processor)", async () => {
    const res = await invoke("print_to_hypermill", {
      profiles: [holeProfile()],
      part_name: "AliasPart",
      default_depth: 12,
      post_processor: "omPPHH",
    });
    expect(res.success).toBe(true);
    expect(res.partName).toBe("AliasPart");
  });

  it("validate via dispatcher returns valid:false on empty input", async () => {
    const res = await invoke("print_to_hypermill_validate", {});
    expect(res.success).toBe(true);
    expect(res.valid).toBe(false);
    expect((res.warnings as string[]).join(" ")).toMatch(/at least one of/);
  });

  it("validate via dispatcher returns valid:true on profiles input", async () => {
    const res = await invoke("print_to_hypermill_validate", { profiles: [holeProfile()] });
    expect(res.success).toBe(true);
    expect(res.valid).toBe(true);
  });

  it("capabilities via dispatcher exposes supported profile types + 4 default tools", async () => {
    const res = await invoke("print_to_hypermill_capabilities", {});
    expect(res.success).toBe(true);
    expect(res.version).toBe("1.1.0");
    const sup = res.supportedProfileTypes as string[];
    expect([...sup].sort()).toEqual(["external", "hole", "pocket"]);
    const tools = res.defaultTools as Array<{ number: number; role: string }>;
    expect(tools.length).toBe(4);
  });
});
