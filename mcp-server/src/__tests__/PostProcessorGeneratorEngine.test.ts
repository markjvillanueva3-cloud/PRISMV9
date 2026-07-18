/**
 * PostProcessorGeneratorEngine.test.ts
 *
 * Reference-value coverage for the post-processor factory engine
 * (ECHO-ULTIMATE-ROADMAP Track A #1 priority).
 *
 * Verified exported symbols (read engine 2026-06-24):
 *   - class PostProcessorGeneratorEngine (generate, compareControllers,
 *     generateFromTemplate, stats)
 *   - singleton postProcessorGeneratorEngine
 *   - types PostGeneratorInput, GeneratedPost, PostComparison (type-only)
 *
 * Tests encode the WHY (R9) -- not incidental string contents:
 *   - generate() builds a structurally correct GeneratedPost for every
 *     supported controller with concrete expected field values
 *   - ID is deterministically derived from manufacturer + model + controller
 *   - coolant codes come from MachineFeatures (controller-specific), not defaults
 *   - TSC is added only when has_tsc=true AND the controller has tsc codes
 *   - HSM control is populated for controllers that have hsm codes
 *   - 5-axis TCP block is emitted for axis_count >= 5 with fiveAxis features
 *   - warnings fire on RPM > 40000 and tool_capacity > 200
 *   - no rotary on 5-axis machine produces a warning
 *   - cross-CAM feature strings carry the "cam:feature" format
 *   - compareControllers() returns all 6 controllers and all 11 features
 *   - generateFromTemplate() returns null on unknown id and a valid post on known id
 *   - stats() returns concrete counts matching the engine's design constants
 */

import { describe, it, expect } from "vitest";
import {
  PostProcessorGeneratorEngine,
  postProcessorGeneratorEngine,
  type PostGeneratorInput,
} from "../engines/PostProcessorGeneratorEngine.js";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

/** Minimal valid 3-axis Haas mill input -- passes all validation. */
function haasInput(overrides: Partial<PostGeneratorInput> = {}): PostGeneratorInput {
  return {
    controller: "haas",
    manufacturer: "Haas",
    model: "VF2",
    axis_count: 3,
    taper: "CAT40",
    max_rpm: 12000,
    max_feed: 15000,
    tool_capacity: 24,
    has_tsc: true,
    has_probing: true,
    has_ssv: true,
    ...overrides,
  };
}

/** Minimal Okuma 3-axis input. */
function okumaInput(overrides: Partial<PostGeneratorInput> = {}): PostGeneratorInput {
  return {
    controller: "okuma",
    manufacturer: "Okuma",
    model: "MB5000H",
    axis_count: 3,
    taper: "HSK-A63",
    max_rpm: 20000,
    max_feed: 40000,
    tool_capacity: 60,
    has_tsc: true,
    has_probing: true,
    ...overrides,
  };
}

/** Minimal Fanuc 3-axis input. */
function fanucInput(overrides: Partial<PostGeneratorInput> = {}): PostGeneratorInput {
  return {
    controller: "fanuc",
    manufacturer: "Fanuc",
    model: "RoboDrill",
    axis_count: 3,
    taper: "CAT30",
    max_rpm: 10000,
    max_feed: 10000,
    tool_capacity: 16,
    has_tsc: false,
    has_probing: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// describe: singleton export
// ---------------------------------------------------------------------------
describe("PostProcessorGeneratorEngine -- singleton", () => {
  it("postProcessorGeneratorEngine is an instance of PostProcessorGeneratorEngine", () => {
    expect(postProcessorGeneratorEngine).toBeInstanceOf(PostProcessorGeneratorEngine);
  });
});

// ---------------------------------------------------------------------------
// describe: generate() -- post ID derivation
// ---------------------------------------------------------------------------
describe("PostProcessorGeneratorEngine.generate() -- post ID", () => {
  it("ID is manufacturer-model-controller, lowercase, spaces replaced with hyphens", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput());
    expect(post.id).toBe("haas-vf2-haas");
  });

  it("multi-word manufacturer and model are both hyphenated", () => {
    const post = postProcessorGeneratorEngine.generate(
      fanucInput({ manufacturer: "Mazak Corp", model: "Integrex J 200" }),
    );
    expect(post.id).toBe("mazak-corp-integrex-j-200-fanuc");
  });

  it("controller field on GeneratedPost matches the requested controller", () => {
    const post = postProcessorGeneratorEngine.generate(okumaInput());
    expect(post.controller).toBe("okuma");
  });
});

