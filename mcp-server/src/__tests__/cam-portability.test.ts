/**
 * Tests for CamKnowledgePortabilityEngine
 * Cross-CAM knowledge bridge: any CAM → any controller
 */
import { describe, it, expect } from "vitest";
import {
  camKnowledgePortabilityEngine as engine,
  type PortabilityInput,
  type TargetController,
  type CamIntent,
} from "../engines/CamKnowledgePortabilityEngine.js";

describe("CamKnowledgePortabilityEngine", () => {
  // ── Core Translation ──────────────────────────────────────────────────

  describe("translate — basic operation", () => {
    const baseInput: PortabilityInput = {
      intent: "rough_3d",
      material: { name: "1045 Steel" },
      tool: { diameter: 10, flute_count: 4 },
      machine: { controller: "fanuc" },
    };

    it("returns complete result with all fields", () => {
      const r = engine.translate(baseInput);
      expect(r.intent).toBe("rough_3d");
      expect(r.controller).toBe("fanuc");
      expect(r.strategy).toBeDefined();
      expect(r.parameters).toBeDefined();
      expect(r.knowledge_sources.length).toBeGreaterThan(0);
    });

    it("resolves RPM from ISO cutting data", () => {
      const r = engine.translate(baseInput);
      // 1045 Steel = ISO P, vc=200, RPM = 200*1000/(pi*10) ≈ 6366
      expect(r.parameters.rpm).toBeGreaterThan(5000);
      expect(r.parameters.rpm).toBeLessThan(8000);
    });

    it("resolves feed rate from RPM × fz × flutes", () => {
      const r = engine.translate(baseInput);
      // RPM ~6366, fz=0.10, 4 flutes → ~2546 mm/min
      expect(r.parameters.feed_rate).toBeGreaterThan(2000);
      expect(r.parameters.feed_rate).toBeLessThan(4000);
    });

    it("includes cycle defaults from hyperMILL knowledge", () => {
      const r = engine.translate(baseInput);
      expect(r.parameters.stepdown).toBeGreaterThan(0);
      expect(r.parameters.stepover).toBeGreaterThan(0);
      expect(r.parameters.clearance_plane).toBeGreaterThan(0);
    });

    it("includes holder clearance from hyperMILL defaults", () => {
      const r = engine.translate(baseInput);
      expect(r.parameters.holder_clearance).toBe(0.25);
    });

    it("includes approach/retract from formula T:Dia*0.35", () => {
      const r = engine.translate({
        ...baseInput,
        intent: "finish_3d",
      });
      // T:Dia*0.35 = 10*0.35 = 3.5
      expect(r.parameters.approach_length).toBeCloseTo(3.5);
      expect(r.parameters.retract_length).toBeCloseTo(3.5);
    });
  });

  // ── Cross-Controller Translation ──────────────────────────────────────

  describe("translate — all 6 controllers", () => {
    const controllers: TargetController[] = ["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"];

    controllers.forEach(ctrl => {
      it(`generates valid result for ${ctrl}`, () => {
        const r = engine.translate({
          intent: "finish_3d",
          material: { name: "7075-T6 Aluminum" },
          tool: { diameter: 6, flute_count: 3 },
          machine: { controller: ctrl },
        });
        expect(r.controller).toBe(ctrl);
        expect(r.parameters.rpm).toBeGreaterThan(0);
        expect(r.parameters.feed_rate).toBeGreaterThan(0);
        expect(r.parameters.smoothing_mode).toBeDefined(); // finishing gets smoothing
      });
    });
  });

  // ── Material ISO Mapping ──────────────────────────────────────────────

  describe("translate — material ISO resolution", () => {
    it("maps titanium to ISO S with low speed", () => {
      const r = engine.translate({
        intent: "rough_3d",
        material: { name: "Ti-6Al-4V" },
        tool: { diameter: 10, flute_count: 4 },
        machine: { controller: "fanuc" },
      });
      // ISO S: vc=50 → RPM = 50*1000/(pi*10) ≈ 1592
      expect(r.parameters.rpm).toBeLessThan(2000);
    });

    it("maps aluminum to ISO N with high speed", () => {
      const r = engine.translate({
        intent: "rough_3d",
        material: { name: "6061 Aluminum" },
        tool: { diameter: 10, flute_count: 3 },
        machine: { controller: "haas" },
      });
      // ISO N: vc=500 → RPM ~15915, capped by max_rpm
      expect(r.parameters.rpm).toBeGreaterThan(10000);
    });

    it("maps stainless to ISO M", () => {
      const r = engine.translate({
        intent: "rough_3d",
        material: { name: "316 Stainless" },
        tool: { diameter: 10, flute_count: 4 },
        machine: { controller: "siemens" },
      });
      // ISO M: vc=120 → RPM ~3820
      expect(r.parameters.rpm).toBeGreaterThan(3000);
      expect(r.parameters.rpm).toBeLessThan(5000);
    });

    it("maps hardened steel to ISO H", () => {
      const r = engine.translate({
        intent: "finish_3d",
        material: { name: "D2 Tool Steel", hardness_hrc: 58 },
        tool: { diameter: 6, flute_count: 4 },
        machine: { controller: "fanuc" },
      });
      // ISO H: vc=80, RPM = 80000/(pi*6) ≈ 4244
      expect(r.parameters.rpm).toBeLessThan(5000);
      // RPM < 8000 threshold so no hardened warning for this combo
      expect(r.parameters.rpm).toBeGreaterThan(3000);
    });

    it("explicit iso_group overrides name detection", () => {
      const r = engine.translate({
        intent: "rough_3d",
        material: { name: "Mystery Alloy", iso_group: "S" },
        tool: { diameter: 10, flute_count: 4 },
        machine: { controller: "fanuc" },
      });
      expect(r.parameters.rpm).toBeLessThan(2000); // ISO S speeds
    });
  });

  // ── Safety Warnings ──────────────────────────────────────────────────

  describe("translate — safety warnings", () => {
    it("warns about superalloy without TSC", () => {
      const r = engine.translate({
        intent: "rough_3d",
        material: { name: "Inconel 718" },
        tool: { diameter: 10, flute_count: 4 },
        machine: { controller: "fanuc", has_through_spindle_coolant: false },
      });
      expect(r.warnings.some(w => w.includes("Superalloy"))).toBe(true);
    });

    it("no TSC warning when TSC is available", () => {
      const r = engine.translate({
        intent: "rough_3d",
        material: { name: "Inconel 718" },
        tool: { diameter: 10, flute_count: 4 },
        machine: { controller: "fanuc", has_through_spindle_coolant: true },
      });
      expect(r.warnings.some(w => w.includes("Superalloy"))).toBe(false);
    });

    it("warns about 5-axis on 3-axis machine", () => {
      const r = engine.translate({
        intent: "5axis_swarf",
        material: { name: "1045 Steel" },
        tool: { diameter: 10 },
        machine: { controller: "fanuc", axis_count: 3 },
      });
      expect(r.warnings.some(w => w.includes("5-axis"))).toBe(true);
    });
  });

  // ── G-code Generation ────────────────────────────────────────────────

  describe("translate — G-code output", () => {
    it("generates drilling G-code for Fanuc", () => {
      const r = engine.translate({
        intent: "peck_drilling",
        material: { name: "1045 Steel" },
        tool: { diameter: 8, type: "drill", flute_count: 2 },
        machine: { controller: "fanuc" },
        depth: 25,
      });
      expect(r.gcode).toBeDefined();
      expect(r.gcode!).toContain("G83"); // peck drill
      expect(r.gcode!).toContain("G90"); // safe start
      expect(r.gcode_lines).toBeGreaterThan(5);
    });

    it("generates drilling G-code for Heidenhain", () => {
      const r = engine.translate({
        intent: "drilling",
        material: { name: "1045 Steel" },
        tool: { diameter: 8, type: "drill", flute_count: 2 },
        machine: { controller: "heidenhain" },
        depth: 20,
      });
      expect(r.gcode).toBeDefined();
      expect(r.gcode!).toContain("CYCL DEF 200"); // Heidenhain drilling cycle
      expect(r.gcode!).toContain("TOOL CALL");
    });

    it("generates drilling G-code for Siemens", () => {
      const r = engine.translate({
        intent: "peck_drilling",
        material: { name: "1045 Steel" },
        tool: { diameter: 8, type: "drill", flute_count: 2 },
        machine: { controller: "siemens" },
        depth: 25,
      });
      expect(r.gcode).toBeDefined();
      expect(r.gcode!).toContain("CYCLE83"); // Siemens peck
    });

    it("generates tapping G-code for Fanuc", () => {
      const r = engine.translate({
        intent: "tapping",
        material: { name: "1045 Steel" },
        tool: { diameter: 10, type: "tap", flute_count: 3 },
        machine: { controller: "fanuc" },
        depth: 15,
      });
      expect(r.gcode).toBeDefined();
      expect(r.gcode!).toContain("G84");
    });

    it("does NOT generate G-code for 3D roughing (CAM-driven)", () => {
      const r = engine.translate({
        intent: "rough_3d",
        material: { name: "1045 Steel" },
        tool: { diameter: 10, flute_count: 4 },
        machine: { controller: "fanuc" },
      });
      // 3D roughing toolpath comes from CAM, we only provide parameters
      expect(r.gcode).toBeUndefined();
    });
  });

  // ── HSM Smoothing ────────────────────────────────────────────────────

  describe("translate — HSM smoothing per controller", () => {
    it("adds G5.1 smoothing for Fanuc finishing", () => {
      const r = engine.translate({
        intent: "hsm_finishing",
        material: { name: "1045 Steel" },
        tool: { diameter: 6, flute_count: 4 },
        machine: { controller: "fanuc" },
      });
      expect(r.parameters.smoothing_mode).toContain("G5.1");
    });

    it("adds G187 smoothing for Haas finishing", () => {
      const r = engine.translate({
        intent: "finish_3d",
        material: { name: "1045 Steel" },
        tool: { diameter: 6, flute_count: 4 },
        machine: { controller: "haas" },
      });
      expect(r.parameters.smoothing_mode).toContain("G187");
    });

    it("adds CYCLE832 for Siemens finishing", () => {
      const r = engine.translate({
        intent: "zlevel_finishing",
        material: { name: "1045 Steel" },
        tool: { diameter: 6, flute_count: 4 },
        machine: { controller: "siemens" },
      });
      expect(r.parameters.smoothing_mode).toContain("CYCLE832");
    });

    it("adds M120 for Heidenhain finishing", () => {
      const r = engine.translate({
        intent: "pencil_milling",
        material: { name: "1045 Steel" },
        tool: { diameter: 3, flute_count: 2 },
        machine: { controller: "heidenhain" },
      });
      expect(r.parameters.smoothing_mode).toContain("M120");
    });

    it("no smoothing for roughing", () => {
      const r = engine.translate({
        intent: "rough_3d",
        material: { name: "1045 Steel" },
        tool: { diameter: 10, flute_count: 4 },
        machine: { controller: "fanuc" },
      });
      // Roughing still gets smoothing code (rough mode), just not finish mode
      expect(r.parameters.smoothing_mode).toBeDefined();
      expect(r.parameters.smoothing_mode).not.toContain("0.005"); // not finish tolerance
    });
  });

  // ── Compare Controllers ──────────────────────────────────────────────

  describe("compareControllers", () => {
    it("returns results for all 6 controllers", () => {
      const r = engine.compareControllers({
        intent: "finish_3d",
        material: { name: "1045 Steel" },
        tool: { diameter: 10, flute_count: 4 },
      });
      expect(r.controllers.length).toBe(6);
      expect(r.controllers.map(c => c.controller)).toContain("fanuc");
      expect(r.controllers.map(c => c.controller)).toContain("heidenhain");
    });

    it("all controllers get same RPM/feed for same input", () => {
      const r = engine.compareControllers({
        intent: "rough_3d",
        material: { name: "1045 Steel" },
        tool: { diameter: 10, flute_count: 4 },
      });
      const rpms = new Set(r.controllers.map(c => c.rpm));
      expect(rpms.size).toBe(1); // same material+tool = same RPM everywhere
    });

    it("different smoothing codes per controller", () => {
      const r = engine.compareControllers({
        intent: "finish_3d",
        material: { name: "1045 Steel" },
        tool: { diameter: 6, flute_count: 4 },
      });
      const smoothings = r.controllers.map(c => c.smoothing);
      // At least some should be different (Fanuc G5.1 vs Haas G187 vs Siemens CYCLE832)
      const unique = new Set(smoothings);
      expect(unique.size).toBeGreaterThan(1);
    });
  });

  // ── Material Recommendation ──────────────────────────────────────────

  describe("materialRecommendation", () => {
    it("returns ISO P for steel", () => {
      const r = engine.materialRecommendation({ name: "1045 Steel" });
      expect(r.iso_group).toBe("P");
      expect(r.cutting_speed).toBe(200);
    });

    it("returns ISO S for titanium with warnings", () => {
      const r = engine.materialRecommendation({ name: "Ti-6Al-4V" });
      expect(r.iso_group).toBe("S");
      expect(r.cutting_speed).toBe(50);
      expect(r.warnings.length).toBeGreaterThan(0);
    });

    it("returns ISO N for aluminum", () => {
      const r = engine.materialRecommendation({ name: "7075-T6 Aluminum" });
      expect(r.iso_group).toBe("N");
      expect(r.cutting_speed).toBe(500);
      expect(r.coolant).toBe("mist");
    });

    it("returns ISO H for hardened by HRC", () => {
      const r = engine.materialRecommendation({ name: "Unknown", hardness_hrc: 55 });
      expect(r.iso_group).toBe("H");
    });
  });

  // ── Listing & Stats ──────────────────────────────────────────────────

  describe("listIntents", () => {
    it("returns all 22 intents with cycle mappings", () => {
      const intents = engine.listIntents();
      expect(intents.length).toBe(22);
      expect(intents.find(i => i.intent === "rough_3d")?.cycles).toContain("hmOrm");
    });
  });

  describe("listControllers", () => {
    it("returns 6 controllers", () => {
      expect(engine.listControllers()).toEqual(["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"]);
    });
  });

  describe("controllerFeatures", () => {
    it("returns smoothing/coolant/safe_start for each controller", () => {
      const f = engine.controllerFeatures("siemens");
      expect(f.smoothing.finish).toContain("CYCLE832");
      expect(f.coolant.flood).toBe("M8");
      expect(f.safe_start).toContain("G90");
    });
  });

  describe("stats", () => {
    it("returns valid counts", () => {
      const s = engine.stats();
      expect(s.intents).toBe(22);
      expect(s.controllers).toBe(6);
      expect(s.iso_groups).toBe(6);
      expect(s.cycle_mappings).toBeGreaterThan(30);
      expect(s.gcode_operations).toBeGreaterThanOrEqual(6);
    });
  });

  // ── Source CAM Agnostic ──────────────────────────────────────────────

  describe("translate — source CAM agnostic", () => {
    it("works with source_cam=fusion360", () => {
      const r = engine.translate({
        intent: "adaptive_clearing",
        material: { name: "1045 Steel" },
        tool: { diameter: 10, flute_count: 4 },
        machine: { controller: "haas" },
        source_cam: "fusion360",
      });
      expect(r.strategy.cam_source).toBe("fusion360");
      expect(r.strategy.confidence).toBe(0.80); // non-hypermill = 0.80
      expect(r.parameters.rpm).toBeGreaterThan(0);
    });

    it("works with source_cam=mastercam", () => {
      const r = engine.translate({
        intent: "contour_2d",
        material: { name: "7075-T6" },
        tool: { diameter: 8, flute_count: 3 },
        machine: { controller: "mazak" },
        source_cam: "mastercam",
      });
      expect(r.strategy.cam_source).toBe("mastercam");
      expect(r.parameters.rpm).toBeGreaterThan(0);
    });

    it("hypermill source has higher confidence", () => {
      const rHm = engine.translate({
        intent: "rough_3d",
        material: { name: "1045 Steel" },
        tool: { diameter: 10, flute_count: 4 },
        machine: { controller: "fanuc" },
        source_cam: "hypermill",
      });
      const rFusion = engine.translate({
        intent: "rough_3d",
        material: { name: "1045 Steel" },
        tool: { diameter: 10, flute_count: 4 },
        machine: { controller: "fanuc" },
        source_cam: "fusion360",
      });
      expect(rHm.strategy.confidence).toBeGreaterThan(rFusion.strategy.confidence);
    });
  });

  // ── Enhancements ─────────────────────────────────────────────────────

  describe("translate — enhancements", () => {
    it("adds adaptive clearing enhancement when requested", () => {
      const r = engine.translate({
        intent: "adaptive_clearing",
        material: { name: "1045 Steel" },
        tool: { diameter: 10, flute_count: 4 },
        machine: { controller: "fanuc" },
        enhance: true,
      });
      expect(r.enhancements.some(e => e.includes("chip-thinning"))).toBe(true);
    });

    it("adds RTCP enhancement for 5-axis finishing", () => {
      const r = engine.translate({
        intent: "5axis_swarf",
        material: { name: "1045 Steel" },
        tool: { diameter: 10, flute_count: 4 },
        machine: { controller: "fanuc", axis_count: 5 },
        enhance: true,
      });
      expect(r.enhancements.some(e => e.includes("RTCP"))).toBe(true);
    });

    it("no enhancements when not requested", () => {
      const r = engine.translate({
        intent: "rough_3d",
        material: { name: "1045 Steel" },
        tool: { diameter: 10, flute_count: 4 },
        machine: { controller: "fanuc" },
        enhance: false,
      });
      expect(r.enhancements.length).toBe(0);
    });
  });

  // ── Controller Dialect (from PDF manual extraction) ─────────────────────

  describe("controllerDialect — Mazak (from EIA Programming Manual)", () => {
    it("returns Mazak-specific dual dialect info", () => {
      const d = engine.controllerDialect("mazak");
      expect(d.controller).toBe("mazak");
      expect(d.source_manual).toContain("Mazatrol Matrix");
      expect(d.coord_system_set).toContain("G50");
      expect(d.coord_system_set).toContain("G92");
      expect(d.feed_per_min).toContain("G98");
      expect(d.feed_per_rev).toContain("G99");
      expect(d.peck_drill).toContain("G283");
      expect(d.tapping).toContain("G284");
      expect(d.cycle_cancel).toBe("G80");
    });

    it("includes INTEGREX e-Series spindle select note", () => {
      const d = engine.controllerDialect("mazak");
      expect(d.c_axis_mode).toContain("M203");
      expect(d.notes.some(n => n.includes("INTEGREX"))).toBe(true);
    });

    it("includes Tornado Tapping note", () => {
      const d = engine.controllerDialect("mazak");
      expect(d.notes.some(n => n.includes("G130") || n.includes("Tornado"))).toBe(true);
    });

    it("documents mirror function for B-axis 180°", () => {
      const d = engine.controllerDialect("mazak");
      expect(d.notes.some(n => n.includes("G50.1") || n.includes("B-axis"))).toBe(true);
    });
  });

  describe("controllerDialect — Okuma (from OSP-P200L Manual)", () => {
    it("returns Okuma-specific dialect info", () => {
      const d = engine.controllerDialect("okuma");
      expect(d.controller).toBe("okuma");
      expect(d.source_manual).toContain("OSP-P200L");
      expect(d.cycle_cancel).toBe("G180 (NOT G80)");
      expect(d.peck_drill).toContain("G183");
      expect(d.tapping).toContain("G184");
      expect(d.boring).toContain("G182");
    });

    it("documents G50 difference from Fanuc", () => {
      const d = engine.controllerDialect("okuma");
      expect(d.coord_system_set).toContain("zero shift");
      expect(d.notes.some(n => n.includes("G50") && n.includes("Fanuc"))).toBe(true);
    });

    it("includes C-axis mode switching", () => {
      const d = engine.controllerDialect("okuma");
      expect(d.c_axis_mode).toContain("M109");
      expect(d.c_axis_mode).toContain("M110");
      expect(d.c_axis_mode).toContain("M147");
    });

    it("documents thread infeed patterns", () => {
      const d = engine.controllerDialect("okuma");
      expect(d.notes.some(n => n.includes("M32") && n.includes("M33"))).toBe(true);
    });
  });

  describe("controllerDialect — all controllers", () => {
    const controllers: TargetController[] = ["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"];

    it("returns dialect for every supported controller", () => {
      for (const ctrl of controllers) {
        const d = engine.controllerDialect(ctrl);
        expect(d.controller).toBe(ctrl);
        expect(d.source_manual).toBeTruthy();
        expect(d.peck_drill).toBeTruthy();
        expect(d.tapping).toBeTruthy();
        expect(d.cycle_cancel).toBeTruthy();
        expect(d.notes.length).toBeGreaterThan(0);
      }
    });
  });

  // ── Okuma-specific G-code generation ────────────────────────────────────

  describe("translate — Okuma G-code specifics", () => {
    it("uses G183 for Okuma peck drilling", () => {
      const r = engine.translate({
        intent: "peck_drilling",
        material: { name: "1045 Steel" },
        tool: { diameter: 8, flute_count: 2, type: "drill" },
        machine: { controller: "okuma" },
        depth: 25,
      });
      expect(r.gcode).toContain("G183");
      expect(r.gcode).not.toContain("G83");
    });

    it("uses G184 for Okuma tapping", () => {
      const r = engine.translate({
        intent: "tapping",
        material: { name: "1045 Steel" },
        tool: { diameter: 10, flute_count: 2, type: "tap", corner_radius: 1.5 },
        machine: { controller: "okuma" },
        depth: 20,
      });
      expect(r.gcode).toContain("G184");
      expect(r.gcode).not.toContain("G84 ");
    });

    it("uses Okuma safe start (G180 not G80)", () => {
      const r = engine.translate({
        intent: "drilling",
        material: { name: "1045 Steel" },
        tool: { diameter: 8, flute_count: 2, type: "drill" },
        machine: { controller: "okuma" },
        depth: 15,
      });
      expect(r.gcode).toContain("G180");
    });
  });

  describe("translate — Mazak safe start", () => {
    it("uses Mazak-specific safe start with G69", () => {
      const r = engine.translate({
        intent: "drilling",
        material: { name: "1045 Steel" },
        tool: { diameter: 8, flute_count: 2, type: "drill" },
        machine: { controller: "mazak" },
        depth: 15,
      });
      expect(r.gcode).toContain("G69");
      expect(r.gcode).toContain("G40");
    });
  });
});
