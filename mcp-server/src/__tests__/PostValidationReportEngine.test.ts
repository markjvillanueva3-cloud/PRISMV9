/**
 * PostValidationReportEngine.test.ts
 *
 * Reference-value + algebraic-invariant coverage for the post-validation
 * report generator (ECHO-ULTIMATE-ROADMAP Track A priority).
 *
 * Tests encode WHY each behaviour matters (R9), not incidental output:
 *   - text format: blocking issues surface with line numbers + suggestions
 *   - json format: round-trips all flags and machine capabilities
 *   - detailed format: per-block flag lines include actual/limit values
 *   - verdict building: worst_severity escalation and deduplication
 *   - summary_only action: forces text format with no recommendations
 *   - warnings: inconsistent (failed + zero flags) validation is flagged
 *   - edge cases: empty flags, all-INFO, multi-dimension mix, no machine
 *   - adversarial: unknown action throws, flag ordering is preserved
 */

import { describe, it, expect } from "vitest";
import {
  postValidationReportEngine,
  type ReportInput,
  type ReportResult,
} from "../engines/PostValidationReportEngine.js";
import type {
  ValidationResult,
  ValidationFlag,
} from "../engines/PostValidationHardeningEngine.js";
import type { MachineContext } from "../engines/PostProcessorPipelineEngine.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** A minimal passing validation with no flags. */
function passingValidation(): ValidationResult {
  return {
    flags: [],
    summary: {
      passed: true,
      block_count: 0,
      warn_count: 0,
      info_count: 0,
      by_dimension: {},
      lines_checked: 120,
      lines_flagged: 0,
      machine_id: "VMC-01",
      machine_name: "Haas VF-2",
    },
    warnings: [],
  };
}

/** A BLOCK-level spindle_rpm flag. */
function blockRpmFlag(line = 45): ValidationFlag {
  return {
    line,
    text: "S12000",
    severity: "BLOCK",
    dimension: "spindle_rpm",
    message: "Spindle RPM 12000 exceeds machine max 8000",
    actual: 12000,
    limit: 8000,
    suggestion: "Reduce S12000 to S8000",
  };
}

/** A WARN-level feed_rate flag. */
function warnFeedFlag(line = 12): ValidationFlag {
  return {
    line,
    text: "F8000",
    severity: "WARN",
    dimension: "feed_rate",
    message: "Feed rate 8000 mm/min near rapid limit 10000",
    actual: 8000,
    limit: 10000,
    suggestion: "Check program units (mm vs inch) -- F values may need unit conversion",
  };
}

/** An INFO-level coolant flag. */
function infoCoolantFlag(line = 99): ValidationFlag {
  return {
    line,
    text: "M8 (TSC)",
    severity: "INFO",
    dimension: "coolant",
    message: "TSC requested; machine supports flood only",
    actual: "tsc",
    limit: "flood",
  };
}

/** Failing validation built from an explicit flag list. */
function failingValidation(flags: ValidationFlag[] = [blockRpmFlag()]): ValidationResult {
  const blockCount = flags.filter(f => f.severity === "BLOCK").length;
  const warnCount  = flags.filter(f => f.severity === "WARN").length;
  const infoCount  = flags.filter(f => f.severity === "INFO").length;
  return {
    flags,
    summary: {
      passed: false,
      block_count: blockCount,
      warn_count: warnCount,
      info_count: infoCount,
      by_dimension: {},
      lines_checked: 200,
      lines_flagged: flags.length,
      machine_id: "VMC-01",
      machine_name: "Haas VF-2",
    },
    warnings: [],
  };
}

/** Minimal MachineContext for capability tests. */
function testMachine(): MachineContext {
  return {
    id: "VMC-01",
    name: "Haas VF-2",
    brand: "Haas",
    controller: "haas",
    max_rpm: 8000,
    max_power_kW: 14.9,
    rapid_rate_mm_min: { x: 25400, y: 25400, z: 25400 },
    work_volume: { x: 762, y: 406, z: 508 },
    axes: 3,
    atc_capacity: 20,
    coolant_types: ["flood", "mist"],
    resolution_confidence: 1.0,
  };
}