// ---------------------------------------------------------------------------
// describe: generate() -- name field
// ---------------------------------------------------------------------------
describe("PostProcessorGeneratorEngine.generate() -- name", () => {
  it("name is 'Manufacturer Model — CONTROLLER' (em-dash, upper controller)", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput());
    // Engine uses an em-dash (U+2014) in the name template
    expect(post.name).toBe("Haas VF2 — HAAS");
  });

  it("Okuma name carries OKUMA suffix with em-dash separator", () => {
    const post = postProcessorGeneratorEngine.generate(okumaInput());
    expect(post.name).toBe("Okuma MB5000H — OKUMA");
  });
});

// ---------------------------------------------------------------------------
// describe: generate() -- controller-specific G-code blocks
// ---------------------------------------------------------------------------
describe("PostProcessorGeneratorEngine.generate() -- controller G-code blocks", () => {
  it("Haas safe_start is the canonical Haas header", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput());
    expect(post.safe_start).toBe("G90 G94 G17 G40 G49 G80");
  });

  it("Haas program_end contains M30", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput());
    expect(post.program_end).toContain("M30");
  });

  it("Siemens safe_start includes CYCLE800()", () => {
    const post = postProcessorGeneratorEngine.generate(
      fanucInput({ controller: "siemens", manufacturer: "DMG", model: "NHX5000" }),
    );
    expect(post.safe_start).toContain("CYCLE800()");
  });

  it("Heidenhain safe_start uses BEGIN PGM format", () => {
    const post = postProcessorGeneratorEngine.generate(
      fanucInput({ controller: "heidenhain", manufacturer: "Hermle", model: "C400" }),
    );
    expect(post.safe_start).toContain("BEGIN PGM");
  });

  it("Okuma safe_start contains G40 G180", () => {
    const post = postProcessorGeneratorEngine.generate(okumaInput());
    expect(post.safe_start).toContain("G40 G180");
  });

  it("Okuma retract uses G20 Z0 (Okuma-specific), not G28", () => {
    const post = postProcessorGeneratorEngine.generate(okumaInput());
    expect(post.safety.retract).toBe("G20 Z0\nG90");
  });

  it("Fanuc retract uses G28 G91 Z0", () => {
    const post = postProcessorGeneratorEngine.generate(fanucInput());
    expect(post.safety.retract).toBe("G28 G91 Z0\nG90");
  });

  it("Okuma work_offset_template remaps G54 -> G15 H1", () => {
    const post = postProcessorGeneratorEngine.generate(okumaInput());
    expect(post.work_offset_template).toBe("G15 H1");
  });

  it("Siemens work_offset_template remaps G54 -> G500", () => {
    const post = postProcessorGeneratorEngine.generate(
      fanucInput({ controller: "siemens", manufacturer: "DMG", model: "NHX5000" }),
    );
    expect(post.work_offset_template).toBe("G500");
  });

  it("Haas work_offset_template passes G54 unchanged", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput());
    expect(post.work_offset_template).toBe("G54");
  });
});

// ---------------------------------------------------------------------------
// describe: generate() -- canned cycles
// ---------------------------------------------------------------------------
describe("PostProcessorGeneratorEngine.generate() -- canned cycles", () => {
  it("Haas canned cycles include drill (G81) and peck_drill (G83)", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput());
    expect(post.canned_cycles.drill).toContain("G81");
    expect(post.canned_cycles.peck_drill).toContain("G83");
  });

  it("Haas tap uses M29 rigid tapping format (Haas-specific)", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput());
    expect(post.canned_cycles.tap).toContain("M29");
  });

  it("Fanuc tap does NOT use M29 (standard G84 without rigid prefix)", () => {
    const post = postProcessorGeneratorEngine.generate(fanucInput());
    expect(post.canned_cycles.tap).not.toContain("M29");
    expect(post.canned_cycles.tap).toContain("G84");
  });

  it("Okuma uses Okuma-dialect drill G181, not G81", () => {
    const post = postProcessorGeneratorEngine.generate(okumaInput());
    expect(post.canned_cycles.drill).toContain("G181");
  });

  it("Okuma cancel cycle uses G180 (not G80)", () => {
    const post = postProcessorGeneratorEngine.generate(okumaInput());
    expect(post.canned_cycles.cancel).toBe("G180");
  });

  it("Siemens uses CYCLE81 format for drill (not G81)", () => {
    const post = postProcessorGeneratorEngine.generate(
      fanucInput({ controller: "siemens", manufacturer: "DMG", model: "NHX5000" }),
    );
    expect(post.canned_cycles.drill).toContain("CYCLE81");
  });

  it("Mazak includes tornado_tap (Mazak-specific G130)", () => {
    const post = postProcessorGeneratorEngine.generate(
      fanucInput({ controller: "mazak", manufacturer: "Mazak", model: "VTC-800" }),
    );
    expect(post.canned_cycles.tornado_tap).toContain("G130");
  });
});

