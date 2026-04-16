/**
 * Trilobe Electrode & Eccentric Turning Tests — ELEC-PIPE Session 8
 *
 * Tests for:
 * 1. TrilobeElectrodeGeometryEngine — profile calculation, CAM exports
 * 2. EccentricTurningEngine — C-axis polar interpolation G-code
 * 3. Integration with ColdHeadingToolConfiguratorEngine
 * 4. Connection to eccentric turning roadmap
 *
 * @module __tests__/trilobe-eccentric.test
 */

import { describe, it, expect } from "vitest";
import {
  trilobeElectrodeGeometryEngine,
  calculateTrilobeProfile,
  calculateLobeRotation,
  interpolateDiameters,
  type TrilobeStage,
  type TrilobeInput,
} from "../engines/TrilobeElectrodeGeometryEngine.js";
import {
  eccentricTurningEngine,
  type EccentricTurningInput,
} from "../engines/EccentricTurningEngine.js";

// ============================================================================
// TRILOBE PROFILE MATHEMATICS
// ============================================================================

describe("Trilobe Profile Calculations", () => {
  describe("calculateTrilobeProfile — polar equation r(θ) = R_base + A×cos(3θ)", () => {
    it("should generate 360 points by default", () => {
      const profile = calculateTrilobeProfile(0.260, 0.240);
      expect(profile.length).toBe(360);
    });

    it("should generate custom number of points", () => {
      const profile = calculateTrilobeProfile(0.260, 0.240, 120);
      expect(profile.length).toBe(120);
    });

    it("should have 3 peaks (lobes) at 0°, 120°, 240°", () => {
      const profile = calculateTrilobeProfile(0.260, 0.240, 360);

      // Find max radius points (lobe peaks)
      const radii = profile.map(p => Math.sqrt(p.x * p.x + p.y * p.y));
      const maxRadius = Math.max(...radii);

      // Peaks should be at roughly 0°, 120°, 240° (indices 0, 120, 240)
      expect(radii[0]).toBeCloseTo(maxRadius, 3);
      expect(radii[120]).toBeCloseTo(maxRadius, 3);
      expect(radii[240]).toBeCloseTo(maxRadius, 3);
    });

    it("should have 3 valleys at 60°, 180°, 300°", () => {
      const profile = calculateTrilobeProfile(0.260, 0.240, 360);

      const radii = profile.map(p => Math.sqrt(p.x * p.x + p.y * p.y));
      const minRadius = Math.min(...radii);

      // Valleys should be at roughly 60°, 180°, 300° (indices 60, 180, 300)
      expect(radii[60]).toBeCloseTo(minRadius, 3);
      expect(radii[180]).toBeCloseTo(minRadius, 3);
      expect(radii[300]).toBeCloseTo(minRadius, 3);
    });

    it("should have correct max radius = C/2", () => {
      const c_dia = 0.260;
      const e_dia = 0.240;
      const profile = calculateTrilobeProfile(c_dia, e_dia, 360);

      const radii = profile.map(p => Math.sqrt(p.x * p.x + p.y * p.y));
      const maxRadius = Math.max(...radii);

      // Max radius should be C/2 = 0.130"
      expect(maxRadius).toBeCloseTo(c_dia / 2, 4);
    });

    it("should have correct min radius = E/2", () => {
      const c_dia = 0.260;
      const e_dia = 0.240;
      const profile = calculateTrilobeProfile(c_dia, e_dia, 360);

      const radii = profile.map(p => Math.sqrt(p.x * p.x + p.y * p.y));
      const minRadius = Math.min(...radii);

      // Min radius should be E/2 = 0.120"
      expect(minRadius).toBeCloseTo(e_dia / 2, 4);
    });

    it("should apply rotation correctly", () => {
      const profile0 = calculateTrilobeProfile(0.260, 0.240, 360, 0);
      const profile30 = calculateTrilobeProfile(0.260, 0.240, 360, 30);

      // First point at 0° rotation should have max radius on X-axis
      expect(profile0[0].y).toBeCloseTo(0, 5);
      expect(profile0[0].x).toBeGreaterThan(0);

      // First point at 30° rotation should have shifted
      const angle30 = Math.atan2(profile30[0].y, profile30[0].x) * 180 / Math.PI;
      expect(angle30).toBeCloseTo(30, 1);
    });
  });

  describe("calculateLobeRotation — helical profile rotation", () => {
    it("should return 0 when lead angle is 0", () => {
      const rotation = calculateLobeRotation(1.0, 0, 2.0);
      expect(rotation).toBe(0);
    });

    it("should increase rotation with Z position", () => {
      const rot0 = calculateLobeRotation(0, 15, 2.0);
      const rot1 = calculateLobeRotation(1.0, 15, 2.0);
      const rot2 = calculateLobeRotation(2.0, 15, 2.0);

      expect(rot0).toBe(0);
      expect(rot1).toBeGreaterThan(rot0);
      expect(rot2).toBeGreaterThan(rot1);
    });

    it("should wrap at 360°", () => {
      const rotation = calculateLobeRotation(10, 45, 1.0);
      expect(rotation).toBeLessThan(360);
      expect(rotation).toBeGreaterThanOrEqual(0);
    });
  });

  describe("interpolateDiameters — multi-stage trilobes", () => {
    const stages: TrilobeStage[] = [
      { c_dia_in: 0.260, e_dia_in: 0.240, z_start_in: 0, z_end_in: 0.5 },
      { c_dia_in: 0.300, e_dia_in: 0.280, z_start_in: 0.5, z_end_in: 1.0 },
    ];

    it("should return first stage dimensions at start", () => {
      const dims = interpolateDiameters(0.1, stages);
      expect(dims.c_dia).toBe(0.260);
      expect(dims.e_dia).toBe(0.240);
    });

    it("should return second stage dimensions in second stage", () => {
      const dims = interpolateDiameters(0.7, stages);
      expect(dims.c_dia).toBe(0.300);
      expect(dims.e_dia).toBe(0.280);
    });

    it("should handle single-stage trilobes", () => {
      const single: TrilobeStage[] = [
        { c_dia_in: 0.250, e_dia_in: 0.230, z_start_in: 0, z_end_in: 1.0 },
      ];
      const dims = interpolateDiameters(0.5, single);
      expect(dims.c_dia).toBe(0.250);
      expect(dims.e_dia).toBe(0.230);
    });
  });
});

