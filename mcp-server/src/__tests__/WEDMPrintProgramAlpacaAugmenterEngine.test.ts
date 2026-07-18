import { describe, it, expect } from "vitest";
import {
  wedmPrintProgramAlpacaAugmenterEngine,
  type PrintExtraction,
  type AugmentInput,
} from "../engines/WEDMPrintProgramAlpacaAugmenterEngine.js";

const PROGRAM_SAMPLE = [
  "%",
  "L001",
  "(03/07/22)",
  "H1 =.0085",
  "N5 G90",
  "N10 M91 (Adaptive Control Off)",
  "N15 G92 X0.0 Y0.0",
  "N20 G1 X0. Y0. F25.0",
  "N25 M20 (Thread Wire)",
  "N30 M78 M78 (Fill Tank)",
  "N35 M80 (Water On)",
  "N40 M82 (Wire On)",
  "N45 M84 (Power On)",
  "N50 E1221 H1 F.12 (PASS=1)",
  "N635 M85 M83 M81 (Power/Wire/Fluid - Off)",
  "N640 M21 (Cut Wire)",
  "N645 M58 (Drain Tank)",
  "N650 M02",
].join("\n");

const FULL_PRINT: PrintExtraction = {
  dimensions: [
    { label: "OD", value: 0.5, unit: "in", tolerance: { plus: 0.001, minus: 0.001 } },
    { label: "ID", value: 0.25, unit: "in" },
  ],
  gdt: ["⊥ 0.002 A", "⌖ 0.005 A B C"],
  material: "A2 Tool Steel — Heat Treated 58-62 HRC",
  surface_finish: "Ra 0.8 max",
  title_block: { part_no: "500-30540-24000-04", customer: "ITW Shakeproof", revision: "B" },
};

// ============================================================================
// HAPPY PATH — full print + program
// ============================================================================

describe("WEDMPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair — happy paths", () => {
  it("HAPPY: full print + program above floor → augmented pair with print_context", () => {
    const result = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
      program_content: PROGRAM_SAMPLE,
      program_path: "JM DIE/WIRE EDM/ITW SHAKEPROOF 500-30540-24000-04.NC",
      print_extraction: FULL_PRINT,
      join_confidence: 0.95,
      join_tier: "exact",
    });
    expect(result.meta.has_print).toBe(true);
    expect(result.meta.skipped).toBe(false);
    expect(result.meta.confidence_tier).toBe("exact");
    expect(result.meta.join_confidence).toBe(0.95);
    expect(result.instruction).toMatch(/blueprint/i);
    expect(result.output).toBe(PROGRAM_SAMPLE);
    // Print context should contain ALL structured fields:
    expect(result.input).toMatch(/TITLE BLOCK:/);
    expect(result.input).toMatch(/customer: ITW Shakeproof/);
    expect(result.input).toMatch(/MATERIAL: A2 Tool Steel/);
    expect(result.input).toMatch(/SURFACE FINISH: Ra 0.8 max/);
    expect(result.input).toMatch(/OD = 0\.5 in \(\+0\.0010\/-0\.0010\)/);
    expect(result.input).toMatch(/ID = 0\.25 in/);
    expect(result.input).toMatch(/GD&T:/);
    expect(result.input).toMatch(/⊥ 0\.002 A/);
    expect(result.meta.print_context_length).toBe(result.input.length);
    expect(result.meta.instruction_family).toBe("print_to_program");
  });

  it("HAPPY: print-only minimal (material + 1 dimension) is still usable", () => {
    const result = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
      program_content: PROGRAM_SAMPLE,
      print_extraction: {
        material: "D2 Tool Steel",
        dimensions: [{ label: "Thickness", value: 0.25, unit: "in" }],
      },
      join_confidence: 0.7,
    });
    expect(result.meta.has_print).toBe(true);
    expect(result.input).toMatch(/MATERIAL: D2 Tool Steel/);
    expect(result.input).toMatch(/Thickness = 0\.25 in/);
  });

  it("HAPPY: confidence_tier auto-inferred when not provided — 0.9 → exact", () => {
    const result = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
      program_content: PROGRAM_SAMPLE,
      print_extraction: FULL_PRINT,
      join_confidence: 0.9,
    });
    expect(result.meta.confidence_tier).toBe("exact");
  });

  it("HAPPY: confidence_tier auto-inferred — 0.6 → loose", () => {
    const result = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
      program_content: PROGRAM_SAMPLE,
      print_extraction: FULL_PRINT,
      join_confidence: 0.6,
    });
    expect(result.meta.confidence_tier).toBe("loose");
  });

  it("HAPPY: confidence clamped to [0,1] — 1.5 input becomes 1.0", () => {
    const result = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
      program_content: PROGRAM_SAMPLE,
      print_extraction: FULL_PRINT,
      join_confidence: 1.5,
    });
    expect(result.meta.join_confidence).toBe(1.0);
  });
});