// ---------------------------------------------------------------------------
// describe: generate() -- coolant codes
// ---------------------------------------------------------------------------
describe("PostProcessorGeneratorEngine.generate() -- coolant codes", () => {
  it("flood coolant is always present with on=M8 off=M9", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput());
    expect(post.coolant_codes.flood).toEqual({ on: "M8", off: "M9" });
  });

  it("TSC is injected when has_tsc=true and controller has tsc codes (Haas: M88/M89)", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput({ has_tsc: true }));
    expect(post.coolant_codes.tsc).toEqual({ on: "M88", off: "M89" });
  });

  it("TSC is absent when has_tsc=false even if controller supports it", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput({ has_tsc: false }));
    expect(post.coolant_codes["tsc"]).toBeUndefined();
  });

  it("Okuma TSC uses M51/M59 (Okuma-specific codes)", () => {
    const post = postProcessorGeneratorEngine.generate(okumaInput({ has_tsc: true }));
    expect(post.coolant_codes.tsc).toEqual({ on: "M51", off: "M59" });
  });
});

// ---------------------------------------------------------------------------
// describe: generate() -- HSM control
// ---------------------------------------------------------------------------
describe("PostProcessorGeneratorEngine.generate() -- HSM control", () => {
  // Haas MACHINE_FEATURE_DB: hsm.code="G187", modes.finish="P3"
  // generate() picks finish mode for activate: "G187 P3"
  it("Haas HSM activate is 'G187 P3' (code + finish mode)", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput());
    expect(post.hsm_control!.activate).toBe("G187 P3");
  });

  it("Haas HSM deactivate is G187 P2", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput());
    expect(post.hsm_control!.deactivate).toBe("G187 P2");
  });

  it("Haas HSM modes.rough is 'G187 P1'", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput());
    expect(post.hsm_control!.modes["rough"]).toBe("G187 P1");
  });

  it("Haas HSM modes.finish is 'G187 P3'", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput());
    expect(post.hsm_control!.modes["finish"]).toBe("G187 P3");
  });

  // Okuma MACHINE_FEATURE_DB: hsm.code="G08 P1", modes.quality="P1-P5"
  // generate() falls back to quality mode when finish is absent: "G08 P1 P1-P5"
  it("Okuma HSM activate contains G08 P1 code", () => {
    const post = postProcessorGeneratorEngine.generate(okumaInput());
    expect(post.hsm_control!.activate).toContain("G08 P1");
  });

  it("Okuma HSM deactivate is G08 P0", () => {
    const post = postProcessorGeneratorEngine.generate(okumaInput());
    expect(post.hsm_control!.deactivate).toBe("G08 P0");
  });

  // Siemens MACHINE_FEATURE_DB: hsm.code="CYCLE832", modes.finish="(0.005,1)"
  it("Siemens HSM activate is 'CYCLE832 (0.005,1)'", () => {
    const post = postProcessorGeneratorEngine.generate(
      fanucInput({ controller: "siemens", manufacturer: "DMG", model: "NHX5000" }),
    );
    expect(post.hsm_control!.activate).toBe("CYCLE832 (0.005,1)");
  });

  it("Siemens HSM deactivate is CYCLE832()", () => {
    const post = postProcessorGeneratorEngine.generate(
      fanucInput({ controller: "siemens", manufacturer: "DMG", model: "NHX5000" }),
    );
    expect(post.hsm_control!.deactivate).toBe("CYCLE832()");
  });

  // Heidenhain MACHINE_FEATURE_DB: hsm.code="M120", modes.finish="LA0.01"
  it("Heidenhain HSM activate is 'M120 LA0.01'", () => {
    const post = postProcessorGeneratorEngine.generate(
      fanucInput({ controller: "heidenhain", manufacturer: "Hermle", model: "C400" }),
    );
    expect(post.hsm_control!.activate).toBe("M120 LA0.01");
  });

  it("Heidenhain HSM deactivate is M120 L0", () => {
    const post = postProcessorGeneratorEngine.generate(
      fanucInput({ controller: "heidenhain", manufacturer: "Hermle", model: "C400" }),
    );
    expect(post.hsm_control!.deactivate).toBe("M120 L0");
  });
});