/** Parse JSON content from a json-format result. */
function parseJsonContent(result: ReportResult): Record<string, unknown> {
  return JSON.parse(result.content) as Record<string, unknown>;
}

// ─── Exported symbols ─────────────────────────────────────────────────────────

describe("PostValidationReportEngine -- exported symbols", () => {
  it("exports a singleton with a process() method", () => {
    expect(typeof postValidationReportEngine.process).toBe("function");
  });
});

// ─── Happy path: passing validation, text format ──────────────────────────────

describe("PostValidationReportEngine -- text format, passing validation", () => {
  it("reports PASSED in the header line", async () => {
    const input: ReportInput = {
      action: "generate_report",
      validation: passingValidation(),
      format: "text",
      program_name: "O1234",
    };
    const result = await postValidationReportEngine.process(input);
    expect(result.passed).toBe(true);
    expect(result.content).toContain("Result: PASSED");
  });

  it("includes program name in the text header when provided", async () => {
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: passingValidation(),
      format: "text",
      program_name: "O9001",
    });
    expect(result.content).toContain("Program: O9001");
  });

  it("includes machine name and brand in the text header when machine is provided", async () => {
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: passingValidation(),
      machine: testMachine(),
      format: "text",
    });
    expect(result.content).toContain("Machine: Haas VF-2 (Haas)");
  });

  it("verdicts array is empty when there are no flags", async () => {
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: passingValidation(),
      format: "text",
    });
    expect(result.verdicts).toHaveLength(0);
    expect(result.metadata.total_flags).toBe(0);
  });

  it("metadata format field matches requested format", async () => {
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: passingValidation(),
      format: "text",
    });
    expect(result.metadata.format).toBe("text");
  });
});

// ─── Happy path: failing validation, text format ─────────────────────────────

describe("PostValidationReportEngine -- text format, failing validation", () => {
  it("reports FAILED in the header line", async () => {
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: failingValidation(),
      format: "text",
    });
    expect(result.passed).toBe(false);
    expect(result.content).toContain("Result: FAILED");
  });

  it("reports block/warn/info counts in the header", async () => {
    const flags = [blockRpmFlag(), warnFeedFlag(), infoCoolantFlag()];
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: failingValidation(flags),
      format: "text",
    });
    // text header: "Flags: 1 BLOCK / 1 WARN / 1 INFO"
    expect(result.content).toContain("1 BLOCK / 1 WARN / 1 INFO");
  });

  it("BLOCKING ISSUES section appears with the flagged line number", async () => {
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: failingValidation([blockRpmFlag(45)]),
      format: "text",
    });
    expect(result.content).toContain("BLOCKING ISSUES (must fix before running)");
    expect(result.content).toContain("Line 45:");
  });

  it("suggestion appears under the block flag prefixed with ->", async () => {
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: failingValidation([blockRpmFlag()]),
      format: "text",
    });
    expect(result.content).toContain("-> Reduce S12000 to S8000");
  });

  it("WARN-only flags do NOT produce a BLOCKING ISSUES section", async () => {
    const warnOnlyVal: ValidationResult = {
      flags: [warnFeedFlag()],
      summary: {
        passed: true,
        block_count: 0,
        warn_count: 1,
        info_count: 0,
        by_dimension: {},
        lines_checked: 50,
        lines_flagged: 1,
        machine_id: "VMC-01",
        machine_name: "Haas VF-2",
      },
      warnings: [],
    };
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: warnOnlyVal,
      format: "text",
    });
    expect(result.content).not.toContain("BLOCKING ISSUES");
  });
});

// ─── Verdict building ─────────────────────────────────────────────────────────

