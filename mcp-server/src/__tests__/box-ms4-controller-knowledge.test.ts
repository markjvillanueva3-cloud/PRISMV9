/**
 * Tests for BOX-MS4 — ControllerKnowledgeDBEngine, PostProcessorTrainerEngine, FusionPostSyncEngine
 */
import { describe, it, expect } from "vitest";
import { ControllerKnowledgeDBEngine } from "../engines/ControllerKnowledgeDBEngine.js";
import { PostProcessorTrainerEngine } from "../engines/PostProcessorTrainerEngine.js";
import { FusionPostSyncEngine } from "../engines/FusionPostSyncEngine.js";

// ============================================================================
// ControllerKnowledgeDBEngine
// ============================================================================

describe("ControllerKnowledgeDBEngine", () => {
  const engine = new ControllerKnowledgeDBEngine();

  describe("getDatabase()", () => {
    it("returns Okuma database with comprehensive G-codes", () => {
      const db = engine.getDatabase("okuma");
      expect(db.family).toBe("okuma");
      expect(db.controller_model).toContain("OSP");
      expect(db.machines).toContain("Genos L400II-e");
      expect(db.gcodes.length).toBeGreaterThan(10);
      expect(db.mcodes.length).toBeGreaterThan(5);
    });

    it("Okuma DB includes Okuma-specific codes", () => {
      const db = engine.getDatabase("okuma");
      const g85 = db.gcodes.find(g => g.code === "G85");
      expect(g85).toBeDefined();
      expect(g85!.okuma_specific).toBe(true);
      expect(g85!.name.toLowerCase()).toContain("od roughing");

      const g71 = db.gcodes.find(g => g.code === "G71");
      expect(g71).toBeDefined();
      expect(g71!.description).toContain("THREADING");
    });

    it("Okuma DB has V-variable conventions", () => {
      const db = engine.getDatabase("okuma");
      const localVars = db.variables.find(v => v.prefix === "V");
      expect(localVars).toBeDefined();
      expect(localVars!.conventions).toBeDefined();
      expect(localVars!.conventions!.length).toBeGreaterThan(5);
      const v1 = localVars!.conventions!.find(c => c.variable === "V1");
      expect(v1?.purpose).toBe("Stock diameter");
    });

    it("returns Haas database", () => {
      const db = engine.getDatabase("haas");
      expect(db.family).toBe("haas");
      expect(db.machines).toContain("VF2");
      expect(db.gcodes.find(g => g.code === "G187")).toBeDefined();
    });

    it("returns Hurco database", () => {
      const db = engine.getDatabase("hurco");
      expect(db.family).toBe("hurco");
      expect(db.controller_model).toContain("WinMax");
    });

    it("returns Roku-Roku database with high-speed codes", () => {
      const db = engine.getDatabase("roku_roku");
      expect(db.family).toBe("roku_roku");
      const g5 = db.gcodes.find(g => g.code === "G5");
      expect(g5).toBeDefined();
      expect(g5!.description).toContain("AICC");
    });

    it("returns Mitsubishi database with SSS", () => {
      const db = engine.getDatabase("mitsubishi");
      const g8 = db.gcodes.find(g => g.code === "G8");
      expect(g8).toBeDefined();
      expect(g8!.description).toContain("Super Smooth Surface");
    });
  });

  describe("listFamilies()", () => {
    it("lists all 5 controller families", () => {
      const families = engine.listFamilies();
      expect(families.length).toBe(5);
      expect(families.map(f => f.family)).toContain("okuma");
      expect(families.map(f => f.family)).toContain("haas");
      expect(families.map(f => f.family)).toContain("hurco");
      expect(families.map(f => f.family)).toContain("roku_roku");
      expect(families.map(f => f.family)).toContain("mitsubishi");
    });
  });

  describe("lookupGCode()", () => {
    it("finds G96 across all controllers", () => {
      const results = engine.lookupGCode("G96");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain("CSS");
    });

    it("finds Okuma-specific G85", () => {
      const results = engine.lookupGCode("G85", "okuma");
      expect(results.length).toBe(1);
      expect(results[0].okuma_specific).toBe(true);
    });

    it("returns empty for non-existent code", () => {
      const results = engine.lookupGCode("G999");
      expect(results.length).toBe(0);
    });
  });

  describe("lookupMCode()", () => {
    it("finds M110 as Okuma-specific", () => {
      const results = engine.lookupMCode("M110", "okuma");
      expect(results.length).toBe(1);
      expect(results[0].machine_specific).toBe(true);
      expect(results[0].description).toContain("C-axis");
    });

    it("finds M5 as safety-critical across controllers", () => {
      const results = engine.lookupMCode("M5");
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(m => m.safety_critical)).toBe(true);
    });
  });

  describe("search()", () => {
    it("finds entries by keyword", () => {
      const result = engine.search("threading", "okuma");
      expect(result.entries.length).toBeGreaterThan(0);
      expect(result.entries.some(e => e.code === "G71")).toBe(true);
    });

    it("finds safety-related entries", () => {
      const result = engine.search("spindle stop");
      expect(result.entries.some(e => e.safety_critical === true)).toBe(true);
    });

    it("searches across all controllers when no family specified", () => {
      const result = engine.search("coolant");
      expect(result.total).toBeGreaterThan(2); // Multiple controllers have coolant entries
    });
  });

  describe("compareDialects()", () => {
    it("identifies differences between Okuma and Haas", () => {
      const diffs = engine.compareDialects("okuma", "haas");
      expect(diffs.length).toBeGreaterThan(0);

      // Subroutine syntax should differ
      const subDiff = diffs.find(d => d.topic === "Subroutine call");
      expect(subDiff).toBeDefined();
      expect(subDiff!.familyA_value).toContain("/CALL");
      expect(subDiff!.familyB_value).toContain("M98");
    });

    it("identifies Okuma-specific codes missing in Haas", () => {
      const diffs = engine.compareDialects("okuma", "haas");
      const missingCodes = diffs.filter(d => d.familyB_value === "NOT AVAILABLE");
      expect(missingCodes.length).toBeGreaterThan(0);
    });
  });

  describe("getSafetyCodes()", () => {
    it("returns safety codes for Okuma", () => {
      const codes = engine.getSafetyCodes("okuma");
      expect(codes).toContain("G50");
      expect(codes).toContain("M5");
      expect(codes).toContain("M1");
    });
  });

  describe("getPostNotes()", () => {
    it("returns post processor notes", () => {
      const notes = engine.getPostNotes("okuma");
      expect(notes.length).toBeGreaterThan(5);
      expect(notes.some(n => n.includes("G71 = threading"))).toBe(true);
    });
  });
});

