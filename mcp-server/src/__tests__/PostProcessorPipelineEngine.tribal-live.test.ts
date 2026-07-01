/**
 * PostProcessorPipelineEngine — LIVE tribal-DB augmentation (U-PP-TRIBAL-LIVE-WIRE)
 *
 * Locks the contract for wiring the previously-DORMANT tribal knowledge DB
 * (3,700+ tips via prismSelfAwarenessEngine.searchTribalKnowledgeSync) into
 * pipeline Stage 5.3. Before this wire, Stage 5.3 emitted only ~6 hardcoded
 * ISO-group strings and the live DB was bypassed (the 2026-06-30 legit-proof
 * audit's #1 customer-value gap).
 *
 * WHY this matters (R9 — tests verify intent, not behavior):
 *   The wire is OPT-IN (stages.tribal_knowledge_live, default OFF) precisely so
 *   the emitted NC stays BYTE-IDENTICAL by default — the golden-NC byte-lock
 *   snapshots (post-golden-drift-cron) must not drift, and no safety-relevant NC
 *   output changes without an explicit operator flag. These tests fail the instant
 *   (a) the default stops being byte-identical, (b) an enabled lookup stops
 *   reaching the emitted comments, (c) a DB read failure stops being fail-soft, or
 *   (d) the dedup/cap guards regress. Every assertion is a real reference value.
 *
 * Contract anchors (read from source, not assumed):
 *   - PostProcessorPipelineEngine.ts  Stage 5.3 `5.3_tribal_knowledge` runs when
 *     stageFlags.tribal_knowledge && material; live block gated on
 *     stageFlags.tribal_knowledge_live (default s.tribal_knowledge_live === true).
 *   - _getEngine("selfAwareness") -> prismSelfAwarenessEngine singleton (lazy import).
 *   - live tips appended to `warnings` as `TK[<source>]: <tip>`; hardcoded tips as `TK: ...`.
 *   - stage data: { tips_applied, live_tips_applied, material_group }; MAX_LIVE = 12.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  postProcessorPipelineEngine,
  type PipelineInput,
  type PipelineOutput,
  type ToolContext,
} from "../engines/PostProcessorPipelineEngine.js";
import { prismSelfAwarenessEngine } from "../engines/PRISMSelfAwarenessEngine.js";

const NEUTRAL_TOOL: ToolContext = {
  id: "1",
  catalog_id: "TEST-EM-10",
  manufacturer: "TEST",
  type: "flat_endmill",
  diameter_mm: 10,
  flute_count: 4,
  flute_length_mm: 30,
  overall_length_mm: 75,
  corner_radius_mm: 0,
  material: "carbide",
  coating: "uncoated",
  rake_angle_deg: 6,
  lead_angle_deg: 45,
  wear_VB_mm: 0,
  edge_radius_um: 0,
  resolution_confidence: 1,
};

/**
 * ISO-M (stainless) single-cut job so Stage 5.3 always emits its 2 hardcoded
 * "TK: Stainless…" / "TK: Reduce speed…" tips regardless of the live flag.
 * `live` undefined => flag absent (proves default-OFF).
 */
function makeInput(live?: boolean): PipelineInput {
  return {
    blocks: [
      { id: 0, move_type: "G0", x: 0, y: 0, z: 5, tool_number: 1 },
      { id: 1, move_type: "G1", x: 20, y: 0, z: 3, feed_mm_min: 400, spindle_rpm: 3000, tool_number: 1 },
    ],
    material: { name: "17-4PH Stainless", iso_group: "M" } as any,
    tools: [{ ...NEUTRAL_TOOL }],
    operations: [{ type: "milling" }] as any,
    controller: "fanuc",
    aggressiveness: 0.5,
    stages: {
      tribal_knowledge: true,
      ...(live !== undefined ? { tribal_knowledge_live: live } : {}),
    } as any,
  };
}