// ============================================================================
// FALLBACK / SKIP POLICIES
// ============================================================================

describe("WEDMPrintProgramAlpacaAugmenterEngine — fallback policies", () => {
  it("FALLBACK: no print attached → program-only by default", () => {
    const result = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
      program_content: PROGRAM_SAMPLE,
    });
    expect(result.meta.has_print).toBe(false);
    expect(result.meta.skipped).toBe(false);
    expect(result.instruction).toMatch(/Reproduce/i);
    expect(result.input).toBe("");
    expect(result.output).toBe(PROGRAM_SAMPLE);
    expect(result.meta.confidence_tier).toBe("none");
  });

  it("FALLBACK: no print attached + emit_program_only_below=false → SKIPPED", () => {
    const result = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
      program_content: PROGRAM_SAMPLE,
      emit_program_only_below: false,
    });
    expect(result.meta.skipped).toBe(true);
    expect(result.meta.skip_reason).toBe("no_print_attached");
    expect(result.instruction).toBe("");
    expect(result.output).toBe("");
  });

  it("FALLBACK: print attached but empty (OCR failure) → program-only by default", () => {
    const result = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
      program_content: PROGRAM_SAMPLE,
      print_extraction: {},
      join_confidence: 0.8,
    });
    expect(result.meta.has_print).toBe(false);
    expect(result.meta.skipped).toBe(false);
    expect(result.input).toBe("");
  });

  it("FALLBACK: print attached but empty + skip mode → SKIPPED with reason print_ocr_empty", () => {
    const result = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
      program_content: PROGRAM_SAMPLE,
      print_extraction: { dimensions: [], gdt: [], material: "", surface_finish: "", title_block: {} },
      join_confidence: 0.8,
      emit_program_only_below: false,
    });
    expect(result.meta.skipped).toBe(true);
    expect(result.meta.skip_reason).toBe("print_ocr_empty");
  });

  it("FALLBACK: print exists but confidence below floor → program-only by default", () => {
    const result = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
      program_content: PROGRAM_SAMPLE,
      print_extraction: FULL_PRINT,
      join_confidence: 0.3,
      confidence_floor: 0.5,
    });
    expect(result.meta.has_print).toBe(false);
    expect(result.meta.skipped).toBe(false);
    expect(result.input).toBe("");
  });

  it("FALLBACK: print exists but confidence below floor + skip mode → SKIPPED with reason below_confidence_floor", () => {
    const result = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
      program_content: PROGRAM_SAMPLE,
      print_extraction: FULL_PRINT,
      join_confidence: 0.3,
      confidence_floor: 0.5,
      emit_program_only_below: false,
    });
    expect(result.meta.skipped).toBe(true);
    expect(result.meta.skip_reason).toBe("below_confidence_floor");
  });

  it("FALLBACK: confidence_floor=0 lets every print through", () => {
    const result = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
      program_content: PROGRAM_SAMPLE,
      print_extraction: FULL_PRINT,
      join_confidence: 0.01,
      confidence_floor: 0,
    });
    expect(result.meta.has_print).toBe(true);
  });
});

// ============================================================================
// FAILURE MODES — must throw on type violations
// ============================================================================