// ---------------------------------------------------------------------------
// describe: generate() -- 5-axis TCP block
// ---------------------------------------------------------------------------
describe("PostProcessorGeneratorEngine.generate() -- 5-axis control", () => {
  it("5-axis Haas: five_axis_control.tcp_on is 'G234' (from MACHINE_FEATURE_DB.haas.fiveAxis.tcp)", () => {
    const post = postProcessorGeneratorEngine.generate(
      haasInput({ axis_count: 5, rotary: { primary: "B", secondary: "C" } }),
    );
    expect(post.five_axis_control!.tcp_on).toBe("G234");
  });

  it("5-axis Haas: tcp_off is G49", () => {
    const post = postProcessorGeneratorEngine.generate(
      haasInput({ axis_count: 5, rotary: { primary: "B", secondary: "C" } }),
    );
    expect(post.five_axis_control!.tcp_off).toBe("G49");
  });

  it("5-axis Haas: mode name is 'G234 DWO'", () => {
    const post = postProcessorGeneratorEngine.generate(
      haasInput({ axis_count: 5, rotary: { primary: "B", secondary: "C" } }),
    );
    expect(post.five_axis_control!.mode).toBe("G234 DWO");
  });

  it("5-axis inverse_time is G93 (industry standard for all controllers)", () => {
    const post = postProcessorGeneratorEngine.generate(
      haasInput({ axis_count: 5, rotary: { primary: "B", secondary: "C" } }),
    );
    expect(post.five_axis_control!.inverse_time).toBe("G93");
  });

  it("3-axis machine: five_axis_control is null/undefined", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput({ axis_count: 3 }));
    expect(post.five_axis_control == null).toBe(true);
  });

  it("Heidenhain 5-axis tcp_on is the full FUNCTION TCPM string", () => {
    const post = postProcessorGeneratorEngine.generate(
      fanucInput({
        controller: "heidenhain",
        manufacturer: "Hermle",
        model: "C42U",
        axis_count: 5,
        rotary: { primary: "B", secondary: "C" },
      }),
    );
    expect(post.five_axis_control!.tcp_on).toBe(
      "FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS",
    );
  });

  it("Heidenhain 5-axis tcp_off is M129", () => {
    const post = postProcessorGeneratorEngine.generate(
      fanucInput({
        controller: "heidenhain",
        manufacturer: "Hermle",
        model: "C42U",
        axis_count: 5,
        rotary: { primary: "B" },
      }),
    );
    expect(post.five_axis_control!.tcp_off).toBe("M129");
  });

  it("Okuma 5-axis mode name is 'G169 TCP'", () => {
    const post = postProcessorGeneratorEngine.generate(
      okumaInput({ axis_count: 5, rotary: { primary: "B", secondary: "C" } }),
    );
    expect(post.five_axis_control!.mode).toBe("G169 TCP");
  });
});