function stage53(out: PipelineOutput): { tips_applied: number; live_tips_applied: number; material_group: string } {
  const s = out.stages.find((st) => st.stage === "5.3_tribal_knowledge");
  if (!s) throw new Error("Stage 5.3_tribal_knowledge not present in pipeline output");
  expect(s.status).not.toBe("skipped");
  expect(s.status).not.toBe("fail");
  return s.data as any;
}

const liveWarnings = (out: PipelineOutput): string[] => out.warnings.filter((w) => w.startsWith("TK["));
const hardcodedTribal = (out: PipelineOutput): string[] =>
  out.warnings.filter((w) => w.startsWith("TK: "));

afterEach(() => vi.restoreAllMocks());

describe("PostProcessorPipelineEngine — Stage 5.3 live tribal-DB augmentation", () => {
  it("stage 5.3 runs for an ISO-M job and emits the hardcoded baseline tips", async () => {
    const out = await postProcessorPipelineEngine.process(makeInput());
    const data = stage53(out);
    // Two hardcoded stainless tips are the pre-wire baseline.
    expect(hardcodedTribal(out)).toContain("TK: Stainless — avoid rubbing (causes work hardening), use sharp tools");
    expect(data.material_group).toBe("M");
    expect(data.tips_applied).toBeGreaterThanOrEqual(2);
  });

  it("DEFAULT (flag absent) does NOT touch the live DB — byte-identical, spy never called", async () => {
    const spy = vi.spyOn(prismSelfAwarenessEngine, "searchTribalKnowledgeSync").mockReturnValue([
      { tip: "should-never-appear", title: "x", category: "c", source: "unit", confidence: 0.9 },
    ]);
    const out = await postProcessorPipelineEngine.process(makeInput()); // no live flag
    expect(spy).not.toHaveBeenCalled();
    expect(liveWarnings(out)).toHaveLength(0);
    expect(stage53(out).live_tips_applied).toBe(0);
  });

  it("explicit tribal_knowledge_live:false is byte-identical to the flag-absent run", async () => {
    const spy = vi.spyOn(prismSelfAwarenessEngine, "searchTribalKnowledgeSync").mockReturnValue([
      { tip: "should-never-appear", title: "x", category: "c", source: "unit", confidence: 0.9 },
    ]);
    const off = await postProcessorPipelineEngine.process(makeInput(false));
    expect(spy).not.toHaveBeenCalled();
    // The warnings a customer/operator sees are identical whether the flag is absent or explicitly false.
    const absent = await postProcessorPipelineEngine.process(makeInput());
    expect(off.warnings).toEqual(absent.warnings);
    expect(liveWarnings(off)).toHaveLength(0);
  });

  it("ENABLED: real DB tips reach the emitted NC as source-tagged TK[…] comments", async () => {
    const spy = vi.spyOn(prismSelfAwarenessEngine, "searchTribalKnowledgeSync").mockReturnValue([
      { tip: "Peck 17-4PH deep holes to clear gummy chips", title: "t", category: "drilling", source: "jm-die", confidence: 0.9 },
      { tip: "Sharp uncoated carbide reduces BUE on stainless", title: "t", category: "milling", source: "sandvik", confidence: 0.8 },
    ]);
    const out = await postProcessorPipelineEngine.process(makeInput(true));
    expect(spy).toHaveBeenCalled();
    const lw = liveWarnings(out);
    expect(lw).toContain("TK[jm-die]: Peck 17-4PH deep holes to clear gummy chips");
    expect(lw).toContain("TK[sandvik]: Sharp uncoated carbide reduces BUE on stainless");
    expect(stage53(out).live_tips_applied).toBe(2);
    // Hardcoded baseline STILL emits alongside the live augmentation (additive, not a replacement).
    expect(hardcodedTribal(out).length).toBeGreaterThanOrEqual(2);
  });

  it("queries the DB by material name, operation type, and tool type", async () => {
    const spy = vi.spyOn(prismSelfAwarenessEngine, "searchTribalKnowledgeSync").mockReturnValue([]);
    await postProcessorPipelineEngine.process(makeInput(true));
    const queries = spy.mock.calls.map((c) => c[0]);
    expect(queries).toContain("17-4PH Stainless");
    expect(queries).toContain("milling");
    expect(queries).toContain("flat_endmill");
  });

  it("ENABLED but empty DB is byte-identical to OFF (no phantom comments)", async () => {
    vi.spyOn(prismSelfAwarenessEngine, "searchTribalKnowledgeSync").mockReturnValue([]);
    const onEmpty = await postProcessorPipelineEngine.process(makeInput(true));
    const off = await postProcessorPipelineEngine.process(makeInput(false));
    expect(onEmpty.warnings).toEqual(off.warnings);
    expect(liveWarnings(onEmpty)).toHaveLength(0);
    expect(stage53(onEmpty).live_tips_applied).toBe(0);
  });

  it("FAIL-SOFT: a DB read that throws never blocks the post; hardcoded tips still emit", async () => {
    vi.spyOn(prismSelfAwarenessEngine, "searchTribalKnowledgeSync").mockImplementation(() => {
      throw new Error("tribal DB unreadable");
    });
    const out = await postProcessorPipelineEngine.process(makeInput(true));
    const data = stage53(out);
    expect(data.live_tips_applied).toBe(0);
    expect(liveWarnings(out)).toHaveLength(0);
    // The stage did NOT fail — hardcoded baseline survived the live-lookup failure.
    expect(hardcodedTribal(out).length).toBeGreaterThanOrEqual(2);
    expect(out.overall_status).not.toBe("fail");
  });

  it("caps live tips at MAX_LIVE=12 to bound comment bloat", async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      tip: `distinct-live-tip-${i}`,
      title: "t",
      category: "milling",
      source: "corpus",
      confidence: 0.9,
    }));
    vi.spyOn(prismSelfAwarenessEngine, "searchTribalKnowledgeSync").mockReturnValue(many);
    const out = await postProcessorPipelineEngine.process(makeInput(true));
    expect(stage53(out).live_tips_applied).toBe(12);
    expect(liveWarnings(out)).toHaveLength(12);
  });

  it("de-duplicates identical tips across queries", async () => {
    vi.spyOn(prismSelfAwarenessEngine, "searchTribalKnowledgeSync").mockReturnValue([
      { tip: "same tip repeated", title: "t", category: "milling", source: "corpus", confidence: 0.9 },
      { tip: "same tip repeated", title: "t", category: "milling", source: "corpus", confidence: 0.9 },
    ]);
    const out = await postProcessorPipelineEngine.process(makeInput(true));
    expect(stage53(out).live_tips_applied).toBe(1);
    expect(liveWarnings(out)).toEqual(["TK[corpus]: same tip repeated"]);
  });

  it("skips entries with empty/whitespace tip text (no bare TK[…]: lines)", async () => {
    vi.spyOn(prismSelfAwarenessEngine, "searchTribalKnowledgeSync").mockReturnValue([
      { tip: "", title: "", category: "milling", source: "corpus", confidence: 0.9 },
      { tip: "real actionable tip", title: "t", category: "milling", source: "corpus", confidence: 0.9 },
    ]);
    const out = await postProcessorPipelineEngine.process(makeInput(true));
    const lw = liveWarnings(out);
    expect(lw).toEqual(["TK[corpus]: real actionable tip"]);
    expect(lw.some((w) => w === "TK[corpus]: ")).toBe(false);
  });

  it("preserves the exact TK[source]: tip comment format", async () => {
    vi.spyOn(prismSelfAwarenessEngine, "searchTribalKnowledgeSync").mockReturnValue([
      { tip: "climb mill only on thin walls", title: "t", category: "milling", source: "titans-of-cnc", confidence: 0.9 },
    ]);
    const out = await postProcessorPipelineEngine.process(makeInput(true));
    expect(liveWarnings(out)).toEqual(["TK[titans-of-cnc]: climb mill only on thin walls"]);
  });
});
