/**
 * OkumaOSPMillMasterPostEngine — AdvancedPost Pipeline (AdvancedPostProcessor wiring)
 *
 * @milestone PPG-WIRE-MS5/U-PPGW-AdvancedPost-Wiring
 *
 * Validates that `generateProgramAdvanced()` threads the post-AutoSpeedFeed
 * G-code through `advancedPostProcessorEngine.enhance()` with controller='okuma',
 * gates `multi_axis` to P500 family only (P300 is 3-axis MB-V), and surfaces
 * requested vs applied features in `advanced_summary.advanced_post`.
 *
 * Mirrors HurcoV11MillMasterPostEngine.AdvancedPostPipeline.test.ts. The
 * sync `output.gcode`, the AS/F pass, and the RapidReposition pass are all
 * preserved when `advanced_post` config is omitted.
 */
import { describe, it, expect } from "vitest";
import {
  okumaOSPMillMasterPostEngine,
  type MillOperation,
} from "../engines/OkumaOSPMillMasterPostEngine.js";

const TOOL_NUM = 5;
const TOOL_DIA_MM = 12;
const TOOL_FLUTES = 4;
const SPINDLE_RPM = 4000;
const FEED_MM_MIN = 800;
const AXIAL_DOC_MM = 2;
const RADIAL_DOC_MM = 6;
const PROGRAM_NUMBER = 9200;

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
describe("OkumaOSPMill.generateProgramAdvanced — AdvancedPost pass gating", () => {
  it("returns advanced_post=null when advanced_post config is omitted but AS/F + RapidReposition still run", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER,
      osp_family: "P300",
      use_advanced_features: true,
    });
    expect(out.advanced_summary?.advanced_post).toBeNull();
    expect(out.advanced_features_applied).not.toContain("advanced_post_processing");
    expect(out.advanced_features_applied).toContain("auto_speed_feed_optimization");
    expect(out.advanced_features_applied).toContain("rapid_reposition_optimization");
    expect(out.advanced_features_applied).toContain("hsm_dwell_optimization");
    expect(out.advanced_features_applied).toContain("feature_sequence_optimization");
    expect(out.advanced_features_applied).toHaveLength(4);
  }, 30_000);

  it("returns advanced_summary=null and empty enhancements when use_advanced_features=false", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 1,
      osp_family: "P300",
    });
    expect(out.advanced_summary).toBeNull();
    expect(out.advanced_features_applied).toEqual([]);
    expect(out.optimized_gcode).toBeNull();
  });

  it("appends 'advanced_post_processing' as fifth enhancement when advanced_post supplied", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 2,
      osp_family: "P300",
      use_advanced_features: true,
      advanced_post: { hsm: HSM_FINISH },
    });
    expect(out.advanced_features_applied).toEqual([
      "auto_speed_feed_optimization",
      "rapid_reposition_optimization",
      "hsm_dwell_optimization",
      "feature_sequence_optimization",
      "advanced_post_processing",
    ]);
  });

  it("populates advanced_post.controller_used = 'okuma' (hard-mapped)", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 3,
      osp_family: "P500",
      use_advanced_features: true,
      advanced_post: { hsm: HSM_FINISH },
    });
    expect(out.advanced_summary?.advanced_post?.controller_used).toBe("okuma");
  });
});

describe("OkumaOSPMill.generateProgramAdvanced — requested_features catalog", () => {
  it("requested_features lists exactly ['hsm'] when only hsm supplied", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 10,
      osp_family: "P500",
      use_advanced_features: true,
      advanced_post: { hsm: HSM_FINISH },
    });
    expect(out.advanced_summary?.advanced_post?.requested_features).toEqual(["hsm"]);
  });

  it("requested_features contains hsm + tool_management + feed_optimization when all three supplied", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 11,
      osp_family: "P500",
      use_advanced_features: true,
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
});

describe("OkumaOSPMill.generateProgramAdvanced — P300 5-axis gate (3-axis MB-V → skip multi_axis)", () => {
  it("skips multi_axis on P300 (3-axis MB-V family) with exact gate-warning text", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 20,
      osp_family: "P300",
      use_advanced_features: true,
      advanced_post: { multi_axis: RTCP_G43_4 },
    });
    const warnings = out.advanced_summary?.advanced_post?.warnings ?? [];
    expect(warnings).toContain(
      "AdvancedPost: multi_axis (RTCP) skipped — P300 family is 3-axis MB-V, RTCP requires P500 (5-axis MU-V).",
    );
  });

  it("when P300 gate fires: requested_features still includes multi_axis but enhancements_applied does NOT", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 21,
      osp_family: "P300",
      use_advanced_features: true,
      advanced_post: { multi_axis: RTCP_G43_4 },
    });
    const ap = out.advanced_summary?.advanced_post;
    expect(ap?.requested_features).toEqual(["multi_axis"]);
    expect(ap?.enhancements_applied).not.toContain("multi_axis_rtcp");
  });

  it("when P300 gate fires: optimized_gcode does NOT contain G43.4 H#1 RTCP activation", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 22,
      osp_family: "P300",
      use_advanced_features: true,
      advanced_post: { multi_axis: RTCP_G43_4 },
    });
    const finalGcode = (out.optimized_gcode ?? []).join("\n");
    expect(finalGcode).not.toContain("G43.4 H#1");
  });
});

