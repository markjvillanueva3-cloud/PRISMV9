/**
 * SwissOrphanWiring.test.ts — INTEL-OLLAMA-OBSIDIAN-MS1/P1-U04
 *
 * Wires 4 previously-orphan Swiss-type engines to prism_turning dispatcher:
 *   - SwissTypeDecisionEngine          (swiss_route_decide)
 *   - SwissGuideBushingPhysicsEngine   (swiss_guide_feed_limits, swiss_guide_clearance)
 *   - SwissPartTransferSequenceEngine  (swiss_part_transfer)
 *   - SwissChannelFileEmitterEngine    (swiss_emit_channel_files)
 *
 * Coverage per action: happy path + ≥3 failure modes + ≥2 adversarial inputs.
 * Round-trip via dispatcher proves enum + schema + lazy import + engine align.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";
import { swissGuideBushingPhysicsEngine } from "../engines/SwissGuideBushingPhysicsEngine.js";
import { swissPartTransferSequenceEngine } from "../engines/SwissPartTransferSequenceEngine.js";
import { swissChannelFileEmitterEngine } from "../engines/SwissChannelFileEmitterEngine.js";

// ----------------------------------------------------------------------------
// Reference values (pulled from engine source — keep in sync with constants there)
// ----------------------------------------------------------------------------
/** Hard-block diameter cap from SwissTypeDecisionEngine.SWISS_BAR_CAP_MM */
const SWISS_BAR_CAP_MM = 42;
/** Hard-block length cap from SwissTypeDecisionEngine.SWISS_FEED_STROKE_MAX_MM */
const SWISS_FEED_STROKE_MAX_MM = 500;
/** Verdict score returned for hard blocks per engine code */
const HARD_BLOCK_SCORE = -100;
/** Score threshold to recommend Swiss per SwissTypeDecisionEngine */
const SWISS_THRESHOLD = 30;
/** ISO group clearance multipliers from MATERIAL_CLEARANCE_FACTOR table */
const ISO_M_FACTOR = 1.3;
const ISO_P_FACTOR = 1.0;
/** Algebraic invariants for assertions */
const FEED_DOUBLE_RATIO = 2.0;          // δ ∝ F (linear in feed force)
const FEED_DOUBLE_PRECISION = 1;        // toBeCloseTo digits
const ISO_RATIO_TOLERANCE = 0.2;        // additive thermal_bump variance
const ISO_RATIO_LOWER_BOUND = 1.1;      // M/P factor minimum
const THERMAL_BUMP_MM = 0.001;          // surface_speed > 200 m/min bump
const THERMAL_BUMP_PRECISION = 4;
const MIN_CLEARANCE_BASELINE_MM = 0.005;
const MIN_TRANSFER_STEPS = 4;
const MIN_FILE_LINE_COUNT = 2;
const MIN_HEADER_BYTES = 20;
const BIG_BODY_LINE_COUNT = 500;

// ----------------------------------------------------------------------------
// Test fixtures
// ----------------------------------------------------------------------------
const SWISS_RECOMMENDED_SPEC = {
  length_mm: 120,
  max_diameter_mm: 5,
  tightest_tolerance_mm: 0.003,
  has_live_operations: true,
  annual_quantity: 5000,
  material: "303-stainless",
};
const HARD_CONVENTIONAL_SPEC = {
  length_mm: 100,
  max_diameter_mm: 50,
  tightest_tolerance_mm: 0.05,
  has_live_operations: false,
  annual_quantity: 100,
  material: "1018-steel",
};
const AMBIGUOUS_SPEC = {
  length_mm: 60,
  max_diameter_mm: 30,
  tightest_tolerance_mm: 0.01,
  has_live_operations: false,
  annual_quantity: 100,
  material: "303",
};

const STAINLESS_FEED_INPUT = {
  mode: "gb_on" as const,
  bar_od_mm: 10,
  part_length_mm: 60,
  bushing_engagement_mm: 12,
  youngs_modulus_gpa: 200,
  yield_mpa: 240,
  kc_mpa: 2100,
  spindle_rpm: 4000,
  feed_per_rev_mm: 0.05,
  ap_mm: 0.4,
};
const FEED_DOUBLED_INPUT = { ...STAINLESS_FEED_INPUT, feed_per_rev_mm: 0.10 };

const TRANSFER_INPUT_BASE = {
  dialect: "citizen" as const,
  main_rpm: 3000,
  sub_rpm: 3000,
  phase_sync: false,
  grip_z_mm: 5,
  cutoff_z_mm: -2,
  cutoff_feed_mm_rev: 0.04,
  retract_z_mm: 200,
  collet_mu: 0.15,
  sensor_confirm: true,
};

