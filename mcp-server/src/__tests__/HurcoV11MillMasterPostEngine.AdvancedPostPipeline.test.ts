/**
 * HurcoV11MillMasterPostEngine — AdvancedPost Pipeline (AdvancedPostProcessor wiring)
 *
 * @milestone PPG-WIRE-MS5/U-PPGW-AdvancedPost-Wiring
 *
 * Validates that `generateProgramAdvanced()` threads the post-AutoSpeedFeed
 * G-code through `advancedPostProcessorEngine.enhance()` with controller='hurco',
 * gates `multi_axis` to ≥4-axis machines, and surfaces requested vs applied
 * features in `advanced_summary.advanced_post`.
 *
 * Mirrors HurcoV11MillMasterPostEngine.RapidPipeline.test.ts. The sync
 * `output.gcode` and the existing AS/F + RapidReposition passes remain
 * untouched when `advanced_post` config is omitted.
 */
import { describe, it, expect } from "vitest";
import {
  hurcoV11MillMasterPostEngine,
  type MillOperation,
} from "../engines/HurcoV11MillMasterPostEngine.js";

const TOOL_NUM = 5;
const TOOL_DIA_MM = 12;
const TOOL_FLUTES = 4;
const SPINDLE_RPM = 4000;
const FEED_MM_MIN = 800;
const AXIAL_DOC_MM = 2;
const RADIAL_DOC_MM = 6;
const PROGRAM_NUMBER = 9100;
const HURCO_3AXIS_MACHINE_ID = "jmdie_hurco_v11";

const baseOp: MillOperation = {
  operation_type: "pocket",
  tool_number: TOOL_NUM,
  tool_diameter_mm: TOOL_DIA_MM,
  tool_flutes: TOOL_FLUTES,
  material_iso: "P",
  spindle_rpm: SPINDLE_RPM,
  feed_mm_min: FEED_MM_MIN,
  axial_depth_mm: AXIAL_DOC_MM,
  radial_depth_mm: RADIAL_DOC_MM,
  coordinates: [
    { x: 0, y: 0, z: 25, type: "rapid" },
    { x: 100, y: 0, z: 25, type: "rapid" },
    { x: 100, y: 0, z: -2, type: "linear" },
    { x: 100, y: 80, z: -2, type: "linear" },
    { x: 0, y: 80, z: -2, type: "linear" },
    { x: 0, y: 0, z: -2, type: "linear" },
  ],
};

const HSM_FINISH = {
  corner_rounding_tolerance: 0.005,
  smoothing_mode: "finish" as const,
  nurbs_interpolation: false,
  arc_fitting: true,
  arc_tolerance: 0.005,
  min_arc_radius: 0.5,
  max_arc_radius: 50,
};

const RTCP_G43_4 = {
  rtcp_mode: "G43.4" as const,
  tilt_axis: "AC" as const,
  tool_vector_output: false,
  singularity_avoidance: false,
  singularity_tolerance: 5,
  inverse_time_feed: false,
};

// Cold-start of AS/F + RapidReposition + AdvancedPost passes incurs the
// TribalKnowledge / playbook lazy-init (~13s on slow disks). Lift the
// per-test timeout above the default 5s for the first describe block
// so CI does not flake on cold cache.
describe("HurcoV11.generateProgramAdvanced — AdvancedPost pass gating", () => {
  it("returns advanced_post=null when advanced_post config is omitted but other passes still run", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER,
      use_advanced_features: true,
      machine_id: HURCO_3AXIS_MACHINE_ID,
    });
    expect(out.advanced_summary?.advanced_post).toBeNull();
    expect(out.advanced_features_applied).not.toContain("advanced_post_processing");
    expect(out.advanced_features_applied).toContain("auto_speed_feed_optimization");
    expect(out.advanced_features_applied).toContain("rapid_reposition_optimization");
    expect(out.advanced_features_applied).toHaveLength(2);
  }, 30_000);

  it("returns advanced_summary=null and empty enhancements list in fully-disabled advanced mode", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 1,
    });
    expect(out.advanced_summary).toBeNull();
    expect(out.advanced_features_applied).toEqual([]);
    expect(out.optimized_gcode).toBeNull();
  });

  it("appends 'advanced_post_processing' as the third enhancement when advanced_post supplied", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 2,
      use_advanced_features: true,
      machine_id: HURCO_3AXIS_MACHINE_ID,
      advanced_post: { hsm: HSM_FINISH },
    });
    expect(out.advanced_features_applied).toEqual([
      "auto_speed_feed_optimization",
      "rapid_reposition_optimization",
      "advanced_post_processing",
    ]);
  });

  it("populates advanced_post.controller_used = 'hurco' (hard-mapped, not 'fanuc' or 'haas')", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 3,
      use_advanced_features: true,
      machine_id: HURCO_3AXIS_MACHINE_ID,
      advanced_post: { hsm: HSM_FINISH },
    });
    const ap = out.advanced_summary?.advanced_post;
    expect(ap?.controller_used).toBe("hurco");
  });
});