describe("WEDMPrintProgramAlpacaAugmenterEngine — failure modes", () => {
  it("FAILURE: empty program throws", () => {
    expect(() =>
      wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({ program_content: "" } as AugmentInput),
    ).toThrow(/non-empty/i);
  });

  it("FAILURE: whitespace-only program throws", () => {
    expect(() =>
      wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({ program_content: "   \n\t  " } as AugmentInput),
    ).toThrow(/non-empty/i);
  });

  it("FAILURE: non-string program throws", () => {
    expect(() =>
      wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({ program_content: 42 as unknown as string }),
    ).toThrow(/string/i);
  });

  it("FAILURE: NaN join_confidence throws", () => {
    expect(() =>
      wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
        program_content: PROGRAM_SAMPLE,
        join_confidence: NaN,
      }),
    ).toThrow(/finite/i);
  });

  it("FAILURE: Infinity join_confidence throws", () => {
    expect(() =>
      wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
        program_content: PROGRAM_SAMPLE,
        join_confidence: Infinity,
      }),
    ).toThrow(/finite/i);
  });

  it("FAILURE: confidence_floor outside [0,1] throws", () => {
    expect(() =>
      wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
        program_content: PROGRAM_SAMPLE,
        confidence_floor: 1.5,
      }),
    ).toThrow(/\[0,1\]/);
  });

  it("FAILURE: negative max_print_context_chars throws", () => {
    expect(() =>
      wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
        program_content: PROGRAM_SAMPLE,
        max_print_context_chars: -1,
      }),
    ).toThrow(/non-negative/i);
  });
});

// ============================================================================
// ADVERSARIAL — oversize / hostile inputs
// ============================================================================

describe("WEDMPrintProgramAlpacaAugmenterEngine — adversarial", () => {
  it("ADVERSARIAL: oversize raw_text is truncated to max_print_context_chars", () => {
    const giantRaw = "X".repeat(10_000_000); // 10MB
    const result = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
      program_content: PROGRAM_SAMPLE,
      print_extraction: { raw_text: giantRaw },
      join_confidence: 0.9,
      max_print_context_chars: 1024,
    });
    expect(result.meta.has_print).toBe(true);
    expect(result.input.length).toBeLessThanOrEqual(1024);
  });

  it("ADVERSARIAL: structured fields alone overshoot budget — truncated cleanly", () => {
    const manyDims = Array.from({ length: 200 }, (_, i) => ({
      label: `DIM_${i}`,
      value: i / 100,
      unit: "in" as const,
    }));
    const result = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
      program_content: PROGRAM_SAMPLE,
      print_extraction: { dimensions: manyDims },
      join_confidence: 0.9,
      max_print_context_chars: 256,
    });
    expect(result.input.length).toBeLessThanOrEqual(256);
  });

  it("ADVERSARIAL: print_extraction = null treated as no print", () => {
    const result = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
      program_content: PROGRAM_SAMPLE,
      print_extraction: null,
    });
    expect(result.meta.has_print).toBe(false);
  });

  it("ADVERSARIAL: program with only minimal valid content (single line) still emits", () => {
    const result = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
      program_content: "N5 G90",
    });
    expect(result.output).toBe("N5 G90");
    expect(result.meta.skipped).toBe(false);
  });
});

// ============================================================================
// VARIABILITY — exercise multiple print-extraction shapes
// ============================================================================

describe("WEDMPrintProgramAlpacaAugmenterEngine — variability across extraction shapes", () => {
  it("VARIABILITY: GD&T-only print (no dims, no material)", () => {
    const result = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
      program_content: PROGRAM_SAMPLE,
      print_extraction: { gdt: ["⌖ 0.005 A B C"] },
      join_confidence: 0.85,
    });
    expect(result.meta.has_print).toBe(true);
    expect(result.input).toMatch(/GD&T:/);
    expect(result.input).not.toMatch(/MATERIAL:/);
    expect(result.input).not.toMatch(/DIMENSIONS:/);
  });

  it("VARIABILITY: material-only print", () => {
    const result = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
      program_content: PROGRAM_SAMPLE,
      print_extraction: { material: "Inconel 718" },
      join_confidence: 0.85,
    });
    expect(result.input).toMatch(/MATERIAL: Inconel 718/);
    expect(result.input).not.toMatch(/DIMENSIONS:/);
    expect(result.input).not.toMatch(/GD&T:/);
  });

  it("VARIABILITY: title-block-only print", () => {
    const result = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
      program_content: PROGRAM_SAMPLE,
      print_extraction: { title_block: { part_no: "X-001", customer: "JM Die" } },
      join_confidence: 0.85,
    });
    expect(result.input).toMatch(/TITLE BLOCK:/);
    expect(result.input).toMatch(/part_no: X-001/);
  });

  it("VARIABILITY: raw_text-only print (OCR couldn't structure anything)", () => {
    const result = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
      program_content: PROGRAM_SAMPLE,
      print_extraction: { raw_text: "PART NO 12345\nMAT A2 HRC 60\n0.500 ±.001 OD" },
      join_confidence: 0.85,
    });
    expect(result.meta.has_print).toBe(true);
    expect(result.input).toMatch(/PART NO 12345/);
  });

  it("VARIABILITY: structured + raw_text — both included when budget allows", () => {
    const result = wedmPrintProgramAlpacaAugmenterEngine.augmentAlpacaPair({
      program_content: PROGRAM_SAMPLE,
      print_extraction: {
        material: "D2 Tool Steel",
        raw_text: "ADDITIONAL NOTES: heat treat after WEDM",
      },
      join_confidence: 0.9,
      max_print_context_chars: 4096,
    });
    expect(result.input).toMatch(/MATERIAL: D2 Tool Steel/);
    expect(result.input).toMatch(/ADDITIONAL NOTES/);
  });
});

