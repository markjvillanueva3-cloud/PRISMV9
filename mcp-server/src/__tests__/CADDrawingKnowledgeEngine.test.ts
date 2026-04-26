/**
 * CADDrawingKnowledgeEngine Tests
 * ================================
 * Tests for GD&T, datum schemes, drawing layouts, DFM rules, fits.
 *
 * @milestone CAD-UNIVERSAL-CONTROL-MS0 U-CUC62
 */
import { describe, it, expect } from "vitest";
import {
  cadDrawingKnowledgeEngine,
  CADDrawingKnowledgeEngine,
  GDT_RULES,
  DFM_RULES,
  COMMON_FITS,
  MODELING_SEQUENCE_RULES,
  GCODE_MACRO_PATTERNS,
  selectGDT,
  designDatumScheme,
  planDrawingLayout,
  selectFit,
} from "../engines/CADDrawingKnowledgeEngine.js";

describe("CADDrawingKnowledgeEngine", () => {
  describe("GDT_RULES constant", () => {
    it("contains exactly 13 GD&T symbols", () => {
      expect(GDT_RULES.length).toBe(13);
    });

    it("has 4 form tolerances that need no datum", () => {
      const formRules = GDT_RULES.filter(r => r.category === "form");
      expect(formRules.length).toBe(4);
      expect(formRules.every(r => r.needs_datum === false)).toBe(true);
      expect(formRules.map(r => r.symbol)).toEqual(
        expect.arrayContaining(["flatness", "straightness", "circularity", "cylindricity"])
      );
    });

    it("has 3 orientation tolerances requiring datum", () => {
      const orientRules = GDT_RULES.filter(r => r.category === "orientation");
      expect(orientRules.length).toBe(3);
      expect(orientRules.every(r => r.needs_datum === true)).toBe(true);
    });

    it("has 2 location tolerances requiring datum", () => {
      const locRules = GDT_RULES.filter(r => r.category === "location");
      expect(locRules.length).toBe(2);
      expect(locRules.map(r => r.symbol)).toEqual(["position", "concentricity"]);
    });

    it("flatness has unicode ⏥ and tight tolerance 0.005mm", () => {
      const flatness = GDT_RULES.find(r => r.symbol === "flatness")!;
      expect(flatness.unicode).toBe("⏥");
      expect(flatness.typical_tolerance_mm.tight).toBe(0.005);
      expect(flatness.typical_tolerance_mm.standard).toBe(0.025);
      expect(flatness.typical_tolerance_mm.loose).toBe(0.1);
    });

    it("position has unicode ⌖ and is most common callout", () => {
      const position = GDT_RULES.find(r => r.symbol === "position")!;
      expect(position.unicode).toBe("⌖");
      expect(position.best_for).toContain("most common");
    });

    it("all rules reference ASME Y14.5-2018", () => {
      for (const rule of GDT_RULES) {
        expect(rule.source).toContain("ASME Y14.5-2018");
      }
    });
  });

  describe("selectGDT", () => {
    it("recommends position for hole location with concentricity alternative", () => {
      const result = selectGDT({ feature_type: "hole", intent: "location" });
      expect(result.recommended).toBe("position");
      expect(result.alternatives).toContain("concentricity");
      expect(result.reasoning).toContain("Y14.5");
    });

    it("recommends flatness for face form with profile_surface alternative", () => {
      const result = selectGDT({ feature_type: "face", intent: "form" });
      expect(result.recommended).toBe("flatness");
      expect(result.alternatives).toContain("profile_surface");
    });

    it("recommends cylindricity for shaft form", () => {
      const result = selectGDT({ feature_type: "shaft", intent: "form" });
      expect(result.recommended).toBe("cylindricity");
      expect(result.alternatives).toEqual(["circularity", "straightness"]);
    });

    it("recommends perpendicularity for face orientation", () => {
      const result = selectGDT({ feature_type: "face", intent: "orientation" });
      expect(result.recommended).toBe("perpendicularity");
      expect(result.alternatives).toEqual(["parallelism", "angularity"]);
    });

    it("recommends circular_runout for runout intent", () => {
      const result = selectGDT({ feature_type: "shaft", intent: "runout" });
      expect(result.recommended).toBe("circular_runout");
      expect(result.alternatives).toEqual(["total_runout", "concentricity"]);
    });

    it("recommends profile_surface for contour features", () => {
      const result = selectGDT({ feature_type: "contour", intent: "profile" });
      expect(result.recommended).toBe("profile_surface");
      expect(result.alternatives).toContain("profile_line");
    });

    it("defaults to position for unknown combinations", () => {
      const result = selectGDT({ feature_type: "thread", intent: "fit" });
      expect(result.recommended).toBe("position");
    });
  });

  describe("designDatumScheme", () => {
    it("returns 3-2-1 scheme for prismatic parts with setup implications", () => {
      const result = designDatumScheme({
        part_type: "prismatic",
        primary_feature: "bottom face",
        functional_requirements: ["bolt pattern accuracy"],
      });
      expect(result.primary).toContain("A");
      expect(result.primary).toContain("flat face");
      expect(result.secondary).toContain("B");
      expect(result.tertiary).toContain("C");
      expect(result.reasoning).toContainEqual(expect.stringContaining("3-2-1"));
      expect(result.setup_implications.length).toBe(3);
      expect(result.setup_implications[0]).toContain("Vise");
    });

    it("uses axis as primary for cylindrical parts", () => {
      const result = designDatumScheme({
        part_type: "cylindrical",
        primary_feature: "OD",
        functional_requirements: ["runout control"],
      });
      expect(result.primary).toContain("A");
      expect(result.primary).toContain("Axis");
      expect(result.secondary).toContain("B");
      expect(result.secondary).toContain("face");
      expect(result.tertiary).toContain("C");
      expect(result.tertiary).toContain("Keyway");
    });

    it("cylindrical scheme has lathe setup implication", () => {
      const result = designDatumScheme({
        part_type: "cylindrical",
        primary_feature: "bore",
        functional_requirements: [],
      });
      expect(result.setup_implications[0]).toContain("Lathe");
    });

    it("handles sheet part type with general scheme", () => {
      const result = designDatumScheme({
        part_type: "sheet",
        primary_feature: "flat surface",
        functional_requirements: [],
      });
      expect(result.primary).toContain("A");
      expect(result.reasoning).toContainEqual("General 3-2-1 datum scheme");
    });
  });

  describe("planDrawingLayout", () => {
    it("returns front/top/right views for simple prismatic part", () => {
      const result = planDrawingLayout({
        part_type: "prismatic",
        complexity: "simple",
        has_internal_features: false,
        has_threads: false,
        max_dimension_mm: 100,
      });
      const viewTypes = result.views.map(v => v.type);
      expect(viewTypes).toContain("front");
      expect(viewTypes).toContain("top");
      expect(viewTypes).toContain("right");
      expect(viewTypes).toContain("isometric");
    });

    it("adds section view when has_internal_features=true", () => {
      const result = planDrawingLayout({
        part_type: "prismatic",
        complexity: "moderate",
        has_internal_features: true,
        has_threads: false,
        max_dimension_mm: 100,
      });
      expect(result.views.some(v => v.type === "section")).toBe(true);
      const section = result.views.find(v => v.type === "section")!;
      expect(section.notes).toContainEqual(expect.stringContaining("Section A-A"));
    });

    it("adds detail view when has_threads=true", () => {
      const result = planDrawingLayout({
        part_type: "cylindrical",
        complexity: "simple",
        has_internal_features: false,
        has_threads: true,
        max_dimension_mm: 50,
      });
      expect(result.views.some(v => v.type === "detail")).toBe(true);
    });

    it("adds detail view for complex parts", () => {
      const result = planDrawingLayout({
        part_type: "prismatic",
        complexity: "complex",
        has_internal_features: false,
        has_threads: false,
        max_dimension_mm: 100,
      });
      const detail = result.views.find(v => v.type === "detail");
      expect(detail).not.toBeNull();
      expect(detail!.scale).toBe("2:1");
    });

    it("selects sheet A for small parts (<200mm)", () => {
      const result = planDrawingLayout({
        part_type: "prismatic",
        complexity: "simple",
        has_internal_features: false,
        has_threads: false,
        max_dimension_mm: 50,
      });
      expect(result.sheet_size).toBe("A (11×8.5)");
    });

    it("selects sheet B for medium parts (200-500mm)", () => {
      const result = planDrawingLayout({
        part_type: "prismatic",
        complexity: "simple",
        has_internal_features: false,
        has_threads: false,
        max_dimension_mm: 300,
      });
      expect(result.sheet_size).toBe("B (17×11)");
    });

    it("selects sheet C for large parts (>500mm)", () => {
      const result = planDrawingLayout({
        part_type: "prismatic",
        complexity: "complex",
        has_internal_features: true,
        has_threads: false,
        max_dimension_mm: 600,
      });
      expect(result.sheet_size).toBe("C (22×17)");
    });

    it("includes required title block fields", () => {
      const result = planDrawingLayout({
        part_type: "prismatic",
        complexity: "simple",
        has_internal_features: false,
        has_threads: false,
        max_dimension_mm: 100,
      });
      expect(result.title_block_fields).toContain("Part Number");
      expect(result.title_block_fields).toContain("Material");
      expect(result.title_block_fields).toContain("Revision");
      expect(result.title_block_fields).toContain("Scale");
    });

    it("includes ASME Y14.5 in general notes", () => {
      const result = planDrawingLayout({
        part_type: "prismatic",
        complexity: "simple",
        has_internal_features: false,
        has_threads: false,
        max_dimension_mm: 100,
      });
      expect(result.general_notes.some(n => n.includes("ASME Y14.5-2018"))).toBe(true);
      expect(result.general_notes.some(n => n.includes("MILLIMETERS"))).toBe(true);
    });

    it("adds thread note when has_threads=true", () => {
      const result = planDrawingLayout({
        part_type: "prismatic",
        complexity: "simple",
        has_internal_features: false,
        has_threads: true,
        max_dimension_mm: 100,
      });
      expect(result.general_notes.some(n => n.includes("THREADS"))).toBe(true);
    });

    it("handles sheet_metal with isometric and bend notes", () => {
      const result = planDrawingLayout({
        part_type: "sheet_metal",
        complexity: "moderate",
        has_internal_features: false,
        has_threads: false,
        max_dimension_mm: 200,
      });
      expect(result.views.some(v => v.type === "isometric")).toBe(true);
      expect(result.views.some(v => v.notes?.some(n => n.includes("bend")))).toBe(true);
    });

    it("handles assembly with exploded isometric", () => {
      const result = planDrawingLayout({
        part_type: "assembly",
        complexity: "complex",
        has_internal_features: false,
        has_threads: false,
        max_dimension_mm: 300,
      });
      const iso = result.views.find(v => v.type === "isometric")!;
      expect(iso.purpose).toContain("Exploded");
    });
  });

  describe("DFM_RULES constant", () => {
    it("has 18 total rules across processes", () => {
      expect(DFM_RULES.length).toBe(18);
    });

    it("has 6 milling rules", () => {
      const millingRules = DFM_RULES.filter(r => r.process === "milling");
      expect(millingRules.length).toBe(6);
      expect(millingRules[0].id).toBe("DFM-M01");
    });

    it("has 4 turning rules", () => {
      const turningRules = DFM_RULES.filter(r => r.process === "turning");
      expect(turningRules.length).toBe(4);
    });

    it("has 3 drilling rules", () => {
      const drillingRules = DFM_RULES.filter(r => r.process === "drilling");
      expect(drillingRules.length).toBe(3);
    });

    it("has 3 sheet metal rules", () => {
      const sheetRules = DFM_RULES.filter(r => r.process === "sheet_metal");
      expect(sheetRules.length).toBe(3);
    });

    it("DFM-M01 addresses internal corner radii", () => {
      const rule = DFM_RULES.find(r => r.id === "DFM-M01")!;
      expect(rule.rule).toContain("Internal corner radii");
      expect(rule.severity).toBe("critical");
      expect(rule.cost_impact).toContain("EDM");
    });

    it("DFM-M06 addresses deep hole drilling L/D > 10", () => {
      const rule = DFM_RULES.find(r => r.id === "DFM-M06")!;
      expect(rule.rule).toContain("10×");
      expect(rule.severity).toBe("critical");
    });
  });

  describe("COMMON_FITS constant", () => {
    it("has 10 standard fits", () => {
      expect(COMMON_FITS.length).toBe(10);
    });

    it("has 4 clearance fits all using H hole basis", () => {
      const clearance = COMMON_FITS.filter(f => f.fit_type === "clearance");
      expect(clearance.length).toBe(4);
      expect(clearance.every(f => f.hole_tolerance.startsWith("H"))).toBe(true);
    });

    it("has 3 transition fits", () => {
      const transition = COMMON_FITS.filter(f => f.fit_type === "transition");
      expect(transition.length).toBe(3);
    });

    it("has 3 interference fits", () => {
      const interference = COMMON_FITS.filter(f => f.fit_type === "interference");
      expect(interference.length).toBe(3);
    });

    it("H7/f6 is running fit for bearings", () => {
      const fit = COMMON_FITS.find(f => f.example === "H7/f6")!;
      expect(fit.fit_type).toBe("clearance");
      expect(fit.application).toContain("bearings");
    });

    it("H7/p6 is light press fit", () => {
      const fit = COMMON_FITS.find(f => f.example === "H7/p6")!;
      expect(fit.fit_type).toBe("interference");
      expect(fit.application).toContain("press fit");
    });
  });

  describe("selectFit", () => {
    it("returns H7/f6 for rotating application", () => {
      const result = selectFit({ application: "rotating" });
      expect(result.example).toBe("H7/f6");
      expect(result.fit_type).toBe("clearance");
      expect(result.hole_tolerance).toBe("H7");
      expect(result.shaft_tolerance).toBe("f6");
    });

    it("returns H7/g6 for sliding application", () => {
      const result = selectFit({ application: "sliding" });
      expect(result.example).toBe("H7/g6");
    });

    it("returns H7/k6 transition for locating application", () => {
      const result = selectFit({ application: "locating" });
      expect(result.example).toBe("H7/k6");
      expect(result.fit_type).toBe("transition");
    });

    it("returns H7/p6 interference for press_fit", () => {
      const result = selectFit({ application: "press_fit" });
      expect(result.example).toBe("H7/p6");
      expect(result.fit_type).toBe("interference");
    });

    it("returns H7/s6 heavy interference for shrink_fit", () => {
      const result = selectFit({ application: "shrink_fit" });
      expect(result.example).toBe("H7/s6");
    });

    it("returns H9/d9 for loose application", () => {
      const result = selectFit({ application: "loose" });
      expect(result.example).toBe("H9/d9");
      expect(result.fit_type).toBe("clearance");
    });
  });

  describe("MODELING_SEQUENCE_RULES constant", () => {
    it("defines 9-step modeling order starting with base feature", () => {
      expect(MODELING_SEQUENCE_RULES.general_order.length).toBe(9);
      expect(MODELING_SEQUENCE_RULES.general_order[0]).toContain("Base feature");
      expect(MODELING_SEQUENCE_RULES.general_order[5]).toContain("Fillets");
      expect(MODELING_SEQUENCE_RULES.general_order[6]).toContain("Chamfers");
    });

    it("has 10 Fusion 360 tips", () => {
      expect(MODELING_SEQUENCE_RULES.fusion360_tips.length).toBe(10);
      expect(MODELING_SEQUENCE_RULES.fusion360_tips[0]).toContain("origin planes");
    });

    it("has 7 anti-patterns all starting with DON'T", () => {
      expect(MODELING_SEQUENCE_RULES.anti_patterns.length).toBe(7);
      expect(MODELING_SEQUENCE_RULES.anti_patterns.every(a => a.startsWith("DON'T"))).toBe(true);
    });

    it("source references Fusion 360 and Creo", () => {
      expect(MODELING_SEQUENCE_RULES.source).toContain("Fusion 360");
      expect(MODELING_SEQUENCE_RULES.source).toContain("Creo");
    });
  });

  describe("GCODE_MACRO_PATTERNS constant", () => {
    it("has 5 macro patterns", () => {
      expect(Object.keys(GCODE_MACRO_PATTERNS).length).toBe(5);
    });

    it("tool_wear_check reads spindle position", () => {
      expect(GCODE_MACRO_PATTERNS.tool_wear_check.gcode.length).toBe(5);
      expect(GCODE_MACRO_PATTERNS.tool_wear_check.gcode[0]).toContain("#5021");
      expect(GCODE_MACRO_PATTERNS.tool_wear_check.source).toContain("Haas");
    });

    it("part_counter uses persistent variable #500", () => {
      expect(GCODE_MACRO_PATTERNS.part_counter.gcode[0]).toContain("#500");
      expect(GCODE_MACRO_PATTERNS.part_counter.gcode[1]).toContain("MOD 25");
    });

    it("parametric_bolt_circle uses WHILE loop", () => {
      expect(GCODE_MACRO_PATTERNS.parametric_bolt_circle.gcode.some(l => l.includes("WHILE"))).toBe(true);
      expect(GCODE_MACRO_PATTERNS.parametric_bolt_circle.gcode.some(l => l.includes("G81"))).toBe(true);
    });

    it("adaptive_feed_override reads spindle load #3028", () => {
      expect(GCODE_MACRO_PATTERNS.adaptive_feed_override.gcode[0]).toContain("#3028");
    });

    it("subprogram_multi_fixture loops G54-G57", () => {
      expect(GCODE_MACRO_PATTERNS.subprogram_multi_fixture.gcode.some(l => l.includes("G54"))).toBe(true);
      expect(GCODE_MACRO_PATTERNS.subprogram_multi_fixture.gcode.some(l => l.includes("G57"))).toBe(true);
    });
  });

  describe("engine.calculate()", () => {
    it("cad_select_gdt returns position for hole location", () => {
      const result = cadDrawingKnowledgeEngine.calculate("cad_select_gdt", {
        feature_type: "hole",
        intent: "location",
      }) as { recommended: string; alternatives: string[] };
      expect(result.recommended).toBe("position");
      expect(result.alternatives).toContain("concentricity");
    });

    it("cad_get_gdt_rules returns 13 rules", () => {
      const result = cadDrawingKnowledgeEngine.calculate("cad_get_gdt_rules", {}) as { count: number };
      expect(result.count).toBe(13);
    });

    it("cad_design_datums returns 3-2-1 for prismatic", () => {
      const result = cadDrawingKnowledgeEngine.calculate("cad_design_datums", {
        part_type: "prismatic",
        primary_feature: "face",
        functional_requirements: [],
      }) as { primary: string; secondary: string; tertiary: string };
      expect(result.primary).toContain("A");
      expect(result.secondary).toContain("B");
      expect(result.tertiary).toContain("C");
    });

    it("cad_plan_drawing returns views array", () => {
      const result = cadDrawingKnowledgeEngine.calculate("cad_plan_drawing", {
        part_type: "prismatic",
        complexity: "simple",
        has_internal_features: false,
        has_threads: false,
        max_dimension_mm: 100,
      }) as { views: Array<{ type: string }>; sheet_size: string };
      expect(result.views.length).toBeGreaterThan(3);
      expect(result.sheet_size).toBe("A (11×8.5)");
    });

    it("cad_modeling_rules returns sequence with 9 steps", () => {
      const result = cadDrawingKnowledgeEngine.calculate("cad_modeling_rules", {}) as { general_order: string[] };
      expect(result.general_order.length).toBe(9);
    });

    it("cad_select_fit returns H7/f6 for rotating", () => {
      const result = cadDrawingKnowledgeEngine.calculate("cad_select_fit", {
        application: "rotating",
      }) as { example: string };
      expect(result.example).toBe("H7/f6");
    });

    it("cad_get_fits returns 10 fits", () => {
      const result = cadDrawingKnowledgeEngine.calculate("cad_get_fits", {}) as { fits: unknown[] };
      expect(result.fits.length).toBe(10);
    });

    it("cad_get_macro_patterns returns 5 patterns", () => {
      const result = cadDrawingKnowledgeEngine.calculate("cad_get_macro_patterns", {}) as Record<string, unknown>;
      expect(Object.keys(result).length).toBe(5);
    });

    it("cad_fusion_modeling_tips returns tips and anti_patterns", () => {
      const result = cadDrawingKnowledgeEngine.calculate("cad_fusion_modeling_tips", {}) as {
        tips: string[];
        anti_patterns: string[];
        sequence: string[];
      };
      expect(result.tips.length).toBe(10);
      expect(result.anti_patterns.length).toBe(7);
      expect(result.sequence.length).toBe(9);
    });

    it("throws Error for unknown action", () => {
      expect(() => cadDrawingKnowledgeEngine.calculate("invalid_action", {})).toThrow("Unknown action: invalid_action");
    });
  });

  describe("engine info", () => {
    it("name is CADDrawingKnowledgeEngine", () => {
      expect(cadDrawingKnowledgeEngine.name).toBe("CADDrawingKnowledgeEngine");
    });

    it("version is 1.0.0", () => {
      expect(cadDrawingKnowledgeEngine.version).toBe("1.0.0");
    });
  });
});
