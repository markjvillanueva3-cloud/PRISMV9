/**
 * OkumaManualTipExtractorEngine Test Suite
 * ==========================================
 *
 * LATHE-AWARE-HARDEN MS4 U-LAT32 — Validates manual text classification
 * into warnings / tips / procedures / examples / specifications.
 *
 * @milestone LATHE-AWARE-HARDEN MS4
 * @unit U-LAT32
 */

import { describe, it, expect } from "vitest";
import { okumaManualTipExtractorEngine } from "../engines/OkumaManualTipExtractorEngine.js";

const SAMPLE_MANUAL = `1.1 SAFETY

WARNING: Do not enter the machining area while the spindle is running.
Failure to observe this warning can result in severe injury.

2.1 G-CODE FUNDAMENTALS

NOTE: The G96 mode enables constant surface speed control.
The system computes RPM from the programmed Vc and current X position.

RECOMMENDED: Use G97 for threading operations to fix the RPM during
the thread cutting cycle.

2.2 MACRO PROGRAMMING

SPECIFICATION: Macro variable #100 through #199 are local variables
that reset at program end.

Example code:
N100 G65 P9100 A10 B20
#100 = 1.5
G1 X#100 F0.1

3.1 SETUP PROCEDURE

1. Mount the chuck with 3 bolts torqued to 45 Nm.
2. Load the workpiece and close the jaws.
3. Verify TIR is within 0.02mm.
4. Engage the tailstock at 300N force.

CAUTION: Do not exceed the maximum tailstock force rating of 5000N.
`;

describe("OkumaManualTipExtractorEngine", () => {
  // ── extractFromText() ────────────────────────────────────────────────

  describe("extractFromText()", () => {
    it("returns a result with total_lines", () => {
      const r = okumaManualTipExtractorEngine.extractFromText(SAMPLE_MANUAL);
      expect(r.total_lines).toBeGreaterThan(0);
    });

    it("detects WARNING as warning class with priority 10", () => {
      const r = okumaManualTipExtractorEngine.extractFromText(SAMPLE_MANUAL);
      const warnings = r.tips.filter((t) => t.class === "warning");
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]!.priority).toBe(10);
    });

    it("detects CAUTION as warning class", () => {
      const r = okumaManualTipExtractorEngine.extractFromText(SAMPLE_MANUAL);
      const hasCaution = r.tips.some(
        (t) => t.class === "warning" && /tailstock/i.test(t.content)
      );
      expect(hasCaution).toBe(true);
    });

    it("detects NOTE as tip class with priority 7", () => {
      const r = okumaManualTipExtractorEngine.extractFromText(SAMPLE_MANUAL);
      const tips = r.tips.filter((t) => t.class === "tip");
      expect(tips.length).toBeGreaterThan(0);
      expect(tips[0]!.priority).toBe(7);
    });

    it("detects RECOMMENDED as tip class", () => {
      const r = okumaManualTipExtractorEngine.extractFromText(SAMPLE_MANUAL);
      const hasRecommended = r.tips.some((t) => t.class === "tip" && /threading/i.test(t.content));
      expect(hasRecommended).toBe(true);
    });

    it("detects SPECIFICATION as specification class", () => {
      const r = okumaManualTipExtractorEngine.extractFromText(SAMPLE_MANUAL);
      const specs = r.tips.filter((t) => t.class === "specification");
      expect(specs.length).toBeGreaterThan(0);
    });

    it("detects G-code block as example class", () => {
      const r = okumaManualTipExtractorEngine.extractFromText(SAMPLE_MANUAL);
      const examples = r.tips.filter((t) => t.class === "example");
      expect(examples.length).toBeGreaterThan(0);
      expect(examples[0]!.content).toMatch(/G65|#100/);
    });

    it("detects numbered procedure", () => {
      const r = okumaManualTipExtractorEngine.extractFromText(SAMPLE_MANUAL);
      const procs = r.tips.filter((t) => t.class === "procedure");
      expect(procs.length).toBeGreaterThan(0);
    });

    it("detects section headers", () => {
      const r = okumaManualTipExtractorEngine.extractFromText(SAMPLE_MANUAL);
      expect(r.sections_detected.length).toBeGreaterThan(0);
      expect(r.sections_detected.some((s) => /SAFETY/i.test(s))).toBe(true);
    });

    it("assigns source_section to tips when available", () => {
      const r = okumaManualTipExtractorEngine.extractFromText(SAMPLE_MANUAL);
      const firstWarning = r.tips.find((t) => t.class === "warning");
      expect(firstWarning?.source_section).toBeDefined();
    });

    it("assigns source_manual from options", () => {
      const r = okumaManualTipExtractorEngine.extractFromText(SAMPLE_MANUAL, {
        manual_name: "OSP-P300L v5.8",
      });
      expect(r.tips.every((t) => t.source_manual === "OSP-P300L v5.8")).toBe(true);
    });

    it("extracts keywords for every tip", () => {
      const r = okumaManualTipExtractorEngine.extractFromText(SAMPLE_MANUAL);
      r.tips.forEach((t) => {
        expect(Array.isArray(t.keywords)).toBe(true);
      });
    });

    it("filters by class when classes option provided", () => {
      const r = okumaManualTipExtractorEngine.extractFromText(SAMPLE_MANUAL, {
        classes: ["warning"],
      });
      expect(r.tips.every((t) => t.class === "warning")).toBe(true);
    });

    it("respects min_words filter", () => {
      const r = okumaManualTipExtractorEngine.extractFromText(SAMPLE_MANUAL, {
        min_words: 100, // nothing will pass
      });
      expect(r.tips.filter((t) => t.class === "warning" || t.class === "tip").length).toBe(0);
    });

    it("produces deterministic IDs for identical content", () => {
      const a = okumaManualTipExtractorEngine.extractFromText(SAMPLE_MANUAL);
      const b = okumaManualTipExtractorEngine.extractFromText(SAMPLE_MANUAL);
      const aIds = a.tips.map((t) => t.id).sort();
      const bIds = b.tips.map((t) => t.id).sort();
      expect(aIds).toEqual(bIds);
    });

    it("reports tip_counts per class", () => {
      const r = okumaManualTipExtractorEngine.extractFromText(SAMPLE_MANUAL);
      const total =
        r.tip_counts.warning +
        r.tip_counts.tip +
        r.tip_counts.procedure +
        r.tip_counts.example +
        r.tip_counts.specification;
      expect(total).toBeGreaterThan(0);
    });

    it("warnings_found matches warning count", () => {
      const r = okumaManualTipExtractorEngine.extractFromText(SAMPLE_MANUAL);
      expect(r.warnings_found).toBe(r.tip_counts.warning);
    });

    it("empty input returns empty tips", () => {
      const r = okumaManualTipExtractorEngine.extractFromText("");
      expect(r.tips.length).toBe(0);
    });
  });

  // ── extractFromFile() ────────────────────────────────────────────────

  describe("extractFromFile()", () => {
    it("returns empty for missing file", () => {
      const r = okumaManualTipExtractorEngine.extractFromFile("H:/ghost_manual.txt");
      expect(r.tips.length).toBe(0);
    });
  });

  // ── getStats() ────────────────────────────────────────────────────────

  describe("getStats()", () => {
    it("reports 5 supported classes", () => {
      const stats = okumaManualTipExtractorEngine.getStats();
      expect(stats.supported_classes.length).toBe(5);
    });

    it("documents input contract (already-extracted text)", () => {
      const stats = okumaManualTipExtractorEngine.getStats();
      expect(stats.input_contract.toLowerCase()).toContain("already-extracted");
    });
  });
});