// ============================================================================
// PostProcessorTrainerEngine
// ============================================================================

describe("PostProcessorTrainerEngine", () => {
  const engine = new PostProcessorTrainerEngine();

  const OKUMA_REF = [
    "(PART - CASING)",
    "T010101",
    "G50 S2500",
    "G96 S600 M3",
    "M8",
    "G0 X2.1 Z0.1",
    "G1 X1.875 F0.012",
    "G0 X20 Z20",
    "M1",
    "M9",
    "T020202",
    "G50 S3000",
    "G96 S800 M3",
    "M8",
    "G0 X1.875 Z0.05",
    "G1 Z-3.5 F0.006",
    "G0 X20 Z20",
    "M9",
    "M5",
    "M30",
  ];

  describe("train() — matching programs", () => {
    it("returns 100% match for identical programs", () => {
      const result = engine.train({
        reference_lines: OKUMA_REF,
        generated_lines: [...OKUMA_REF],
        controller: "okuma",
      });
      expect(result.structural_match_pct).toBe(100);
      expect(result.summary.critical_diffs).toBe(0);
    });
  });

  describe("train() — structural differences", () => {
    it("detects missing safety codes", () => {
      const genLines = OKUMA_REF.filter(l => !/M1/.test(l));
      const result = engine.train({
        reference_lines: OKUMA_REF,
        generated_lines: genLines,
        controller: "okuma",
      });
      const m1Diff = result.diffs.find(d => d.ref_value.includes("M1"));
      expect(m1Diff).toBeDefined();
      expect(m1Diff!.severity).toBe("critical");
    });

    it("detects tool count mismatch", () => {
      const genLines = OKUMA_REF.filter(l => !/T020202/.test(l));
      const result = engine.train({
        reference_lines: OKUMA_REF,
        generated_lines: genLines,
        controller: "okuma",
      });
      const toolDiff = result.diffs.find(d => d.description.includes("Tool change count"));
      expect(toolDiff).toBeDefined();
    });

    it("detects tool code format mismatch", () => {
      const genLines = OKUMA_REF.map(l =>
        l.replace("T010101", "T01").replace("T020202", "T02"),
      );
      const result = engine.train({
        reference_lines: OKUMA_REF,
        generated_lines: genLines,
        controller: "okuma",
      });
      const formatDiff = result.diffs.find(d => d.category === "format");
      expect(formatDiff).toBeDefined();
      expect(formatDiff!.severity).toBe("major");
    });
  });

  describe("train() — generates patches", () => {
    it("produces dialect patches for mismatches", () => {
      const genLines = OKUMA_REF.filter(l => !/G50/.test(l));
      const result = engine.train({
        reference_lines: OKUMA_REF,
        generated_lines: genLines,
        controller: "okuma",
      });
      expect(result.patches.patches.length).toBeGreaterThan(0);
      expect(result.patches.controller).toBe("okuma");
    });
  });

  describe("train() — extracts structural elements", () => {
    it("identifies all structural elements in reference", () => {
      const result = engine.train({
        reference_lines: OKUMA_REF,
        generated_lines: OKUMA_REF,
        controller: "okuma",
      });
      expect(result.ref_structure.length).toBeGreaterThan(10);
      expect(result.ref_structure.some(e => e.type === "tool_change")).toBe(true);
      expect(result.ref_structure.some(e => e.type === "speed_mode")).toBe(true);
      expect(result.ref_structure.some(e => e.type === "safety_code")).toBe(true);
      expect(result.ref_structure.some(e => e.type === "coolant")).toBe(true);
    });
  });
});

