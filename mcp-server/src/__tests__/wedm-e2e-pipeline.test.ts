/**
 * wedm-e2e-pipeline.test.ts — End-to-End WEDM Pipeline Smoke Test
 *
 * Feeds real DXF content through the ENTIRE WEDM pipeline:
 *   parse → classify → feasibility → selection → start-holes →
 *   toolpath → multipass → optimize → gcode → cost → setup-sheet
 *
 * Tests 3 representative Wire EDM parts:
 *   1. Simple die plate (rectangle with hole) — most common WEDM job
 *   2. Multi-cavity punch (rectangle with 3 internal features)
 *   3. Open contour trim — tests non-closed path handling
 *
 * Each test verifies:
 *   - No engine throws
 *   - Return shapes match what the frontend expects
 *   - Physics values are within sane ranges
 */

import { describe, it, expect } from "vitest";
import { DXFGeometryParserEngine } from "../engines/DXFGeometryParserEngine.js";

// Lazy-import pipeline engines to match dispatcher pattern
async function loadEngine(name: string) {
  switch (name) {
    case "drawingInterp": return (await import("../engines/EDMDrawingInterpretationEngine.js")).edmDrawingInterpretationEngine;
    case "feasibility": return (await import("../engines/EDMFeasibilityEngine.js")).edmFeasibilityEngine;
    case "materialMachineWire": return (await import("../engines/EDMMaterialMachineWireEngine.js")).edmMaterialMachineWireEngine;
    case "startHoleSetup": return (await import("../engines/EDMStartHoleSetupEngine.js")).edmStartHoleSetupEngine;
    case "toolpathStrategy": return (await import("../engines/EDMToolpathStrategyEngine.js")).edmToolpathStrategyEngine;
    case "multiPass": return (await import("../engines/EDMMultiPassStrategyEngine.js")).edmMultiPassStrategyEngine;
    case "cuttingParamFlush": return (await import("../engines/EDMCuttingParamFlushEngine.js")).edmCuttingParamFlushEngine;
    case "wireSlugCornerTaper": return (await import("../engines/EDMWireSlugCornerTaperEngine.js")).edmWireSlugCornerTaperEngine;
    case "monitorSurface": return (await import("../engines/EDMMonitorSurfaceIntegrityEngine.js")).edmMonitorSurfaceIntegrityEngine;
    case "postProcessGCode": return (await import("../engines/EDMPostProcessGCodeEngine.js")).edmPostProcessGCodeEngine;
    case "costDocumentation": return (await import("../engines/EDMCostDocumentationEngine.js")).edmCostDocumentationEngine;
    default: throw new Error(`Unknown engine: ${name}`);
  }
}

// ============================================================================
// DXF HELPERS
// ============================================================================

function makeDXF(entities: string): string {
  return [
    "0", "SECTION",
    "2", "ENTITIES",
    entities,
    "0", "ENDSEC",
    "0", "EOF",
  ].join("\n");
}

function dxfLine(x1: number, y1: number, x2: number, y2: number): string {
  return ["0", "LINE", "10", String(x1), "20", String(y1), "11", String(x2), "21", String(y2)].join("\n");
}

function dxfCircle(cx: number, cy: number, r: number): string {
  return ["0", "CIRCLE", "10", String(cx), "20", String(cy), "40", String(r)].join("\n");
}

function dxfRect(x: number, y: number, w: number, h: number): string {
  return ["0", "LWPOLYLINE", "70", "1",
    "10", String(x), "20", String(y),
    "10", String(x + w), "20", String(y),
    "10", String(x + w), "20", String(y + h),
    "10", String(x), "20", String(y + h),
  ].join("\n");
}

// ============================================================================
// TEST DXF FILES — Realistic Wire EDM Parts
// ============================================================================

/** Part 1: Simple die plate — 50×30mm rectangle with 10mm hole at center */
const DXF_DIE_PLATE = makeDXF([
  dxfRect(0, 0, 50, 30),    // exterior contour
  dxfCircle(25, 15, 5),     // 10mm diameter hole
].join("\n"));