// ============================================================================
// TRILOBE ELECTRODE GEOMETRY ENGINE
// ============================================================================

describe("TrilobeElectrodeGeometryEngine", () => {
  describe("generate — full electrode geometry", () => {
    it("should generate trilobe geometry with all outputs", async () => {
      const input: TrilobeInput = {
        part_number: "TEST-TRILOBE-001",
        customer: "Test Customer",
        stages: [
          { c_dia_in: 0.260, e_dia_in: 0.240, z_start_in: 0, z_end_in: 0.75 },
        ],
        lobe_count: 3,
        lead_angle_deg: 0,
        total_length_in: 0.75,
        shank_dia_in: 0.5,
        draft_deg: 0,
        undersize_in: 0.001,
        oversize_in: 0,
        target_finish_Ra_um: 1.6,
        workpiece_material: "D2",
        export_step: true,
        export_dxf: true,
        export_gcode: false,
      };

      const output = await trilobeElectrodeGeometryEngine.generate(input);

      expect(output.job_id).toMatch(/^TRILOBE-/);
      expect(output.part_number).toBe("TEST-TRILOBE-001");
      expect(output.geometry).toBeDefined();
      expect(output.geometry.sections.length).toBeGreaterThan(0);
      expect(output.cam_exports.length).toBeGreaterThan(0);
      expect(output.ai_recommendations).toBeDefined();
    });

    it("should apply undersizing correctly", async () => {
      const undersize = 0.002;
      const input: TrilobeInput = {
        part_number: "UNDERSIZE-TEST",
        stages: [
          { c_dia_in: 0.260, e_dia_in: 0.240, z_start_in: 0, z_end_in: 0.5 },
        ],
        lobe_count: 3,
        lead_angle_deg: 0,
        total_length_in: 0.5,
        shank_dia_in: 0.5,
        draft_deg: 0,
        undersize_in: undersize,
        oversize_in: 0,
        target_finish_Ra_um: 1.6,
        workpiece_material: "D2",
        export_step: false,
        export_dxf: false,
        export_gcode: false,
      };

      const output = await trilobeElectrodeGeometryEngine.generate(input);

      // Check that undersize was applied
      expect(output.geometry.definition.undersize_applied_in).toBe(undersize);

      // Section C/E should be reduced by undersize
      const section = output.geometry.sections[0];
      expect(section.c_dia_in).toBeCloseTo(0.260 - undersize, 5);
      expect(section.e_dia_in).toBeCloseTo(0.240 - undersize, 5);
    });

    it("should warn about carbide workpiece", async () => {
      const input: TrilobeInput = {
        part_number: "CARBIDE-WARN",
        stages: [
          { c_dia_in: 0.260, e_dia_in: 0.240, z_start_in: 0, z_end_in: 0.5 },
        ],
        lobe_count: 3,
        lead_angle_deg: 0,
        total_length_in: 0.5,
        shank_dia_in: 0.5,
        draft_deg: 0,
        undersize_in: 0,
        oversize_in: 0,
        target_finish_Ra_um: 1.6,
        workpiece_material: "carbide",
        export_step: false,
        export_dxf: false,
        export_gcode: false,
      };

      const output = await trilobeElectrodeGeometryEngine.generate(input);

      expect(output.warnings).toContain(
        "SAFETY: Carbide workpiece requires CuW electrode — graphite causes microcracking"
      );
      expect(output.ai_recommendations.electrode_material).toBe("copper_tungsten_cuw70");
    });

    it("should warn about invalid C < E dimensions", async () => {
      const input: TrilobeInput = {
        part_number: "INVALID-DIMS",
        stages: [
          { c_dia_in: 0.220, e_dia_in: 0.240, z_start_in: 0, z_end_in: 0.5 }, // C < E
        ],
        lobe_count: 3,
        lead_angle_deg: 0,
        total_length_in: 0.5,
        shank_dia_in: 0.5,
        draft_deg: 0,
        undersize_in: 0,
        oversize_in: 0,
        target_finish_Ra_um: 1.6,
        workpiece_material: "D2",
        export_step: false,
        export_dxf: false,
        export_gcode: false,
      };

      const output = await trilobeElectrodeGeometryEngine.generate(input);

      expect(output.warnings.some(w => w.includes("C(") && w.includes("must be > E"))).toBe(true);
    });
  });

  describe("CAM exports", () => {
    it("should generate STEP for all 3 CAM systems when export_step=true", async () => {
      const input: TrilobeInput = {
        part_number: "STEP-EXPORT",
        stages: [
          { c_dia_in: 0.260, e_dia_in: 0.240, z_start_in: 0, z_end_in: 0.5 },
        ],
        lobe_count: 3,
        lead_angle_deg: 0,
        total_length_in: 0.5,
        shank_dia_in: 0.5,
        draft_deg: 0,
        undersize_in: 0,
        oversize_in: 0,
        target_finish_Ra_um: 1.6,
        workpiece_material: "D2",
        export_step: true,
        export_dxf: false,
        export_gcode: false,
      };

      const output = await trilobeElectrodeGeometryEngine.generate(input);

      const stepExports = output.cam_exports.filter(e => e.format === "step");
      expect(stepExports.length).toBe(3); // fusion360, hypermill, mastercam

      const camSystems = stepExports.map(e => e.cam_system);
      expect(camSystems).toContain("fusion360");
      expect(camSystems).toContain("hypermill");
      expect(camSystems).toContain("mastercam");
    });

    it("should generate DXF when export_dxf=true", async () => {
      const input: TrilobeInput = {
        part_number: "DXF-EXPORT",
        stages: [
          { c_dia_in: 0.260, e_dia_in: 0.240, z_start_in: 0, z_end_in: 0.5 },
        ],
        lobe_count: 3,
        lead_angle_deg: 0,
        total_length_in: 0.5,
        shank_dia_in: 0.5,
        draft_deg: 0,
        undersize_in: 0,
        oversize_in: 0,
        target_finish_Ra_um: 1.6,
        workpiece_material: "D2",
        export_step: false,
        export_dxf: true,
        export_gcode: false,
      };

      const output = await trilobeElectrodeGeometryEngine.generate(input);

      const dxfExport = output.cam_exports.find(e => e.format === "dxf");
      expect(dxfExport).toBeDefined();
      expect(dxfExport!.content).toContain("LWPOLYLINE");
    });

    it("should generate Okuma G-code when export_gcode=true", async () => {
      const input: TrilobeInput = {
        part_number: "GCODE-EXPORT",
        stages: [
          { c_dia_in: 0.260, e_dia_in: 0.240, z_start_in: 0, z_end_in: 0.5 },
        ],
        lobe_count: 3,
        lead_angle_deg: 0,
        total_length_in: 0.5,
        shank_dia_in: 0.5,
        draft_deg: 0,
        undersize_in: 0.001,
        oversize_in: 0,
        target_finish_Ra_um: 1.6,
        workpiece_material: "D2",
        export_step: false,
        export_dxf: false,
        export_gcode: true,
      };

      const output = await trilobeElectrodeGeometryEngine.generate(input);

      const gcodeExport = output.cam_exports.find(e => e.format === "template");
      expect(gcodeExport).toBeDefined();
      expect(gcodeExport!.content).toContain("G12.1"); // Polar interpolation on
      expect(gcodeExport!.content).toContain("G13.1"); // Polar interpolation off
    });
  });

  describe("getProfile — preview function", () => {
    it("should return profile points for preview", () => {
      const profile = trilobeElectrodeGeometryEngine.getProfile(0.260, 0.240, 0);
      expect(profile.length).toBe(360);
    });

    it("should apply rotation for animated preview", () => {
      const profile0 = trilobeElectrodeGeometryEngine.getProfile(0.260, 0.240, 0);
      const profile45 = trilobeElectrodeGeometryEngine.getProfile(0.260, 0.240, 45);

      // First points should be at different angles
      const angle0 = Math.atan2(profile0[0].y, profile0[0].x) * 180 / Math.PI;
      const angle45 = Math.atan2(profile45[0].y, profile45[0].x) * 180 / Math.PI;

      expect(Math.abs(angle45 - angle0 - 45)).toBeLessThan(1);
    });
  });

  describe("stats", () => {
    it("should return engine statistics", () => {
      const stats = trilobeElectrodeGeometryEngine.stats();
      expect(stats.jobs_generated).toBeGreaterThanOrEqual(0);
      expect(stats.cam_systems_supported).toBe(3);
    });
  });
});

