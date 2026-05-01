/**
 * Tests for PostDownloadEngine — PP-MS4 U-PP21 quality fixes.
 *
 * Verifies:
 *   1. Dynamic program number derived from program_name (not hardcoded O0001)
 *   2. Heidenhain ISO G-code body warning
 *   3. Controller-specific format framing (Siemens .mpf, Haas .nc)
 *   4. Setup sheet machine info
 *   5. Manifest multi-file output
 */
import { describe, it, expect } from "vitest";
import { postDownloadEngine } from "../engines/PostDownloadEngine.js";
import type {
  DownloadInput,
  DownloadResult,
  ManifestResult,
} from "../engines/PostDownloadEngine.js";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const SAMPLE_ISO_GCODE = [
  "G90 G80 G40",
  "T1 M6",
  "S8000 M3",
  "G43 H1 Z50.",
  "G0 X0 Y0",
  "G0 Z5.",
  "G1 Z-3. F200",
  "G1 X50. F500",
  "G1 Y50.",
  "G0 Z50.",
  "M30",
].join("\n");

const CONVERSATIONAL_HEIDENHAIN_BODY = [
  "BLK FORM 0.1 Z X+0 Y+0 Z-50",
  "BLK FORM 0.2 X+100 Y+80 Z+0",
  "TOOL CALL 1 Z S8000",
  "L Z+50 R0 FMAX",
  "L X+0 Y+0 R0 FMAX",
  "L Z+5 R0 FMAX",
  "L Z-3 R0 F200",
  "L X+50 R0 F500",
  "L Y+50 R0",
  "L Z+50 R0 FMAX",
  "TOOL CALL 0",
].join("\n");

