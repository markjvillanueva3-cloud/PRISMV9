/**
 * camDispatcher gcode_reverse_cad_reconstruct wiring fix
 * (U-DELTA-CNC-RECONSTRUCT-WIRE, slot:delta 2026-07-02)
 * =============================================================================
 * REGRESSION: the wired `gcode_reverse_cad_reconstruct` action passed the whole
 * `params` object as the engine's FIRST positional arg `blocks`, but the real
 * signature is reconstruct(blocks: ParsedBlock[], tools: Map, stock: StockBlock).
 * The engine's guard `if (!Array.isArray(blocks)) throw` therefore fired on EVERY
 * call — the action was 100% dead (threw "blocks must be an array" for every input).
 *
 * These tests prove the fix by ROUND-TRIPPING THROUGH THE DISPATCHER (not the
 * engine singleton, which already has its own suite): real reference values from
 * the canonical 4-tool program, tools accepted as array AND Record (JSON can't
 * carry a Map across the dispatcher boundary), and fail-loud on missing inputs.
 *
 * Reference program (100x80x50mm stock, vol=400,000mm^3):
 *   T1 10mm drill  depth25 -> hole        pi*5^2*25   = 1963.495
 *   T2 12mm endmill 40x30x15 -> pocket     40*30*15    = 18000
 *   T3 50mm facemill 80x60x1 -> face       80*60*1     = 4800
 *   T4 6mm tap     depth20 -> tapped_hole pi*3^2*20   = 565.487
 *   removed = 25,328.982 ; finished = 374,671.018
 */
import { describe, it, expect, beforeEach } from "vitest";
import { registerCamDispatcher, ACTIONS } from "../tools/dispatchers/camDispatcher.js";
import type { ParsedBlock } from "../engines/GCodeRuntimePredictorEngine.js";
import type { ToolEnvelope } from "../engines/GCodeReverseCADEngine.js";

// ── round-trip harness (mirrors camDispatcher.catalog-query-wire.test.ts) ──
interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, handler });
  }
}
async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: any }> {
  const tool = server.tools.find((t) => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  const raw = (await tool.handler({ action, params })) as {
    content?: { text: string }[];
    success?: boolean;
  };
  if (raw && typeof raw === "object" && "success" in raw && raw.success === false) {
    return { ok: false, data: raw };
  }
  const text = (raw as { content: { text: string }[] }).content[0]!.text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in (parsed as Record<string, unknown>)) {
    return { ok: false, data: parsed };
  }
  // These gcode actions wrap the payload in a { success:true, data:{...} } envelope
  // (slimResponse preserves the envelope) — unwrap to the real reconstruct payload.
  const p = parsed as Record<string, unknown>;
  const payload = p && typeof p === "object" && "success" in p && "data" in p ? p.data : parsed;
  return { ok: true, data: payload };
}

// ── canonical 4-tool reference program ──
const STD_STOCK = { min: { x: 0, y: 0, z: -50 }, max: { x: 100, y: 80, z: 0 } };
const BLOCKS: ParsedBlock[] = [
  { m: [6], t: 1 },
  { motion: "G0", x: 50, y: 40, z: 2 },
  { motion: "G83", x: 50, y: 40, z: -25, q: 5 },
  { m: [6], t: 2 },
  { motion: "G1", x: 10, y: 10, z: -1, f: 500 },
  { motion: "G1", x: 50, y: 10, z: -15, f: 500 },
  { motion: "G1", x: 50, y: 40, z: -15, f: 500 },
  { motion: "G1", x: 10, y: 40, z: -15, f: 500 },
  { motion: "G1", x: 10, y: 10, z: -15, f: 500 },
  { m: [6], t: 3 },
  { motion: "G1", x: 0, y: 0, z: -1, f: 500 },
  { motion: "G1", x: 80, y: 0, z: -1, f: 500 },
  { motion: "G1", x: 80, y: 60, z: -1, f: 500 },
  { motion: "G1", x: 0, y: 60, z: -1, f: 500 },
  { m: [6], t: 4 },
  { motion: "G0", x: 25, y: 25, z: 2 },
  { motion: "G84", x: 25, y: 25, z: -20 },
];
const TOOLS_ARRAY: ToolEnvelope[] = [
  { tool_number: 1, type: "drill", diameter_mm: 10 },
  { tool_number: 2, type: "endmill", diameter_mm: 12 },
  { tool_number: 3, type: "facemill", diameter_mm: 50 },
  { tool_number: 4, type: "tap", diameter_mm: 6 },
];

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerCamDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