describe("HurcoV11.generateProgramAdvanced — requested_features catalog", () => {
  it("requested_features lists exactly ['hsm'] when only hsm supplied", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 10,
      use_advanced_features: true,
      machine_id: HURCO_3AXIS_MACHINE_ID,
      advanced_post: { hsm: HSM_FINISH },
    });
    expect(out.advanced_summary?.advanced_post?.requested_features).toEqual(["hsm"]);
  });

  it("requested_features contains hsm + tool_management + feed_optimization when all three supplied", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 11,
      use_advanced_features: true,
      machine_id: HURCO_3AXIS_MACHINE_ID,
      advanced_post: {
        hsm: HSM_FINISH,
        tool_management: {
          sister_tooling: true,
          max_tool_life_minutes: 60,
          break_detection: false,
          break_detection_method: "probe",
          wear_offset_increment: 0,
          auto_offset_update: false,
        },
        feed_optimization: {
          chip_thinning: false,
          corner_slowdown: true,
          corner_radius_threshold: 1.0,
          corner_feed_factor: 0.6,
          plunge_rate_factor: 0.5,
          retract_rapid: true,
        },
      },
    });
    const reqd = out.advanced_summary?.advanced_post?.requested_features ?? [];
    expect(reqd.sort()).toEqual(["feed_optimization", "hsm", "tool_management"]);
  });

  it("requested_features is exactly [] when advanced_post is provided as empty object", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 12,
      use_advanced_features: true,
      machine_id: HURCO_3AXIS_MACHINE_ID,
      advanced_post: {},
    });
    expect(out.advanced_summary?.advanced_post?.requested_features).toEqual([]);
    // Pass still runs (advanced_post object provided)
    expect(out.advanced_features_applied).toContain("advanced_post_processing");
  });
});

describe("HurcoV11.generateProgramAdvanced — 5-axis gate (axis_count<4 → skip multi_axis)", () => {
  it("skips multi_axis on jmdie_hurco_v11 (3-axis VMX24) with exact gate-warning text", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 20,
      use_advanced_features: true,
      machine_id: HURCO_3AXIS_MACHINE_ID,
      advanced_post: { multi_axis: RTCP_G43_4 },
    });
    const warnings = out.advanced_summary?.advanced_post?.warnings ?? [];
    expect(warnings).toContain(
      "AdvancedPost: multi_axis (RTCP) skipped — resolved machine 'jmdie_hurco_v11' is 3-axis; RTCP requires axis_count >= 4 (e.g. Hurco VMX5x).",
    );
  });

  it("when gate fires: requested_features still includes multi_axis but enhancements_applied does NOT include multi_axis_rtcp", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 21,
      use_advanced_features: true,
      machine_id: HURCO_3AXIS_MACHINE_ID,
      advanced_post: { multi_axis: RTCP_G43_4 },
    });
    const ap = out.advanced_summary?.advanced_post;
    expect(ap?.requested_features).toEqual(["multi_axis"]);
    expect(ap?.enhancements_applied).not.toContain("multi_axis_rtcp");
  });

  it("when gate fires: optimized_gcode does NOT contain 'G43.4 H#1' RTCP activation", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 22,
      use_advanced_features: true,
      machine_id: HURCO_3AXIS_MACHINE_ID,
      advanced_post: { multi_axis: RTCP_G43_4 },
    });
    const finalGcode = (out.optimized_gcode ?? []).join("\n");
    expect(finalGcode).not.toContain("G43.4 H#1");
  });

  it("does NOT skip multi_axis when machine_id is omitted (no machine = no axis_count check)", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 23,
      use_advanced_features: true,
      // machine_id omitted
      advanced_post: { multi_axis: RTCP_G43_4 },
    });
    const warnings = out.advanced_summary?.advanced_post?.warnings ?? [];
    const skipMatches = warnings.filter((w) => w.includes("multi_axis (RTCP) skipped"));
    expect(skipMatches).toEqual([]);
  });
});

