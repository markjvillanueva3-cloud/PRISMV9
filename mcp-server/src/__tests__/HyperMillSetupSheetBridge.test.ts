/**
 * HyperMillSetupSheetBridge.test.ts
 *
 * Coverage for HM-REV-MS10 / U-HMR55 setup sheet generation +
 * U-HMR51-53 quality gate logic. Validates tool de-duplication,
 * cycle-type collection, WCS resolution, quality checkpoint routing
 * (critical → CMM, toleranced → gauge, none → visual), safety note
 * derivation, and the 8-state quality gate matrix.
 *
 * CAM-EXHAUST-MS0 / U-CAM-HM-SETUPSHEET-TESTS-01
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillSetupSheetBridge,
  hyperMillSetupSheetBridge,
  type HyperMillSetupSheetInput,
  type HyperMillOperation,
  type HyperMillFixture,
} from "../engines/HyperMillSetupSheetBridge.js";

const ENGINE = new HyperMillSetupSheetBridge();

// Named constants (extracted from inline test data per hook guidance)
const QUALITY_DOC_COUNT = 3; // setup sheet + FAI + SPC
const DEFAULT_TOOL_DIAMETER_MM = 10;
const DEFAULT_FLUTE_COUNT = 4;
const ADVERSARIAL_OP_COUNT = 100;
const ADVERSARIAL_TOOL_COUNT = 20;
const SHARED_TOOL_OP_COUNT = 10;
const SHARED_TOOL_NUMBER = 99;
const SAMPLE_RPM_LOW = 6000;
const SAMPLE_RPM_HIGH = 18000;
const SAMPLE_RPM_MID = 12000;
const SAMPLE_FEED_MMPM = 1500;
const DEFAULT_SPEED_RPM = 8000;

// ── Test data factory ────────────────────────────────────────────────────────

function op(over: Partial<HyperMillOperation> & { operation_id: string; tool_number: number }): HyperMillOperation {
  return {
    operation_id: over.operation_id,
    operation_name: over.operation_name ?? `op-${over.operation_id}`,
    cycle_type: over.cycle_type,
    tool_number: over.tool_number,
    tool_description: over.tool_description ?? `T${over.tool_number} ${DEFAULT_TOOL_DIAMETER_MM}mm endmill`,
    feature_type: over.feature_type,
    nominal_dimension_mm: over.nominal_dimension_mm,
    tolerance_plus_mm: over.tolerance_plus_mm,
    tolerance_minus_mm: over.tolerance_minus_mm,
    is_critical: over.is_critical,
    speed_rpm: over.speed_rpm ?? DEFAULT_SPEED_RPM,
    feed_mmpm: over.feed_mmpm ?? SAMPLE_FEED_MMPM,
    ap_mm: over.ap_mm,
    ae_mm: over.ae_mm,
    coolant: over.coolant,
  };
}

function input(over: Partial<HyperMillSetupSheetInput> & { job_id: string; part_number: string; operations: HyperMillOperation[] }): HyperMillSetupSheetInput {
  return {
    job_id: over.job_id,
    part_number: over.part_number,
    part_description: over.part_description,
    material: over.material ?? "4140_steel",
    machine: over.machine ?? "Hurco-VM30i",
    controller_model: over.controller_model,
    post_processor: over.post_processor,
    ac_script_refs: over.ac_script_refs,
    programmer: over.programmer,
    program_number: over.program_number,
    operations: over.operations,
    fixture: over.fixture,
    format: over.format,
    include_quality_checkpoints: over.include_quality_checkpoints,
    include_safety_notes: over.include_safety_notes,
  };
}

// ── Tool de-duplication ──────────────────────────────────────────────────────

describe("HyperMillSetupSheetBridge — tool list de-duplication", () => {
  it("two ops sharing tool_number produce one tool entry with both ops listed", () => {
    const r = ENGINE.generate(input({
      job_id: "J1", part_number: "P-001",
      operations: [
        op({ operation_id: "OP10", tool_number: 1, tool_description: "T1 10mm endmill" }),
        op({ operation_id: "OP20", tool_number: 1, tool_description: "T1 10mm endmill" }),
      ],
    }));
    expect(r.tool_count).toBe(1);
    expect(r.tools.length).toBe(1);
    expect(r.tools[0].used_in_ops).toEqual(["OP10", "OP20"]);
  });

  it("three distinct tool_numbers produce three tool entries", () => {
    const r = ENGINE.generate(input({
      job_id: "J2", part_number: "P-002",
      operations: [
        op({ operation_id: "OP10", tool_number: 1 }),
        op({ operation_id: "OP20", tool_number: 2 }),
        op({ operation_id: "OP30", tool_number: 3 }),
      ],
    }));
    expect(r.tool_count).toBe(3);
    const numbers = r.tools.map(t => t.tool_number).sort();
    expect(numbers).toEqual([1, 2, 3]);
  });

  it("first occurrence wins for tool_description on duplicate tool_number", () => {
    const FIRST_DESC = "T5 first description";
    const SECOND_DESC = "T5 second description";
    const r = ENGINE.generate(input({
      job_id: "J3", part_number: "P-003",
      operations: [
        op({ operation_id: "OP10", tool_number: 5, tool_description: FIRST_DESC }),
        op({ operation_id: "OP20", tool_number: 5, tool_description: SECOND_DESC }),
      ],
    }));
    const t5 = r.tools.find(t => t.tool_number === 5)!;
    expect(t5.description).toBe(FIRST_DESC);
  });

  it("operation_count matches input length even when tools are de-duplicated", () => {
    const r = ENGINE.generate(input({
      job_id: "J4", part_number: "P-004",
      operations: [
        op({ operation_id: "OP10", tool_number: 1 }),
        op({ operation_id: "OP20", tool_number: 1 }),
        op({ operation_id: "OP30", tool_number: 1 }),
      ],
    }));
    expect(r.tool_count).toBe(1);
    expect(r.operation_count).toBe(3);
  });
});

// ── Cycle type collection ────────────────────────────────────────────────────

describe("HyperMillSetupSheetBridge — cycle type collection", () => {
  it("collects unique cycle types across operations (de-dups roughing)", () => {
    const r = ENGINE.generate(input({
      job_id: "J5", part_number: "P-005",
      operations: [
        op({ operation_id: "OP10", tool_number: 1, cycle_type: "roughing" }),
        op({ operation_id: "OP20", tool_number: 2, cycle_type: "finishing" }),
        op({ operation_id: "OP30", tool_number: 3, cycle_type: "roughing" }),
      ],
    }));
    expect(r.hypermill_metadata.cycle_types.sort()).toEqual(["finishing", "roughing"]);
  });

  it("missing cycle_type defaults to 'standard' in hypermill_metadata", () => {
    const r = ENGINE.generate(input({
      job_id: "J6", part_number: "P-006",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
    }));
    expect(r.hypermill_metadata.cycle_types).toEqual(["standard"]);
  });

  it("operation summary cycle_type defaults to 'standard' when undefined on input", () => {
    const r = ENGINE.generate(input({
      job_id: "J7", part_number: "P-007",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
    }));
    expect(r.operations[0].cycle_type).toBe("standard");
  });
});

// ── WCS summary ──────────────────────────────────────────────────────────────

describe("HyperMillSetupSheetBridge — WCS summary", () => {
  it("absent fixture defaults WCS to G54 origin (0,0,0)", () => {
    const r = ENGINE.generate(input({
      job_id: "J8", part_number: "P-008",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
    }));
    expect(r.wcs_summary).toEqual({
      offset_designation: "G54",
      datum_x_mm: 0,
      datum_y_mm: 0,
      datum_z_mm: 0,
    });
  });

  it("explicit fixture WCS offset propagates to summary verbatim", () => {
    const fixture: HyperMillFixture = {
      description: "Kurt 6\" vise",
      wcs_offset: "G55",
      datum_x_mm: 100,
      datum_y_mm: 50,
      datum_z_mm: -25,
    };
    const r = ENGINE.generate(input({
      job_id: "J9", part_number: "P-009",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
      fixture,
    }));
    expect(r.wcs_summary).toEqual({
      offset_designation: "G55",
      datum_x_mm: 100,
      datum_y_mm: 50,
      datum_z_mm: -25,
    });
  });

  it("partial fixture (offset only) defaults missing datums to zero", () => {
    const r = ENGINE.generate(input({
      job_id: "J10", part_number: "P-010",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
      fixture: { description: "Vacuum chuck", wcs_offset: "G59" },
    }));
    expect(r.wcs_summary).toEqual({
      offset_designation: "G59",
      datum_x_mm: 0,
      datum_y_mm: 0,
      datum_z_mm: 0,
    });
  });

  it("fixture present without wcs_offset still defaults to G54", () => {
    const r = ENGINE.generate(input({
      job_id: "J11", part_number: "P-011",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
      fixture: { description: "Custom fixture" },
    }));
    expect(r.wcs_summary.offset_designation).toBe("G54");
  });
});

// ── Quality checkpoints ──────────────────────────────────────────────────────

describe("HyperMillSetupSheetBridge — quality checkpoint routing", () => {
  it("critical operation generates CMM checkpoint mentioning tolerance + 'critical'", () => {
    const r = ENGINE.generate(input({
      job_id: "J12", part_number: "P-012",
      operations: [op({
        operation_id: "OP10", tool_number: 1,
        is_critical: true,
        nominal_dimension_mm: 25.0,
        tolerance_plus_mm: 0.01,
        tolerance_minus_mm: 0.01,
      })],
    }));
    const cp = r.quality_checkpoints[0];
    expect(cp.is_critical).toBe(true);
    expect(cp.checkpoint).toContain("CMM");
    expect(cp.checkpoint).toContain("critical");
    expect(cp.checkpoint).toContain("25");
  });

  it("non-critical toleranced operation routes to gauge check (not CMM)", () => {
    const r = ENGINE.generate(input({
      job_id: "J13", part_number: "P-013",
      operations: [op({
        operation_id: "OP10", tool_number: 1,
        nominal_dimension_mm: 12.7,
        tolerance_plus_mm: 0.05,
      })],
    }));
    const cp = r.quality_checkpoints[0];
    expect(cp.is_critical).toBe(false);
    expect(cp.checkpoint).toContain("Gauge");
    expect(cp.checkpoint).not.toContain("CMM");
  });

  it("operation without tolerance routes to visual inspection", () => {
    const r = ENGINE.generate(input({
      job_id: "J14", part_number: "P-014",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
    }));
    const cp = r.quality_checkpoints[0];
    expect(cp.checkpoint).toContain("Visual");
  });

  it("checkpoint count equals operation count when checkpoints enabled", () => {
    const r = ENGINE.generate(input({
      job_id: "J15", part_number: "P-015",
      operations: [
        op({ operation_id: "OP10", tool_number: 1 }),
        op({ operation_id: "OP20", tool_number: 2 }),
        op({ operation_id: "OP30", tool_number: 3 }),
      ],
    }));
    expect(r.quality_checkpoints.length).toBe(3);
  });

  it("include_quality_checkpoints=false yields zero checkpoints", () => {
    const r = ENGINE.generate(input({
      job_id: "J16", part_number: "P-016",
      operations: [op({ operation_id: "OP10", tool_number: 1, is_critical: true })],
      include_quality_checkpoints: false,
    }));
    expect(r.quality_checkpoints).toEqual([]);
  });

  it("checkpoint preserves operation_id and operation_name from source op", () => {
    const r = ENGINE.generate(input({
      job_id: "J17", part_number: "P-017",
      operations: [op({
        operation_id: "OP-FINISH-01",
        operation_name: "finish_pocket_floor",
        tool_number: 7,
      })],
    }));
    expect(r.quality_checkpoints[0].operation_id).toBe("OP-FINISH-01");
    expect(r.quality_checkpoints[0].operation_name).toBe("finish_pocket_floor");
  });
});

// ── Safety notes ─────────────────────────────────────────────────────────────

describe("HyperMillSetupSheetBridge — safety note derivation", () => {
  it("safety notes mention machine and verify E-stop + axis limits", () => {
    const r = ENGINE.generate(input({
      job_id: "J18", part_number: "P-018",
      machine: "Okuma-Multus-B250II",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
    }));
    const machineNote = r.safety_notes.find(n => n.includes("Okuma-Multus-B250II"))!;
    expect(machineNote).toContain("E-stop");
    expect(machineNote).toContain("axis limits");
  });

  it("safety notes mention controller and post processor by name", () => {
    const r = ENGINE.generate(input({
      job_id: "J19", part_number: "P-019",
      controller_model: "OSP-P300SA",
      post_processor: "okuma_b250_post_v3",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
    }));
    const ctrlNote = r.safety_notes.find(n => n.includes("OSP-P300SA"))!;
    expect(ctrlNote).toContain("okuma_b250_post_v3");
  });

  it("WCS safety note quotes the offset designation and 'datum'", () => {
    const r = ENGINE.generate(input({
      job_id: "J20", part_number: "P-020",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
      fixture: { description: "Vise", wcs_offset: "G56" },
    }));
    const wcsNote = r.safety_notes.find(n => n.includes("G56"))!;
    expect(wcsNote).toContain("datum");
  });

  it("fixture description is echoed in safety notes with clamping torque reminder", () => {
    const r = ENGINE.generate(input({
      job_id: "J21", part_number: "P-021",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
      fixture: { description: "Soft jaws — Aluminum 7075" },
    }));
    const fixNote = r.safety_notes.find(n => n.includes("Soft jaws"))!;
    expect(fixNote).toContain("clamping torque");
  });

  it("AC script refs are listed in safety notes with verification reminder", () => {
    const r = ENGINE.generate(input({
      job_id: "J22", part_number: "P-022",
      ac_script_refs: ["probing_macro_v2", "tool_breakage_check"],
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
    }));
    const acNote = r.safety_notes.find(n => n.includes("probing_macro_v2"))!;
    expect(acNote).toContain("tool_breakage_check");
    expect(acNote).toContain("automation");
  });

  it("max spindle RPM in job is reported as the largest value across ops", () => {
    const r = ENGINE.generate(input({
      job_id: "J23", part_number: "P-023",
      operations: [
        op({ operation_id: "OP10", tool_number: 1, speed_rpm: SAMPLE_RPM_LOW }),
        op({ operation_id: "OP20", tool_number: 2, speed_rpm: SAMPLE_RPM_HIGH }),
        op({ operation_id: "OP30", tool_number: 3, speed_rpm: SAMPLE_RPM_MID }),
      ],
    }));
    const rpmNote = r.safety_notes.find(n => n.includes(`${SAMPLE_RPM_HIGH} RPM`))!;
    expect(rpmNote).toContain("Max spindle");
    expect(rpmNote).not.toContain(`${SAMPLE_RPM_LOW} RPM`);
  });

  it("critical-op count surfaces in safety notes with do-not-skip warning", () => {
    const r = ENGINE.generate(input({
      job_id: "J24", part_number: "P-024",
      operations: [
        op({ operation_id: "OP10", tool_number: 1, is_critical: true }),
        op({ operation_id: "OP20", tool_number: 2, is_critical: true }),
        op({ operation_id: "OP30", tool_number: 3, is_critical: false }),
      ],
    }));
    const critNote = r.safety_notes.find(n => n.includes("2 critical"))!;
    expect(critNote).toContain("do NOT skip");
  });

  it("zero critical ops omits the critical-count safety note entirely", () => {
    const r = ENGINE.generate(input({
      job_id: "J25", part_number: "P-025",
      operations: [op({ operation_id: "OP10", tool_number: 1, is_critical: false })],
    }));
    const critNotes = r.safety_notes.filter(n => n.includes("critical characteristic"));
    expect(critNotes).toEqual([]);
  });

  it("include_safety_notes=false yields empty safety_notes array", () => {
    const r = ENGINE.generate(input({
      job_id: "J26", part_number: "P-026",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
      include_safety_notes: false,
    }));
    expect(r.safety_notes).toEqual([]);
  });
});

// ── Operation summary ────────────────────────────────────────────────────────

describe("HyperMillSetupSheetBridge — operation summary", () => {
  it("operation sequence is 1-indexed and preserves input order", () => {
    const r = ENGINE.generate(input({
      job_id: "J27", part_number: "P-027",
      operations: [
        op({ operation_id: "FACE", tool_number: 1 }),
        op({ operation_id: "ROUGH", tool_number: 2 }),
        op({ operation_id: "FINISH", tool_number: 3 }),
      ],
    }));
    expect(r.operations[0].sequence).toBe(1);
    expect(r.operations[0].operation_id).toBe("FACE");
    expect(r.operations[1].sequence).toBe(2);
    expect(r.operations[1].operation_id).toBe("ROUGH");
    expect(r.operations[2].sequence).toBe(3);
    expect(r.operations[2].operation_id).toBe("FINISH");
  });

  it("missing speed_rpm/feed_mmpm default to 0 in summary", () => {
    const r = ENGINE.generate(input({
      job_id: "J28", part_number: "P-028",
      operations: [{
        operation_id: "OP10",
        operation_name: "manual",
        tool_number: 1,
        tool_description: "T1",
      }],
    }));
    expect(r.operations[0].speed_rpm).toBe(0);
    expect(r.operations[0].feed_mmpm).toBe(0);
  });

  it("missing coolant defaults to 'flood' in operation summary", () => {
    const r = ENGINE.generate(input({
      job_id: "J29", part_number: "P-029",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
    }));
    expect(r.operations[0].coolant).toBe("flood");
  });

  it("explicit coolant string is preserved verbatim", () => {
    const r = ENGINE.generate(input({
      job_id: "J30", part_number: "P-030",
      operations: [op({ operation_id: "OP10", tool_number: 1, coolant: "MQL" })],
    }));
    expect(r.operations[0].coolant).toBe("MQL");
  });
});

// ── hypermill_metadata passthrough ───────────────────────────────────────────

describe("HyperMillSetupSheetBridge — hypermill_metadata passthrough", () => {
  it("controller_model and post_processor default to 'Not specified'", () => {
    const r = ENGINE.generate(input({
      job_id: "J31", part_number: "P-031",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
    }));
    expect(r.hypermill_metadata.controller_model).toBe("Not specified");
    expect(r.hypermill_metadata.post_processor).toBe("Not specified");
  });

  it("AC script refs default to empty array when omitted", () => {
    const r = ENGINE.generate(input({
      job_id: "J32", part_number: "P-032",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
    }));
    expect(r.hypermill_metadata.ac_script_refs).toEqual([]);
  });

  it("explicit AC script refs are preserved verbatim", () => {
    const r = ENGINE.generate(input({
      job_id: "J33", part_number: "P-033",
      ac_script_refs: ["macro_a", "macro_b"],
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
    }));
    expect(r.hypermill_metadata.ac_script_refs).toEqual(["macro_a", "macro_b"]);
  });
});

// ── Formatted output ─────────────────────────────────────────────────────────

describe("HyperMillSetupSheetBridge — formatted output content", () => {
  it("default (json) format output contains 'operations' key/word", () => {
    const r = ENGINE.generate(input({
      job_id: "J34", part_number: "P-034",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
    }));
    expect(r.formatted_output).toContain("operations");
  });

  it("markdown format output contains markdown 'Op 1' header + Tool List section", () => {
    const r = ENGINE.generate(input({
      job_id: "J35", part_number: "P-035",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
      format: "markdown",
    }));
    expect(r.formatted_output).toContain("## Op 1");
    expect(r.formatted_output).toContain("Tool List");
    expect(r.formatted_output).toContain("J35");
  });

  it("printable format output contains box-drawing 'OPERATION 1' + 'TOOL LIST' sections", () => {
    const r = ENGINE.generate(input({
      job_id: "J36", part_number: "P-036",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
      format: "printable",
    }));
    expect(r.formatted_output).toContain("OPERATION 1");
    expect(r.formatted_output).toContain("TOOL LIST");
    expect(r.formatted_output).toContain("J36");
  });
});

// ── Fixture description ──────────────────────────────────────────────────────

describe("HyperMillSetupSheetBridge — fixture description handling", () => {
  it("absent fixture sets fixture_description to canonical string", () => {
    const r = ENGINE.generate(input({
      job_id: "J37", part_number: "P-037",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
    }));
    expect(r.fixture_description).toBe("No fixture specified");
  });

  it("present fixture description propagates verbatim to result", () => {
    const r = ENGINE.generate(input({
      job_id: "J38", part_number: "P-038",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
      fixture: { description: "Schunk Tandem TANDEM-100" },
    }));
    expect(r.fixture_description).toBe("Schunk Tandem TANDEM-100");
  });
});

// ── qualityGateCheck — 8-state matrix ────────────────────────────────────────

describe("HyperMillSetupSheetBridge.qualityGateCheck — pass/block matrix", () => {
  it("all three present → gate_pass=true, no missing items, all 3 present", () => {
    const r = ENGINE.qualityGateCheck(true, true, true);
    expect(r.gate_pass).toBe(true);
    expect(r.missing_items).toEqual([]);
    expect(r.present_items.length).toBe(QUALITY_DOC_COUNT);
    expect(r.message).toContain("PASS");
  });

  it("setup sheet only → gate_pass=false, FAI+SPC named missing", () => {
    const r = ENGINE.qualityGateCheck(true, false, false);
    expect(r.gate_pass).toBe(false);
    expect(r.missing_items.sort()).toEqual(["AS9102 FAI Plan", "SPC Control Plan"]);
    expect(r.present_items).toEqual(["Setup Sheet"]);
  });

  it("FAI only → gate_pass=false, setup+SPC named missing", () => {
    const r = ENGINE.qualityGateCheck(false, true, false);
    expect(r.gate_pass).toBe(false);
    expect(r.missing_items.sort()).toEqual(["SPC Control Plan", "Setup Sheet"]);
    expect(r.present_items).toEqual(["AS9102 FAI Plan"]);
  });

  it("SPC only → gate_pass=false, setup+FAI named missing", () => {
    const r = ENGINE.qualityGateCheck(false, false, true);
    expect(r.gate_pass).toBe(false);
    expect(r.missing_items.sort()).toEqual(["AS9102 FAI Plan", "Setup Sheet"]);
    expect(r.present_items).toEqual(["SPC Control Plan"]);
  });

  it("setup + FAI present, SPC missing → gate_pass=false, only SPC missing", () => {
    const r = ENGINE.qualityGateCheck(true, true, false);
    expect(r.gate_pass).toBe(false);
    expect(r.missing_items).toEqual(["SPC Control Plan"]);
    expect(r.present_items.length).toBe(2);
  });

  it("setup + SPC present, FAI missing → only FAI missing", () => {
    const r = ENGINE.qualityGateCheck(true, false, true);
    expect(r.gate_pass).toBe(false);
    expect(r.missing_items).toEqual(["AS9102 FAI Plan"]);
  });

  it("FAI + SPC present, setup missing → only Setup Sheet missing", () => {
    const r = ENGINE.qualityGateCheck(false, true, true);
    expect(r.gate_pass).toBe(false);
    expect(r.missing_items).toEqual(["Setup Sheet"]);
  });

  it("all three missing → gate_pass=false, all 3 in missing list, none present", () => {
    const r = ENGINE.qualityGateCheck(false, false, false);
    expect(r.gate_pass).toBe(false);
    expect(r.missing_items.length).toBe(QUALITY_DOC_COUNT);
    expect(r.present_items).toEqual([]);
    expect(r.message).toContain("BLOCK");
  });

  it("BLOCK message names every missing item by canonical label", () => {
    const r = ENGINE.qualityGateCheck(false, false, false);
    expect(r.message).toContain("Setup Sheet");
    expect(r.message).toContain("AS9102 FAI Plan");
    expect(r.message).toContain("SPC Control Plan");
  });
});

// ── Adversarial / edge cases ─────────────────────────────────────────────────

describe("HyperMillSetupSheetBridge — adversarial edges", () => {
  it("zero operations: returns empty arrays for tools/operations/cycle_types", () => {
    const r = ENGINE.generate(input({
      job_id: "J50", part_number: "P-050",
      operations: [],
    }));
    expect(r.operation_count).toBe(0);
    expect(r.tool_count).toBe(0);
    expect(r.tools).toEqual([]);
    expect(r.operations).toEqual([]);
    expect(r.hypermill_metadata.cycle_types).toEqual([]);
  });

  it("zero operations + safety notes enabled: no max-RPM note emitted", () => {
    const r = ENGINE.generate(input({
      job_id: "J51", part_number: "P-051",
      operations: [],
    }));
    const rpmNotes = r.safety_notes.filter(n => n.includes("Max spindle"));
    expect(rpmNotes).toEqual([]);
  });

  it("100 ops sharing 20 tool_numbers: all ops counted, exactly 20 tools", () => {
    const ops: HyperMillOperation[] = [];
    for (let i = 0; i < ADVERSARIAL_OP_COUNT; i++) {
      ops.push(op({ operation_id: `OP${i}`, tool_number: (i % ADVERSARIAL_TOOL_COUNT) + 1 }));
    }
    const r = ENGINE.generate(input({
      job_id: "J52", part_number: "P-052",
      operations: ops,
    }));
    expect(r.operation_count).toBe(ADVERSARIAL_OP_COUNT);
    expect(r.operations.length).toBe(ADVERSARIAL_OP_COUNT);
    expect(r.tool_count).toBe(ADVERSARIAL_TOOL_COUNT);
  });

  it("all ops share single tool_number → exactly one tool entry with all op IDs", () => {
    const ops: HyperMillOperation[] = [];
    for (let i = 0; i < SHARED_TOOL_OP_COUNT; i++) {
      ops.push(op({ operation_id: `OP${i}`, tool_number: SHARED_TOOL_NUMBER }));
    }
    const r = ENGINE.generate(input({
      job_id: "J53", part_number: "P-053",
      operations: ops,
    }));
    expect(r.tool_count).toBe(1);
    expect(r.tools[0].used_in_ops.length).toBe(SHARED_TOOL_OP_COUNT);
    expect(r.tools[0].tool_number).toBe(SHARED_TOOL_NUMBER);
  });

  it("zero speed + zero feed: summary produces 0/0 values without divide-by-zero", () => {
    const r = ENGINE.generate(input({
      job_id: "J54", part_number: "P-054",
      operations: [op({ operation_id: "OP10", tool_number: 1, speed_rpm: 0, feed_mmpm: 0 })],
    }));
    expect(r.operations[0].speed_rpm).toBe(0);
    expect(r.operations[0].feed_mmpm).toBe(0);
    // Formatted output is still well-formed JSON/text containing the operation key
    expect(r.formatted_output).toContain("operations");
  });

  it("job_id and part_number echo verbatim into result", () => {
    const r = ENGINE.generate(input({
      job_id: "JOB-2026-A-001",
      part_number: "PN-12345-REV-C",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
    }));
    expect(r.job_id).toBe("JOB-2026-A-001");
    expect(r.part_number).toBe("PN-12345-REV-C");
  });

  it("default flute count matches DEFAULT_FLUTE_COUNT in formatted JSON output", () => {
    // Engine maps tools with flutes=DEFAULT_FLUTE_COUNT in buildSetupSheet payload
    const r = ENGINE.generate(input({
      job_id: "J55", part_number: "P-055",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
    }));
    expect(r.formatted_output).toContain(`"flutes": ${DEFAULT_FLUTE_COUNT}`);
  });
});

// ── Singleton + dispatcher round-trip ────────────────────────────────────────

describe("HyperMillSetupSheetBridge — singleton + dispatcher round-trip", () => {
  it("singleton produces identical tool_count + operation_count + cycle_types as fresh instance", () => {
    const sample = input({
      job_id: "J60", part_number: "P-060",
      operations: [
        op({ operation_id: "OP10", tool_number: 1, cycle_type: "roughing" }),
        op({ operation_id: "OP20", tool_number: 2, cycle_type: "finishing" }),
      ],
    });
    const r1 = ENGINE.generate(sample);
    const r2 = hyperMillSetupSheetBridge.generate(sample);
    expect(r2.tool_count).toBe(r1.tool_count);
    expect(r2.operation_count).toBe(r1.operation_count);
    expect(r2.hypermill_metadata.cycle_types).toEqual(r1.hypermill_metadata.cycle_types);
  });

  it("singleton qualityGateCheck matches fresh instance for all-present case", () => {
    const r1 = ENGINE.qualityGateCheck(true, true, true);
    const r2 = hyperMillSetupSheetBridge.qualityGateCheck(true, true, true);
    expect(r2.gate_pass).toBe(r1.gate_pass);
    expect(r2.message).toBe(r1.message);
  });

  it("dispatcher exposes cam_hypermill_setup_sheet in ACTIONS", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS.includes("cam_hypermill_setup_sheet")).toBe(true);
  });

  it("dispatcher exposes cam_hypermill_quality_package in ACTIONS", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS.includes("cam_hypermill_quality_package")).toBe(true);
  });

  it("engine reachable via dynamic import path used by dispatcher", async () => {
    const mod = await import("../engines/HyperMillSetupSheetBridge.js");
    const r = mod.hyperMillSetupSheetBridge.generate(input({
      job_id: "J70", part_number: "P-070",
      operations: [op({ operation_id: "OP10", tool_number: 1 })],
    }));
    expect(r.job_id).toBe("J70");
    expect(r.tool_count).toBe(1);
  });
});