describe("PostValidationReportEngine -- verdict building", () => {
  it("verdict.passed is false only for the dimension with a BLOCK flag", async () => {
    const flags = [blockRpmFlag(), warnFeedFlag()];
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: failingValidation(flags),
      format: "text",
    });
    const rpmVerdict = result.verdicts.find(v => v.dimension === "spindle_rpm");
    const feedVerdict = result.verdicts.find(v => v.dimension === "feed_rate");
    // Both must be present -- concrete existence check
    expect(rpmVerdict?.dimension).toBe("spindle_rpm");
    expect(feedVerdict?.dimension).toBe("feed_rate");
    expect(rpmVerdict?.passed).toBe(false);
    expect(feedVerdict?.passed).toBe(true); // WARN does not fail a verdict
  });

  it("worst_severity escalates INFO -> WARN -> BLOCK within one dimension", async () => {
    // Three flags in the same coolant dimension with escalating severity
    const mixedFlags: ValidationFlag[] = [
      infoCoolantFlag(1),
      { ...infoCoolantFlag(2), severity: "WARN" },
      { ...infoCoolantFlag(3), severity: "BLOCK" },
    ];
    const val: ValidationResult = {
      flags: mixedFlags,
      summary: {
        passed: false,
        block_count: 1,
        warn_count: 1,
        info_count: 1,
        by_dimension: {},
        lines_checked: 10,
        lines_flagged: 3,
        machine_id: "VMC-01",
        machine_name: "Haas VF-2",
      },
      warnings: [],
    };
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: val,
      format: "text",
    });
    const verdict = result.verdicts.find(v => v.dimension === "coolant");
    expect(verdict?.dimension).toBe("coolant");
    expect(verdict?.worst_severity).toBe("BLOCK");
    expect(verdict?.block_count).toBe(1);
    expect(verdict?.warn_count).toBe(1);
    expect(verdict?.info_count).toBe(1);
  });

  it("duplicate suggestions are deduplicated to a single recommendation entry", async () => {
    const dupFlags: ValidationFlag[] = [
      { ...blockRpmFlag(10), suggestion: "Reduce max RPM" },
      { ...blockRpmFlag(20), suggestion: "Reduce max RPM" }, // exact duplicate
    ];
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: failingValidation(dupFlags),
      format: "text",
      include_recommendations: true,
    });
    const verdict = result.verdicts.find(v => v.dimension === "spindle_rpm");
    expect(verdict?.dimension).toBe("spindle_rpm");
    const recs = verdict?.recommendations ?? [];
    // "Reduce max RPM" must appear exactly once after deduplication
    expect(recs.filter(r => r === "Reduce max RPM")).toHaveLength(1);
  });

  it("getDimensionRemediation appends spindle_rpm fix referencing actual and limit values", async () => {
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: failingValidation([blockRpmFlag()]),
      format: "text",
      include_recommendations: true,
    });
    const verdict = result.verdicts.find(v => v.dimension === "spindle_rpm");
    expect(verdict?.dimension).toBe("spindle_rpm");
    // Engine builds: "Reduce max RPM from 12000 to at most 8000"
    const hasRpmRec = (verdict?.recommendations ?? []).some(
      r => r.includes("12000") && r.includes("8000"),
    );
    expect(hasRpmRec).toBe(true);
  });

  it("include_recommendations:false produces an empty recommendations array", async () => {
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: failingValidation(),
      format: "text",
      include_recommendations: false,
    });
    expect(result.verdicts[0]?.recommendations).toHaveLength(0);
  });
});

// ─── JSON format ──────────────────────────────────────────────────────────────