/** Part 2: Multi-cavity punch — 80×60mm with 3 internal pockets */
const DXF_MULTI_CAVITY = makeDXF([
  dxfRect(0, 0, 80, 60),    // exterior
  dxfCircle(20, 30, 4),     // 8mm hole
  dxfCircle(40, 30, 6),     // 12mm hole
  dxfCircle(60, 30, 3),     // 6mm hole
].join("\n"));

/** Part 3: Open contour (2 disconnected lines — should flag as WEDM issue) */
const DXF_OPEN_CONTOUR = makeDXF([
  dxfLine(0, 0, 20, 0),
  dxfLine(20, 0, 20, 15),
  // deliberately not closed
].join("\n"));

// ============================================================================
// TESTS
// ============================================================================

const parser = new DXFGeometryParserEngine();

describe("WEDM E2E Pipeline — Real DXF Files", () => {

  // ── STAGE 1: Geometry Parsing ──────────────────────────────────────────

  describe("Stage 1: DXF Parsing", () => {
    it("parses die plate: 2 contours (1 exterior rect + 1 interior hole)", () => {
      const result = parser.parseDXF(DXF_DIE_PLATE);
      expect(result.contours.length).toBe(2);
      expect(result.entity_count).toBeGreaterThanOrEqual(2);
      // Exterior should have area ~1500 (50×30)
      const exterior = result.contours.find(c => c.is_exterior);
      expect(exterior).toBeDefined();
      expect(exterior!.area_mm2).toBeCloseTo(50 * 30, -1);
      expect(exterior!.is_closed).toBe(true);
      // Interior hole should have area ~π×5²
      const interior = result.contours.find(c => !c.is_exterior);
      expect(interior).toBeDefined();
      expect(interior!.area_mm2).toBeCloseTo(Math.PI * 25, -1);
      expect(interior!.is_closed).toBe(true);
    });

    it("parses multi-cavity: 4 contours (1 exterior + 3 holes)", () => {
      const result = parser.parseDXF(DXF_MULTI_CAVITY);
      expect(result.contours.length).toBe(4);
      const exteriors = result.contours.filter(c => c.is_exterior);
      const interiors = result.contours.filter(c => !c.is_exterior);
      expect(exteriors.length).toBe(1);
      expect(interiors.length).toBe(3);
    });

    it("flags open contour with appropriate issue", () => {
      const result = parser.parseDXF(DXF_OPEN_CONTOUR);
      expect(result.issues.some(i => i.type === "open_contour")).toBe(true);
    });
  });

  // ── STAGE 2: Feature Classification ────────────────────────────────────

  describe("Stage 2: Feature Classification", () => {
    it("converts die plate contours to PartFeatures", () => {
      const parseResult = parser.parseDXF(DXF_DIE_PLATE);
      const features = parser.toPartFeatures(parseResult.contours);

      expect(features.length).toBe(2);
      // Should have at least one profile and one hole
      const types = features.map(f => f.type);
      expect(types).toContain("profile");
      // Interior circle could be "hole" or "cavity"
      expect(types.some(t => t === "hole" || t === "cavity" || t === "contour")).toBe(true);
    });

    it("extracts correct dimensions from die plate", () => {
      const parseResult = parser.parseDXF(DXF_DIE_PLATE);
      const features = parser.toPartFeatures(parseResult.contours);
      const profile = features.find(f => f.type === "profile");
      expect(profile).toBeDefined();
      expect(profile!.dimensions_mm.length).toBeCloseTo(50, 0);
      expect(profile!.dimensions_mm.width).toBeCloseTo(30, 0);
      expect(profile!.profile_length_mm).toBeCloseTo(160, 0); // perimeter
    });

    it("classifyFeaturesAction returns edm_process assessments", async () => {
      const parseResult = parser.parseDXF(DXF_DIE_PLATE);
      const features = parser.toPartFeatures(parseResult.contours);

      const interpEngine = await loadEngine("drawingInterp");
      const classified = interpEngine.classifyFeaturesAction({
        features,
        material: "D2 Tool Steel",
      });

      expect(classified).toBeDefined();
      // Should return an array of classified features
      if (Array.isArray(classified)) {
        expect(classified.length).toBeGreaterThan(0);
        for (const f of classified) {
          expect(f).toHaveProperty("edm_process");
          expect(["wire_edm", "sinker_edm", "hole_popper", "micro_edm", "not_edm"]).toContain(f.edm_process);
        }
      }
    });
  });

  // ── STAGE 3: Feasibility ───────────────────────────────────────────────

  describe("Stage 3: Feasibility Assessment", () => {
    it("assesses die plate as feasible for Wire EDM", async () => {
      const parseResult = parser.parseDXF(DXF_DIE_PLATE);
      const features = parser.toPartFeatures(parseResult.contours);

      const engine = await loadEngine("feasibility");
      // Engine expects nested FeasibilityInput with workpiece object
      const result = engine.assess({
        features: features.map(f => ({
          name: f.name,
          is_through: f.is_through,
          profile_length_mm: f.profile_length_mm ?? 0,
          min_corner_radius_mm: f.min_corner_radius_mm,
          tolerance_mm: f.tolerance_mm,
          surface_finish_ra_um: f.surface_finish_ra_um,
        })),
        material: "D2 Tool Steel",
        workpiece: { thickness_mm: 25, length_mm: 50, width_mm: 30, height_mm: 25 },
        wire_diameter_mm: 0.25,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("overall_feasible");
      expect(result.overall_feasible).toBe(true);
    });
  });

  // ── STAGE 4: Material/Machine/Wire Selection ──────────────────────────

  describe("Stage 4: Material/Machine/Wire Selection", () => {
    it("selects appropriate machine and wire for D2 steel", async () => {
      const parseResult = parser.parseDXF(DXF_DIE_PLATE);
      const features = parser.toPartFeatures(parseResult.contours);

      const engine = await loadEngine("materialMachineWire");
      const result = engine.fullSelection({
        material: "D2 Tool Steel",
        features,
      });

      expect(result).toBeDefined();
      // Engine returns { material_assessment, machine_selection, wire_selection }
      expect(result).toHaveProperty("material_assessment");
      expect(result).toHaveProperty("machine_selection");
      expect(result).toHaveProperty("wire_selection");
      // Wire selection should have diameter (engine uses diameter_mm, not wire_diameter_mm)
      expect(result.wire_selection).toHaveProperty("diameter_mm");
      expect(result.wire_selection.diameter_mm).toBeGreaterThan(0);
    });
  });

  // ── STAGE 5: Start Holes ──────────────────────────────────────────────

  describe("Stage 5: Start Hole Planning", () => {
    it("plans start holes for internal features", async () => {
      const parseResult = parser.parseDXF(DXF_DIE_PLATE);

      const engine = await loadEngine("startHoleSetup");
      // Engine expects profiles (ProfileGeometry[]) + workpiece, not features
      const profiles = parseResult.contours.filter(c => !c.is_exterior).map(c => ({
        id: c.id,
        type: "closed_internal" as const,
        contour: c.segments,
        is_closed: c.is_closed,
        perimeter_mm: c.perimeter_mm,
        area_mm2: c.area_mm2,
        bbox: c.bbox,
      }));

      const result = engine.action_plan_start_holes({
        profiles,
        workpiece: { material: "D2 Tool Steel", thickness_mm: 25, length_mm: 50, width_mm: 30 },
        wire_diameter_mm: 0.25,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("holes");
      if (Array.isArray(result.holes)) {
        expect(result.holes.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // ── STAGE 6: Toolpath ─────────────────────────────────────────────────

  describe("Stage 6: Toolpath Strategy", () => {
    it("generates toolpath profiles from contours", async () => {
      const parseResult = parser.parseDXF(DXF_DIE_PLATE);

      const engine = await loadEngine("toolpathStrategy");
      // Engine expects { profiles: ProfileDefinition[], workpiece_thickness_mm, wire_diameter_mm }
      const profiles = parseResult.contours.map((c, i) => ({
        name: `profile_${i}`,
        type: (c.is_exterior ? "closed_external" : "closed_internal") as "closed_external" | "closed_internal",
        contour_points: c.segments.map((s: any) => s.start),
        profile_length_mm: c.perimeter_mm,
        min_corner_radius_mm: undefined,
        start_hole_id: c.is_exterior ? undefined : `sh_${i}`,
      }));

      const result = engine.generate_toolpath({
        profiles,
        workpiece_thickness_mm: 25,
        wire_diameter_mm: 0.25,
      });

      expect(result).toBeDefined();
      // Engine returns profiles_classified (not profiles) and total_profile_length_mm (not total_cut_length_mm)
      expect(result).toHaveProperty("profiles_classified");
      expect(result).toHaveProperty("total_profile_length_mm");
      expect(result.total_profile_length_mm).toBeGreaterThan(0);
    });
  });

  // ── STAGE 7: Multi-Pass Strategy ──────────────────────────────────────

  describe("Stage 7: Multi-Pass Strategy", () => {
    it("plans passes for D2 steel with 0.8μm Ra target", async () => {
      const engine = await loadEngine("multiPass");
      // Engine method is full_plan, expects MultiPassInput
      const result = engine.full_plan({
        material: "D2 Tool Steel",
        thickness_mm: 25,
        profile_length_mm: 160,
        tolerance_mm: 0.01,
        target_ra_um: 0.8,
        wire_diameter_mm: 0.25,
        wire_type: "brass",
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("total_passes");
      expect(result).toHaveProperty("passes");
      expect(result.total_passes).toBeGreaterThanOrEqual(2);
      expect(result.total_passes).toBeLessThanOrEqual(8);
      if (Array.isArray(result.passes)) {
        for (const pass of result.passes) {
          expect(pass).toHaveProperty("pass_type");
          expect(pass).toHaveProperty("offset_mm");
        }
      }
    });
  });

  // ── STAGE 8: Cutting Params + Flushing ────────────────────────────────

  describe("Stage 8: Cutting Parameters", () => {
    it("optimizes cutting params for D2 steel", async () => {
      const engine = await loadEngine("cuttingParamFlush");
      const result = engine.optimizeParams({
        material: "D2 Tool Steel",
        thickness_mm: 25,
        wire_diameter_mm: 0.25,
        wire_type: "brass",
        pass_number: 1,
        pass_type: "rough",
        target_ra_um: 0.8,
      });

      expect(result).toBeDefined();
      // Engine returns nested: { pulse: { on_us, off_us, peak_current_A }, predicted: { ra_um }, ... }
      expect(result).toHaveProperty("pulse");
      expect(result.pulse).toHaveProperty("on_us");
      expect(result.pulse).toHaveProperty("off_us");
      expect(result.pulse.on_us).toBeGreaterThan(0);
      expect(result).toHaveProperty("predicted");
      expect(result.predicted).toHaveProperty("ra_um");
    });
  });

  // ── STAGE 9: G-code Generation ────────────────────────────────────────

  describe("Stage 9: G-code Generation", () => {
    it("generates valid G-code for Fanuc controller", async () => {
      const engine = await loadEngine("postProcessGCode");
      const profileInput = {
        name: "outer",
        type: "closed_external",
        contour_points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 30 }, { x: 0, y: 30 }],
        profile_length_mm: 160,
        start_hole: { x: -2, y: 0 },
        approach: { type: "linear", length_mm: 2 },
        departure: { type: "linear", length_mm: 2 },
      };
      const result = engine.generate_gcode({
        material: "D2 Tool Steel",
        machine_id: "fanuc-robocut-c600",
        controller: "fanuc",
        wire_type: "brass",
        wire_diameter_mm: 0.25,
        profiles: [profileInput],
        passes: [
          { pass_number: 1, pass_type: "rough", offset_mm: 0.15, pulse_on_us: 8, pulse_off_us: 16, wire_tension_n: 12, wire_speed_m_min: 8, cutting_speed_mm_min: 4 },
          { pass_number: 2, pass_type: "finish", offset_mm: 0.01, pulse_on_us: 2, pulse_off_us: 10, wire_tension_n: 18, wire_speed_m_min: 4, cutting_speed_mm_min: 8 },
        ],
        flushing: { mode: "submerged", pressure_bar: 5 },
      });

      expect(result).toBeDefined();
      // Engine returns { gcode: string } not { program: string }
      expect(result).toHaveProperty("gcode");
      expect(typeof result.gcode).toBe("string");
      expect(result.gcode.length).toBeGreaterThan(10);
      expect(result).toHaveProperty("line_count");
      expect(result.line_count).toBeGreaterThan(0);
    });

    it("generates G-code for all 6 controller dialects without throwing", async () => {
      const engine = await loadEngine("postProcessGCode");
      // EDMPostProcessGCodeEngine supports 5 dialects (accutex handled by EDMProgramAssemblerEngine separately)
      const dialects = ["fanuc", "sodick", "makino", "mitsubishi", "agiecharmilles"];
      const baseParams = {
        material: "D2 Tool Steel",
        machine_id: "test-machine",
        wire_type: "brass",
        wire_diameter_mm: 0.25,
        profiles: [{
          name: "outer",
          type: "closed_external" as const,
          contour_points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 30 }, { x: 0, y: 30 }],
          profile_length_mm: 160,
          start_hole: { x: -2, y: 0 },
          approach: { type: "linear" as const, length_mm: 2 },
          departure: { type: "linear" as const, length_mm: 2 },
        }],
        passes: [
          { pass_number: 1, pass_type: "rough" as const, offset_mm: 0.15, pulse_on_us: 8, pulse_off_us: 16, wire_tension_n: 12, wire_speed_m_min: 8, cutting_speed_mm_min: 4, technology_table: "E10" },
          { pass_number: 2, pass_type: "finish" as const, offset_mm: 0.01, pulse_on_us: 2, pulse_off_us: 10, wire_tension_n: 18, wire_speed_m_min: 4, cutting_speed_mm_min: 8, technology_table: "E15" },
        ],
        flushing: { mode: "submerged" as const, pressure_bar: 5 },
      };

      for (const dialect of dialects) {
        const result = engine.generate_gcode({ ...baseParams, controller: dialect });
        expect(result.gcode.length).toBeGreaterThan(0);
      }
    });
  });

  // ── STAGE 10: Cost Estimation ─────────────────────────────────────────

  describe("Stage 10: Cost & Documentation", () => {
    it("estimates cost for die plate job", async () => {
      const engine = await loadEngine("costDocumentation");
      const result = engine.estimateCost({
        part_id: "die-plate-001",
        material: "D2 Tool Steel",
        machine_time: {
          machine_rate_per_hr: 85,
          setup_hrs: 0.5,
          cutting_hrs: 0.75,
          threading_time_per_event_hr: 0.01,
          threading_events: 1,
          idle_hrs: 0.1,
        },
        wire: {
          wire_type: "brass" as const,
          wire_diameter_mm: 0.25,
          cutting_hrs: 0.75,
          wire_speed_mm_per_min: 120,
        },
        consumables: {
          cutting_hrs: 0.75,
        },
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("total_per_part");
      expect(result.total_per_part).toBeGreaterThan(0);
    });

    it("generates setup sheet", async () => {
      const engine = await loadEngine("costDocumentation");
      const result = engine.generateSetupSheet({
        program: "O0001",
        machine: "Fanuc Robocut C600iB",
        material: "D2 Tool Steel",
        dimensions: "50×30×25mm",
        weight_kg: 0.3,
        wire_type: "brass",
        wire_diameter_mm: 0.25,
      });

      expect(result).toBeDefined();
      // Engine returns nested structure: header.material lives in workpiece.material
      expect(result).toHaveProperty("header");
      expect(result).toHaveProperty("workpiece");
      expect(result.workpiece).toHaveProperty("material");
    });
  });

  // ── FULL CHAIN: DXF → G-code in one shot ──────────────────────────────

  describe("Full Chain: DXF → G-code", () => {
    it("processes die plate from DXF to G-code without any throw", async () => {
      // Step 1: Parse
      const parseResult = parser.parseDXF(DXF_DIE_PLATE);
      expect(parseResult.contours.length).toBeGreaterThan(0);
      const features = parser.toPartFeatures(parseResult.contours);
      expect(features.length).toBeGreaterThan(0);

      // Step 2: Classify
      const interp = await loadEngine("drawingInterp");
      const classified = interp.classifyFeaturesAction({ features, material: "D2 Tool Steel" });
      expect(classified).toBeDefined();

      // Step 3: Feasibility (engine expects nested workpiece object)
      const feasEngine = await loadEngine("feasibility");
      const feasibility = feasEngine.assess({
        features: features.map(f => ({
          name: f.name, is_through: f.is_through,
          profile_length_mm: f.profile_length_mm ?? 0,
        })),
        material: "D2 Tool Steel",
        workpiece: { thickness_mm: 25, length_mm: 50, width_mm: 30, height_mm: 25 },
        wire_diameter_mm: 0.25,
      });
      expect(feasibility.overall_feasible).toBe(true);

      // Step 4: Selection (returns nested structure)
      const selEngine = await loadEngine("materialMachineWire");
      const selection = selEngine.fullSelection({ material: "D2 Tool Steel", features });
      expect(selection).toBeDefined();
      const wireDia = selection.wire_selection?.diameter_mm ?? 0.25;
      const wireType = selection.wire_selection?.wire_type ?? "brass";

      // Step 5: Toolpath (engine expects ProfileDefinition[], not features)
      const tpEngine = await loadEngine("toolpathStrategy");
      const profiles = parseResult.contours.map((c, i) => ({
        name: `profile_${i}`,
        type: (c.is_exterior ? "closed_external" : "closed_internal") as "closed_external" | "closed_internal",
        contour_points: c.segments.map((s: any) => s.start),
        profile_length_mm: c.perimeter_mm,
        start_hole_id: c.is_exterior ? undefined : `sh_${i}`,
      }));
      const toolpath = tpEngine.generate_toolpath({
        profiles,
        workpiece_thickness_mm: 25,
        wire_diameter_mm: wireDia,
      });
      // Engine returns total_profile_length_mm, not total_cut_length_mm
      expect(toolpath.total_profile_length_mm).toBeGreaterThan(0);

      // Step 6: Multi-pass
      const mpEngine = await loadEngine("multiPass");
      const multipass = mpEngine.full_plan({
        material: "D2 Tool Steel",
        thickness_mm: 25,
        profile_length_mm: toolpath.total_profile_length_mm,
        tolerance_mm: 0.01,
        target_ra_um: 0.8,
        wire_diameter_mm: wireDia,
        wire_type: wireType,
      });
      expect(multipass.total_passes).toBeGreaterThanOrEqual(2);

      // Step 7: G-code — profiles need start_hole + approach/departure
      const gcodeEngine = await loadEngine("postProcessGCode");
      const gcodeProfiles = profiles.map(p => ({
        ...p,
        start_hole: { x: -2, y: 0 },
        approach: { type: "linear", length_mm: 2 },
        departure: { type: "linear", length_mm: 2 },
      }));
      const gcode = gcodeEngine.generate_gcode({
        material: "D2 Tool Steel",
        machine_id: "fanuc-robocut-c600",
        controller: "fanuc",
        wire_type: wireType,
        wire_diameter_mm: wireDia,
        profiles: gcodeProfiles,
        passes: multipass.passes,
        flushing: { mode: "submerged", pressure_bar: 5 },
      });
      expect(gcode.gcode.length).toBeGreaterThan(10);
      expect(gcode.line_count).toBeGreaterThan(0);

      // Step 8: Cost — engine expects nested input structure
      const costEngine = await loadEngine("costDocumentation");
      const estTimeHrs = 0.75;
      const cost = costEngine.estimateCost({
        part_id: "die-plate-chain",
        material: "D2 Tool Steel",
        machine_time: {
          machine_rate_per_hr: 85,
          setup_hrs: 0.5,
          cutting_hrs: estTimeHrs,
          threading_time_per_event_hr: 0.01,
          threading_events: 1,
        },
        wire: {
          wire_type: wireType as any,
          wire_diameter_mm: wireDia,
          cutting_hrs: estTimeHrs,
          wire_speed_mm_per_min: 120,
        },
        consumables: { cutting_hrs: estTimeHrs },
      });
      expect(cost.total_per_part).toBeGreaterThan(0);

      // SUCCESS — Full pipeline: DXF → Parse → Classify → Feasibility → Selection →
      // Toolpath → Multi-Pass → G-code → Cost — all completed without throwing
    });
  });
});
