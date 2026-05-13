/**
 * TaptiteElectrodeMacroBridgeEngine.test.ts
 *
 * Reference-value tests for TRAINING-LEARNING-MS0/U-TL-U4 (engine 2 of 2 —
 * the taptite-electrode → macro-fill bridge). Every assertion checks a
 * specific value — no presence-only patterns.
 *
 * Coverage floor (per comprehensive-build enforcement):
 *   - Happy path (bridge a valid taptite-electrode template)
 *   - ≥3 failure modes (template_missing, wrong_family, template_schema_mismatch,
 *     missing_part_folder, outdir_escape, already_exists, filename_unsafe,
 *     invalid_bridge, write_failed)
 *   - ≥2 adversarial inputs (path-traversal outdir, sanitized filename)
 *   - ≥3 input-variability configs (full 4-pass schedule, 3-pass, empty schedule)
 *   - Singleton + canonical schema surfaces exercised
 *   - Verifies the labelled placeholder is NEVER mistaken for runnable code
 *     (DO-NOT-RUN header present + _MACRO-TEMPLATE_ prefix + non-runnable body)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  TaptiteElectrodeMacroBridgeEngine,
  taptiteElectrodeMacroBridgeEngine,
  TAPTITE_ELECTRODE_VC_VARIABLES,
  TAPTITE_ELECTRODE_VC_VARIABLE_SCHEMA,
  type TaptiteElectrodeMacroBridge,
} from "../engines/TaptiteElectrodeMacroBridgeEngine.js";
import type {
  WEDMTrainingTemplate,
  WEDMStrategySeed,
} from "../engines/WEDMPartFamilyTemplateExtractorEngine.js";

// ───────────────────────────────────────────────────────────────────────────────
// Test fixtures.

function passSeed(
  category: "roughing" | "finishing",
  id: string,
  on_time_us: number,
  peak_current_A: number,
  wire_tension_N = 14
): WEDMStrategySeed {
  return {
    strategy_id: id,
    name: id,
    category,
    on_time_us,
    peak_current_A,
    gap_voltage_V: 60,
    wire_tension_N,
    material_suitability: 0.9,
  };
}

function templateFixture(overrides: Partial<WEDMTrainingTemplate> = {}): WEDMTrainingTemplate {
  return {
    schemaVersion: 1,
    family: "taptite-electrode",
    generated_at: "2026-05-13T19:00:00.000Z",
    controller_baseline: null,
    material_class: "copper",
    representative_parts: ["H:/PRISM/JM DIE/WIRE EDM/ITW/TAPTITE-ELECTRODE-7.nc"],
    customers_top: [{ customer: "ITW", count: 60 }],
    ext_breakdown: { ".nc": 90 },
    kind_breakdown: { g_code: 95 },
    pass_schedule_seed: [
      passSeed("roughing", "rough_cut", 8.0, 20.0, 14),
      passSeed("finishing", "skim_1", 3.5, 8.0, 16),
      passSeed("finishing", "skim_2", 1.8, 4.0, 17),
      passSeed("finishing", "skim_3", 0.9, 2.0, 18),
    ],
    op_sequence: ["roughing", "finishing", "finishing", "finishing"],
    tribal_tips: [],
    playbook_rules: [],
    variability: { cycle_time_sec: null, dim_cpk: null, wire_life_min: null },
    run_count: 95,
    sx_score_distribution: null,
    classification_coverage_at_extract: 0.9,
    source_index: "H:/PRISM/Docustrata/.index/jm-die-wedm-corpus-v1.json",
    total_corpus_count: 1200,
    historical_pulse_note: "Historical pulse values are DATA, NOT GROUND TRUTH.",
    notes: [],
    ...overrides,
  };
}

let tempDir = "";
beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "taptite-bridge-test-"));
});
afterEach(() => {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Canonical VC variable schema

describe("TAPTITE_ELECTRODE_VC_VARIABLE_SCHEMA — canonical 20-variable list", () => {
  it("exposes exactly 20 variables in 5 categories", () => {
    const names = Object.keys(TAPTITE_ELECTRODE_VC_VARIABLE_SCHEMA);
    expect(names).toHaveLength(20);
    const categories = new Set(names.map((n) => {
      const k = n as keyof typeof TAPTITE_ELECTRODE_VC_VARIABLE_SCHEMA;
      return TAPTITE_ELECTRODE_VC_VARIABLE_SCHEMA[k].category;
    }));
    expect(categories).toEqual(new Set(["geometry", "process", "wire", "material", "quality"]));
  });

  it("required variables outnumber optional (17 required vs 3 optional)", () => {
    const entries = Object.values(TAPTITE_ELECTRODE_VC_VARIABLE_SCHEMA);
    const requiredCount = entries.filter((e) => e.required).length;
    const optionalCount = entries.filter((e) => !e.required).length;
    expect(requiredCount).toBe(17);
    expect(optionalCount).toBe(3);
  });

  it("TAPTITE_ELECTRODE_VC_VARIABLES sorts by category then alphabetic", () => {
    // Spot-check ordering: geometry comes first alphabetically.
    expect(TAPTITE_ELECTRODE_VC_VARIABLES[0]).toBe("VC_ELECTRODE_LENGTH_MM");
    // material is the last category alphabetically that has any entries before
    // "process"/"quality"/"wire"; verify it appears before process/quality/wire.
    const idxMaterial = TAPTITE_ELECTRODE_VC_VARIABLES.indexOf("VC_MATERIAL_CLASS");
    const idxProcess = TAPTITE_ELECTRODE_VC_VARIABLES.indexOf("VC_ROUGH_ON_TIME_US");
    expect(idxMaterial).toBeLessThan(idxProcess);
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// bridge()

describe("bridge — happy path (4-pass full taptite-electrode template)", () => {
  it("produces a complete TaptiteElectrodeMacroBridge with hydrated VC variables", () => {
    const eng = new TaptiteElectrodeMacroBridgeEngine();
    const r = eng.bridge(templateFixture());
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    const b = r.bridge;
    expect(b.schemaVersion).toBe(1);
    expect(b.source_family).toBe("taptite-electrode");
    expect(b.material_class).toBe("copper");
    expect(b.pass_schedule_seed).toHaveLength(4);
    expect(b.vc_variables).toHaveLength(20);
    expect(b.do_not_run_header).toContain("DO NOT RUN AS-IS");
    expect(b.sx_score).toBe(null);
    expect(b.bridge_id).toBe("taptite-electrode--copper--p4--v1");
    // Verify hydration: rough on_time_us = 8.0
    const rough = b.vc_variables.find((v) => v.name === "VC_ROUGH_ON_TIME_US");
    expect(rough?.initialValue).toBe(8.0);
    const skim3 = b.vc_variables.find((v) => v.name === "VC_SKIM3_ON_TIME_US");
    expect(skim3?.initialValue).toBe(0.9);
    const mat = b.vc_variables.find((v) => v.name === "VC_MATERIAL_CLASS");
    expect(mat?.initialValue).toBe("copper");
  });

  it("bridge_id is deterministic for identical templates (idempotency)", () => {
    const eng = new TaptiteElectrodeMacroBridgeEngine();
    const r1 = eng.bridge(templateFixture());
    const r2 = eng.bridge(templateFixture());
    expect(r1.ok && r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) throw new Error("unreachable");
    expect(r1.bridge.bridge_id).toBe(r2.bridge.bridge_id);
  });

  it("notes is empty when template has full 4-pass schedule + material_class", () => {
    const eng = new TaptiteElectrodeMacroBridgeEngine();
    const r = eng.bridge(templateFixture());
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.bridge.notes).toEqual([]);
  });
});

describe("bridge — variability: 3-pass and empty schedules", () => {
  it("3-pass template: VC_SKIM3_* variables get initialValue=null", () => {
    const t = templateFixture({
      pass_schedule_seed: [
        passSeed("roughing", "rough_cut", 8.0, 20.0),
        passSeed("finishing", "skim_1", 3.5, 8.0),
        passSeed("finishing", "skim_2", 1.8, 4.0),
      ],
    });
    const r = taptiteElectrodeMacroBridgeEngine.bridge(t);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.bridge.pass_schedule_seed).toHaveLength(3);
    expect(r.bridge.bridge_id).toBe("taptite-electrode--copper--p3--v1");
    const skim3 = r.bridge.vc_variables.find((v) => v.name === "VC_SKIM3_ON_TIME_US");
    expect(skim3?.initialValue).toBe(null);
    expect(r.bridge.notes).toEqual([]); // 3-pass is on the boundary; no warning
  });

  it("empty schedule: all pulse vars null + warning in notes", () => {
    const t = templateFixture({ pass_schedule_seed: [] });
    const r = taptiteElectrodeMacroBridgeEngine.bridge(t);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.bridge.pass_schedule_seed).toEqual([]);
    const rough = r.bridge.vc_variables.find((v) => v.name === "VC_ROUGH_ON_TIME_US");
    expect(rough?.initialValue).toBe(null);
    expect(r.bridge.notes[0]).toContain("pass_schedule_seed is empty");
  });

  it("2-pass (incomplete) template: warning in notes about typical 3-4 passes", () => {
    const t = templateFixture({
      pass_schedule_seed: [
        passSeed("roughing", "rough_cut", 8.0, 20.0),
        passSeed("finishing", "skim_1", 3.5, 8.0),
      ],
    });
    const r = taptiteElectrodeMacroBridgeEngine.bridge(t);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.bridge.notes[0]).toContain("2 entry/entries");
    expect(r.bridge.notes[0]).toContain("3-4 passes");
  });

  it("null material_class: VC_MATERIAL_CLASS initialValue=null + warning in notes", () => {
    const t = templateFixture({ material_class: null });
    const r = taptiteElectrodeMacroBridgeEngine.bridge(t);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.bridge.material_class).toBe(null);
    const mat = r.bridge.vc_variables.find((v) => v.name === "VC_MATERIAL_CLASS");
    expect(mat?.initialValue).toBe(null);
    expect(r.bridge.notes.some((n) => n.includes("material_class is null"))).toBe(true);
    expect(r.bridge.bridge_id).toBe("taptite-electrode--no-mat--p4--v1");
  });
});

describe("bridge — error paths", () => {
  it("undefined template → ok:false / error:'template_missing'", () => {
    const r = taptiteElectrodeMacroBridgeEngine.bridge(undefined);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error).toBe("template_missing");
  });

  it("non-taptite-electrode family → ok:false / error:'wrong_family'", () => {
    const wrong = templateFixture({ family: "punch-die" as unknown as "taptite-electrode" });
    const r = taptiteElectrodeMacroBridgeEngine.bridge(wrong);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error).toBe("wrong_family");
    expect(r.detail).toContain("punch-die");
  });

  it("missing schemaVersion → ok:false / error:'template_schema_mismatch'", () => {
    const noSchema = templateFixture({
      schemaVersion: undefined as unknown as number,
    });
    const r = taptiteElectrodeMacroBridgeEngine.bridge(noSchema);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error).toBe("template_schema_mismatch");
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// listRequiredVariables()

describe("listRequiredVariables", () => {
  it("without template: 17 required + 3 optional, all initialValue=null", () => {
    const r = taptiteElectrodeMacroBridgeEngine.listRequiredVariables();
    expect(r.ok).toBe(true);
    expect(r.variables).toHaveLength(20);
    expect(r.required_count).toBe(17);
    expect(r.optional_count).toBe(3);
    for (const v of r.variables) {
      expect(v.initialValue).toBe(null);
    }
  });

  it("with full template: pulse params hydrated, geometry/quality still null", () => {
    const r = taptiteElectrodeMacroBridgeEngine.listRequiredVariables(templateFixture());
    expect(r.ok).toBe(true);
    const rough = r.variables.find((v) => v.name === "VC_ROUGH_ON_TIME_US");
    expect(rough?.initialValue).toBe(8.0);
    // Geometry not in template — operator must fill
    const od = r.variables.find((v) => v.name === "VC_ELECTRODE_OD_MM");
    expect(od?.initialValue).toBe(null);
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// placeLabelledTemplate()

describe("placeLabelledTemplate — happy path", () => {
  it("writes _MACRO-TEMPLATE_<id>.min under <partFolder>/CNC PROGRAM/ with DO-NOT-RUN header", () => {
    const eng = new TaptiteElectrodeMacroBridgeEngine();
    const b = eng.bridge(templateFixture());
    expect(b.ok).toBe(true);
    if (!b.ok) throw new Error("unreachable");
    const partFolder = path.join(tempDir, "ITW", "TAPTITE-7");
    const r = eng.placeLabelledTemplate({
      bridge: b.bridge,
      partFolderPath: partFolder,
      partLibraryRoot: tempDir,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.written_to).toBe(
      path.join(partFolder, "CNC PROGRAM", "_MACRO-TEMPLATE_taptite-electrode--copper--p4--v1.min")
    );
    expect(fs.existsSync(r.written_to)).toBe(true);
    expect(r.bytes_written).toBeGreaterThan(500);
    const body = fs.readFileSync(r.written_to, "utf8");
    expect(body).toContain("DO NOT RUN AS-IS");
    expect(body).toContain("_MACRO-TEMPLATE_");
    expect(body).toContain("bridge_id: taptite-electrode--copper--p4--v1");
    expect(body).toContain("material_class: copper");
    expect(body).toContain("pass_count: 4");
    // Must NOT contain any runnable G-code lines (no G0/G1/G2/G3/G90/etc with
    // numbers, no T words). The only allowed "code"-shaped line is M30 marker.
    const runnableLines = body
      .split("\n")
      .filter((l) => /^(G|T)\d/.test(l.trim()));
    expect(runnableLines).toEqual([]);
  });
});

describe("placeLabelledTemplate — error paths", () => {
  it("invalid bridge: not taptite-electrode → error:'invalid_bridge'", () => {
    const fakeBridge = {
      source_family: "punch-die",
      bridge_id: "x",
    } as unknown as TaptiteElectrodeMacroBridge;
    const r = taptiteElectrodeMacroBridgeEngine.placeLabelledTemplate({
      bridge: fakeBridge,
      partFolderPath: tempDir,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error).toBe("invalid_bridge");
  });

  it("missing partFolderPath → error:'missing_part_folder'", () => {
    const eng = new TaptiteElectrodeMacroBridgeEngine();
    const b = eng.bridge(templateFixture());
    expect(b.ok).toBe(true);
    if (!b.ok) throw new Error("unreachable");
    const r = eng.placeLabelledTemplate({
      bridge: b.bridge,
      partFolderPath: "",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error).toBe("missing_part_folder");
  });

  it("already_exists guard: refuses to overwrite by default", () => {
    const eng = new TaptiteElectrodeMacroBridgeEngine();
    const b = eng.bridge(templateFixture());
    expect(b.ok).toBe(true);
    if (!b.ok) throw new Error("unreachable");
    const partFolder = path.join(tempDir, "ITW", "TAPTITE-X");
    const first = eng.placeLabelledTemplate({
      bridge: b.bridge,
      partFolderPath: partFolder,
      partLibraryRoot: tempDir,
    });
    expect(first.ok).toBe(true);
    const second = eng.placeLabelledTemplate({
      bridge: b.bridge,
      partFolderPath: partFolder,
      partLibraryRoot: tempDir,
    });
    expect(second.ok).toBe(false);
    if (second.ok) throw new Error("unreachable");
    expect(second.error).toBe("already_exists");
  });

  it("already_exists guard: overwrite=true succeeds", () => {
    const eng = new TaptiteElectrodeMacroBridgeEngine();
    const b = eng.bridge(templateFixture());
    expect(b.ok).toBe(true);
    if (!b.ok) throw new Error("unreachable");
    const partFolder = path.join(tempDir, "ITW", "TAPTITE-Y");
    eng.placeLabelledTemplate({
      bridge: b.bridge,
      partFolderPath: partFolder,
      partLibraryRoot: tempDir,
    });
    const second = eng.placeLabelledTemplate({
      bridge: b.bridge,
      partFolderPath: partFolder,
      partLibraryRoot: tempDir,
      overwrite: true,
    });
    expect(second.ok).toBe(true);
  });
});

describe("placeLabelledTemplate — multiline injection defense (reviewer-B P0-1)", () => {
  it("ADVERSARIAL: caller-mutated bridge_id containing newlines is sanitized in the body", () => {
    const eng = new TaptiteElectrodeMacroBridgeEngine();
    const b = eng.bridge(templateFixture());
    expect(b.ok).toBe(true);
    if (!b.ok) throw new Error("unreachable");
    // Mutate bridge_id to contain an injection payload (newline + ostensibly-runnable text)
    b.bridge.bridge_id = "evil_id\nG01 X100 Y200 (column-0 injection)";
    // generated_at can also be caller-mutated via JSON round-trip
    b.bridge.generated_at = "2026-05-13\nG02 X50 Y50";
    const partFolder = path.join(tempDir, "INJECT-TEST");
    const r = eng.placeLabelledTemplate({
      bridge: b.bridge,
      partFolderPath: partFolder,
      partLibraryRoot: tempDir,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    const body = fs.readFileSync(r.written_to, "utf8");
    // The body must contain ZERO column-0 G/M/T-prefix lines (the M30 placeholder
    // is now wrapped inside a comment per P1-2 fix).
    const lines = body.split("\n");
    const runnableLines = lines.filter((l) => /^(G|M|T)\d/.test(l));
    expect(runnableLines).toEqual([]);
    // bridge_id and generated_at appear in the body but with newlines replaced by `_`
    expect(body).toContain("evil_id_G01 X100 Y200");
    expect(body).not.toContain("\nG01 X100 Y200");
    expect(body).not.toContain("\nG02 X50 Y50");
  });

  it("ADVERSARIAL: caller-mutated material_class containing ')' does not close the comment early", () => {
    const eng = new TaptiteElectrodeMacroBridgeEngine();
    const b = eng.bridge(templateFixture());
    expect(b.ok).toBe(true);
    if (!b.ok) throw new Error("unreachable");
    b.bridge.material_class = "copper) G01 X9999 Y9999 (";
    const partFolder = path.join(tempDir, "PAREN-TEST");
    const r = eng.placeLabelledTemplate({
      bridge: b.bridge,
      partFolderPath: partFolder,
      partLibraryRoot: tempDir,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    const body = fs.readFileSync(r.written_to, "utf8");
    // material_class line must NOT have an early-close `)` followed by `G01`
    expect(body).not.toMatch(/material_class:.*\) G01/);
  });
});

describe("placeLabelledTemplate — adversarial inputs", () => {
  it("ADVERSARIAL: path-traversal outDir via partFolderPath escape rejected", () => {
    const eng = new TaptiteElectrodeMacroBridgeEngine();
    const b = eng.bridge(templateFixture());
    expect(b.ok).toBe(true);
    if (!b.ok) throw new Error("unreachable");
    // partLibraryRoot = tempDir/customer; partFolderPath = tempDir/../escape
    const customerRoot = path.join(tempDir, "ITW");
    fs.mkdirSync(customerRoot);
    const escapePath = path.resolve(tempDir, "..", "escape-target");
    const r = eng.placeLabelledTemplate({
      bridge: b.bridge,
      partFolderPath: escapePath,
      partLibraryRoot: customerRoot,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error).toBe("outdir_escape");
  });

  it("ADVERSARIAL: bridge_id with unsafe filename chars is sanitized into _", () => {
    const eng = new TaptiteElectrodeMacroBridgeEngine();
    const b = eng.bridge(templateFixture());
    expect(b.ok).toBe(true);
    if (!b.ok) throw new Error("unreachable");
    // Mutate the bridge_id to contain shell-meta + path-seps
    b.bridge.bridge_id = "x/../y;rm -rf;";
    const partFolder = path.join(tempDir, "PART-Z");
    const r = eng.placeLabelledTemplate({
      bridge: b.bridge,
      partFolderPath: partFolder,
      partLibraryRoot: tempDir,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    // The sanitized filename has no `/`, `.`, `;`, ` `, or `-` at the start
    // and no `..` traversal sequence.
    const base = path.basename(r.written_to);
    expect(base.startsWith("_MACRO-TEMPLATE_")).toBe(true);
    expect(base).not.toContain("..");
    expect(base).not.toContain("/");
    expect(base).not.toContain(";");
  });

  it("ADVERSARIAL: bridge_id of only non-allowed chars sanitizes to '_' and is REJECTED as filename_unsafe (reviewer-B P1-1)", () => {
    const eng = new TaptiteElectrodeMacroBridgeEngine();
    const b = eng.bridge(templateFixture());
    expect(b.ok).toBe(true);
    if (!b.ok) throw new Error("unreachable");
    // Pure non-allowed chars sanitize to "_" — refusing this is the P1-1 fix
    // (previously the engine would write `_MACRO-TEMPLATE__.min`, a useless
    // filename indicating that the bridge_id contained zero alphanumeric content).
    b.bridge.bridge_id = "***///";
    const partFolder = path.join(tempDir, "PART-Q");
    const r = eng.placeLabelledTemplate({
      bridge: b.bridge,
      partFolderPath: partFolder,
      partLibraryRoot: tempDir,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error).toBe("filename_unsafe");
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// Singleton

describe("Engine singleton export", () => {
  it("singleton bridge() on a template works", () => {
    const r = taptiteElectrodeMacroBridgeEngine.bridge(templateFixture());
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.bridge.source_family).toBe("taptite-electrode");
  });

  it("singleton class name is TaptiteElectrodeMacroBridgeEngine", () => {
    expect(taptiteElectrodeMacroBridgeEngine.constructor.name).toBe(
      "TaptiteElectrodeMacroBridgeEngine"
    );
  });
});
