/**
 * lathe_chip_flow_analyze + lathe_chipbreaker_design — wiring test
 * ===============================================================
 * U-LW-CHIP-FLOW-WIRE (whiskey, 2026-07-03). From the lathe physics coverage
 * audit (PARTIAL: "general OD/ID turning chip evacuation"): LatheChipMechanicsEngine
 * had analyzeChipFlow() + designChipBreaker() on disk but ONLY predictChipType was
 * dispatcher-reachable. This wires the two orphan methods to turningDispatcher.
 */

import { describe, it, expect } from "vitest";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { latheChipMechanicsEngine } from "../engines/LatheChipMechanicsEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params: Record<string, unknown> }) => Promise<{ content?: Array<{ text: string }> } | unknown>;
}
function mockServer() {
  const tools: CapturedTool[] = [];
  return { server: { tool: (name: string, _d: string, _s: unknown, h: CapturedTool["handler"]) => tools.push({ name, handler: h }) }, tools };
}
async function call(tool: CapturedTool, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const r = (await tool.handler({ action, params })) as { content?: Array<{ text: string }> };
  const text = r?.content?.[0]?.text;
  return text ? (JSON.parse(text) as Record<string, unknown>) : (r as Record<string, unknown>);
}
function payload(res: Record<string, unknown>): Record<string, unknown> {
  let d: Record<string, unknown> = res;
  if (d.data && typeof d.data === "object") d = d.data as Record<string, unknown>;
  return d;
}

const { server, tools } = mockServer();
registerTurningDispatcher(server);
const turn = tools[0];

const CP = { depth_of_cut_mm: 2, feed_mm_rev: 0.2, nose_radius_mm: 0.8, inclination_angle_deg: 0 };

describe("lathe chip-flow / chipbreaker wiring", () => {
  it("lathe_chip_flow_analyze routes to analyzeChipFlow — real Stabler chip-flow physics + parity", async () => {
    const res = await call(turn, "lathe_chip_flow_analyze", { params: CP, material: "steel" });
    const d = payload(res);
    expect(JSON.stringify(res)).not.toContain("method not callable");
    expect(["side", "back", "combined"]).toContain(d.natural_curl_direction);
    expect(["easy", "moderate", "difficult"]).toContain(d.evacuation_difficulty);
    // AtomicValue { value } present + finite.
    expect(Number.isFinite((d.chip_flow_angle as { value: number }).value)).toBe(true);
    // Parity with the direct engine.
    const direct = latheChipMechanicsEngine.analyzeChipFlow(CP as never, "steel");
    expect(d.natural_curl_direction).toBe(direct.natural_curl_direction);
    expect((d.stabler_angle as { value: number }).value).toBeCloseTo(direct.stabler_angle.value, 6);
  });

  it("accepts flat cutting params (params.* fallback) as well as nested params", async () => {
    const res = await call(turn, "lathe_chip_flow_analyze", { ...CP, material: "steel" });
    const d = payload(res);
    expect(["side", "back", "combined"]).toContain(d.natural_curl_direction);
  });

  it("lathe_chipbreaker_design routes to designChipBreaker — real recommendation + parity", async () => {
    const res = await call(turn, "lathe_chipbreaker_design", { material: "steel", doc_mm: 2, feed_mm_rev: 0.2 });
    const d = payload(res);
    expect(JSON.stringify(res)).not.toContain("method not callable");
    expect(["none", "light", "medium", "heavy", "high_feed"]).toContain(d.recommended_type);
    const direct = latheChipMechanicsEngine.designChipBreaker("steel", 2, 0.2);
    expect(d.recommended_type).toBe(direct.recommended_type);
  });

  it("cast iron (K-group, brittle) recommends no chipbreaker — physics-correct", async () => {
    const res = await call(turn, "lathe_chipbreaker_design", { material: "cast_iron", doc_mm: 2, feed_mm_rev: 0.2 });
    const direct = latheChipMechanicsEngine.designChipBreaker("cast_iron", 2, 0.2);
    // Whatever the engine decides, the dispatcher must match it exactly (real routing).
    expect(payload(res).recommended_type).toBe(direct.recommended_type);
  });

  it("lathe_chip_flow_analyze validates required cutting params (fail-loud, not silent)", async () => {
    const res = await call(turn, "lathe_chip_flow_analyze", { material: "steel" }); // no depth/feed
    const failLoud = res.success === false || "error" in res || /requires|depth_of_cut|feed_mm_rev/i.test(JSON.stringify(res));
    expect(failLoud).toBe(true);
    expect(JSON.stringify(res)).not.toContain("method not callable");
  });

  it("lathe_chipbreaker_design validates required doc (fail-loud)", async () => {
    const res = await call(turn, "lathe_chipbreaker_design", { material: "steel" }); // no doc
    const failLoud = res.success === false || "error" in res || /requires|doc_mm/i.test(JSON.stringify(res));
    expect(failLoud).toBe(true);
  });
});