const EMIT_INPUT_BASE = {
  dialect: "citizen" as const,
  program_number: 1234,
  program_comment: "P1-U04 test",
  channels: [
    { channel_id: 1, label: "main", body: ["G0 X10", "G1 Z-5 F0.05"] },
    { channel_id: 2, label: "sub",  body: ["G0 X10", "G1 Z-3 F0.04"] },
  ],
  sync_points: [
    { after_op: "rough_main", wait_channels: [1, 2], type: "generic" as const },
  ],
  cycle_time_est_min: 1.2,
};

// ----------------------------------------------------------------------------
// Capture registered handler — fakeServer pattern
// ----------------------------------------------------------------------------
type DispatcherResult = { content: { type: "text"; text: string }[]; isError?: boolean };
type Handler = (req: { action: string; params?: Record<string, unknown> }) => Promise<DispatcherResult>;
let handler: Handler;

beforeAll(() => {
  let captured: Handler | null = null;
  const fakeServer = {
    tool: (_name: string, _desc: string, _schema: unknown, h: Handler) => { captured = h; },
  };
  registerTurningDispatcher(fakeServer as never);
  if (!captured) throw new Error("registerTurningDispatcher did not invoke server.tool()");
  handler = captured;
});

async function call(action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const res = await handler({ action, params }) as Record<string, unknown>;
  const content = res.content as Array<{ type: string; text: string }> | undefined;
  if (content?.[0]?.type === "text") return JSON.parse(content[0].text) as Record<string, unknown>;
  if (typeof res.error === "string") return res;
  throw new Error(`Unexpected dispatcher response: ${JSON.stringify(res).slice(0, 200)}`);
}