// ============================================================================
// ECCENTRIC TURNING ENGINE
// ============================================================================

describe("EccentricTurningEngine", () => {
  describe("generate — polar interpolation program", () => {
    it("should generate Okuma polar interpolation G-code", async () => {
      const input: EccentricTurningInput = {
        part_number: "TURN-TEST-001",
        profile_type: "trilobe",
        trilobe_stages: [
          { c_dia_in: 0.260, e_dia_in: 0.240, z_start_in: 0, z_end_in: 0.5 },
        ],
        lead_angle_deg: 0,
        total_length_in: 0.5,
        workpiece_material: "graphite",
        target_finish_Ra_um: 1.6,
        max_spindle_rpm: 1500,
        controller: "OSP-P300L-R",
        tool_position: 1,
        tool_nose_radius_in: 0.016,
        finish_passes: 2,
        finish_stock_in: 0.003,
        use_css: true,
        css_sfm: 600,
      };

      const output = await eccentricTurningEngine.generate(input);

      expect(output.job_id).toMatch(/^ECCENTRIC-/);
      expect(output.controller).toBe("OSP-P300L-R");
      expect(output.gcode).toContain("G12.1"); // Polar on
      expect(output.gcode).toContain("G13.1"); // Polar off
      expect(output.gcode).toContain("G96"); // CSS
      expect(output.gcode).toContain("G50"); // Max RPM clamp
    });

    it("should support all controller dialects", async () => {
      const controllers: ("OSP-P300L-R" | "OSP-P300LA-E" | "OSP-P300SA")[] = [
        "OSP-P300L-R",
        "OSP-P300LA-E",
        "OSP-P300SA",
      ];

      for (const controller of controllers) {
        const input: EccentricTurningInput = {
          part_number: `CTRL-${controller}`,
          profile_type: "trilobe",
          trilobe_stages: [
            { c_dia_in: 0.260, e_dia_in: 0.240, z_start_in: 0, z_end_in: 0.5 },
          ],
          total_length_in: 0.5,
          workpiece_material: "graphite",
          target_finish_Ra_um: 1.6,
          max_spindle_rpm: 1500,
          controller,
          tool_position: 1,
          tool_nose_radius_in: 0.016,
          finish_passes: 1,
          finish_stock_in: 0.002,
          use_css: true,
          css_sfm: 600,
        };

        const output = await eccentricTurningEngine.generate(input);
        expect(output.gcode).toContain(`CONTROLLER: ${controller}`);
      }
    });

    it("should calculate physics for force variation", async () => {
      const input: EccentricTurningInput = {
        part_number: "PHYSICS-TEST",
        profile_type: "trilobe",
        trilobe_stages: [
          { c_dia_in: 0.300, e_dia_in: 0.260, z_start_in: 0, z_end_in: 0.5 },
        ],
        total_length_in: 0.5,
        workpiece_material: "graphite",
        target_finish_Ra_um: 1.6,
        max_spindle_rpm: 1500,
        controller: "OSP-P300L-R",
        tool_position: 1,
        tool_nose_radius_in: 0.016,
        finish_passes: 2,
        finish_stock_in: 0.003,
        use_css: true,
        css_sfm: 600,
      };

      const output = await eccentricTurningEngine.generate(input);

      expect(output.physics.max_cutting_force_N).toBeGreaterThan(0);
      expect(output.physics.force_variation_percent).toBeGreaterThan(0);
      expect(output.physics.max_x_accel_mm_s2).toBeGreaterThan(0);
      expect(output.physics.recommended_css_sfm).toBeGreaterThan(0);
    });

    it("should warn about high X-axis acceleration", async () => {
      const input: EccentricTurningInput = {
        part_number: "HIGH-ACCEL",
        profile_type: "trilobe",
        trilobe_stages: [
          { c_dia_in: 0.400, e_dia_in: 0.300, z_start_in: 0, z_end_in: 0.5 }, // Large amplitude
        ],
        total_length_in: 0.5,
        workpiece_material: "graphite",
        target_finish_Ra_um: 1.6,
        max_spindle_rpm: 2500, // High RPM
        controller: "OSP-P300L-R",
        tool_position: 1,
        tool_nose_radius_in: 0.016,
        finish_passes: 2,
        finish_stock_in: 0.003,
        use_css: false,
      };

      const output = await eccentricTurningEngine.generate(input);

      // Should have acceleration warning due to large lobe amplitude + high RPM
      expect(output.warnings.some(w => w.includes("acceleration") || w.includes("X-axis"))).toBe(true);
    });
  });

  describe("validateInput", () => {
    it("should require trilobe_stages for trilobe profile", () => {
      const errors = eccentricTurningEngine.validateInput({
        part_number: "MISSING-STAGES",
        profile_type: "trilobe",
        // trilobe_stages missing
        total_length_in: 0.5,
        workpiece_material: "graphite",
        target_finish_Ra_um: 1.6,
        max_spindle_rpm: 1500,
        controller: "OSP-P300L-R",
        tool_position: 1,
        tool_nose_radius_in: 0.016,
        finish_passes: 1,
        finish_stock_in: 0.002,
        use_css: true,
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes("trilobe_stages"))).toBe(true);
    });

    it("should reject RPM > 3000", () => {
      const errors = eccentricTurningEngine.validateInput({
        part_number: "HIGH-RPM",
        profile_type: "polygon",
        max_radius_in: 0.15,
        min_radius_in: 0.12,
        total_length_in: 0.5,
        workpiece_material: "graphite",
        target_finish_Ra_um: 1.6,
        max_spindle_rpm: 4000, // Too high
        controller: "OSP-P300L-R",
        tool_position: 1,
        tool_nose_radius_in: 0.016,
        finish_passes: 1,
        finish_stock_in: 0.002,
        use_css: true,
      });

      expect(errors.some(e => e.includes("RPM") || e.includes("spindle"))).toBe(true);
    });
  });

  describe("getSupportedControllers", () => {
    it("should return 3 Okuma controller dialects", () => {
      const controllers = eccentricTurningEngine.getSupportedControllers();
      expect(controllers).toHaveLength(3);
      expect(controllers).toContain("OSP-P300L-R");
      expect(controllers).toContain("OSP-P300LA-E");
      expect(controllers).toContain("OSP-P300SA");
    });
  });

  describe("stats", () => {
    it("should return engine statistics", () => {
      const stats = eccentricTurningEngine.stats();
      expect(stats.jobs_generated).toBeGreaterThanOrEqual(0);
      expect(stats.controllers_supported).toBe(3);
    });
  });
});