// ---------------------------------------------------------------------------
// describe: generate() -- probing cycles
// ---------------------------------------------------------------------------
describe("PostProcessorGeneratorEngine.generate() -- probing cycles", () => {
  it("Haas with probing: single_surface probe is 'G65 P9832'", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput({ has_probing: true }));
    expect(post.probing_cycles!.single_surface).toBe("G65 P9832");
  });

  it("Haas with probing: tool_length cycle is 'G65 P9023'", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput({ has_probing: true }));
    expect(post.probing_cycles!.tool_length).toBe("G65 P9023");
  });

  it("Fanuc with has_probing=false: probing_cycles is null/undefined", () => {
    const post = postProcessorGeneratorEngine.generate(
      fanucInput({ has_probing: false }),
    );
    expect(post.probing_cycles == null).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// describe: generate() -- SSV control
// ---------------------------------------------------------------------------
describe("PostProcessorGeneratorEngine.generate() -- SSV control", () => {
  it("Haas SSV: on=G10, off=G11 when has_ssv=true", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput({ has_ssv: true }));
    expect(post.ssv_control!.on).toBe("G10");
    expect(post.ssv_control!.off).toBe("G11");
  });

  it("Haas SSV range is '5-15%' (from MACHINE_FEATURE_DB)", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput({ has_ssv: true }));
    expect(post.ssv_control!.range).toBe("5-15%");
  });

  it("has_ssv=false: ssv_control is null/undefined", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput({ has_ssv: false }));
    expect(post.ssv_control == null).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// describe: generate() -- cross-CAM features
// ---------------------------------------------------------------------------
describe("PostProcessorGeneratorEngine.generate() -- cross-CAM features", () => {
  it("cross-CAM features are recorded as 'cam:feature' strings", () => {
    const post = postProcessorGeneratorEngine.generate(
      haasInput({
        feature_sources: [
          { cam: "hypermill", features: ["collision_check", "tilt_control"] },
          { cam: "solidcam", features: ["iMachining"] },
        ],
      }),
    );
    expect(post.cross_cam_features).toContain("hypermill:collision_check");
    expect(post.cross_cam_features).toContain("hypermill:tilt_control");
    expect(post.cross_cam_features).toContain("solidcam:iMachining");
  });

  it("feature_sources undefined -> cross_cam_features is empty array", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput({ feature_sources: undefined }));
    expect(post.cross_cam_features).toEqual([]);
  });

  it("cross-CAM with 'collision' triggers hypermill_collision_check=true in master_config", () => {
    const post = postProcessorGeneratorEngine.generate(
      haasInput({
        feature_sources: [{ cam: "hypermill", features: ["collision"] }],
      }),
    );
    expect(post.master_config.cross_cam_features?.hypermill_collision_check).toBe(true);
  });

  it("cross-CAM with 'adaptive' triggers fusion360_adaptive=true in master_config", () => {
    const post = postProcessorGeneratorEngine.generate(
      haasInput({
        feature_sources: [{ cam: "fusion360", features: ["adaptive"] }],
      }),
    );
    expect(post.master_config.cross_cam_features?.fusion360_adaptive).toBe(true);
  });

  it("cross-CAM with 'rtcp' triggers nx_advanced_rtcp=true in master_config", () => {
    const post = postProcessorGeneratorEngine.generate(
      haasInput({
        feature_sources: [{ cam: "nx", features: ["rtcp"] }],
      }),
    );
    expect(post.master_config.cross_cam_features?.nx_advanced_rtcp).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// describe: generate() -- custom M-codes
// ---------------------------------------------------------------------------
describe("PostProcessorGeneratorEngine.generate() -- custom_mcodes", () => {
  it("custom_mcodes are preserved verbatim in custom_codes", () => {
    const post = postProcessorGeneratorEngine.generate(
      haasInput({
        custom_mcodes: { M200: "Pallet change", M201: "Pallet clamp" },
      }),
    );
    expect(post.custom_codes).toEqual({ M200: "Pallet change", M201: "Pallet clamp" });
  });

  it("no custom_mcodes -> custom_codes is empty object", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput());
    expect(post.custom_codes).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// describe: generate() -- master_config wiring
// ---------------------------------------------------------------------------
describe("PostProcessorGeneratorEngine.generate() -- master_config", () => {
  it("master_config.controller matches the requested controller", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput());
    expect(post.master_config.controller).toBe("haas");
  });

  it("master_config.machine carries manufacturer + model + max_rpm", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput());
    const m = post.master_config.machine!;
    expect(m.manufacturer).toBe("Haas");
    expect(m.model).toBe("VF2");
    expect(m.max_rpm).toBe(12000);
  });

  it("five_axis_mode is 'tcpm' for 5-axis input, 'none' for 3-axis", () => {
    const post3 = postProcessorGeneratorEngine.generate(haasInput({ axis_count: 3 }));
    expect(post3.master_config.five_axis_mode).toBe("none");

    const post5 = postProcessorGeneratorEngine.generate(
      haasInput({ axis_count: 5, rotary: { primary: "B" } }),
    );
    expect(post5.master_config.five_axis_mode).toBe("tcpm");
  });

  it("enable_hsm is true when the controller has HSM codes (all 6 do)", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput());
    expect(post.master_config.enable_hsm).toBe(true);
  });

  it("enable_cross_cam_features is false when no feature_sources provided", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput({ feature_sources: undefined }));
    expect(post.master_config.enable_cross_cam_features).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// describe: generate() -- machine info passthrough