// ============================================================================
// swiss_route_decide
// ============================================================================
describe("swiss_route_decide", () => {
  it("ROUND-TRIP: dispatcher → engine returns swiss_recommended for long thin part", async () => {
    const r = await call("swiss_route_decide", SWISS_RECOMMENDED_SPEC);
    expect(r.verdict).toBe("swiss_recommended");
    expect(r.score as number).toBeGreaterThanOrEqual(SWISS_THRESHOLD);
    // No hard block on this spec → at least one scoring rule must have fired
    expect((r.rules_fired as unknown[]).length).toBeGreaterThan(0);
  });

  it("variability: hard-block diameter (>cap) returns hard_conventional", async () => {
    const r = await call("swiss_route_decide", HARD_CONVENTIONAL_SPEC);
    expect(r.verdict).toBe("hard_conventional");
    expect(r.score).toBe(HARD_BLOCK_SCORE);
    expect(r.hard_block_reason as string).toContain(String(SWISS_BAR_CAP_MM));
  });

  it("variability: middle-of-road spec returns ambiguous with score=0", async () => {
    const r = await call("swiss_route_decide", AMBIGUOUS_SPEC);
    expect(r.verdict).toBe("ambiguous");
    expect(r.score).toBe(0);
  });

  it("schema rejects negative length_mm", () => {
    const r = TURNING_ACTION_SCHEMAS.swiss_route_decide.safeParse({
      ...SWISS_RECOMMENDED_SPEC, length_mm: -1,
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects missing has_live_operations", () => {
    const { has_live_operations: _drop, ...partial } = SWISS_RECOMMENDED_SPEC;
    const r = TURNING_ACTION_SCHEMAS.swiss_route_decide.safeParse(partial);
    expect(r.success).toBe(false);
  });

  it("schema rejects empty material string", () => {
    const r = TURNING_ACTION_SCHEMAS.swiss_route_decide.safeParse({
      ...SWISS_RECOMMENDED_SPEC, material: "",
    });
    expect(r.success).toBe(false);
  });

  it("adversarial: NaN length_mm returns soft error string from dispatcher", async () => {
    const r = await call("swiss_route_decide", { ...SWISS_RECOMMENDED_SPEC, length_mm: NaN });
    expect(typeof r.error).toBe("string");
    expect((r.error as string).length).toBeGreaterThan(0);
  });

  it("adversarial: length over feed-stroke cap returns hard_conventional", async () => {
    const r = await call("swiss_route_decide", { ...SWISS_RECOMMENDED_SPEC, length_mm: SWISS_FEED_STROKE_MAX_MM + 1, max_diameter_mm: 5 });
    expect(r.verdict).toBe("hard_conventional");
    expect(r.score).toBe(HARD_BLOCK_SCORE);
    expect(r.hard_block_reason as string).toContain(String(SWISS_FEED_STROKE_MAX_MM));
  });
});

// ============================================================================
// swiss_guide_feed_limits
// ============================================================================
describe("swiss_guide_feed_limits", () => {
  it("ROUND-TRIP: gb_on moderate feed reports feed_limited_by='ok' and ratio<1", async () => {
    const r = await call("swiss_guide_feed_limits", STAINLESS_FEED_INPUT);
    expect(r.mode).toBe("gb_on");
    expect(r.feed_limited_by).toBe("ok");
    expect(r.deflection_ratio as number).toBeLessThan(1.0);
    expect(r.computed_deflection_mm as number).toBeGreaterThan(0);
  });

  it("variability: gb_off has lower max_feed than gb_on (cantilever vs supported)", () => {
    const onResult = swissGuideBushingPhysicsEngine.feedLimits("gb_on", STAINLESS_FEED_INPUT as never);
    const offResult = swissGuideBushingPhysicsEngine.feedLimits("gb_off", STAINLESS_FEED_INPUT as never);
    expect(offResult.max_feed_per_rev_mm).toBeLessThan(onResult.max_feed_per_rev_mm);
  });

  it("variability: extreme feed triggers feed_limited_by='deflection'", async () => {
    const r = await call("swiss_guide_feed_limits", {
      ...STAINLESS_FEED_INPUT, feed_per_rev_mm: 0.5, ap_mm: 2.0,
    });
    expect(r.feed_limited_by).toBe("deflection");
    expect(r.deflection_ratio as number).toBeGreaterThanOrEqual(1.0);
  });

  it("schema rejects mode='gb_invalid'", () => {
    const r = TURNING_ACTION_SCHEMAS.swiss_guide_feed_limits.safeParse({
      ...STAINLESS_FEED_INPUT, mode: "gb_invalid",
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects negative bar_od_mm", () => {
    const r = TURNING_ACTION_SCHEMAS.swiss_guide_feed_limits.safeParse({
      ...STAINLESS_FEED_INPUT, bar_od_mm: -1,
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects spindle_rpm=0 (positive guard)", () => {
    const r = TURNING_ACTION_SCHEMAS.swiss_guide_feed_limits.safeParse({
      ...STAINLESS_FEED_INPUT, spindle_rpm: 0,
    });
    expect(r.success).toBe(false);
  });

  it("adversarial: doubling feed exactly doubles deflection (linear in F)", () => {
    const a = swissGuideBushingPhysicsEngine.feedLimits("gb_on", STAINLESS_FEED_INPUT as never);
    const b = swissGuideBushingPhysicsEngine.feedLimits("gb_on", FEED_DOUBLED_INPUT as never);
    const ratio = b.computed_deflection_mm / a.computed_deflection_mm;
    expect(ratio).toBeCloseTo(FEED_DOUBLE_RATIO, FEED_DOUBLE_PRECISION);
  });

  it("adversarial: 600mm part in gb_off mode exceeds deflection limit (ratio>1)", async () => {
    const r = await call("swiss_guide_feed_limits", {
      ...STAINLESS_FEED_INPUT, part_length_mm: 600, mode: "gb_off",
    });
    expect(r.deflection_ratio as number).toBeGreaterThan(1.0);
    expect(r.feed_limited_by).toBe("deflection");
  });
});

// ============================================================================
// swiss_guide_clearance
// ============================================================================
describe("swiss_guide_clearance", () => {
  it("ROUND-TRIP: ISO-P bar 10mm returns clearance min<nominal<max all >0", async () => {
    const r = await call("swiss_guide_clearance", { bar_od_mm: 10, iso_group: "P" });
    expect(r.min_mm as number).toBeGreaterThan(0);
    expect(r.clearance_mm as number).toBeGreaterThan(r.min_mm as number);
    expect(r.max_mm as number).toBeGreaterThan(r.clearance_mm as number);
    expect(r.rationale as string).toContain("P");
  });

  it("variability: ISO-M factor=1.3 yields larger clearance than ISO-P factor=1.0", () => {
    const p = swissGuideBushingPhysicsEngine.recommendClearance({ bar_od_mm: 10, iso_group: "P" });
    const m = swissGuideBushingPhysicsEngine.recommendClearance({ bar_od_mm: 10, iso_group: "M" });
    const ratio = m.clearance_mm / p.clearance_mm;
    expect(ratio).toBeGreaterThanOrEqual(ISO_RATIO_LOWER_BOUND);
    expect(ratio).toBeLessThanOrEqual(ISO_M_FACTOR / ISO_P_FACTOR + ISO_RATIO_TOLERANCE);
  });

  it("variability: ISO-N (aluminum gummy) yields larger clearance than ISO-K (cast iron clean)", () => {
    const n = swissGuideBushingPhysicsEngine.recommendClearance({ bar_od_mm: 10, iso_group: "N" });
    const k = swissGuideBushingPhysicsEngine.recommendClearance({ bar_od_mm: 10, iso_group: "K" });
    expect(n.clearance_mm).toBeGreaterThan(k.clearance_mm);
  });

  it("schema rejects iso_group='X' (unknown)", () => {
    const r = TURNING_ACTION_SCHEMAS.swiss_guide_clearance.safeParse({
      bar_od_mm: 10, iso_group: "X",
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects bar_od_mm=0", () => {
    const r = TURNING_ACTION_SCHEMAS.swiss_guide_clearance.safeParse({
      bar_od_mm: 0, iso_group: "P",
    });
    expect(r.success).toBe(false);
  });

  it("engine throws on bar_od > 80mm via dispatcher", async () => {
    const r = await call("swiss_guide_clearance", { bar_od_mm: 100, iso_group: "P" });
    expect(typeof r.error).toBe("string");
    expect(r.error as string).toMatch(/80/);
  });

  it("adversarial: high surface_speed bumps clearance by thermal_bump", () => {
    const slow = swissGuideBushingPhysicsEngine.recommendClearance({
      bar_od_mm: 10, iso_group: "P", surface_speed_m_per_min: 100,
    });
    const fast = swissGuideBushingPhysicsEngine.recommendClearance({
      bar_od_mm: 10, iso_group: "P", surface_speed_m_per_min: 300,
    });
    expect(fast.clearance_mm - slow.clearance_mm).toBeCloseTo(THERMAL_BUMP_MM, THERMAL_BUMP_PRECISION);
  });

  it("adversarial: 80mm bar (boundary) accepted with positive clearance", async () => {
    const r = await call("swiss_guide_clearance", { bar_od_mm: 80, iso_group: "P" });
    expect(r.clearance_mm as number).toBeGreaterThan(MIN_CLEARANCE_BASELINE_MM);
  });
});

// ============================================================================
// swiss_part_transfer
// ============================================================================
describe("swiss_part_transfer", () => {
  it("ROUND-TRIP: citizen dialect returns >=4 ordered steps + sync_points + line arrays", async () => {
    const r = await call("swiss_part_transfer", TRANSFER_INPUT_BASE);
    expect(r.dialect).toBe("citizen");
    const steps = r.steps as Array<{ step: number; channel: number; description: string; gcode: string }>;
    expect(steps.length).toBeGreaterThanOrEqual(MIN_TRANSFER_STEPS);
    expect(steps[0].step).toBe(1);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].step).toBe(steps[i - 1].step + 1);
    }
    expect((r.main_lines as string[]).length).toBeGreaterThan(0);
    expect((r.sub_lines as string[]).length).toBeGreaterThan(0);
  });

  it.each([
    ["citizen", "M81"],
    ["star", "M210"],
    ["mazak", "M43"],
  ])("variability: dialect=%s emits sub_advance code %s in line stream", (dialect, code) => {
    const r = swissPartTransferSequenceEngine.generate({
      ...TRANSFER_INPUT_BASE, dialect: dialect as never,
    });
    const allLines = [...r.main_lines, ...r.sub_lines, ...r.steps.map((s) => s.gcode)].join("\n");
    expect(allLines).toContain(code);
  });

  it("engine throws when phase_sync=true and main_rpm !== sub_rpm", async () => {
    const r = await call("swiss_part_transfer", {
      ...TRANSFER_INPUT_BASE, phase_sync: true, sub_rpm: 4000,
    });
    expect(typeof r.error).toBe("string");
    expect((r.error as string).toLowerCase()).toContain("phase");
  });

  it("schema rejects unknown dialect 'unknown_brand'", () => {
    const r = TURNING_ACTION_SCHEMAS.swiss_part_transfer.safeParse({
      ...TRANSFER_INPUT_BASE, dialect: "unknown_brand",
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects collet_mu=0.5 (out of [0.1, 0.3])", () => {
    const r = TURNING_ACTION_SCHEMAS.swiss_part_transfer.safeParse({
      ...TRANSFER_INPUT_BASE, collet_mu: 0.5,
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects negative cutoff_feed_mm_rev", () => {
    const r = TURNING_ACTION_SCHEMAS.swiss_part_transfer.safeParse({
      ...TRANSFER_INPUT_BASE, cutoff_feed_mm_rev: -0.05,
    });
    expect(r.success).toBe(false);
  });

  it("adversarial: cutoff_z >= grip_z generates explicit warning", () => {
    const r = swissPartTransferSequenceEngine.generate({
      ...TRANSFER_INPUT_BASE, cutoff_z_mm: 10, grip_z_mm: 5,
    });
    const warnsAboutZ = r.warnings.filter((w) => w.includes("cutoff_z_mm") && w.includes("grip_z_mm"));
    expect(warnsAboutZ.length).toBeGreaterThan(0);
  });

  it("adversarial: collet-close step always precedes cut-off feed step (safety invariant)", () => {
    const r = swissPartTransferSequenceEngine.generate(TRANSFER_INPUT_BASE);
    // Use distinctive substrings — "collet close" only appears in clamping step,
    // "Cut-off feed" only appears in the part-off feed step (cutoff RPM hold uses different phrasing).
    const clampStep = r.steps.find((s) => /collet close/i.test(s.description));
    const cutStep = r.steps.find((s) => /cut-off feed/i.test(s.description));
    expect(clampStep === undefined).toBe(false);
    expect(cutStep === undefined).toBe(false);
    const clampIdx = (clampStep as { step: number }).step;
    const cutIdx = (cutStep as { step: number }).step;
    expect(clampIdx).toBeLessThan(cutIdx);
  });
});

// ============================================================================
// swiss_emit_channel_files
// ============================================================================
describe("swiss_emit_channel_files", () => {
  it("ROUND-TRIP: citizen 2-channel program produces non-empty file with line_count>=2", async () => {
    const r = await call("swiss_emit_channel_files", EMIT_INPUT_BASE);
    expect(r.dialect).toBe("citizen");
    const files = r.channel_files as Array<{ text: string; line_count: number; channel_id: number }>;
    expect(files.length).toBeGreaterThanOrEqual(1);
    expect(files[0].line_count).toBeGreaterThanOrEqual(MIN_FILE_LINE_COUNT);
    expect(files[0].text.length).toBeGreaterThan(MIN_HEADER_BYTES);
  });

  it.each([
    ["citizen", true],
    ["tsugami", true],
    ["star", false],
  ])("variability: dialect=%s channel_files_separate=%s", (dialect, expectedSeparate) => {
    const r = swissChannelFileEmitterEngine.emit({
      ...EMIT_INPUT_BASE, dialect: dialect as never,
    });
    expect(r.channel_files_separate).toBe(expectedSeparate);
  });

  it("variability: dmg_mori uses CHANDATA blocks in single combined file", () => {
    const r = swissChannelFileEmitterEngine.emit({
      ...EMIT_INPUT_BASE, dialect: "dmg_mori",
    });
    expect(r.channel_files_separate).toBe(false);
    expect(r.channel_files[0].text).toContain("CHANDATA");
  });

  it("schema rejects program_number=0 (out of [1,9999])", () => {
    const r = TURNING_ACTION_SCHEMAS.swiss_emit_channel_files.safeParse({
      ...EMIT_INPUT_BASE, program_number: 0,
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects empty channels array", () => {
    const r = TURNING_ACTION_SCHEMAS.swiss_emit_channel_files.safeParse({
      ...EMIT_INPUT_BASE, channels: [],
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects channel without body field", () => {
    const r = TURNING_ACTION_SCHEMAS.swiss_emit_channel_files.safeParse({
      ...EMIT_INPUT_BASE,
      channels: [{ channel_id: 1, label: "main" }],
    });
    expect(r.success).toBe(false);
  });

  it("adversarial: 500-line body emits at least 500 lines (no truncation)", () => {
    const bigBody = Array.from({ length: BIG_BODY_LINE_COUNT }, (_, i) => `N${i} G1 X${i}`);
    const r = swissChannelFileEmitterEngine.emit({
      ...EMIT_INPUT_BASE,
      channels: [
        { channel_id: 1, body: bigBody },
        { channel_id: 2, body: ["G0 X0"] },
      ],
    });
    const totalLines = r.channel_files.reduce((sum, f) => sum + f.line_count, 0);
    expect(totalLines).toBeGreaterThanOrEqual(BIG_BODY_LINE_COUNT);
  });

  it("adversarial: single-channel input emits exactly one file (separate dialect)", () => {
    const r = swissChannelFileEmitterEngine.emit({
      ...EMIT_INPUT_BASE,
      channels: [{ channel_id: 1, body: ["G0 X0", "M30"] }],
      sync_points: [],
    });
    expect(r.channel_files.length).toBe(1);
    expect(r.channel_files[0].line_count).toBeGreaterThanOrEqual(MIN_FILE_LINE_COUNT);
  });
});