// ============================================================================
// BATCH STATS
// ============================================================================

describe("WEDMPrintProgramAlpacaAugmenterEngine.augmentBatch", () => {
  it("BATCH HAPPY: mixed inputs produce correct stats", () => {
    const inputs: AugmentInput[] = [
      // 2 fully matched
      { program_content: PROGRAM_SAMPLE, print_extraction: FULL_PRINT, join_confidence: 0.95 },
      { program_content: PROGRAM_SAMPLE, print_extraction: FULL_PRINT, join_confidence: 0.7 },
      // 1 no print → program-only
      { program_content: PROGRAM_SAMPLE },
      // 1 below floor → program-only fallback
      { program_content: PROGRAM_SAMPLE, print_extraction: FULL_PRINT, join_confidence: 0.2, confidence_floor: 0.5 },
    ];
    const { augmented, stats } = wedmPrintProgramAlpacaAugmenterEngine.augmentBatch(inputs);
    expect(stats.total_input).toBe(4);
    expect(stats.total_emitted).toBe(4);
    expect(stats.total_skipped).toBe(0);
    expect(stats.with_print_context).toBe(2);
    expect(stats.program_only_fallback).toBe(2);
    expect(stats.by_tier.exact).toBe(1);
    expect(stats.by_tier.loose).toBe(1);
    expect(stats.by_tier.none).toBe(2);
    expect(augmented).toHaveLength(4);
  });

  it("BATCH SKIP: skip-mode counts skipped + reasons", () => {
    const inputs: AugmentInput[] = [
      { program_content: PROGRAM_SAMPLE, emit_program_only_below: false },
      { program_content: PROGRAM_SAMPLE, emit_program_only_below: false, print_extraction: {} },
      { program_content: PROGRAM_SAMPLE, emit_program_only_below: false, print_extraction: FULL_PRINT, join_confidence: 0.1 },
    ];
    const { augmented, stats } = wedmPrintProgramAlpacaAugmenterEngine.augmentBatch(inputs);
    expect(stats.total_skipped).toBe(3);
    expect(stats.total_emitted).toBe(0);
    expect(stats.reasons.no_print_attached).toBe(1);
    expect(stats.reasons.print_ocr_empty).toBe(1);
    expect(stats.reasons.below_confidence_floor).toBe(1);
    expect(augmented).toHaveLength(0); // skipped excluded by default
  });

  it("BATCH SKIP: include_skipped=true keeps skipped pairs for audit", () => {
    const inputs: AugmentInput[] = [
      { program_content: PROGRAM_SAMPLE, print_extraction: FULL_PRINT, join_confidence: 0.95 },
      { program_content: PROGRAM_SAMPLE, emit_program_only_below: false },
    ];
    const { augmented } = wedmPrintProgramAlpacaAugmenterEngine.augmentBatch(inputs, { include_skipped: true });
    expect(augmented).toHaveLength(2);
    expect(augmented[1].meta.skipped).toBe(true);
  });

  it("BATCH FAILURE: non-array input throws", () => {
    expect(() =>
      wedmPrintProgramAlpacaAugmenterEngine.augmentBatch({} as unknown as AugmentInput[]),
    ).toThrow(/array/i);
  });

  it("BATCH FAILURE: invalid input inside the batch propagates", () => {
    expect(() =>
      wedmPrintProgramAlpacaAugmenterEngine.augmentBatch([
        { program_content: PROGRAM_SAMPLE },
        { program_content: "" }, // invalid
      ] as AugmentInput[]),
    ).toThrow(/non-empty/i);
  });
});
