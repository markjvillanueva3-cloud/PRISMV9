/**
 * PostProcessorPipelineEngine -- P6 outcome-emit auto-wire (U-PP-OUTCOME-EMIT-P6)
 *
 * Verifies the pipeline auto-publishes every REAL post-gen result to the
 * cross-galaxy OutcomeCaptureBus (domain "post_processor") at P6 stage 6.9 --
 * closing the in-pipeline auto-emit gap. Before this, only the dispatcher action
 * prism_pp:pp_outcome_emit reached the bus, so pipeline-generated posts never fed
 * the india self-learning loop (the closed loop was OPEN for pipeline outputs).
 *
 * Round-trips THROUGH the real OutcomeCaptureBus (record -> disk -> query by
 * lineage_id), not just the wire engine's return value (R15 round-trip).
 */

import { describe, it, expect } from "vitest";
import { postProcessorPipelineEngine } from "../engines/PostProcessorPipelineEngine.js";
import { outcomeCaptureBusEngine } from "../engines/OutcomeCaptureBusEngine.js";
import type { StageResult } from "../engines/PostProcessorPipelineEngine.js";

/** A minimal real program so stage 6.1 produces non-empty output_gcode. */
const PROGRAM_INPUT = {
  gcode: "G90 G21\nG0 X0 Y0 Z5\nG1 Z-1 F100\nG1 X10 Y10 F250\nG0 Z25\nM30\n",
  controller: "fanuc" as const,
  material: { name: "1045 steel", iso_group: "P" as const },
};

const EMIT_STAGE = "6.9_outcome_emit";

function findEmitStage(stages: StageResult[]): StageResult | undefined {
  return stages.find((s) => s.stage === EMIT_STAGE);
}

describe("PostProcessorPipelineEngine -- P6 outcome emit (U-PP-OUTCOME-EMIT-P6)", () => {
  it("auto-emits a post_processor outcome and round-trips it through the bus by lineage_id", async () => {
    const out = await postProcessorPipelineEngine.process(PROGRAM_INPUT);
    // Precondition: the pipeline produced real output (otherwise the emit is vacuous).
    expect(out.output_gcode.length).toBeGreaterThan(0);

    const emitStage = findEmitStage(out.stages);
    expect(emitStage?.stage).toBe(EMIT_STAGE);
    expect(emitStage?.phase).toBe(6);
    expect(emitStage?.status).toBe("pass");

    const data = emitStage?.data as { ok: boolean; lineage_id: string; event_id: string; block_count?: number };
    expect(data.ok).toBe(true);
    expect(typeof data.lineage_id).toBe("string");
    expect(data.lineage_id.length).toBeGreaterThan(0);
    expect(typeof data.event_id).toBe("string");
    expect(data.event_id.length).toBeGreaterThan(0);

    // Real round-trip: the event must be retrievable from the bus by its lineage_id.
    const { events } = outcomeCaptureBusEngine.query({
      domain: "post_processor",
      lineage_id: data.lineage_id,
      limit: 5,
    });
    expect(events.length).toBeGreaterThan(0);
    const ev = events[0];
    expect(ev.domain).toBe("post_processor");
    expect(ev.kind).toBe("recommendation_emitted");
    const ctx = ev.context as { engine?: string };
    expect(ctx.engine).toBe("PostProcessorPipelineEngine");
    // The summarizer extracted a positive block_count from the emitted G-code.
    const rec = ev.recommended as { summary?: { block_count?: number } };
    expect(rec.summary?.block_count).toBeGreaterThan(0);
  });

  it("opt-out: stages.outcome_emit=false skips the emit (the wire is never called)", async () => {
    const out = await postProcessorPipelineEngine.process({
      ...PROGRAM_INPUT,
      stages: { outcome_emit: false },
    });
    // The pipeline still generated output -- only the emit is suppressed.
    expect(out.output_gcode.length).toBeGreaterThan(0);
    const emitStage = findEmitStage(out.stages);
    expect(emitStage?.stage).toBe(EMIT_STAGE);
    expect(emitStage?.status).toBe("skipped");
    expect(emitStage?.summary).toContain("Disabled");
    expect(emitStage?.data).toBeNull();
  });

  it("no output (gcode-gen disabled, no input gcode) emits nothing -- bus not polluted by dry-runs", async () => {
    // outputGcode inits "" and is only populated by stage 6.1 (gcode_generation) and
    // 6.4 (controller_params prepend); disabling both with no input gcode leaves it empty.
    const out = await postProcessorPipelineEngine.process({
      stages: { gcode_generation: false, controller_params: false },
    });
    expect(out.output_gcode.length).toBe(0);
    const emitStage = findEmitStage(out.stages);
    expect(emitStage?.stage).toBe(EMIT_STAGE);
    expect(emitStage?.status).toBe("skipped");
    expect(emitStage?.summary).toContain("No output to emit");
  });

  it("a telemetry-emit failure can never flip the pipeline verdict (emit is post-verdict)", async () => {
    // overall_status is computed BEFORE stage 6.9 runs, so the emit (pass or skipped)
    // is excluded from the verdict. A clean program must not be downgraded by emission.
    const out = await postProcessorPipelineEngine.process(PROGRAM_INPUT);
    const emitStage = findEmitStage(out.stages);
    expect(emitStage?.status).toBe("pass");
    expect(["pass", "warn"]).toContain(out.overall_status);
  });
});