describe("OkumaOSPMill.generateProgramAdvanced — P500 5-axis applies multi_axis", () => {
  // Provide 5-axis op so RTCP injector finds rotary moves to gate on
  const fiveAxisOp: MillOperation = {
    ...baseOp,
    operation_type: "3d_surface",
    coordinates: [
      { x: 0, y: 0, z: 25, type: "rapid" },
      { x: 100, y: 0, z: 25, type: "rapid" },
      { x: 100, y: 0, z: -2, type: "linear" },
      { x: 100, y: 80, z: -2, type: "linear" },
    ],
    rotary_a_deg: 30,
    rotary_c_deg: 45,
  };

  it("does NOT push the P300-skip warning on P500 family", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([fiveAxisOp], {
      program_number: PROGRAM_NUMBER + 30,
      osp_family: "P500",
      use_advanced_features: true,
      advanced_post: { multi_axis: RTCP_G43_4 },
    });
    const warnings = out.advanced_summary?.advanced_post?.warnings ?? [];
    const skipMatches = warnings.filter((w) =>
      w.includes("multi_axis (RTCP) skipped — P300 family is 3-axis"),
    );
    expect(skipMatches).toEqual([]);
  });

  it("on P500 with 5-axis ops: enhancements_applied contains 'multi_axis_rtcp'", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([fiveAxisOp], {
      program_number: PROGRAM_NUMBER + 31,
      osp_family: "P500",
      use_advanced_features: true,
      advanced_post: { multi_axis: RTCP_G43_4 },
    });
    expect(out.advanced_summary?.advanced_post?.enhancements_applied).toContain(
      "multi_axis_rtcp",
    );
  });
});

describe("OkumaOSPMill.generateProgramAdvanced — Okuma dialect emission in optimized_gcode", () => {
  it("HSM finish smoothing emits OSP-correct G08 P1 high-speed mode in final G-code", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 40,
      osp_family: "P500",
      use_advanced_features: true,
      advanced_post: { hsm: HSM_FINISH },
    });
    const finalGcode = (out.optimized_gcode ?? []).join("\n");
    expect(finalGcode).toContain("G08 P1");
    // Hurco/Fanuc/Haas codes must NOT appear
    expect(finalGcode).not.toMatch(/\bG5\.1\s+Q1\s+R/);
    expect(finalGcode).not.toMatch(/\bG187\s+P\d+\s+E/);
  });

  it("corner_rounding emits OSP G64 P{tol} (Okuma supports inline tolerance arg)", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 41,
      osp_family: "P500",
      use_advanced_features: true,
      advanced_post: { hsm: HSM_FINISH },
    });
    const finalGcode = (out.optimized_gcode ?? []).join("\n");
    expect(finalGcode).toContain("G64 P0.005");
  });
});

describe("OkumaOSPMill.generateProgramAdvanced — output_lines + savings invariants", () => {
  it("output_lines equals (optimized_gcode ?? []).length exactly", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 50,
      osp_family: "P500",
      use_advanced_features: true,
      advanced_post: { hsm: HSM_FINISH },
    });
    const finalLineCount = (out.optimized_gcode ?? []).length;
    expect(out.advanced_summary?.advanced_post?.output_lines).toBe(finalLineCount);
    expect(finalLineCount).toBeGreaterThan(0);
  });

  it("estimated_time_savings_pct is bounded by AdvancedPostProcessor's [0, 50] cap", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 51,
      osp_family: "P500",
      use_advanced_features: true,
      advanced_post: { hsm: HSM_FINISH },
    });
    const pct = out.advanced_summary?.advanced_post?.estimated_time_savings_pct ?? -1;
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(50);
  });
});

describe("OkumaOSPMill.generateProgramAdvanced — sync byte-identical regression", () => {
  const stripGenerated = (lines: string[]) =>
    lines.filter((l) => !l.startsWith("(GENERATED:"));

  it("output.gcode is byte-identical (modulo timestamp) between sync and AdvancedPost-enabled calls", async () => {
    const sync = okumaOSPMillMasterPostEngine.generateProgram([baseOp], {
      program_number: PROGRAM_NUMBER + 60,
      osp_family: "P500",
    });
    const adv = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 60,
      osp_family: "P500",
      use_advanced_features: true,
      advanced_post: { hsm: HSM_FINISH },
    });
    expect(stripGenerated(adv.gcode).join("\n")).toBe(
      stripGenerated(sync.gcode).join("\n"),
    );
  });

  it("physics_checks length matches between sync and AdvancedPost-enabled calls", async () => {
    const sync = okumaOSPMillMasterPostEngine.generateProgram([baseOp], {
      program_number: PROGRAM_NUMBER + 61,
      osp_family: "P500",
    });
    const adv = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 61,
      osp_family: "P500",
      use_advanced_features: true,
      advanced_post: { hsm: HSM_FINISH },
    });
    expect(adv.physics_checks).toHaveLength(sync.physics_checks.length);
  });
});

describe("OkumaOSPMill.generateProgramAdvanced — NaN coords throw structured error", () => {
  it("rejects with OkumaOSPMill prefix when MillOperation.coordinates contain NaN", async () => {
    const badOp: MillOperation = {
      ...baseOp,
      coordinates: [
        { x: 0, y: 0, z: 25, type: "rapid" },
        { x: NaN, y: 0, z: -2, type: "linear" },
      ],
    };
    await expect(
      okumaOSPMillMasterPostEngine.generateProgramAdvanced([badOp], {
        program_number: PROGRAM_NUMBER + 70,
        osp_family: "P500",
        use_advanced_features: true,
        advanced_post: { hsm: HSM_FINISH },
      }),
    ).rejects.toThrow(/Invalid coordinate/);
  });
});