describe("PostValidationReportEngine -- json format", () => {
  it("content is valid parseable JSON", async () => {
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: failingValidation(),
      format: "json",
    });
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("JSON passed field matches summary.passed", async () => {
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: failingValidation(),
      format: "json",
    });
    const parsed = parseJsonContent(result);
    expect(parsed.passed).toBe(false);
  });

  it("JSON machine_capabilities includes canonical machine fields when machine is provided", async () => {
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: passingValidation(),
      machine: testMachine(),
      format: "json",
    });
    const parsed = parseJsonContent(result);
    const caps = parsed.machine_capabilities as Record<string, unknown>;
    expect(caps.id).toBe("VMC-01");
    expect(caps.max_rpm).toBe(8000);
    expect(caps.axes).toBe(3);
    expect(caps.atc_capacity).toBe(20);
  });

  it("JSON machine_capabilities key is absent when no machine is provided", async () => {
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: passingValidation(),
      format: "json",
    });
    const parsed = parseJsonContent(result);
    // key must be completely absent (undefined), not null
    expect(Object.prototype.hasOwnProperty.call(parsed, "machine_capabilities")).toBe(false);
  });

  it("JSON flags array length equals metadata.total_flags", async () => {
    const flags = [blockRpmFlag(), warnFeedFlag(), infoCoolantFlag()];
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: failingValidation(flags),
      format: "json",
    });
    const parsed = parseJsonContent(result);
    const parsedFlags = parsed.flags as unknown[];
    expect(parsedFlags).toHaveLength(3);
    expect(result.metadata.total_flags).toBe(3);
  });

  it("machine_id and machine_name in metadata come from validation summary when no machine provided", async () => {
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: passingValidation(),
      format: "json",
    });
    expect(result.metadata.machine_id).toBe("VMC-01");
    expect(result.metadata.machine_name).toBe("Haas VF-2");
  });

  it("machine from ReportInput overrides summary machine fields in metadata", async () => {
    const overrideMachine: MachineContext = {
      ...testMachine(),
      id: "VMC-OVERRIDE",
      name: "Override Mill",
    };
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: passingValidation(),
      machine: overrideMachine,
      format: "json",
    });
    expect(result.metadata.machine_id).toBe("VMC-OVERRIDE");
    expect(result.metadata.machine_name).toBe("Override Mill");
  });
});

// ─── Detailed format ──────────────────────────────────────────────────────────

describe("PostValidationReportEngine -- detailed format", () => {
  it("detailed header uses 72-char separator; text header uses 60-char separator", async () => {
    const [detResult, txtResult] = await Promise.all([
      postValidationReportEngine.process({
        action: "generate_report",
        validation: passingValidation(),
        format: "detailed",
      }),
      postValidationReportEngine.process({
        action: "generate_report",
        validation: passingValidation(),
        format: "text",
      }),
    ]);
    expect(detResult.content).toContain("=".repeat(72));
    expect(txtResult.content).toContain("=".repeat(60));
    // text must NOT contain the wider separator
    expect(txtResult.content).not.toContain("=".repeat(72));
  });

  it("detailed format includes lines_checked and lines_flagged statistics", async () => {
    const val = failingValidation([blockRpmFlag()]);
    val.summary.lines_checked = 350;
    val.summary.lines_flagged = 1;
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: val,
      format: "detailed",
    });
    expect(result.content).toContain("Lines checked: 350");
    expect(result.content).toContain("Lines flagged: 1");
  });

  it("detailed format includes controller and max RPM/power from machine context", async () => {
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: passingValidation(),
      machine: testMachine(),
      format: "detailed",
    });
    expect(result.content).toContain("Controller: haas");
    expect(result.content).toContain("Max RPM: 8000");
    expect(result.content).toContain("14.9 kW");
  });

  it("detailed format shows [FAIL] icon and actual/limit values for BLOCK flags", async () => {
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: failingValidation([blockRpmFlag(45)]),
      format: "detailed",
    });
    expect(result.content).toContain("[FAIL]");
    expect(result.content).toContain("Actual: 12000");
    expect(result.content).toContain("Limit: 8000");
    expect(result.content).toContain("Line 45:");
  });

  it("detailed format shows [WARN] icon and line number for WARN flags", async () => {
    const warnVal: ValidationResult = {
      flags: [warnFeedFlag(12)],
      summary: {
        passed: true,
        block_count: 0,
        warn_count: 1,
        info_count: 0,
        by_dimension: {},
        lines_checked: 50,
        lines_flagged: 1,
        machine_id: "VMC-01",
        machine_name: "Haas VF-2",
      },
      warnings: [],
    };
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: warnVal,
      format: "detailed",
    });
    expect(result.content).toContain("[WARN]");
    expect(result.content).toContain("Line 12:");
  });
});

// ─── summary_only action ──────────────────────────────────────────────────────

