/**
 * turning-thread-depth-override.test.ts -- slot:whiskey (TurningFeature TS2551 fix)
 * ============================================================================
 * Pre-existing latent bug: toOkumaOperations read `finitePos(feat?.thread_depth_mm, pitch*0.61)` but
 * `TurningFeature` had no `thread_depth_mm` field (tsc TS2551, latent in HEAD since 37411c797a). The
 * read was always `undefined` so thread depth always fell back to 0.61*pitch. Adding the optional
 * field resolves the type error and is the PRECONDITION for honoring a per-feature override.
 *
 * STATUS: the override is NOW end-to-end functional -- U-LW-THREAD-ROUTE routed the thread op types to
 * the G71 cycle, so the thread_depth block runs and the override reaches the emitted thread (the last
 * test asserts it). The history below records why it was dormant when this file was first written and
 * why a naive program_text differential was a false proof (the 3-of-3 analyst arm caught both):
 *   (1) `mapOkumaOpType` has no case for the thread op types (od_thread/id_thread/thread_single_point/
 *       thread_insert) -- they fall through to the `od_rough` catch-all -- so the `if (ot === "thread")`
 *       block in toOkumaOperations that sets okOp.thread_depth_mm is never reached for them. That
 *       routing gap is a SEPARATE documented bug (regression log / task U-LW-THREAD-ROUTE) and a
 *       real-machine G-code change, deferred for proper verification of the normal thread path.
 *   (2) A naive program_text differential is a FALSE proof here -- OkumaB250 emits a wall-clock
 *       `(GENERATED: <ISO timestamp>)` line, so two runs differ regardless of thread depth.
 *
 * So this file asserts ONLY what is verifiably TRUE: the interface now accepts the field (type fix),
 * and a threaded part runs through runPipeline without error or regression from the addition.
 */
import { describe, it, expect } from "vitest";
import { turningPrintToProgramEngine } from "../engines/TurningPrintToProgramEngine.js";

type PipeIn = Parameters<typeof turningPrintToProgramEngine.runPipeline>[0];

const threadedPart = (threadDepth?: number) => ({
  part_number: "THREAD-DEPTH-TEST",
  material: { material_name: "1018", iso_group: "P" as const },
  bar_stock_od_mm: 30,
  part_length_mm: 50,
  features: [
    { id: "f1", type: "od_straight" as const, od_mm: 24, length_mm: 20, position_z_mm: 0,
      x_start_mm: 30, x_end_mm: 24, z_start_mm: 0, z_end_mm: -20 },
    { id: "t1", type: "thread_od" as const, od_mm: 24, length_mm: 20, position_z_mm: -20,
      thread_pitch_mm: 1.5, thread_depth_mm: threadDepth,
      x_start_mm: 24, x_end_mm: 24, z_start_mm: -20, z_end_mm: -40 },
  ],
  controller: "okuma",
  machine_model: "Okuma LB3000",
});
const run = (i: unknown) => turningPrintToProgramEngine.runPipeline(i as PipeIn);

// Strip the non-deterministic generated-timestamp line so equality is over real content only
// (the false-proof the analyst arm caught: OkumaB250 emits `(GENERATED: <ISO>)`).
const stripTimestamp = (g: string) => g.replace(/\(GENERATED:[^)]*\)/g, "(GENERATED)");

describe("thread_depth_mm field (TurningFeature TS2551 fix -- type correctness)", () => {
  it("DEFAULT: a threaded part with NO thread_depth_mm runs + emits (no regression)", () => {
    const r = run(threadedPart(undefined));
    expect(r.success).toBe(true);
    expect(r.program_text.length).toBeGreaterThan(0);
  });

  it("the interface now ACCEPTS an explicit thread_depth_mm and the part still emits (no crash)", () => {
    const r = run(threadedPart(1.2));
    expect(r.success).toBe(true);
    expect(r.program_text.length).toBeGreaterThan(0);
  });

  it("OVERRIDE NOW FLOWS (U-LW-THREAD-ROUTE closed the gap): a shallow vs deep thread_depth_mm yields DIFFERENT emitted G-code", () => {
    // U-LW-THREAD-ROUTE connected the thread op types to the G71 cycle, so the thread_depth block in
    // toOkumaOperations now runs and the override reaches the emitted thread. Timestamp-stripped, a
    // shallow vs deep override now DIFFERS (this assertion was `toBe` while the gap was open).
    const shallow = stripTimestamp(run(threadedPart(0.5)).program_text);
    const deep = stripTimestamp(run(threadedPart(1.3)).program_text);
    expect(shallow).not.toBe(deep); // the override reaches the emitted thread cycle
  });
});