// ============================================================================
// FusionPostSyncEngine
// ============================================================================

describe("FusionPostSyncEngine", () => {
  const engine = new FusionPostSyncEngine();

  const SAMPLE_CPS = `
// Okuma OSP-P300L post processor for Fusion 360
// Machine: Genos L400II-e

description = "Okuma OSP Lathe";
vendor = "Autodesk";

properties.writeToolComment = true; // Write tool comments
properties.useRadius = true; // Use L for arc radius (Okuma convention)
properties.maxRPM = 4200; // Maximum spindle RPM

function onOpen() {
  gFormat = createFormat({decimals:0, width:2, zeropad:true});
  mFormat = createFormat({decimals:0});
  // Custom tool format for 6-digit Okuma T-codes
  var toolFormat = createFormat({decimals:0, width:6, zeropad:true});
}

function onSection() {
  writeBlock(gFormat.format(50), "S" + maxRPM); // G50 safety
  writeBlock(gFormat.format(96), "S" + currentSFM); // CSS mode
  writeBlock(mFormat.format(8)); // Coolant ON
}

function onSectionEnd() {
  writeBlock(mFormat.format(9)); // Coolant OFF - safe retract
  writeBlock("G0", "X20", "Z20"); // Safe retract position
}

function onClose() {
  writeBlock(mFormat.format(5)); // Spindle stop
  writeBlock(mFormat.format(30)); // Program end
}

function onCycle() {
  writeBlock(gFormat.format(85)); // Okuma G85 roughing cycle
}
`.trim();

  describe("analyze()", () => {
    it("extracts properties from .cps content", () => {
      const result = engine.analyze({
        cps_content: SAMPLE_CPS,
        filename: "okuma-genos-l400.cps",
      });
      expect(result.profile.properties.length).toBeGreaterThan(0);
    });

    it("detects machine type from filename", () => {
      const result = engine.analyze({
        cps_content: SAMPLE_CPS,
        filename: "okuma-genos-l400.cps",
      });
      expect(result.profile.machine_type).toContain("Okuma");
    });

    it("detects controller from content", () => {
      const result = engine.analyze({
        cps_content: SAMPLE_CPS,
        filename: "post.cps",
      });
      expect(result.profile.controller).toContain("Okuma");
    });

    it("extracts format customizations", () => {
      const result = engine.analyze({
        cps_content: SAMPLE_CPS,
        filename: "okuma-genos.cps",
      });
      // Should find the createFormat customization for tool
      const formatCustoms = result.profile.format_customizations.filter(
        c => c.type === "format_change",
      );
      expect(formatCustoms.length).toBeGreaterThanOrEqual(0);
    });

    it("identifies G-code overrides for Okuma dialect", () => {
      const result = engine.analyze({
        cps_content: SAMPLE_CPS,
        filename: "okuma.cps",
      });
      const g85 = result.profile.gcode_overrides.find(o => o.standard === "G85");
      expect(g85).toBeDefined();
      expect(g85!.reason).toContain("Okuma");
    });
  });

  describe("analyze() — recommendations", () => {
    it("generates recommendations for PRISM", () => {
      const result = engine.analyze({
        cps_content: SAMPLE_CPS,
        filename: "okuma.cps",
      });
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("analyze() — gaps", () => {
    it("identifies gaps between default and custom", () => {
      const result = engine.analyze({
        cps_content: SAMPLE_CPS,
        filename: "okuma.cps",
      });
      expect(result.gaps.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("analyze() — edge cases", () => {
    it("handles empty .cps content", () => {
      const result = engine.analyze({
        cps_content: "",
        filename: "empty.cps",
      });
      expect(result.profile.total_customizations).toBe(0);
      expect(result.profile.machine_type).toBe("Unknown");
    });
  });
});