function makeInput(overrides: Partial<DownloadInput>): DownloadInput {
  return {
    action: "format_download",
    gcode: SAMPLE_ISO_GCODE,
    controller: "haas_ngc",
    program_name: "PART_ABC_001",
    machine_brand: "Haas",
    machine_model: "VF-2",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Dynamic program number — not hardcoded O0001
// ---------------------------------------------------------------------------

describe("PostDownloadEngine — dynamic program number", () => {
  it("derives O-number from program_name, not hardcoded O0001", () => {
    const input = makeInput({ program_name: "PART_ABC_001" });
    const result = postDownloadEngine.execute(input) as DownloadResult;
    expect(result.content).not.toContain("O0001");
    // Must contain an O-number (O followed by 4 digits)
    expect(result.content).toMatch(/O\d{4}/);
  });

  it("two different program_names produce different O-numbers", () => {
    const resultA = postDownloadEngine.execute(
      makeInput({ program_name: "ALPHA_WIDGET" }),
    ) as DownloadResult;
    const resultB = postDownloadEngine.execute(
      makeInput({ program_name: "BETA_BRACKET" }),
    ) as DownloadResult;

    const extractO = (content: string) => {
      const m = content.match(/O(\d{4})/);
      return m ? m[1] : null;
    };
    const oA = extractO(resultA.content);
    const oB = extractO(resultB.content);
    expect(oA).not.toBeNull();
    expect(oB).not.toBeNull();
    expect(oA).not.toBe(oB);
  });

  it("same program_name always produces the same O-number (deterministic)", () => {
    const name = "DETERMINISM_CHECK_42";
    const r1 = postDownloadEngine.execute(
      makeInput({ program_name: name }),
    ) as DownloadResult;
    const r2 = postDownloadEngine.execute(
      makeInput({ program_name: name }),
    ) as DownloadResult;

    const extractO = (content: string) => {
      const m = content.match(/O(\d{4})/);
      return m ? m[1] : null;
    };
    expect(extractO(r1.content)).toBe(extractO(r2.content));
  });
});

// ---------------------------------------------------------------------------
// 2. Heidenhain ISO body warning
// ---------------------------------------------------------------------------

describe("PostDownloadEngine — Heidenhain ISO warning", () => {
  it("warns when ISO G-code body is used with Heidenhain controller", () => {
    const input = makeInput({
      controller: "heidenhain_tnc640",
      gcode: SAMPLE_ISO_GCODE,
    });
    const result = postDownloadEngine.execute(input) as DownloadResult;
    const hasIsoWarning = result.warnings.some((w) =>
      /ISO format/i.test(w),
    );
    expect(hasIsoWarning).toBe(true);
  });

  it("does NOT warn when Heidenhain conversational body is used", () => {
    const input = makeInput({
      controller: "heidenhain_tnc640",
      gcode: CONVERSATIONAL_HEIDENHAIN_BODY,
    });
    const result = postDownloadEngine.execute(input) as DownloadResult;
    const hasIsoWarning = result.warnings.some((w) =>
      /ISO format/i.test(w),
    );
    expect(hasIsoWarning).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Siemens .mpf format
// ---------------------------------------------------------------------------

describe("PostDownloadEngine — Siemens .mpf format", () => {
  it("output starts with %_N_ header for Siemens controller", () => {
    const input = makeInput({
      controller: "siemens_840d",
      program_name: "BRACKET_007",
    });
    const result = postDownloadEngine.execute(input) as DownloadResult;
    expect(result.content).toMatch(/^%_N_/);
    expect(result.format).toBe("mpf");
    expect(result.filename).toMatch(/\.mpf$/);
  });
});

// ---------------------------------------------------------------------------
// 4. Haas .nc format
// ---------------------------------------------------------------------------

describe("PostDownloadEngine — Haas .nc format", () => {
  it("output contains % and O-number for Haas controller", () => {
    const input = makeInput({
      controller: "haas_ngc",
      program_name: "HOUSING_123",
    });
    const result = postDownloadEngine.execute(input) as DownloadResult;
    expect(result.content).toContain("%");
    expect(result.content).toMatch(/O\d{4}/);
    expect(result.format).toBe("nc");
    expect(result.filename).toMatch(/\.nc$/);
  });
});

// ---------------------------------------------------------------------------
// 5. Setup sheet contains machine info
// ---------------------------------------------------------------------------

describe("PostDownloadEngine — setup sheet", () => {
  it("contains machine_brand and machine_model", () => {
    const input = makeInput({
      action: "setup_sheet",
      machine_brand: "Haas",
      machine_model: "VF-2",
    });
    const result = postDownloadEngine.execute(input) as DownloadResult;
    expect(result.content).toContain("Haas");
    expect(result.content).toContain("VF-2");
  });

  it("includes program name in setup sheet", () => {
    const input = makeInput({
      action: "setup_sheet",
      program_name: "FIXTURE_PLATE_99",
    });
    const result = postDownloadEngine.execute(input) as DownloadResult;
    expect(result.content).toContain("FIXTURE_PLATE_99");
  });

  it("includes controller info in setup sheet", () => {
    const input = makeInput({
      action: "setup_sheet",
      controller: "fanuc_31i",
    });
    const result = postDownloadEngine.execute(input) as DownloadResult;
    expect(result.content).toContain("fanuc_31i");
  });
});

// ---------------------------------------------------------------------------
// 6. Manifest has 2+ files (G-code + setup sheet)
// ---------------------------------------------------------------------------

describe("PostDownloadEngine — manifest", () => {
  it("returns at least G-code and setup sheet files", () => {
    const input = makeInput({ action: "manifest" });
    const result = postDownloadEngine.execute(input) as ManifestResult;
    expect(result.files.length).toBeGreaterThanOrEqual(2);

    const filenames = result.files.map((f) => f.filename);
    // At least one G-code file and one setup sheet
    const hasGcode = filenames.some(
      (fn) =>
        fn.endsWith(".nc") ||
        fn.endsWith(".tap") ||
        fn.endsWith(".mpf") ||
        fn.endsWith(".h") ||
        fn.endsWith(".eia"),
    );
    const hasSetup = filenames.some((fn) => fn.includes("SETUP"));
    expect(hasGcode).toBe(true);
    expect(hasSetup).toBe(true);
  });

  it("manifest total_size_bytes equals sum of file sizes", () => {
    const input = makeInput({ action: "manifest" });
    const result = postDownloadEngine.execute(input) as ManifestResult;
    const sum = result.files.reduce((acc, f) => acc + f.size_bytes, 0);
    expect(result.total_size_bytes).toBe(sum);
  });

  it("includes validation report when validation_summary is provided", () => {
    const input = makeInput({
      action: "manifest",
      validation_summary: "All checks passed. 0 errors, 2 warnings.",
    });
    const result = postDownloadEngine.execute(input) as ManifestResult;
    expect(result.files.length).toBeGreaterThanOrEqual(3);
    const valFile = result.files.find((f) => f.filename.includes("VALIDATION"));
    expect(valFile).toBeDefined();
    expect(valFile!.content).toContain("All checks passed");
  });
});