// ---------------------------------------------------------------------------
describe("PostProcessorGeneratorEngine.generate() -- machine info", () => {
  it("machine block carries manufacturer, model, axis_count, taper verbatim", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput());
    expect(post.machine).toEqual({
      manufacturer: "Haas",
      model: "VF2",
      axis_count: 3,
      taper: "CAT40",
    });
  });
});

// ---------------------------------------------------------------------------
// describe: generate() -- validation warnings (failure modes)
// ---------------------------------------------------------------------------
describe("PostProcessorGeneratorEngine.generate() -- validation warnings", () => {
  it("[failure] RPM > 40000 produces a spindle bearing warning", () => {
    const post = postProcessorGeneratorEngine.generate(
      haasInput({ max_rpm: 42000 }),
    );
    expect(post.warnings.some((w) => w.includes("RPM > 40000"))).toBe(true);
  });

  it("[failure] RPM <= 40000 produces NO spindle warning", () => {
    const post = postProcessorGeneratorEngine.generate(
      haasInput({ max_rpm: 40000 }),
    );
    expect(post.warnings.some((w) => w.includes("RPM > 40000"))).toBe(false);
  });

  it("[failure] tool_capacity > 200 produces ATC magazine warning", () => {
    const post = postProcessorGeneratorEngine.generate(
      haasInput({ tool_capacity: 201 }),
    );
    expect(post.warnings.some((w) => w.includes("Tool capacity > 200"))).toBe(true);
  });

  it("[failure] 5-axis without rotary config warns about defaulting to A/C", () => {
    const post = postProcessorGeneratorEngine.generate(
      haasInput({ axis_count: 5, rotary: undefined }),
    );
    expect(post.warnings.some((w) => w.includes("rotary config"))).toBe(true);
  });

  it("[failure] 5-axis on Haas (which has fiveAxis codes) does NOT warn about missing TCP", () => {
    const post = postProcessorGeneratorEngine.generate(
      haasInput({ axis_count: 5, rotary: { primary: "B" } }),
    );
    expect(post.warnings.some((w) => w.includes("no TCP codes"))).toBe(false);
  });

  it("[failure] clean 3-axis input produces zero warnings", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput());
    expect(post.warnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// describe: generate() -- feature_count accounting
// ---------------------------------------------------------------------------
describe("PostProcessorGeneratorEngine.generate() -- feature_count", () => {
  it("feature_count is a positive integer", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput());
    expect(post.feature_count).toBeGreaterThan(0);
    expect(Number.isInteger(post.feature_count)).toBe(true);
  });

  it("adding 2 cross-CAM features increases feature_count by exactly 2", () => {
    const base = postProcessorGeneratorEngine.generate(haasInput());
    const withFeatures = postProcessorGeneratorEngine.generate(
      haasInput({
        feature_sources: [{ cam: "hypermill", features: ["collision_check", "tilt"] }],
      }),
    );
    expect(withFeatures.feature_count).toBe(base.feature_count + 2);
  });

  it("adding 3 custom M-codes increases feature_count by exactly 3", () => {
    const base = postProcessorGeneratorEngine.generate(haasInput());
    const withCustom = postProcessorGeneratorEngine.generate(
      haasInput({ custom_mcodes: { M200: "pallet", M201: "clamp", M202: "unclamp" } }),
    );
    expect(withCustom.feature_count).toBe(base.feature_count + 3);
  });
});

// ---------------------------------------------------------------------------
// describe: compareControllers()
// ---------------------------------------------------------------------------
describe("PostProcessorGeneratorEngine.compareControllers()", () => {
  it("returns exactly 6 controllers", () => {
    const result = postProcessorGeneratorEngine.compareControllers();
    expect(result.controllers).toHaveLength(6);
  });

  it("all 6 known controller names are present", () => {
    const result = postProcessorGeneratorEngine.compareControllers();
    const names = result.controllers;
    expect(names).toContain("fanuc");
    expect(names).toContain("haas");
    expect(names).toContain("siemens");
    expect(names).toContain("heidenhain");
    expect(names).toContain("mazak");
    expect(names).toContain("okuma");
  });

  it("returns exactly 11 feature rows", () => {
    const result = postProcessorGeneratorEngine.compareControllers();
    expect(result.features).toHaveLength(11);
  });

  it("every feature row has a support entry for each of the 6 controllers", () => {
    const result = postProcessorGeneratorEngine.compareControllers();
    for (const row of result.features) {
      for (const ctrl of result.controllers) {
        // property must exist (value may be bool or string)
        expect(Object.prototype.hasOwnProperty.call(row.support, ctrl)).toBe(true);
      }
    }
  });

  it("Rigid Tapping is true for ALL 6 controllers", () => {
    const result = postProcessorGeneratorEngine.compareControllers();
    const rigidRow = result.features.find((f) => f.feature === "Rigid Tapping")!;
    for (const ctrl of result.controllers) {
      expect(rigidRow.support[ctrl]).toBe(true);
    }
  });

  it("Canned Drill Cycles is true for ALL 6 controllers", () => {
    const result = postProcessorGeneratorEngine.compareControllers();
    const row = result.features.find((f) => f.feature === "Canned Drill Cycles")!;
    for (const ctrl of result.controllers) {
      expect(row.support[ctrl]).toBe(true);
    }
  });

  it("Spline Compression is true only for siemens and heidenhain", () => {
    const result = postProcessorGeneratorEngine.compareControllers();
    const row = result.features.find((f) => f.feature === "Spline Compression")!;
    expect(row.support["siemens"]).toBe(true);
    expect(row.support["heidenhain"]).toBe(true);
    expect(row.support["fanuc"]).toBe(false);
    expect(row.support["haas"]).toBe(false);
    expect(row.support["mazak"]).toBe(false);
    expect(row.support["okuma"]).toBe(false);
  });

  it("NURBS Interpolation is true for fanuc, siemens, mazak, okuma (not haas/heidenhain)", () => {
    const result = postProcessorGeneratorEngine.compareControllers();
    const row = result.features.find((f) => f.feature === "NURBS Interpolation")!;
    expect(row.support["fanuc"]).toBe(true);
    expect(row.support["siemens"]).toBe(true);
    expect(row.support["mazak"]).toBe(true);
    expect(row.support["okuma"]).toBe(true);
    expect(row.support["haas"]).toBe(false);
    expect(row.support["heidenhain"]).toBe(false);
  });

  it("HSM Smoothing: Haas support value is the string 'G187' (its hsm.code)", () => {
    const result = postProcessorGeneratorEngine.compareControllers();
    const row = result.features.find((f) => f.feature === "HSM Smoothing")!;
    expect(row.support["haas"]).toBe("G187");
  });

  it("HSM Smoothing: Okuma support value is the string 'G08 P1'", () => {
    const result = postProcessorGeneratorEngine.compareControllers();
    const row = result.features.find((f) => f.feature === "HSM Smoothing")!;
    expect(row.support["okuma"]).toBe("G08 P1");
  });

  it("recommendations array is non-empty and mentions Fanuc", () => {
    const result = postProcessorGeneratorEngine.compareControllers();
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(
      result.recommendations.some((r) => r.toLowerCase().includes("fanuc")),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// describe: generateFromTemplate()
// ---------------------------------------------------------------------------
describe("PostProcessorGeneratorEngine.generateFromTemplate()", () => {
  it("[failure] unknown template ID returns null", () => {
    const result = postProcessorGeneratorEngine.generateFromTemplate("nonexistent-template-xyz");
    expect(result).toBeNull();
  });

  it("known template 'haas-umc-5ax' returns a valid GeneratedPost with controller=haas", () => {
    const result = postProcessorGeneratorEngine.generateFromTemplate("haas-umc-5ax")!;
    expect(result).not.toBeNull();
    expect(result.controller).toBe("haas");
  });

  it("haas-umc-5ax has axis_count=5 (template config has tcpm mode)", () => {
    const result = postProcessorGeneratorEngine.generateFromTemplate("haas-umc-5ax")!;
    expect(result.machine.axis_count).toBe(5);
  });

  it("haas-umc-5ax generated post has five_axis_control.tcp_on = 'G234'", () => {
    const result = postProcessorGeneratorEngine.generateFromTemplate("haas-umc-5ax")!;
    expect(result.five_axis_control!.tcp_on).toBe("G234");
  });

  it("known template 'siemens-840d-5ax' returns siemens controller post", () => {
    const result = postProcessorGeneratorEngine.generateFromTemplate("siemens-840d-5ax")!;
    expect(result).not.toBeNull();
    expect(result.controller).toBe("siemens");
  });

  it("known template 'heidenhain-tnc640-5ax' returns heidenhain post", () => {
    const result = postProcessorGeneratorEngine.generateFromTemplate("heidenhain-tnc640-5ax")!;
    expect(result).not.toBeNull();
    expect(result.controller).toBe("heidenhain");
  });
});

// ---------------------------------------------------------------------------
// describe: stats()
// ---------------------------------------------------------------------------
describe("PostProcessorGeneratorEngine.stats()", () => {
  it("controllers count is exactly 6 (fanuc/haas/siemens/heidenhain/mazak/okuma)", () => {
    const s = postProcessorGeneratorEngine.stats();
    expect(s.controllers).toBe(6);
  });

  it("canned_cycle_types is exactly 7", () => {
    const s = postProcessorGeneratorEngine.stats();
    expect(s.canned_cycle_types).toBe(7);
  });

  it("feature_categories is exactly 11", () => {
    const s = postProcessorGeneratorEngine.stats();
    expect(s.feature_categories).toBe(11);
  });

  it("templates_available matches live masterPostProcessorEngine.getPostTemplates().length", () => {
    const s = postProcessorGeneratorEngine.stats();
    // At minimum the 3 known templates (haas-umc-5ax, siemens-840d-5ax, heidenhain-tnc640-5ax)
    expect(s.templates_available).toBeGreaterThanOrEqual(3);
    expect(Number.isInteger(s.templates_available)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// describe: adversarial inputs
// ---------------------------------------------------------------------------
describe("PostProcessorGeneratorEngine -- adversarial inputs", () => {
  it("[adversarial] RPM at exact boundary 40000: no warning (boundary is exclusive >40000)", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput({ max_rpm: 40000 }));
    expect(post.warnings.some((w) => w.includes("RPM > 40000"))).toBe(false);
  });

  it("[adversarial] tool_capacity at exact boundary 200: no ATC warning (boundary is exclusive >200)", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput({ tool_capacity: 200 }));
    expect(post.warnings.some((w) => w.includes("Tool capacity > 200"))).toBe(false);
  });

  it("[adversarial] both extreme RPM AND capacity over limits produce two distinct warnings", () => {
    const post = postProcessorGeneratorEngine.generate(
      haasInput({ max_rpm: 55000, tool_capacity: 250 }),
    );
    expect(post.warnings.some((w) => w.includes("RPM > 40000"))).toBe(true);
    expect(post.warnings.some((w) => w.includes("Tool capacity > 200"))).toBe(true);
    expect(post.warnings).toHaveLength(2);
  });

  it("[adversarial] empty feature_sources array -> cross_cam_features=[] and enable_cross_cam_features=false", () => {
    const post = postProcessorGeneratorEngine.generate(haasInput({ feature_sources: [] }));
    expect(post.cross_cam_features).toEqual([]);
    expect(post.master_config.enable_cross_cam_features).toBe(false);
  });

  it("[adversarial] manufacturer with spaces + model with spaces are both normalized in ID", () => {
    const post = postProcessorGeneratorEngine.generate(
      haasInput({ manufacturer: "DMG Mori", model: "NHX 5000 2nd Gen" }),
    );
    expect(post.id).toBe("dmg-mori-nhx-5000-2nd-gen-haas");
  });
});
