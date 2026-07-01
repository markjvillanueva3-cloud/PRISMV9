/**
 * PostDownloadEngine.test.ts
 *
 * Real reference-value / algebraic-invariant tests for PostDownloadEngine.
 * No network or disk I/O -- all logic is pure in-memory.
 *
 * Coverage:
 *   formatDownload   -- happy path, all 5 formats, physics annotation, warnings
 *   setupSheet       -- happy path, physics summary, no-physics warning
 *   buildManifest    -- 2-file vs 3-file, size invariant, warning aggregation
 *   postDownloadEngine singleton execute() -- dispatch + unknown-action throw
 *   Edge cases       -- empty gcode, unknown controller, negative force/line,
 *                       oversized program, Heidenhain ISO-motion warning,
 *                       include_physics_comments:false suppression
 *   Adversarial      -- special chars in program_name, physics block beyond
 *                       gcode length, duplicate line-index blocks, CRLF gcode
 */

import { describe, it, expect } from "vitest";
import {
  postDownloadEngine,
  formatDownload,
  setupSheet,
  buildManifest,
} from "../engines/PostDownloadEngine.js";
import type {
  DownloadInput,
  PhysicsBlock,
  ControllerFormat,
} from "../engines/PostDownloadEngine.js";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const SIMPLE_GCODE = [
  "G90 G80 G40",
  "T1 M6",
  "S6000 M3",
  "G0 X0 Y0 Z5.",
  "G1 Z-2. F300",
  "G1 X50. F800",
  "G0 Z50.",
  "M30",
].join("\n");

const BASE_INPUT: DownloadInput = {
  action: "format_download",
  gcode: SIMPLE_GCODE,
  controller: "haas_ngc",
  machine_brand: "Haas",
  machine_model: "VF2",
  program_name: "PART_001",
};

const PHYSICS_BLOCKS: PhysicsBlock[] = [
  { line: 4, force_N: 350, power_kW: 2.1, confidence: 0.92 },
  { line: 5, force_N: 410, predicted_Ra_um: 1.25, note: "finish_pass" },
];

// ---------------------------------------------------------------------------
// formatDownload -- happy paths
// ---------------------------------------------------------------------------

describe("formatDownload -- happy path", () => {
  it("returns correct format, mime and zero warnings for haas_ngc", () => {
    const result = formatDownload(BASE_INPUT);
    expect(result.format).toBe("nc");
    expect(result.mime_type).toBe("application/x-gcode");
    expect(result.warnings).toEqual([]);
  });

  it("filename has .nc extension for haas_ngc", () => {
    const result = formatDownload(BASE_INPUT);
    expect(result.filename.endsWith(".nc")).toBe(true);
  });

  it("content includes PRISM metadata header", () => {
    const result = formatDownload(BASE_INPUT);
    expect(result.content).toContain("PRISM Physics-Optimized G-code");
    expect(result.content).toContain("Controller: haas_ngc");
    expect(result.content).toContain("PRISM MCP Server v8.2");
  });

  it("nc format opens with % then O<4-digit> program number", () => {
    const result = formatDownload(BASE_INPUT);
    expect(result.content).toMatch(/^%\n/);
    expect(result.content).toMatch(/O\d{4}/);
  });

  it("content closes with M30", () => {
    const result = formatDownload(BASE_INPUT);
    expect(result.content).toContain("M30");
  });

  it("size_bytes is exact byte-length of content (algebraic invariant)", () => {
    const result = formatDownload(BASE_INPUT);
    const expected = new TextEncoder().encode(result.content).length;
    expect(result.size_bytes).toBe(expected);
  });

  it("filename is fully sanitized (only A-Z 0-9 underscore + extension)", () => {
    const result = formatDownload(BASE_INPUT);
    expect(result.filename).toMatch(/^[A-Z0-9_]+\.nc$/);
  });

  it("G-code body lines appear verbatim in the output", () => {
    const result = formatDownload(BASE_INPUT);
    expect(result.content).toContain("G1 X50. F800");
    expect(result.content).toContain("G0 Z50.");
  });
});

// ---------------------------------------------------------------------------
// formatDownload -- all 5 controller formats
// ---------------------------------------------------------------------------