// ============================================================================
// INTEGRATION: Trilobe Geometry → Eccentric Turning
// ============================================================================

describe("Integration: Trilobe Electrode → Eccentric Turning", () => {
  it("should pass trilobe geometry to eccentric turning engine", async () => {
    // First generate trilobe geometry
    const trilobeInput: TrilobeInput = {
      part_number: "INTEGRATED-001",
      stages: [
        { c_dia_in: 0.260, e_dia_in: 0.240, z_start_in: 0, z_end_in: 0.75 },
      ],
      lobe_count: 3,
      lead_angle_deg: 0,
      total_length_in: 0.75,
      shank_dia_in: 0.5,
      draft_deg: 0,
      undersize_in: 0.001,
      oversize_in: 0,
      target_finish_Ra_um: 1.6,
      workpiece_material: "D2",
      export_step: false,
      export_dxf: false,
      export_gcode: false,
    };

    const trilobeOutput = await trilobeElectrodeGeometryEngine.generate(trilobeInput);

    // Then use trilobe stages for eccentric turning
    const turningInput: EccentricTurningInput = {
      part_number: trilobeOutput.part_number,
      profile_type: "trilobe",
      trilobe_stages: trilobeOutput.geometry.definition.stages,
      lead_angle_deg: trilobeOutput.geometry.definition.lead_angle_deg,
      total_length_in: trilobeOutput.geometry.definition.total_length_in,
      workpiece_material: "graphite", // Electrode material
      target_finish_Ra_um: 1.6,
      max_spindle_rpm: 1500,
      controller: "OSP-P300L-R",
      tool_position: 1,
      tool_nose_radius_in: 0.016,
      finish_passes: 2,
      finish_stock_in: 0.003,
      use_css: true,
      css_sfm: 600,
    };

    const turningOutput = await eccentricTurningEngine.generate(turningInput);

    // Verify outputs match
    expect(turningOutput.profile_summary.type).toBe("trilobe");
    expect(turningOutput.gcode).toContain("G12.1");
    // Eccentric turning receives already-adjusted stages, so compare to stage c_dia directly
    expect(turningOutput.profile_summary.max_diameter_in).toBeCloseTo(
      trilobeOutput.geometry.definition.stages[0].c_dia_in,
      3
    );
  });

  it("should handle helical trilobes with lead angle", async () => {
    const trilobeInput: TrilobeInput = {
      part_number: "HELICAL-001",
      stages: [
        { c_dia_in: 0.280, e_dia_in: 0.260, z_start_in: 0, z_end_in: 1.0 },
      ],
      lobe_count: 3,
      lead_angle_deg: 10, // Helical
      total_length_in: 1.0,
      shank_dia_in: 0.5,
      draft_deg: 0,
      undersize_in: 0.001,
      oversize_in: 0,
      target_finish_Ra_um: 1.6,
      workpiece_material: "D2",
      export_step: false,
      export_dxf: false,
      export_gcode: true,
    };

    const trilobeOutput = await trilobeElectrodeGeometryEngine.generate(trilobeInput);

    // Check that sections have varying lobe_rotation_deg
    const rotations = trilobeOutput.geometry.sections.map(s => s.lobe_rotation_deg);
    const uniqueRotations = new Set(rotations);

    // Should have multiple unique rotations due to helical lead
    expect(uniqueRotations.size).toBeGreaterThan(1);
  });
});