describe("prism_cam gcode_reverse_cad_reconstruct — wiring fix round-trip", () => {
  it("action is registered in the ACTIONS enum", () => {
    expect(ACTIONS).toContain("gcode_reverse_cad_reconstruct");
  });

  it("reconstructs the finished part from the 4-tool program (tools as array)", async () => {
    const { ok, data } = await call(server, "gcode_reverse_cad_reconstruct", {
      blocks: BLOCKS,
      tools: TOOLS_ARRAY,
      stock: STD_STOCK,
    });
    expect(ok).toBe(true);
    // 4 distinct ops classify to 4 features (the whole point of back-inference)
    expect(data.features).toHaveLength(4);
    expect(data.feature_counts.hole).toBe(1);
    expect(data.feature_counts.pocket).toBe(1);
    expect(data.feature_counts.face).toBe(1);
    expect(data.feature_counts.tapped_hole).toBe(1);
    // real reference volumes
    expect(data.stock_volume_mm3).toBeCloseTo(400000, 3);
    expect(data.material_removed_mm3).toBeCloseTo(25328.982, 1);
    expect(data.finished_volume_mm3).toBeCloseTo(374671.018, 1);
    // conservation invariant must survive the dispatcher boundary
    expect(data.finished_volume_mm3 + data.material_removed_mm3).toBeCloseTo(
      data.stock_volume_mm3,
      3,
    );
  });

  it("accepts tools as a Record keyed by tool number (equivalent result)", async () => {
    const toolsRecord = {
      "1": { tool_number: 1, type: "drill", diameter_mm: 10 },
      "2": { tool_number: 2, type: "endmill", diameter_mm: 12 },
      "3": { tool_number: 3, type: "facemill", diameter_mm: 50 },
      "4": { tool_number: 4, type: "tap", diameter_mm: 6 },
    };
    const { ok, data } = await call(server, "gcode_reverse_cad_reconstruct", {
      blocks: BLOCKS,
      tools: toolsRecord,
      stock: STD_STOCK,
    });
    expect(ok).toBe(true);
    expect(data.features).toHaveLength(4);
    expect(data.material_removed_mm3).toBeCloseTo(25328.982, 1);
  });

  it("does NOT return the old 'method not callable' garbage (regression guard)", async () => {
    const { ok, data } = await call(server, "gcode_reverse_cad_reconstruct", {
      blocks: BLOCKS,
      tools: TOOLS_ARRAY,
      stock: STD_STOCK,
    });
    expect(ok).toBe(true);
    expect(JSON.stringify(data)).not.toContain("method not callable");
    // real summary content (the engine emits an operator-readable line per section)
    expect(Array.isArray(data.summary)).toBe(true);
    expect(data.summary.some((s: string) => s.includes("Features extracted: 4"))).toBe(true);
  });

  it("fail-loud: missing blocks is rejected (not silently wrong)", async () => {
    const { ok } = await call(server, "gcode_reverse_cad_reconstruct", {
      tools: TOOLS_ARRAY,
      stock: STD_STOCK,
    });
    expect(ok).toBe(false);
  });

  it("fail-loud: missing stock is rejected", async () => {
    const { ok } = await call(server, "gcode_reverse_cad_reconstruct", {
      blocks: BLOCKS,
      tools: TOOLS_ARRAY,
    });
    expect(ok).toBe(false);
  });

  it("unknown tool numbers are warned, not crashed (partial-catalog robustness)", async () => {
    const { ok, data } = await call(server, "gcode_reverse_cad_reconstruct", {
      blocks: BLOCKS,
      tools: [{ tool_number: 1, type: "drill", diameter_mm: 10 }], // only T1 known
      stock: STD_STOCK,
    });
    expect(ok).toBe(true);
    expect(data.warnings.length).toBeGreaterThan(0); // T2/T3/T4 skipped with a warning
    expect(data.feature_counts.hole).toBe(1); // T1 still reconstructs
  });
});