describe("formatDownload -- all 5 controller formats", () => {
  const FORMAT_CASES: Array<{
    controller: string;
    expectedFormat: ControllerFormat;
    expectedExt: string;
    expectedMime: string;
  }> = [
    {
      controller: "haas_ngc",
      expectedFormat: "nc",
      expectedExt: ".nc",
      expectedMime: "application/x-gcode",
    },
    {
      controller: "fanuc_31i",
      expectedFormat: "tap",
      expectedExt: ".tap",
      expectedMime: "application/x-gcode",
    },
    {
      controller: "siemens_840d",
      expectedFormat: "mpf",
      expectedExt: ".mpf",
      expectedMime: "application/x-sinumerik",
    },
    {
      controller: "heidenhain_tnc640",
      expectedFormat: "h",
      expectedExt: ".h",
      expectedMime: "application/x-heidenhain",
    },
    {
      controller: "mazak_smooth_ai",
      expectedFormat: "eia",
      expectedExt: ".eia",
      expectedMime: "application/x-gcode",
    },
  ];

  for (const tc of FORMAT_CASES) {
    it(`controller "${tc.controller}" -> format "${tc.expectedFormat}", ext "${tc.expectedExt}"`, () => {
      const result = formatDownload({
        ...BASE_INPUT,
        controller: tc.controller,
        gcode: "CYCL DEF 1.0 PECK-DRILLING",
      });
      expect(result.format).toBe(tc.expectedFormat);
      expect(result.filename.endsWith(tc.expectedExt)).toBe(true);
      expect(result.mime_type).toBe(tc.expectedMime);
    });
  }

  it("Siemens MPF wraps with %_N_ and _MPF markers", () => {
    const result = formatDownload({
      ...BASE_INPUT,
      controller: "siemens_840d",
      program_name: "my-prog",
      gcode: "G0 Z50",
    });
    expect(result.content).toContain("%_N_");
    expect(result.content).toContain("_MPF");
  });

  it("Heidenhain wraps with BEGIN PGM <name> MM", () => {
    const result = formatDownload({
      ...BASE_INPUT,
      controller: "heidenhain_tnc640",
      program_name: "hh_prog",
      gcode: "CYCL DEF 200 DRILLING",
    });
    expect(result.content).toContain("BEGIN PGM");
    expect(result.content).toMatch(/BEGIN PGM [A-Z0-9_]+ MM/);
  });

  it("explicit format field overrides the controller mapping", () => {
    const result = formatDownload({
      ...BASE_INPUT,
      controller: "haas_ngc",
      format: "mpf",
      gcode: "G0 Z50",
    });
    expect(result.format).toBe("mpf");
    expect(result.filename.endsWith(".mpf")).toBe(true);
    expect(result.mime_type).toBe("application/x-sinumerik");
  });
});

// ---------------------------------------------------------------------------
// formatDownload -- deriveProgramNumber invariant (tested indirectly)
// ---------------------------------------------------------------------------

describe("formatDownload -- program number invariant", () => {
  it("O-number is 4 digits in range 0001-9999 for various program names", () => {
    const names = ["PART_001", "A", "z".repeat(200), "123", "PRISM_PROGRAM"];
    for (const name of names) {
      const result = formatDownload({ ...BASE_INPUT, program_name: name, gcode: "G0 Z50" });
      const match = result.content.match(/O(\d{4})/);
      expect(match).not.toBeNull();
      const num = parseInt(match![1], 10);
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(9999);
    }
  });

  it("same program name always yields the same O-number (deterministic hash)", () => {
    const r1 = formatDownload({ ...BASE_INPUT, program_name: "REPEATABLE", gcode: "G0" });
    const r2 = formatDownload({ ...BASE_INPUT, program_name: "REPEATABLE", gcode: "G0 Z10" });
    const m1 = r1.content.match(/O(\d{4})/)![1];
    const m2 = r2.content.match(/O(\d{4})/)![1];
    expect(m1).toBe(m2);
  });
});

// ---------------------------------------------------------------------------
// formatDownload -- physics annotation injection
// ---------------------------------------------------------------------------

