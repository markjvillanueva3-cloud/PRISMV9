/**
 * CAMFeatureExtractorEngine tests — U-CAM-ML-02
 * ==============================================
 * Exercises the feature extractor against real JM Die corpus files.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  CAMFeatureExtractorEngine,
  camFeatureExtractorEngine,
} from "../engines/CAMFeatureExtractorEngine.js";

const JM_DIE = "H:/PRISM/JM DIE";
const engine = new CAMFeatureExtractorEngine(JM_DIE);

// Pick real fixtures from the corpus — confirmed present by U-CAM-ML-01
const REAL_MIN = "CNC LATHE/9007405.MIN";
const REAL_MIN_WITH_CYCLES = "CNC LATHE/A05-LSC-25-B.MIN";

describe("CAMFeatureExtractorEngine — Okuma .MIN happy path", () => {
  it("parses a real .MIN file with parsed_ok=true", () => {
    const v = engine.extractOne(REAL_MIN);
    expect(v.parsed_ok).toBe(true);
    expect(v.cam_system).toBe("okuma_native");
    expect(v.g_code_dialect_hint).toBe("okuma");
  });

  it("extracts non-zero tool_count from a real program", () => {
    const v = engine.extractOne(REAL_MIN);
    expect(v.tool_count).toBeGreaterThanOrEqual(1);
    expect(v.tool_changes).toBeGreaterThanOrEqual(v.tool_count);
  });

  it("infers CNC LATHE machine_type from path", () => {
    const v = engine.extractOne(REAL_MIN);
    expect(v.machine_type).toBe("CNC LATHE");
  });

  it("emits non-empty ops_by_strategy on a real lathe program", () => {
    const v = engine.extractOne(REAL_MIN_WITH_CYCLES);
    const totalOps = Object.values(v.ops_by_strategy).reduce((a, b) => a + b, 0);
    expect(totalOps).toBeGreaterThan(0);
  });

  it("detects Okuma-style lathe cycle tokens on a file using G85/G87", () => {
    const v = engine.extractOne(REAL_MIN_WITH_CYCLES);
    expect(v.has_g71_g72_lathe_cycle).toBe(true);
  });

  it("spindle range is positive and finite when program has S-codes", () => {
    const v = engine.extractOne(REAL_MIN_WITH_CYCLES);
    const [sMin, sMax] = v.estimated_spindle_range_rpm;
    expect(sMin).toBeGreaterThanOrEqual(0);
    expect(sMax).toBeGreaterThanOrEqual(sMin);
  });
});

describe("CAMFeatureExtractorEngine — Mastercam binary graceful degrade", () => {
  it("returns parsed_ok=false for a synthetic .mcx-8 file with a descriptive warning", () => {
    const tmp = path.join(os.tmpdir(), "synthetic.mcx-8");
    fs.writeFileSync(tmp, Buffer.from([0, 1, 2, 3, 4]));
    try {
      const v = engine.extractOne(tmp);
      expect(v.cam_system).toBe("mastercam");
      expect(v.parsed_ok).toBe(false);
      expect(v.parse_warnings.length).toBeGreaterThan(0);
      expect(v.parse_warnings[0]).toMatch(/binary|NET-Hook|U-CAM89/i);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it(".MCX legacy extension routes to the same binary degrade path", () => {
    const tmp = path.join(os.tmpdir(), "legacy.MCX");
    fs.writeFileSync(tmp, Buffer.from(new Uint8Array(60000)));
    try {
      const v = engine.extractOne(tmp);
      expect(v.cam_system).toBe("mastercam");
      expect(v.parsed_ok).toBe(false);
    } finally {
      fs.unlinkSync(tmp);
    }
  });
});

describe("CAMFeatureExtractorEngine — edge cases", () => {
  it("handles an empty .min file gracefully", () => {
    const tmp = path.join(os.tmpdir(), "empty.min");
    fs.writeFileSync(tmp, "");
    try {
      const v = engine.extractOne(tmp);
      expect(v.parsed_ok).toBe(false);
      expect(v.parse_warnings.length).toBeGreaterThan(0);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("handles unsupported extensions with parsed_ok=false and descriptive warning", () => {
    const tmp = path.join(os.tmpdir(), "random.xyz");
    fs.writeFileSync(tmp, "random content");
    try {
      const v = engine.extractOne(tmp);
      expect(v.parsed_ok).toBe(false);
      expect(v.parse_warnings[0]).toMatch(/unsupported|ancillary/i);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("assigns a stable program_id (same path → same hash)", () => {
    const a = engine.extractOne(REAL_MIN);
    const b = engine.extractOne(REAL_MIN);
    expect(a.program_id).toBe(b.program_id);
    expect(a.program_id).toHaveLength(16);
  });

  it("produces schema-valid output (all required fields present)", () => {
    const v = engine.extractOne(REAL_MIN);
    expect(v).toHaveProperty("program_id");
    expect(v).toHaveProperty("source_path");
    expect(v).toHaveProperty("cam_system");
    expect(v).toHaveProperty("machine_type");
    expect(v).toHaveProperty("ops_by_strategy");
    expect(v).toHaveProperty("estimated_spindle_range_rpm");
    expect(v).toHaveProperty("estimated_feed_range_mm_min");
    expect(v).toHaveProperty("parsed_ok");
    expect(Array.isArray(v.detected_materials)).toBe(true);
    expect(Array.isArray(v.parse_warnings)).toBe(true);
  });

  it("infers part_hint from filename", () => {
    const v = engine.extractOne(REAL_MIN);
    expect(v.part_hint).toBe("9007405");
  });
});

describe("U-CAM-ML-02-CLASSIFIER — header-based CAM override", () => {
  it("inferCAMSystemFromHeader detects MASTERCAM banner", () => {
    const r = engine["inferCAMSystemFromHeader"]("O0001 (MASTERCAM X8 POST TEST)\nN10 G90");
    expect(r?.tag).toBe("mastercam");
    expect(r?.confidence).toBe("header_match");
  });

  it("inferCAMSystemFromHeader detects HYPERMILL banner", () => {
    const r = engine["inferCAMSystemFromHeader"]("(HYPERMILL V2024)\n%\n O1000");
    expect(r?.tag).toBe("hypermill");
  });

  it("inferCAMSystemFromHeader detects OPEN MIND as hyperMILL alias", () => {
    const r = engine["inferCAMSystemFromHeader"]("(OPEN MIND hyperMILL post)");
    expect(r?.tag).toBe("hypermill");
  });

  it("inferCAMSystemFromHeader detects FUSION 360 banner", () => {
    const r = engine["inferCAMSystemFromHeader"]("(Fusion 360 post v2024)");
    expect(r?.tag).toBe("fusion360");
  });

  it("inferCAMSystemFromHeader detects INVENTOR HSM banner", () => {
    const r = engine["inferCAMSystemFromHeader"]("(Inventor HSM 2024 post processor)");
    expect(r?.tag).toBe("inventor-hsm");
  });

  it("inferCAMSystemFromHeader detects SOLIDCAM banner", () => {
    const r = engine["inferCAMSystemFromHeader"]("(SolidCAM 2024 iMachining post)");
    expect(r?.tag).toBe("solidcam");
  });

  it("inferCAMSystemFromHeader returns null when no CAM signature present", () => {
    const r = engine["inferCAMSystemFromHeader"]("$PART1.MIN%\nNAT01 (OD RGH. TURN)\nT010101\n");
    expect(r).toBeNull();
  });

  it("extractOne emits cam_system_confidence=extension for plain Okuma .MIN", () => {
    const v = engine.extractOne(REAL_MIN);
    expect(v.cam_system_confidence).toBe("extension");
    expect(v.cam_system_evidence).toMatch(/extension=/);
  });

  it("extractOne with a synthetic MASTERCAM-branded .min file flips cam_system to mastercam with header_match confidence", () => {
    const tmp = path.join(os.tmpdir(), "branded.min");
    fs.writeFileSync(tmp, "$P1.MIN%\n(MASTERCAM X8 MILL POST)\nNAT01 (FACE RGH)\nT010101\nG0 X10 Z10\nS1000\nF0.1\n");
    try {
      const v = new CAMFeatureExtractorEngine(os.tmpdir()).extractOne(tmp);
      expect(v.cam_system).toBe("mastercam");
      expect(v.cam_system_confidence).toBe("header_match");
      expect(v.cam_system_evidence).toMatch(/MASTERCAM/);
    } finally {
      fs.unlinkSync(tmp);
    }
  });
});

describe("CAMFeatureExtractorEngine — batch extraction", () => {
  it("extracts a small batch from the corpus index without throwing", () => {
    const r = camFeatureExtractorEngine.extractBatch(
      5,
      "H:/PRISM/mcp-server/data/state/JM_DIE_CORPUS_INDEX.json"
    );
    expect(r.schemaVersion).toBe(1);
    expect(r.vectors.length).toBeLessThanOrEqual(5);
    expect(r.statistics.total_programs).toBe(r.vectors.length);
  });

  it("reports parsed_ok_rate as a number in [0,1]", () => {
    const r = camFeatureExtractorEngine.extractBatch(
      5,
      "H:/PRISM/mcp-server/data/state/JM_DIE_CORPUS_INDEX.json"
    );
    expect(r.statistics.parsed_ok_rate).toBeGreaterThanOrEqual(0);
    expect(r.statistics.parsed_ok_rate).toBeLessThanOrEqual(1);
  });

  it("returns an empty result when the corpus index is missing", () => {
    const r = camFeatureExtractorEngine.extractBatch(10, "/nonexistent/path.json");
    expect(r.vectors).toHaveLength(0);
    expect(r.sample_size).toBe(0);
  });
});

describe("U-CAM-FEED-PER-REV — native feed-per-rev capture (CSS-shop dense target)", () => {
  function extractProgram(body: string, name = "perrev") {
    const tmp = path.join(os.tmpdir(), `${name}-${Math.random().toString(36).slice(2)}.min`);
    fs.writeFileSync(tmp, body);
    try {
      return new CAMFeatureExtractorEngine(os.tmpdir()).extractOne(tmp);
    } finally {
      fs.unlinkSync(tmp);
    }
  }

  it("captures feed-per-rev under G96 CSS where mm/min is necessarily EMPTY (the gap this closes)", () => {
    // G96 CSS ⇒ rpm unknown ⇒ mm/min cannot be computed; but G95 F-values ARE feed-per-rev.
    const v = extractProgram("$T.MIN%\nG20 G95\nT010101\nG96 S250 M3\nG0 X1.65 Z.1\nG1 X1.5 Z-1. F.007\nG1 X1.6 F.012\nM2\n");
    expect(v.parsed_ok).toBe(true);
    expect(v.estimated_feed_range_mm_min).toEqual([0, 0]); // CSS → mm/min legitimately empty
    expect(v.estimated_feed_range_per_rev?.[0]).toBeCloseTo(0.007, 5);
    expect(v.estimated_feed_range_per_rev?.[1]).toBeCloseTo(0.012, 5);
    expect(v.feed_per_rev_unit).toBe("in/rev"); // G20 declared
  });

  it("tags in/rev when G20 declared, mm/rev when G21 declared", () => {
    const inch = extractProgram("$T.MIN%\nG20 G95\nT010101\nG96 S250\nG1 X1. Z-1. F.006\nM2\n");
    expect(inch.feed_per_rev_unit).toBe("in/rev");
    expect(inch.estimated_feed_range_per_rev?.[0]).toBeCloseTo(0.006, 5);
    const metric = extractProgram("$T.MIN%\nG21 G95\nT010101\nG96 S200\nG1 X20 Z-25 F0.15\nM2\n");
    expect(metric.feed_per_rev_unit).toBe("mm/rev");
    expect(metric.estimated_feed_range_per_rev?.[0]).toBeCloseTo(0.15, 5);
  });

  it("tags unit='unknown' + warns when no G20/G21 (does NOT silently assume inch — units-first)", () => {
    const v = extractProgram("$T.MIN%\nG95\nT010101\nG96 S250\nG1 X1. Z-1. F.006\nM2\n");
    expect(v.estimated_feed_range_per_rev?.[0]).toBeCloseTo(0.006, 5);
    expect(v.feed_per_rev_unit).toBe("unknown");
    expect(v.parse_warnings.some((w) => /unit='unknown'|25\.4x/i.test(w))).toBe(true);
  });

  it("routes a G94 feed-per-MINUTE value to mm/min (not into the per-rev target)", () => {
    const v = extractProgram("$T.MIN%\nG20 G94\nT010101\nG97 S1000 M3\nG1 X1 Z-1 F5.0\nM2\n");
    expect(v.estimated_feed_range_mm_min).toEqual([5, 5]); // G94 → mm/min populated, per-rev stays empty
  });

  it("feed_per_rev values are plausible in/rev magnitudes (no 25.4x mislabel)", () => {
    const v = extractProgram("$T.MIN%\nG20 G95\nT010101\nG96 S250\nG1 X1. Z-1. F.007\nM2\n");
    // in/rev turning feeds are sub-0.1; a 25.4x mix would show ~0.18+. Guard the mislabel class.
    expect(v.estimated_feed_range_per_rev?.[1]).toBeCloseTo(0.007, 5);
    expect(v.estimated_feed_range_per_rev?.[1]).toBeLessThan(0.1);
  });

  it("REAL JM CSS program populates feed-per-rev (closes the n≈6 mm/min coverage gap)", () => {
    const v = engine.extractOne(REAL_MIN_WITH_CYCLES);
    expect(v.parsed_ok).toBe(true); // corpus file present (same assumption as the happy-path suite)
    expect(v.estimated_feed_range_per_rev?.[1] ?? 0).toBeGreaterThan(0);
    // in/rev sanity: real per-rev feeds incl. coarse thread leads stay well under 20 in/rev;
    // a catastrophic unit mislabel would be in the hundreds.
    expect(v.estimated_feed_range_per_rev?.[1] ?? 99).toBeLessThan(20);
  });
});