describe("HurcoV11.generateProgramAdvanced — Hurco dialect emission in optimized_gcode", () => {
  it("HSM finish smoothing emits the V11 control-panel comment annotation in final G-code", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 30,
      use_advanced_features: true,
      machine_id: HURCO_3AXIS_MACHINE_ID,
      advanced_post: { hsm: HSM_FINISH },
    });
    const finalGcode = (out.optimized_gcode ?? []).join("\n");
    expect(finalGcode).toContain(
      "(HURCO V11: smoothing tol target ~0.005mm — set in WinMax UI)",
    );
    expect(finalGcode).toContain(
      "(HURCO V11: corner blend tol=0.005mm — set in WinMax UI)",
    );
    // Bare G64 line (not Fanuc-style G64 P{tol})
    expect(finalGcode).not.toMatch(/\bG64\s+P0\.005\b/);
    expect(finalGcode).not.toMatch(/\bG62\s+P1\b/);
  });

  it("AdvancedPost warnings include the 'WinMax control panel' note when smoothing requested", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 31,
      use_advanced_features: true,
      machine_id: HURCO_3AXIS_MACHINE_ID,
      advanced_post: { hsm: HSM_FINISH },
    });
    const warnings = out.advanced_summary?.advanced_post?.warnings ?? [];
    const cpw = warnings.filter(
      (w) => w.includes("Hurco V11") && w.includes("WinMax control panel"),
    );
    expect(cpw).toHaveLength(1);
    expect(cpw[0]).toContain(
      "smoothing tolerance is set in the WinMax control panel",
    );
  });
});

describe("HurcoV11.generateProgramAdvanced — output_lines + savings invariants", () => {
  it("output_lines equals (optimized_gcode ?? []).length exactly", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 40,
      use_advanced_features: true,
      machine_id: HURCO_3AXIS_MACHINE_ID,
      advanced_post: { hsm: HSM_FINISH },
    });
    const finalLineCount = (out.optimized_gcode ?? []).length;
    expect(out.advanced_summary?.advanced_post?.output_lines).toBe(finalLineCount);
    expect(finalLineCount).toBeGreaterThan(0);
  });

  it("estimated_time_savings_pct is bounded by AdvancedPostProcessor's [0, 50] cap", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 41,
      use_advanced_features: true,
      machine_id: HURCO_3AXIS_MACHINE_ID,
      advanced_post: { hsm: HSM_FINISH },
    });
    const pct = out.advanced_summary?.advanced_post?.estimated_time_savings_pct ?? -1;
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(50);
  });
});

describe("HurcoV11.generateProgramAdvanced — sync byte-identical regression", () => {
  // Mask the only line that varies between two calls in the same tick — the
  // ISO-millisecond GENERATED stamp.
  const stripGenerated = (lines: string[]) =>
    lines.filter((l) => !l.startsWith("(GENERATED:"));

  it("output.gcode is byte-identical (modulo timestamp) between sync and AdvancedPost-enabled calls", async () => {
    const sync = hurcoV11MillMasterPostEngine.generateProgram([baseOp], {
      program_number: PROGRAM_NUMBER + 50,
    });
    const adv = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 50,
      use_advanced_features: true,
      machine_id: HURCO_3AXIS_MACHINE_ID,
      advanced_post: { hsm: HSM_FINISH },
    });
    expect(stripGenerated(adv.gcode).join("\n")).toBe(
      stripGenerated(sync.gcode).join("\n"),
    );
  });

  it("physics_checks length matches between sync and AdvancedPost-enabled calls", async () => {
    const sync = hurcoV11MillMasterPostEngine.generateProgram([baseOp], {
      program_number: PROGRAM_NUMBER + 51,
    });
    const adv = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 51,
      use_advanced_features: true,
      machine_id: HURCO_3AXIS_MACHINE_ID,
      advanced_post: { hsm: HSM_FINISH },
    });
    expect(adv.physics_checks).toHaveLength(sync.physics_checks.length);
  });
});

describe("HurcoV11.generateProgramAdvanced — NaN coords throw structured error", () => {
  it("rejects with HurcoV11 prefix when MillOperation.coordinates contain NaN", async () => {
    const badOp: MillOperation = {
      ...baseOp,
      coordinates: [
        { x: 0, y: 0, z: 25, type: "rapid" },
        { x: NaN, y: 0, z: -2, type: "linear" },
      ],
    };
    await expect(
      hurcoV11MillMasterPostEngine.generateProgramAdvanced([badOp], {
        program_number: PROGRAM_NUMBER + 60,
        use_advanced_features: true,
        machine_id: HURCO_3AXIS_MACHINE_ID,
        advanced_post: { hsm: HSM_FINISH },
      }),
    ).rejects.toThrow(/HurcoV11.*Invalid coordinate/);
  });
});