describe("PostValidationReportEngine -- summary_only action", () => {
  it("summary_only forces text format regardless of the format field", async () => {
    const result = await postValidationReportEngine.process({
      action: "summary_only",
      validation: failingValidation(),
      format: "json", // must be overridden to text
    });
    // text format uses 60-char separator; JSON output would start with '{'
    expect(result.content.startsWith("{")).toBe(false);
    expect(result.content).toContain("=".repeat(60));
    expect(result.metadata.format).toBe("text");
  });

  it("summary_only forces include_recommendations:false", async () => {
    const result = await postValidationReportEngine.process({
      action: "summary_only",
      validation: failingValidation([blockRpmFlag()]),
      include_recommendations: true, // must be overridden to false
    });
    expect(result.verdicts[0]?.recommendations).toHaveLength(0);
  });

  it("summary_only reflects overall pass/fail correctly for both states", async () => {
    const [passResult, failResult] = await Promise.all([
      postValidationReportEngine.process({ action: "summary_only", validation: passingValidation() }),
      postValidationReportEngine.process({ action: "summary_only", validation: failingValidation() }),
    ]);
    expect(passResult.passed).toBe(true);
    expect(failResult.passed).toBe(false);
  });
});

// ─── Warnings generation ──────────────────────────────────────────────────────

describe("PostValidationReportEngine -- warnings generation", () => {
  it("warns when validation reports failure but has zero flags (upstream error signal)", async () => {
    const inconsistentVal: ValidationResult = {
      flags: [],
      summary: {
        passed: false, // failed with no flags -- upstream engine error
        block_count: 0,
        warn_count: 0,
        info_count: 0,
        by_dimension: {},
        lines_checked: 10,
        lines_flagged: 0,
        machine_id: "VMC-01",
        machine_name: "Haas VF-2",
      },
      warnings: [],
    };
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: inconsistentVal,
      format: "text",
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("possible upstream error");
  });

  it("no warning emitted for a passing validation with zero flags", async () => {
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: passingValidation(),
      format: "text",
    });
    expect(result.warnings).toHaveLength(0);
  });
});

// ─── Failure modes ────────────────────────────────────────────────────────────

describe("PostValidationReportEngine -- failure modes", () => {
  it("[failure] throws with descriptive message on unknown action", async () => {
    await expect(
      postValidationReportEngine.process({
        action: "unknown_action" as "generate_report",
        validation: passingValidation(),
      }),
    ).rejects.toThrow("Unknown action");
  });

  it("[failure] axis_travel dimension gets WCS + fixture remediation", async () => {
    const travelFlag: ValidationFlag = {
      line: 88,
      text: "X900",
      severity: "BLOCK",
      dimension: "axis_travel",
      message: "X axis 900 mm exceeds envelope 762 mm",
      actual: 900,
      limit: 762,
    };
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: failingValidation([travelFlag]),
      format: "text",
      include_recommendations: true,
    });
    const verdict = result.verdicts.find(v => v.dimension === "axis_travel");
    expect(verdict?.dimension).toBe("axis_travel");
    const recs = (verdict?.recommendations ?? []).join(" ");
    expect(recs).toContain("WCS");
    expect(recs).toContain("fixture");
  });

  it("[failure] tool_capacity BLOCK flag gets multi-setup remediation", async () => {
    const capFlag: ValidationFlag = {
      line: 5,
      text: "T25 M6",
      severity: "BLOCK",
      dimension: "tool_capacity",
      message: "Tool 25 exceeds ATC capacity 20",
      actual: 25,
      limit: 20,
    };
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: failingValidation([capFlag]),
      format: "text",
      include_recommendations: true,
    });
    const verdict = result.verdicts.find(v => v.dimension === "tool_capacity");
    expect(verdict?.dimension).toBe("tool_capacity");
    const recs = (verdict?.recommendations ?? []).join(" ");
    expect(recs).toContain("multiple setups");
  });

  it("[failure] feed_rate BLOCK flag gets unit-conversion remediation", async () => {
    const blockFeedFlag: ValidationFlag = { ...warnFeedFlag(), severity: "BLOCK" };
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: failingValidation([blockFeedFlag]),
      format: "text",
      include_recommendations: true,
    });
    const verdict = result.verdicts.find(v => v.dimension === "feed_rate");
    expect(verdict?.dimension).toBe("feed_rate");
    const recs = (verdict?.recommendations ?? []).join(" ");
    expect(recs).toContain("mm vs inch");
  });
});

// ─── Adversarial inputs ───────────────────────────────────────────────────────

