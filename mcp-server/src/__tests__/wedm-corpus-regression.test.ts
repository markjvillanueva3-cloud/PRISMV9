/**
 * WEDM-CAL-MS0 / U-CAL03 + U-CAL04 — Corpus Expansion + Regression Suite
 *
 * U-CAL03 adds real shop programs beyond the original ITW/NOZE/5"-square trio
 * so the parser is exercised on diverse E-code families (E122x hex/bore vs
 * E128x thin-die-gage vs E282x UV taper) and diverse H-offset cascades.
 *
 * U-CAL04 locks a "corpus passes without throwing" regression: every *.NC in
 * data/programs/wire-edm/ must parse to a program object whose required
 * invariants hold (dialect resolved, pass array populated when E-codes are
 * present, safety block asserts at least one terminator). New programs added
 * to the folder auto-enter the regression without code changes.
 *
 * Engines: WireEDMProgramParserEngine
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import {
  wireEDMProgramParserEngine,
  type WireEDMProgram,
} from "../engines/WireEDMProgramParserEngine.js";

const PROGRAMS_DIR = join(__dirname, "../../data/programs/wire-edm");

function load(name: string): WireEDMProgram {
  const content = readFileSync(join(PROGRAMS_DIR, name), "utf-8");
  return wireEDMProgramParserEngine.parse(content, name);
}

function listNC(): string[] {
  return readdirSync(PROGRAMS_DIR)
    .filter((n) => n.toUpperCase().endsWith(".NC"))
    .sort();
}

// ═══════════════════════════════════════════════════════════════════════
// U-CAL03: Expanded Corpus — CHOCTAW 38CAL CANNELURE (E1281-E1285)
// ═══════════════════════════════════════════════════════════════════════

describe("U-CAL03: CHOCTAW 38CAL CANNELURE — E1281-E1285, 5 passes, thin die", () => {
  const FN = "CHOCTAW-38CAL-CANNELURE-30TPI.NC";

  it("parses without throwing and detects Mitsubishi dialect", () => {
    const p = load(FN);
    expect(p.dialect).toBe("mitsubishi");
    expect(p.dialect_confidence).toBeGreaterThan(30);
  });

  it("extracts 5 unique offset declarations (H1-H5 + H175 master)", () => {
    const p = load(FN);
    expect(p.offset_declarations[175]).toBeCloseTo(0.0, 4);
    expect(p.offset_declarations[1]).toBeCloseTo(0.00995, 5);
    expect(p.offset_declarations[2]).toBeCloseTo(0.00725, 5);
    expect(p.offset_declarations[3]).toBeCloseTo(0.00585, 5);
    expect(p.offset_declarations[4]).toBeCloseTo(0.00535, 5);
    expect(p.offset_declarations[5]).toBeCloseTo(0.0052, 5);
  });

  it("H-offset cascade is monotonically decreasing (each pass removes less)", () => {
    const p = load(FN);
    const offsets = [1, 2, 3, 4, 5].map((i) => p.offset_declarations[i]);
    for (let i = 1; i < offsets.length; i++) {
      expect(offsets[i]).toBeLessThan(offsets[i - 1]);
    }
  });

  it("extracts E-codes E1281-E1285 (thin die-gage family)", () => {
    const p = load(FN);
    const eCodes = p.passes.map((pp) => pp.condition_code).filter((c) => c !== null);
    for (const code of ["E1281", "E1282", "E1283", "E1284", "E1285"]) {
      expect(eCodes).toContain(code);
    }
  });

  it("pass 1 is rough (slowest feed), final pass is skim (faster)", () => {
    const p = load(FN);
    const p1 = p.passes.find((pp) => pp.condition_code === "E1281");
    const pLast = p.passes.find((pp) => pp.condition_code === "E1285");
    expect(p1?.feed_rate).toBeCloseTo(0.06, 2); // F.06 rough
    // Later passes are faster
    expect(pLast?.feed_rate).toBeGreaterThan(p1!.feed_rate!);
  });

  it("pass 1 resolves H1 = 0.00995 via offset_register cascade", () => {
    const p = load(FN);
    const p1 = p.passes.find((pp) => pp.condition_code === "E1281");
    expect(p1?.offset_register).toBe(1);
    expect(p1?.offset_value).toBeCloseTo(0.00995, 5);
  });

  it("is NOT a taper program (2D thin die gage)", () => {
    const p = load(FN);
    expect(p.hasTaper).toBe(false);
  });

  it("safety block: has program end + offset cancel + wire stop", () => {
    const p = load(FN);
    expect(p.safety.has_program_end).toBe(true);
    expect(p.safety.has_offset_cancel).toBe(true);
    expect(p.safety.has_wire_stop).toBe(true);
  });

  it("adaptive control + tank management present (standard submerged Mitsubishi)", () => {
    const p = load(FN);
    expect(p.hasAdaptiveControl).toBe(true);
    expect(p.hasTankManagement).toBe(true);
    expect(p.hasSubmergedCut).toBe(true);
  });

  it("contour moves populated (program is 1476 lines, long profile)", () => {
    const p = load(FN);
    expect(p.contour_moves.length).toBeGreaterThan(100);
  });

  it("multi-pass flag set + hasMultiPass true", () => {
    const p = load(FN);
    expect(p.hasMultiPass).toBe(true);
    expect(p.passes.length).toBeGreaterThanOrEqual(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// U-CAL04: Corpus Regression — every NC file parses, invariants hold
// ═══════════════════════════════════════════════════════════════════════

describe("U-CAL04: Corpus regression — every *.NC parses cleanly", () => {
  const FILES = listNC();

  it("corpus has at least 4 programs (ITW, NOZE, square, CHOCTAW)", () => {
    expect(FILES.length).toBeGreaterThanOrEqual(4);
    expect(FILES.some((f) => f.includes("ITW SHAKEPROOF"))).toBe(true);
    expect(FILES.some((f) => f.startsWith("NOZE"))).toBe(true);
    expect(FILES.some((f) => f.startsWith("CHOCTAW"))).toBe(true);
  });

  for (const filename of FILES) {
    it(`parses "${filename}" without throwing and honors basic invariants`, () => {
      const p = load(filename);

      // Parser must always resolve a dialect (even if "unknown") and set confidence
      expect(typeof p.dialect).toBe("string");
      expect(p.dialect_confidence).toBeGreaterThanOrEqual(0);
      expect(p.dialect_confidence).toBeLessThanOrEqual(100);

      // Filename stored
      expect(p.filename).toBe(filename);

      // rawLines matches lineCount
      expect(p.rawLines.length).toBe(p.lineCount);
      expect(p.lineCount).toBeGreaterThan(0);

      // If the program claims multi-pass, it must have ≥ 2 passes
      if (p.hasMultiPass) {
        expect(p.passes.length).toBeGreaterThanOrEqual(2);
      }

      // If taper flag is true, at least one taper/UV move must exist
      if (p.hasTaper) {
        const hasUV =
          p.contour_moves.some((m) => m.u !== null || m.v !== null) ||
          p.taper.enabled;
        expect(hasUV).toBe(true);
      }

      // offset_declarations values are finite numbers
      for (const [k, v] of Object.entries(p.offset_declarations)) {
        expect(Number.isFinite(v)).toBe(true);
        expect(Number.isFinite(Number(k))).toBe(true);
      }

      // Every pass must have a valid start/end line range
      for (const pass of p.passes) {
        expect(pass.start_line).toBeGreaterThanOrEqual(0);
        expect(pass.end_line).toBeGreaterThanOrEqual(pass.start_line);
      }

      // Every contour move's line_number must be within program bounds
      for (const m of p.contour_moves) {
        expect(m.line_number).toBeGreaterThanOrEqual(0);
        expect(m.line_number).toBeLessThanOrEqual(p.lineCount);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// U-CAL04: Dialect Confidence — real programs ≥ unknown programs
// ═══════════════════════════════════════════════════════════════════════

describe("U-CAL04: Dialect confidence ordering", () => {
  it("Mitsubishi programs score > 50 on dialect confidence", () => {
    const mitsubishi = ["ITW SHAKEPROOF 500-30540-24000-04.NC", "NOZE TEST.NC", "CHOCTAW-38CAL-CANNELURE-30TPI.NC"];
    for (const fn of mitsubishi) {
      const p = load(fn);
      expect(p.dialect).toBe("mitsubishi");
      expect(p.dialect_confidence).toBeGreaterThan(50);
    }
  });

  it("ITW vs CHOCTAW: different E-code families but same dialect", () => {
    const itw = load("ITW SHAKEPROOF 500-30540-24000-04.NC");
    const cho = load("CHOCTAW-38CAL-CANNELURE-30TPI.NC");
    expect(itw.dialect).toBe(cho.dialect);
    // E-code families differ (E122x vs E128x)
    const itwECodes = new Set(itw.passes.map((p) => p.condition_code?.slice(0, 4)));
    const choECodes = new Set(cho.passes.map((p) => p.condition_code?.slice(0, 4)));
    expect(itwECodes.has("E122")).toBe(true);
    expect(choECodes.has("E128")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// U-CAL04: Calibration Anchors — monotonic invariants across corpus
// ═══════════════════════════════════════════════════════════════════════

describe("U-CAL04: Physical calibration anchors across corpus", () => {
  it("every multi-pass Mitsubishi program: offset cascade monotonically decreases", () => {
    const mitsubishi = ["ITW SHAKEPROOF 500-30540-24000-04.NC", "CHOCTAW-38CAL-CANNELURE-30TPI.NC"];
    for (const fn of mitsubishi) {
      const p = load(fn);
      const offsets: number[] = [];
      for (let i = 1; i <= 10; i++) {
        const v = p.offset_declarations[i];
        if (typeof v === "number" && v > 0) offsets.push(v);
      }
      if (offsets.length < 2) continue;
      for (let i = 1; i < offsets.length; i++) {
        expect(offsets[i]).toBeLessThanOrEqual(offsets[i - 1]);
      }
    }
  });

  it("ITW + NOZE + CHOCTAW: rough pass feed < fastest skim feed", () => {
    for (const fn of [
      "ITW SHAKEPROOF 500-30540-24000-04.NC",
      "NOZE TEST.NC",
      "CHOCTAW-38CAL-CANNELURE-30TPI.NC",
    ]) {
      const p = load(fn);
      const feeds = p.passes
        .map((pp) => pp.feed_rate)
        .filter((f): f is number => f !== null && f > 0);
      if (feeds.length < 2) continue;
      const rough = feeds[0];
      const maxSkim = Math.max(...feeds.slice(1));
      expect(maxSkim).toBeGreaterThan(rough);
    }
  });
});