describe("formatDownload -- physics annotation injection", () => {
  it("injects Fc, power and confidence annotation on the correct line", () => {
    const result = formatDownload({
      ...BASE_INPUT,
      physics_blocks: PHYSICS_BLOCKS,
      include_physics_comments: true,
    });
    expect(result.content).toContain("Fc=350N");
    expect(result.content).toContain("P=2.10kW");
    expect(result.content).toContain("conf=92%");
  });

  it("injects Ra and note fields from second physics block", () => {
    const result = formatDownload({
      ...BASE_INPUT,
      physics_blocks: PHYSICS_BLOCKS,
      include_physics_comments: true,
    });
    expect(result.content).toContain("Ra=1.25um");
    expect(result.content).toContain("finish_pass");
  });

  it("include_physics_comments:false suppresses annotation even when blocks are present", () => {
    const result = formatDownload({
      ...BASE_INPUT,
      physics_blocks: PHYSICS_BLOCKS,
      include_physics_comments: false,
    });
    expect(result.content.includes("PRISM: Fc=")).toBe(false);
    expect(result.content.includes("conf=")).toBe(false);
  });

  it("annotation appears inline with the original G-code line (not on a new line)", () => {
    const result = formatDownload({
      ...BASE_INPUT,
      physics_blocks: [{ line: 4, force_N: 200 }],
      include_physics_comments: true,
    });
    const lines = result.content.split("\n");
    const annotatedLine = lines.find((l) => l.includes("PRISM: Fc="));
    expect(typeof annotatedLine).toBe("string");
    expect((annotatedLine as string).includes("G1 Z-2.")).toBe(true);
  });

  it("physics block referencing a line beyond gcode length does not crash and adds no annotation", () => {
    const result = formatDownload({
      ...BASE_INPUT,
      physics_blocks: [{ line: 50000, force_N: 100 }],
      include_physics_comments: true,
    });
    expect(result.content.includes("Fc=100N")).toBe(false);
    expect(result.size_bytes).toBeGreaterThan(0);
  });

  it("physics block with no data fields (only line index) produces no PRISM: annotation", () => {
    const result = formatDownload({
      ...BASE_INPUT,
      physics_blocks: [{ line: 2 }],
      include_physics_comments: true,
    });
    expect(result.content.includes("PRISM: ")).toBe(false);
  });

  it("duplicate line-index blocks: last one clobbers the first (Map semantics)", () => {
    const result = formatDownload({
      ...BASE_INPUT,
      physics_blocks: [
        { line: 4, force_N: 100 },
        { line: 4, force_N: 999 },
      ],
      include_physics_comments: true,
    });
    expect(result.content).toContain("Fc=999N");
    expect(result.content.includes("Fc=100N")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatDownload -- warning / failure modes
// ---------------------------------------------------------------------------

describe("formatDownload -- warnings (failure modes)", () => {
  it("empty gcode emits exactly the 'Empty G-code' warning", () => {
    const result = formatDownload({ ...BASE_INPUT, gcode: "" });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Empty G-code");
  });

  it("whitespace-only gcode is treated as empty", () => {
    const result = formatDownload({ ...BASE_INPUT, gcode: "   \n   " });
    expect(result.warnings.some((w) => w.includes("Empty G-code"))).toBe(true);
  });

  it("unknown controller without explicit format triggers unknown-controller warning and falls back to nc", () => {
    const result = formatDownload({
      ...BASE_INPUT,
      controller: "unknown_xyz_controller",
      gcode: "G0 Z50",
    });
    expect(result.warnings.some((w) => w.includes("Unknown controller"))).toBe(true);
    expect(result.format).toBe("nc");
  });

  it("negative cutting force in physics_blocks triggers warning", () => {
    const result = formatDownload({
      ...BASE_INPUT,
      physics_blocks: [{ line: 1, force_N: -50 }],
    });
    expect(result.warnings.some((w) => w.includes("Negative cutting force"))).toBe(true);
  });

  it("negative physics block line index triggers warning", () => {
    const result = formatDownload({
      ...BASE_INPUT,
      physics_blocks: [{ line: -1, force_N: 100 }],
    });
    expect(result.warnings.some((w) => w.includes("negative line index"))).toBe(true);
  });

  it("program exceeding 50000 lines triggers size warning", () => {
    const bigLine = "G1 X1 F500";
    const big = Array.from({ length: 50001 }, () => bigLine).join("\n");
    const result = formatDownload({ ...BASE_INPUT, gcode: big });
    expect(result.warnings.some((w) => w.includes("50,000 lines"))).toBe(true);
  });

  it("Heidenhain format with ISO G0/G1 motion emits ISO-format warning", () => {
    const isoGcode = "G0 X0 Y0\nG1 Z-5 F200\nG1 X50 F800";
    const result = formatDownload({
      ...BASE_INPUT,
      controller: "heidenhain_tnc640",
      gcode: isoGcode,
    });
    expect(result.warnings.some((w) => w.includes("ISO format"))).toBe(true);
    expect(result.warnings.some((w) => w.includes("TNC"))).toBe(true);
  });

  it("Heidenhain format with conversational gcode does NOT produce ISO warning", () => {
    const convGcode = "CYCL DEF 200 DRILLING\nCYCL CALL POS X+50 Y+0";
    const result = formatDownload({
      ...BASE_INPUT,
      controller: "heidenhain_tnc640",
      gcode: convGcode,
    });
    expect(result.warnings.some((w) => w.includes("ISO format"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatDownload -- adversarial inputs
// ---------------------------------------------------------------------------

describe("formatDownload -- adversarial inputs", () => {
  it("program_name with special chars produces a fully sanitized filename", () => {
    const result = formatDownload({
      ...BASE_INPUT,
      program_name: "part/001 test!@#",
      gcode: "G0 Z50",
    });
    expect(result.filename).toMatch(/^[A-Z0-9_]+\.nc$/i);
    expect(result.filename.includes("/")).toBe(false);
    expect(result.filename.includes(" ")).toBe(false);
    expect(result.filename.includes("!")).toBe(false);
  });

  it("missing machine_brand and machine_model falls back to PRISM in filename", () => {
    const result = formatDownload({
      action: "format_download",
      gcode: "G0 Z50",
      controller: "haas_ngc",
    });
    expect(result.filename).toContain("PRISM");
    expect(result.size_bytes).toBeGreaterThan(0);
  });

  it("gcode with Windows CRLF line endings does not crash", () => {
    const crlfGcode = "G0 Z50\r\nG1 X10 F300\r\nM30";
    const result = formatDownload({ ...BASE_INPUT, gcode: crlfGcode });
    expect(result.size_bytes).toBeGreaterThan(0);
    expect(result.warnings).toEqual([]);
  });

  it("no controller field produces no-controller warning and a valid output", () => {
    const result = formatDownload({
      action: "format_download",
      gcode: "G0 Z50",
      controller: "",
    });
    expect(result.warnings.some((w) => w.includes("No controller"))).toBe(true);
    expect(result.size_bytes).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// comment style per format
// ---------------------------------------------------------------------------

describe("comment style per format", () => {
  it("nc format uses parenthesis comments: (PRISM Physics-Optimized G-code)", () => {
    const result = formatDownload({ ...BASE_INPUT, controller: "haas_ngc", gcode: "G0 Z5" });
    expect(result.content).toContain("(PRISM Physics-Optimized G-code)");
  });

  it("tap format uses parenthesis comments", () => {
    const result = formatDownload({ ...BASE_INPUT, controller: "fanuc_31i", gcode: "G0 Z5" });
    expect(result.content).toContain("(PRISM Physics-Optimized G-code)");
  });

  it("mpf format uses semicolon-space comments: ; PRISM Physics-Optimized G-code", () => {
    const result = formatDownload({ ...BASE_INPUT, controller: "siemens_840d", gcode: "G0 Z5" });
    expect(result.content).toContain("; PRISM Physics-Optimized G-code");
  });

  it("h format uses semicolon-space comments", () => {
    const result = formatDownload({
      ...BASE_INPUT,
      controller: "heidenhain_tnc640",
      gcode: "CYCL DEF",
    });
    expect(result.content).toContain("; PRISM Physics-Optimized G-code");
  });

  it("eia format uses parenthesis comments", () => {
    const result = formatDownload({ ...BASE_INPUT, controller: "mazak_smooth_ai", gcode: "G0 Z5" });
    expect(result.content).toContain("(PRISM Physics-Optimized G-code)");
  });
});

// ---------------------------------------------------------------------------
// setupSheet -- happy path
// ---------------------------------------------------------------------------

describe("setupSheet -- happy path", () => {
  it("returns text/markdown mime type", () => {
    const result = setupSheet({ ...BASE_INPUT, action: "setup_sheet" });
    expect(result.mime_type).toBe("text/markdown");
  });

  it("filename ends with _SETUP.md", () => {
    const result = setupSheet({ ...BASE_INPUT, action: "setup_sheet" });
    expect(result.filename.endsWith("_SETUP.md")).toBe(true);
  });

  it("format field is 'setup_sheet'", () => {
    const result = setupSheet({ ...BASE_INPUT, action: "setup_sheet" });
    expect(result.format).toBe("setup_sheet");
  });

  it("size_bytes equals byte-length of content (algebraic invariant)", () => {
    const result = setupSheet({ ...BASE_INPUT, action: "setup_sheet" });
    const expected = new TextEncoder().encode(result.content).length;
    expect(result.size_bytes).toBe(expected);
  });

  it("content includes all 5 pre-run checklist items", () => {
    const result = setupSheet({ ...BASE_INPUT, action: "setup_sheet" });
    expect(result.content).toContain("Pre-Run Checklist");
    expect(result.content).toContain("Verify work offset");
    expect(result.content).toContain("Confirm tool lengths");
    expect(result.content).toContain("coolant");
    expect(result.content).toContain("50%");
  });

  it("program name appears in content", () => {
    const result = setupSheet({ ...BASE_INPUT, action: "setup_sheet", program_name: "FLANGE_A" });
    expect(result.content).toContain("FLANGE_A");
  });

  it("no physics data emits exactly 1 warning about missing physics summary", () => {
    const result = setupSheet({ ...BASE_INPUT, action: "setup_sheet" });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("No physics data");
  });
});

// ---------------------------------------------------------------------------
// setupSheet -- physics summary content correctness
// ---------------------------------------------------------------------------

describe("setupSheet -- physics summary", () => {
  it("physics summary section appears with correct max and avg force values", () => {
    const result = setupSheet({
      ...BASE_INPUT,
      action: "setup_sheet",
      physics_blocks: PHYSICS_BLOCKS,
    });
    expect(result.content).toContain("Physics Summary");
    // max force = 410, avg force = (350+410)/2 = 380
    expect(result.content).toContain("410 N");
    expect(result.content).toContain("380 N");
  });

  it("average physics confidence is computed correctly (only block 0 has confidence)", () => {
    const result = setupSheet({
      ...BASE_INPUT,
      action: "setup_sheet",
      physics_blocks: PHYSICS_BLOCKS,
    });
    // only PHYSICS_BLOCKS[0].confidence = 0.92 -> avg = 92%
    expect(result.content).toContain("92%");
    expect(result.warnings).toEqual([]);
  });

  it("blocks with no force_N show only confidence, not force lines", () => {
    const result = setupSheet({
      ...BASE_INPUT,
      action: "setup_sheet",
      physics_blocks: [{ line: 0, confidence: 0.75 }],
    });
    expect(result.content).toContain("75%");
    expect(result.content.includes("Max cutting force:")).toBe(false);
  });

  it("blocks with only force_N show force lines but no confidence line", () => {
    const result = setupSheet({
      ...BASE_INPUT,
      action: "setup_sheet",
      physics_blocks: [{ line: 0, force_N: 250 }],
    });
    expect(result.content).toContain("Max cutting force:");
    expect(result.content.includes("Avg physics confidence:")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setupSheet -- failure modes
// ---------------------------------------------------------------------------

describe("setupSheet -- failure modes", () => {
  it("empty gcode does not crash -- checklist still generated", () => {
    const result = setupSheet({ ...BASE_INPUT, action: "setup_sheet", gcode: "" });
    expect(result.size_bytes).toBeGreaterThan(0);
    expect(result.content).toContain("Pre-Run Checklist");
  });
});

// ---------------------------------------------------------------------------
// buildManifest -- 2-file bundle (no validation summary)
// ---------------------------------------------------------------------------

describe("buildManifest -- 2-file bundle", () => {
  it("returns exactly 2 files: gcode then setup sheet", () => {
    const result = buildManifest({ ...BASE_INPUT, action: "manifest" });
    expect(result.files).toHaveLength(2);
  });

  it("first file has nc extension, second has _SETUP.md suffix", () => {
    const result = buildManifest({ ...BASE_INPUT, action: "manifest" });
    expect(result.files[0].filename.endsWith(".nc")).toBe(true);
    expect(result.files[1].filename.endsWith("_SETUP.md")).toBe(true);
  });

  it("total_size_bytes equals sum of individual file sizes (algebraic invariant)", () => {
    const result = buildManifest({ ...BASE_INPUT, action: "manifest" });
    const summed = result.files.reduce((acc, f) => acc + f.size_bytes, 0);
    expect(result.total_size_bytes).toBe(summed);
  });

  it("no-validation warning is present when validation_summary is absent", () => {
    const result = buildManifest({ ...BASE_INPUT, action: "manifest" });
    expect(result.warnings.some((w) => w.includes("No validation report"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildManifest -- 3-file bundle (with validation summary)
// ---------------------------------------------------------------------------

describe("buildManifest -- 3-file bundle (with validation_summary)", () => {
  const INPUT_WITH_VAL: DownloadInput = {
    ...BASE_INPUT,
    action: "manifest",
    validation_summary: "All 12 checks PASSED. Collision-free.",
  };

  it("returns exactly 3 files when validation_summary is provided", () => {
    const result = buildManifest(INPUT_WITH_VAL);
    expect(result.files).toHaveLength(3);
  });

  it("third file is the validation report with txt mime and correct content", () => {
    const result = buildManifest(INPUT_WITH_VAL);
    const valFile = result.files[2];
    expect(valFile.filename.endsWith("_VALIDATION.txt")).toBe(true);
    expect(valFile.mime_type).toBe("text/plain");
    expect(valFile.content).toContain("All 12 checks PASSED");
  });

  it("total_size_bytes invariant holds for 3 files", () => {
    const result = buildManifest(INPUT_WITH_VAL);
    const summed = result.files.reduce((acc, f) => acc + f.size_bytes, 0);
    expect(result.total_size_bytes).toBe(summed);
  });

  it("no-validation warning is absent when summary provided", () => {
    const result = buildManifest(INPUT_WITH_VAL);
    expect(result.warnings.some((w) => w.includes("No validation report"))).toBe(false);
  });

  it("warnings from sub-files are aggregated into the manifest warnings array", () => {
    const result = buildManifest({
      ...INPUT_WITH_VAL,
      controller: "unknown_ctrl_xyz",
      gcode: "G0 Z5",
    });
    expect(result.warnings.some((w) => w.includes("Unknown controller"))).toBe(true);
    expect(result.warnings.some((w) => w.includes("No physics data"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// postDownloadEngine singleton -- dispatch round-trip
// ---------------------------------------------------------------------------

describe("postDownloadEngine singleton -- dispatch", () => {
  it("has name 'PostDownloadEngine' and version '1.0.0'", () => {
    expect(postDownloadEngine.name).toBe("PostDownloadEngine");
    expect(postDownloadEngine.version).toBe("1.0.0");
  });

  it("actions array contains exactly format_download, setup_sheet, manifest", () => {
    expect(postDownloadEngine.actions).toHaveLength(3);
    expect(postDownloadEngine.actions).toContain("format_download");
    expect(postDownloadEngine.actions).toContain("setup_sheet");
    expect(postDownloadEngine.actions).toContain("manifest");
  });

  it("execute format_download returns DownloadResult with nc extension via haas_ngc", () => {
    const result = postDownloadEngine.execute(BASE_INPUT) as {
      content: string;
      filename: string;
      size_bytes: number;
      mime_type: string;
    };
    expect(typeof result.content).toBe("string");
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.filename.endsWith(".nc")).toBe(true);
    expect(result.mime_type).toBe("application/x-gcode");
  });

  it("execute setup_sheet returns text/markdown content with Pre-Run Checklist", () => {
    const result = postDownloadEngine.execute({
      ...BASE_INPUT,
      action: "setup_sheet",
    }) as { content: string; mime_type: string };
    expect(result.mime_type).toBe("text/markdown");
    expect(result.content).toContain("Pre-Run Checklist");
  });

  it("execute manifest returns 2-element files array with correct total_size_bytes", () => {
    const result = postDownloadEngine.execute({
      ...BASE_INPUT,
      action: "manifest",
    }) as { files: Array<{ size_bytes: number }>; total_size_bytes: number };
    expect(Array.isArray(result.files)).toBe(true);
    expect(result.files).toHaveLength(2);
    const summed = result.files.reduce((acc, f) => acc + f.size_bytes, 0);
    expect(result.total_size_bytes).toBe(summed);
  });

  it("execute throws an Error containing 'PostDownloadEngine' for unknown action", () => {
    expect(() =>
      postDownloadEngine.execute({
        ...BASE_INPUT,
        action: "unknown_action" as "format_download",
      })
    ).toThrow("PostDownloadEngine");
  });

  it("execute throw message lists all valid actions", () => {
    expect(() =>
      postDownloadEngine.execute({
        ...BASE_INPUT,
        action: "bad_action" as "format_download",
      })
    ).toThrow("format_download");
  });
});