describe("PostValidationReportEngine -- adversarial inputs", () => {
  it("[adversarial] dimensions in verdicts are sorted alphabetically regardless of flag insertion order", async () => {
    // Flags inserted in reverse-alphabetical order
    const flags: ValidationFlag[] = [
      { ...blockRpmFlag(1), dimension: "spindle_rpm" },
      { ...infoCoolantFlag(2), dimension: "coolant" },
      { ...warnFeedFlag(3), dimension: "feed_rate" },
    ];
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: failingValidation(flags),
      format: "text",
    });
    const dims = result.verdicts.map(v => v.dimension);
    // sorted: coolant, feed_rate, spindle_rpm
    expect(dims).toEqual(["coolant", "feed_rate", "spindle_rpm"]);
  });

  it("[adversarial] extremely high RPM BLOCK is reported without NaN or Infinity in recommendations", async () => {
    const extremeFlag: ValidationFlag = {
      line: 1,
      text: "S999999",
      severity: "BLOCK",
      dimension: "spindle_rpm",
      message: "Spindle RPM 999999 exceeds machine max 8000",
      actual: 999999,
      limit: 8000,
      suggestion: "Reduce S999999 to S8000",
    };
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: failingValidation([extremeFlag]),
      format: "text",
      include_recommendations: true,
    });
    expect(result.passed).toBe(false);
    expect(result.content).toContain("999999");
    // getDimensionRemediation builds the string from actual/limit -- must be finite
    const verdict = result.verdicts[0];
    expect(verdict?.dimension).toBe("spindle_rpm");
    const badRec = (verdict?.recommendations ?? []).some(
      r => r.includes("NaN") || r.includes("Infinity"),
    );
    expect(badRec).toBe(false);
  });

  it("[adversarial] program_name propagates into both result metadata and JSON content", async () => {
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: passingValidation(),
      format: "json",
      program_name: "O99-SPECIAL",
    });
    expect(result.metadata.program_name).toBe("O99-SPECIAL");
    const parsed = parseJsonContent(result);
    const meta = parsed.metadata as Record<string, unknown>;
    expect(meta.program_name).toBe("O99-SPECIAL");
  });
});

// ─── Algebraic invariants ─────────────────────────────────────────────────────

describe("PostValidationReportEngine -- algebraic invariants", () => {
  it("number of verdicts equals number of distinct flag dimensions", async () => {
    const flags: ValidationFlag[] = [
      blockRpmFlag(1),
      blockRpmFlag(2), // same dimension -- collapses into ONE verdict
      warnFeedFlag(3),
    ];
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: failingValidation(flags),
      format: "text",
    });
    // 2 distinct dimensions: spindle_rpm, feed_rate
    expect(result.verdicts).toHaveLength(2);
  });

  it("sum of verdict block+warn+info equals total flags within each dimension", async () => {
    const flags: ValidationFlag[] = [
      { ...blockRpmFlag(1), severity: "BLOCK" },
      { ...blockRpmFlag(2), severity: "WARN" },
      { ...blockRpmFlag(3), severity: "INFO" },
    ];
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: failingValidation(flags),
      format: "text",
    });
    const v = result.verdicts.find(x => x.dimension === "spindle_rpm");
    expect(v?.dimension).toBe("spindle_rpm");
    expect((v!.block_count + v!.warn_count + v!.info_count)).toBe(3);
  });

  it("result.passed always equals summary.passed (identity invariant)", async () => {
    for (const v of [passingValidation(), failingValidation()]) {
      // sequential to avoid concurrent shared-state risk
      // eslint-disable-next-line no-await-in-loop
      const result = await postValidationReportEngine.process({
        action: "generate_report",
        validation: v,
        format: "text",
      });
      expect(result.passed).toBe(v.summary.passed);
    }
  });

  it("metadata.total_flags exactly equals flags.length from the input", async () => {
    const flags = [blockRpmFlag(), warnFeedFlag(), infoCoolantFlag()];
    const result = await postValidationReportEngine.process({
      action: "generate_report",
      validation: failingValidation(flags),
      format: "text",
    });
    expect(result.metadata.total_flags).toBe(flags.length);
    expect(result.metadata.total_flags).toBe(3);
  });
});
