/**
 * U-MILL-LORA-PIPELINE-COORDINATOR — wire the orphaned MillLoRAPipelineCoordinatorEngine
 * (mill parity for the turning-wired Lathe coordinator) into millDispatcher (prism_mill).
 *
 * Verifies (a) the engine builds the canonical 13-stage mill LoRA pipeline with the 4
 * MILL-CANONICAL stages, and (b) the `mill_lora_pipeline_coord_create` action round-trips
 * through the REAL dispatcher (registerMillDispatcher → fakeServer handler), with the
 * Map→array stage serialization landing in the JSON response (the lathe parity drops it).
 *
 * slot:bravo /loop (2026-06-01, claude-5e210e4e). @module __tests__/millDispatcher.mill-lora-pipeline-coord
 */
import { describe, it, expect, beforeAll } from "vitest";
import { z } from "zod";

import { millLoRAPipelineCoordinatorEngine } from "../engines/MillLoRAPipelineCoordinatorEngine.js";
import { registerMillDispatcher, MILL_ACTIONS } from "../tools/dispatchers/millDispatcher.js";

const CANONICAL_STAGE_COUNT = 13;
const MILL_CANONICAL_TYPES = [
  "chatter_stability_calibration",
  "tcpm_post_validation",
  "first_piece_audit",
  "thermal_warmup",
];

describe("MillLoRAPipelineCoordinatorEngine.createMillStandardPipeline (engine-direct)", () => {
  it("builds the canonical 13-stage mill pipeline incl. all 4 MILL-CANONICAL stages", () => {
    const p = millLoRAPipelineCoordinatorEngine.createMillStandardPipeline("shared", "test");
    const stages = [...p.stages.values()];
    expect(stages.length).toBe(CANONICAL_STAGE_COUNT);
    expect(p.axis_mode).toBe("shared");
    const types = stages.map((s) => s.type);
    for (const t of MILL_CANONICAL_TYPES) expect(types).toContain(t);
    // The AS9102 first-piece-audit gate depends on BOTH eval + tcpm (it blocks deployment).
    const fpa = stages.find((s) => s.type === "first_piece_audit");
    expect(fpa?.depends_on).toContain("s-eval");
    expect(fpa?.depends_on).toContain("s-tcpm");
  });

  it("tags the pipeline axis_mode so the same template runs per cell type without contamination", () => {
    const a = millLoRAPipelineCoordinatorEngine.createMillStandardPipeline("5_axis_simul", "fiveaxis");
    expect(a.axis_mode).toBe("5_axis_simul");
    expect(a.name).toContain("5_axis_simul");
  });
});

describe("prism_mill::mill_lora_pipeline_coord_create (dispatcher round-trip)", () => {
  type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: "text"; text: string }>;
  }>;
  let invoke: (action: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;

  beforeAll(() => {
    let captured: Handler | undefined;
    const fakeServer = {
      tool: (_n: string, _d: string, _s: { action: z.ZodEnum; params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>> }, handler: Handler) => {
        captured = handler;
      },
    };
    registerMillDispatcher(fakeServer);
    if (!captured) throw new Error("registerMillDispatcher did not register the prism_mill tool");
    const h = captured;
    invoke = async (action, params = {}) => JSON.parse((await h({ action, params })).content[0].text) as Record<string, unknown>;
  });

  it("registers the action in MILL_ACTIONS", () => {
    expect((MILL_ACTIONS as readonly string[]).includes("mill_lora_pipeline_coord_create")).toBe(true);
  });

  it("create returns the canonical pipeline with stages serialized as an array (not a dropped Map)", async () => {
    const r = await invoke("mill_lora_pipeline_coord_create", { axis_mode: "shared", namePrefix: "rt" });
    expect(Array.isArray(r.stages)).toBe(true);
    const stages = r.stages as Array<{ type: string }>;
    expect(stages.length).toBe(CANONICAL_STAGE_COUNT);
    expect(r.axis_mode).toBe("shared");
    expect(typeof r.id).toBe("string");
    const types = stages.map((s) => s.type);
    for (const t of MILL_CANONICAL_TYPES) expect(types).toContain(t);
  });

  it("defaults axis_mode to 'shared' when omitted", async () => {
    const r = await invoke("mill_lora_pipeline_coord_create", {});
    expect(r.axis_mode).toBe("shared");
  });
});
