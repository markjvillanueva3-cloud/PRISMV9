/**
 * BlueprintProgramJoinEngine — Phase 8 → JM Die join table tests
 *
 * Covers normalization, candidate extraction, program indexing, and the
 * full streaming join (happy path, failure modes, adversarial inputs,
 * cross-customer variability). All assertions check concrete values
 * (no presence-only / toBeDefined placeholders).
 */

import { describe, it, expect, afterAll, beforeAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  blueprintProgramJoinEngine,
  normalizePartNumber,
  extractPartNumberCandidates,
  loadJoinIndex,
  programForPrint,
  printForProgram,
  getJoinIndex,
  clearJoinIndexCache,
  normalizeProgramPathKey,
  type ProgramFileRef,
} from "../engines/BlueprintProgramJoinEngine.js";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "bp-program-join-test-"));
const fix = (name: string) => path.join(TMP, name);

function writeJSONL(file: string, rows: unknown[]): string {
  const p = fix(file);
  fs.writeFileSync(
    p,
    rows.map((r) => (typeof r === "string" ? r : JSON.stringify(r))).join("\n") + "\n",
    "utf-8",
  );
  return p;
}

function writeLabels(
  file: string,
  labels: Array<{
    filePath: string;
    fileName: string;
    customer?: string;
    machineCategory?: string;
    controllerFamily?: string;
    materialHint?: string;
  }>,
): string {
  const p = fix(file);
  fs.writeFileSync(
    p,
    JSON.stringify({ schemaVersion: "1.0.0", labels }, null, 2),
    "utf-8",
  );
  return p;
}

function phase8Row(opts: {
  doc_id: string;
  filename?: string;
  page_index?: number;
  drawing_score?: number;
  part_numbers_clean?: string[];
}): Record<string, unknown> {
  return {
    doc_id: opts.doc_id,
    filename: opts.filename ?? `${opts.doc_id}.pdf`,
    page_index: opts.page_index ?? 0,
    tier1: { drawing_score: opts.drawing_score ?? 0.85 },
    tier2: { part_numbers_clean: opts.part_numbers_clean ?? [] },
  };
}

afterAll(() => {
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe("normalizePartNumber", () => {
  it("strips a leading L- op prefix and uppercases", () => {
    expect(normalizePartNumber("l-2845")).toBe("2845");
  });

  it("strips trailing material codes (-D2, -A2, -4140)", () => {
    expect(normalizePartNumber("L-2845-D2")).toBe("2845");
    expect(normalizePartNumber("PART-A2")).toBe("PART");
    expect(normalizePartNumber("BRACKET-4140")).toBe("BRACKET");
  });

  it("strips a trailing single-letter rev (-A)", () => {
    expect(normalizePartNumber("PART-001-A")).toBe("PART-001");
  });

  it("strips a trailing -OPn suffix", () => {
    expect(normalizePartNumber("PART-001-OP2")).toBe("PART-001");
  });

  it("returns empty string on empty / whitespace input", () => {
    expect(normalizePartNumber("")).toBe("");
    expect(normalizePartNumber("   ")).toBe("");
  });

  it("is idempotent: f(f(x)) === f(x)", () => {
    const once = normalizePartNumber("L-2845-D2-A");
    expect(normalizePartNumber(once)).toBe(once);
  });
});

describe("extractPartNumberCandidates", () => {
  it("derives the exact candidate set from a real lathe filename", () => {
    const cands = extractPartNumberCandidates("L-2845-D2.MIN").sort();
    expect(cands).toEqual(["2845", "2845-D2", "L-2845-D2"]);
  });

  it("strips file extensions case-insensitively and yields exact set", () => {
    const cands = extractPartNumberCandidates("Part123.sldprt").sort();
    expect(cands).toEqual(["123", "PART123"]);
  });

  it("returns empty array on empty input", () => {
    expect(extractPartNumberCandidates("")).toEqual([]);
  });
});

describe("indexProgramsFromLabels", () => {
  it("indexes labels under the digits-only normalized key", () => {
    const labelsPath = writeLabels("labels-basic.json", [
      {
        filePath: "H:\\PRISM\\JM DIE\\CNC LATHE\\ALCOA\\L-2845-D2.MIN",
        fileName: "L-2845-D2.MIN",
        customer: "ALCOA",
        machineCategory: "lathe",
        controllerFamily: "OSP-U10/P-series",
        materialHint: "D2",
      },
    ]);
    const { index, count } = blueprintProgramJoinEngine.indexProgramsFromLabels(labelsPath);
    expect(count).toBe(1);
    const hits = index.get("2845") as ProgramFileRef[] | undefined;
    expect(hits).not.toBeUndefined();
    expect((hits as ProgramFileRef[]).length).toBe(1);
    expect((hits as ProgramFileRef[])[0].customer).toBe("ALCOA");
    expect((hits as ProgramFileRef[])[0].machineCategory).toBe("lathe");
    expect((hits as ProgramFileRef[])[0].material).toBe("D2");
  });

  it("throws a descriptive error when the labels file does not exist", () => {
    expect(() =>
      blueprintProgramJoinEngine.indexProgramsFromLabels(fix("missing-labels.json")),
    ).toThrow(/not found/);
  });

  it("throws a descriptive error on malformed labels JSON", () => {
    const p = fix("bad-labels.json");
    fs.writeFileSync(p, "{not valid json", "utf-8");
    expect(() =>
      blueprintProgramJoinEngine.indexProgramsFromLabels(p),
    ).toThrow(/not valid JSON/);
  });
});

describe("joinBlueprintsToPrograms — happy path", () => {
  it("joins a phase8 page to a lathe program by exact normalized key", async () => {
    const labelsPath = writeLabels("labels-happy.json", [
      {
        filePath: "H:\\PRISM\\JM DIE\\CNC LATHE\\ALCOA\\L-2845-D2.MIN",
        fileName: "L-2845-D2.MIN",
        customer: "ALCOA",
        machineCategory: "lathe",
        materialHint: "D2",
      },
    ]);
    const phase8Path = writeJSONL("phase8-happy.jsonl", [
      phase8Row({ doc_id: "doc-A", part_numbers_clean: ["2845"] }),
    ]);

    const { summary, joins } = await blueprintProgramJoinEngine.joinBlueprintsToPrograms(
      phase8Path,
      { programLabelsPath: labelsPath },
    );

    expect(summary.blueprint_pages_total).toBe(1);
    expect(summary.blueprint_pages_with_part_number).toBe(1);
    expect(summary.unique_part_numbers).toBe(1);
    expect(summary.joins_exact).toBe(1);
    expect(summary.joins_miss).toBe(0);
    expect(joins).toHaveLength(1);
    expect(joins[0].part_number).toBe("2845");
    expect(joins[0].part_number_normalized).toBe("2845");
    expect(joins[0].programs).toHaveLength(1);
    expect(joins[0].programs[0].customer).toBe("ALCOA");
    expect(joins[0].programs[0].filename).toBe("L-2845-D2.MIN");
    expect(joins[0].match_confidence).toBe("exact");
  });

  it("aggregates two blueprint pages of the same part under a single join record", async () => {
    const labelsPath = writeLabels("labels-agg.json", [
      {
        filePath: "X\\L-2845-D2.MIN",
        fileName: "L-2845-D2.MIN",
        customer: "ALCOA",
      },
    ]);
    const phase8Path = writeJSONL("phase8-agg.jsonl", [
      phase8Row({ doc_id: "doc-A", page_index: 0, part_numbers_clean: ["2845"] }),
      phase8Row({ doc_id: "doc-A", page_index: 1, part_numbers_clean: ["2845"] }),
    ]);

    const { joins } = await blueprintProgramJoinEngine.joinBlueprintsToPrograms(phase8Path, {
      programLabelsPath: labelsPath,
    });

    expect(joins).toHaveLength(1);
    expect(joins[0].blueprints).toHaveLength(2);
    expect(joins[0].blueprints.map((b) => b.page_index).sort()).toEqual([0, 1]);
    expect(joins[0].blueprints[0].drawing_score).toBeCloseTo(0.85, 5);
  });

  it("returns confidence='miss' when no programs match", async () => {
    const labelsPath = writeLabels("labels-miss.json", [
      { filePath: "X\\L-9999-D2.MIN", fileName: "L-9999-D2.MIN" },
    ]);
    const phase8Path = writeJSONL("phase8-miss.jsonl", [
      phase8Row({ doc_id: "doc-X", part_numbers_clean: ["1280-1"] }),
    ]);

    const { summary, joins } = await blueprintProgramJoinEngine.joinBlueprintsToPrograms(
      phase8Path,
      { programLabelsPath: labelsPath },
    );

    expect(summary.joins_miss).toBe(1);
    expect(summary.joins_exact).toBe(0);
    expect(joins[0].match_confidence).toBe("miss");
    expect(joins[0].programs).toHaveLength(0);
  });

  it("writes a JSONL output file when outPath is provided", async () => {
    const labelsPath = writeLabels("labels-out.json", [
      { filePath: "X\\L-2845-D2.MIN", fileName: "L-2845-D2.MIN", customer: "ALCOA" },
    ]);
    const phase8Path = writeJSONL("phase8-out.jsonl", [
      phase8Row({ doc_id: "doc-A", part_numbers_clean: ["2845"] }),
    ]);
    const outPath = fix("join-out.jsonl");

    await blueprintProgramJoinEngine.joinBlueprintsToPrograms(phase8Path, {
      programLabelsPath: labelsPath,
      outPath,
    });

    expect(fs.existsSync(outPath)).toBe(true);
    const lines = fs.readFileSync(outPath, "utf-8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const rec = JSON.parse(lines[0]) as {
      part_number: string;
      match_confidence: string;
      programs: ProgramFileRef[];
    };
    expect(rec.part_number).toBe("2845");
    expect(rec.match_confidence).toBe("exact");
    expect(rec.programs).toHaveLength(1);
    expect(rec.programs[0].customer).toBe("ALCOA");
  });
});

describe("joinBlueprintsToPrograms — failure modes", () => {
  it("throws when phase8 input file is missing", async () => {
    await expect(
      blueprintProgramJoinEngine.joinBlueprintsToPrograms(fix("nope.jsonl")),
    ).rejects.toThrow(/not found/);
  });

  it("counts malformed JSON lines without aborting the stream", async () => {
    const labelsPath = writeLabels("labels-mal.json", [
      { filePath: "X\\L-2845-D2.MIN", fileName: "L-2845-D2.MIN" },
    ]);
    const phase8Path = writeJSONL("phase8-mal.jsonl", [
      "{not valid json",
      JSON.stringify(phase8Row({ doc_id: "doc-A", part_numbers_clean: ["2845"] })),
    ]);

    const { summary } = await blueprintProgramJoinEngine.joinBlueprintsToPrograms(phase8Path, {
      programLabelsPath: labelsPath,
    });

    expect(summary.blueprint_pages_malformed).toBe(1);
    expect(summary.blueprint_pages_with_part_number).toBe(1);
    expect(summary.joins_exact).toBe(1);
  });

  it("treats rows missing required fields as malformed", async () => {
    const labelsPath = writeLabels("labels-req.json", [
      { filePath: "X\\L-2845-D2.MIN", fileName: "L-2845-D2.MIN" },
    ]);
    const missing = { tier2: { part_numbers_clean: ["2845"] } };
    const phase8Path = writeJSONL("phase8-req.jsonl", [
      missing,
      phase8Row({ doc_id: "doc-A", part_numbers_clean: ["2845"] }),
    ]);

    const { summary } = await blueprintProgramJoinEngine.joinBlueprintsToPrograms(phase8Path, {
      programLabelsPath: labelsPath,
    });

    expect(summary.blueprint_pages_malformed).toBe(1);
    expect(summary.joins_exact).toBe(1);
  });
});

describe("joinBlueprintsToPrograms — adversarial inputs", () => {
  it("rejects oversize lines beyond maxLineBytes", async () => {
    const labelsPath = writeLabels("labels-over.json", [
      { filePath: "X\\L-2845-D2.MIN", fileName: "L-2845-D2.MIN" },
    ]);
    const oversize = '{"a":"' + "X".repeat(2048) + '"}';
    const phase8Path = writeJSONL("phase8-over.jsonl", [
      oversize,
      JSON.stringify(phase8Row({ doc_id: "doc-A", part_numbers_clean: ["2845"] })),
    ]);

    const { summary } = await blueprintProgramJoinEngine.joinBlueprintsToPrograms(phase8Path, {
      programLabelsPath: labelsPath,
      maxLineBytes: 1024,
    });

    expect(summary.blueprint_pages_malformed).toBe(1);
    expect(summary.joins_exact).toBe(1);
  });

  it("ignores rows with no part numbers at all", async () => {
    const labelsPath = writeLabels("labels-empty.json", [
      { filePath: "X\\L-2845-D2.MIN", fileName: "L-2845-D2.MIN" },
    ]);
    const phase8Path = writeJSONL("phase8-empty.jsonl", [
      phase8Row({ doc_id: "doc-A", part_numbers_clean: [] }),
    ]);

    const { summary, joins } = await blueprintProgramJoinEngine.joinBlueprintsToPrograms(
      phase8Path,
      { programLabelsPath: labelsPath },
    );

    expect(summary.blueprint_pages_total).toBe(1);
    expect(summary.blueprint_pages_with_part_number).toBe(0);
    expect(joins).toHaveLength(0);
  });
});

describe("joinBlueprintsToPrograms — ambiguous demotion (maxProgramsPerMatch)", () => {
  // Build a labels file where many programs share the same digits-only
  // key — mirrors the real-world failure mode where phase8 emits a part
  // number like "0001" and dozens of unrelated programs encode "0001"
  // somewhere in their filename.
  function buildSharedKeyLabels(file: string, count: number) {
    const labels: Array<{ filePath: string; fileName: string; customer: string }> = [];
    for (let i = 0; i < count; i++) {
      labels.push({
        filePath: `X\\AMB\\PROG-${i}-2845.MIN`,
        fileName: `PROG-${i}-2845.MIN`,
        customer: `CUST_${i}`,
      });
    }
    return writeLabels(file, labels);
  }

  it("demotes a match with > maxProgramsPerMatch programs to confidence='ambiguous'", async () => {
    const labelsPath = buildSharedKeyLabels("labels-amb-30.json", 30);
    const phase8Path = writeJSONL("phase8-amb-30.jsonl", [
      phase8Row({ doc_id: "d1", part_numbers_clean: ["2845"] }),
    ]);

    const { summary, joins } = await blueprintProgramJoinEngine.joinBlueprintsToPrograms(
      phase8Path,
      { programLabelsPath: labelsPath, maxProgramsPerMatch: 25 },
    );

    expect(summary.joins_ambiguous).toBe(1);
    expect(summary.joins_exact).toBe(0);
    expect(summary.joins_miss).toBe(0);
    expect(joins).toHaveLength(1);
    expect(joins[0].match_confidence).toBe("ambiguous");
    expect(joins[0].programs).toHaveLength(30);
  });

  it("keeps a match below the threshold as confidence='exact'", async () => {
    const labelsPath = buildSharedKeyLabels("labels-amb-10.json", 10);
    const phase8Path = writeJSONL("phase8-amb-10.jsonl", [
      phase8Row({ doc_id: "d1", part_numbers_clean: ["2845"] }),
    ]);

    const { summary, joins } = await blueprintProgramJoinEngine.joinBlueprintsToPrograms(
      phase8Path,
      { programLabelsPath: labelsPath, maxProgramsPerMatch: 25 },
    );

    expect(summary.joins_exact).toBe(1);
    expect(summary.joins_ambiguous).toBe(0);
    expect(joins[0].match_confidence).toBe("exact");
    expect(joins[0].programs).toHaveLength(10);
  });

  it("disables demotion when maxProgramsPerMatch=0 (all matches stay exact)", async () => {
    const labelsPath = buildSharedKeyLabels("labels-amb-50.json", 50);
    const phase8Path = writeJSONL("phase8-amb-50.jsonl", [
      phase8Row({ doc_id: "d1", part_numbers_clean: ["2845"] }),
    ]);

    const { summary, joins } = await blueprintProgramJoinEngine.joinBlueprintsToPrograms(
      phase8Path,
      { programLabelsPath: labelsPath, maxProgramsPerMatch: 0 },
    );

    expect(summary.joins_exact).toBe(1);
    expect(summary.joins_ambiguous).toBe(0);
    expect(joins[0].match_confidence).toBe("exact");
    expect(joins[0].programs).toHaveLength(50);
  });

  it("default threshold (25) trips on a 26-program collision", async () => {
    const labelsPath = buildSharedKeyLabels("labels-amb-26.json", 26);
    const phase8Path = writeJSONL("phase8-amb-26.jsonl", [
      phase8Row({ doc_id: "d1", part_numbers_clean: ["2845"] }),
    ]);

    // Omit maxProgramsPerMatch to exercise the default path.
    const { summary } = await blueprintProgramJoinEngine.joinBlueprintsToPrograms(
      phase8Path,
      { programLabelsPath: labelsPath },
    );

    expect(summary.joins_ambiguous).toBe(1);
    expect(summary.joins_exact).toBe(0);
  });
});

describe("joinBlueprintsToPrograms — customer variability", () => {
  it("indexes ALCOA, ACME, and ITW programs and joins each correctly", async () => {
    const labelsPath = writeLabels("labels-multi.json", [
      { filePath: "X\\ALCOA\\L-2845-D2.MIN", fileName: "L-2845-D2.MIN", customer: "ALCOA" },
      { filePath: "X\\ACME\\11-10715-0-A.MIN", fileName: "11-10715-0-A.MIN", customer: "ACME" },
      { filePath: "X\\ITW\\M-1280-1.NC", fileName: "M-1280-1.NC", customer: "ITW" },
    ]);
    const phase8Path = writeJSONL("phase8-multi.jsonl", [
      phase8Row({ doc_id: "d1", part_numbers_clean: ["2845"] }),
      phase8Row({ doc_id: "d2", part_numbers_clean: ["11-10715-0"] }),
      phase8Row({ doc_id: "d3", part_numbers_clean: ["1280-1"] }),
    ]);

    const { summary, joins } = await blueprintProgramJoinEngine.joinBlueprintsToPrograms(
      phase8Path,
      { programLabelsPath: labelsPath },
    );

    expect(summary.joins_exact).toBe(3);
    expect(summary.joins_miss).toBe(0);

    const customers = joins
      .flatMap((j) => j.programs.map((p) => p.customer))
      .sort();
    expect(customers).toEqual(["ACME", "ALCOA", "ITW"]);
  });

  it("multiple programs sharing a part number all attach to the same join record", async () => {
    const labelsPath = writeLabels("labels-revs.json", [
      { filePath: "X\\L-2845-D2.MIN", fileName: "L-2845-D2.MIN", customer: "ALCOA", materialHint: "D2" },
      { filePath: "X\\L-2845-A2.MIN", fileName: "L-2845-A2.MIN", customer: "ALCOA", materialHint: "A2" },
    ]);
    const phase8Path = writeJSONL("phase8-revs.jsonl", [
      phase8Row({ doc_id: "d1", part_numbers_clean: ["2845"] }),
    ]);

    const { joins } = await blueprintProgramJoinEngine.joinBlueprintsToPrograms(phase8Path, {
      programLabelsPath: labelsPath,
    });

    expect(joins).toHaveLength(1);
    expect(joins[0].programs).toHaveLength(2);
    const materials = joins[0].programs.map((p) => p.material).sort();
    expect(materials).toEqual(["A2", "D2"]);
  });

  it("merges master-index hits with labels hits without double-counting", async () => {
    const labelsPath = writeLabels("labels-merge.json", [
      { filePath: "X\\L-2845-D2.MIN", fileName: "L-2845-D2.MIN", customer: "ALCOA" },
    ]);
    const masterIndexPath = fix("master-index.json");
    fs.writeFileSync(
      masterIndexPath,
      JSON.stringify({
        schemaVersion: 1,
        files: [
          {
            fileId: "abc123",
            absolutePath: "H:\\CAD\\ALCOA\\2845.step",
            format: ".step",
            customer: "ALCOA",
            machineCategory: "unknown",
          },
        ],
      }),
      "utf-8",
    );
    const phase8Path = writeJSONL("phase8-merge.jsonl", [
      phase8Row({ doc_id: "d1", part_numbers_clean: ["2845"] }),
    ]);

    const { summary, joins } = await blueprintProgramJoinEngine.joinBlueprintsToPrograms(
      phase8Path,
      { programLabelsPath: labelsPath, masterIndexPath },
    );

    expect(summary.programs_indexed).toBe(2);
    expect(joins).toHaveLength(1);
    const sortedPrograms = joins[0].programs
      .slice()
      .sort((a, b) => a.filename.localeCompare(b.filename));
    expect(sortedPrograms.map((p) => p.filename)).toEqual([
      "2845.step",
      "L-2845-D2.MIN",
    ]);
    expect(sortedPrograms.map((p) => p.format ?? null)).toEqual([".step", null]);
    expect(sortedPrograms.map((p) => p.customer)).toEqual(["ALCOA", "ALCOA"]);
  });
});

// ============================================================================
// U-DOCU-04 / MS-DOCU-INGEST — QUERY LAYER
// loadJoinIndex / programForPrint / printForProgram / getJoinIndex cache, plus
// the prism_dev + prism_cam dispatcher round-trip (the unit's exit condition:
// the action must work THROUGH the dispatcher, not only the engine singleton).
// ============================================================================

/** Build one v6-join-JSONL row (superset of JoinRecord — see JoinIndexRow). */
function v6JoinRow(opts: {
  part_number: string;
  part_number_normalized?: string;
  match_confidence?: string;
  programs?: Array<{ source_path: string; customer?: string; filename?: string; via?: string }>;
  blueprints?: Array<{ doc_id: string; filename?: string; page_index?: number; drawing_score?: number }>;
  n_programs?: number;
  print_customers?: string[];
}): Record<string, unknown> {
  const row: Record<string, unknown> = {
    part_number: opts.part_number,
    part_number_normalized: opts.part_number_normalized ?? normalizePartNumber(opts.part_number),
    match_confidence: opts.match_confidence ?? "exact",
    programs: opts.programs ?? [],
    blueprints: (opts.blueprints ?? []).map((b) => ({
      doc_id: b.doc_id,
      filename: b.filename ?? `${b.doc_id}.pdf`,
      page_index: b.page_index ?? 0,
      drawing_score: b.drawing_score ?? 0.9,
    })),
  };
  if (opts.n_programs !== undefined) row.n_programs = opts.n_programs;
  if (opts.print_customers) row.print_customers = opts.print_customers;
  return row;
}

/** Build one training-triples-v4 JSONL row (see TrainingTripleRow). */
function trainingTriple(opts: {
  print_id: string;
  tb_part_number: string | null;
  print_disk_path?: string;
  candidate_programs?: Array<{ name: string; path: string; score: number }>;
  match_confidence?: number;
}): Record<string, unknown> {
  const cands = opts.candidate_programs ?? [];
  return {
    print_id: opts.print_id,
    print_filename: `${opts.print_id}.pdf`,
    print_disk_path: opts.print_disk_path ?? `H:/Docustrata/prints/${opts.print_id}.pdf`,
    tb_part_number: opts.tb_part_number,
    tb_drawing_number: null,
    tb_revision: null,
    tb_customer: null,
    tb_material: null,
    tb_description: null,
    candidate_programs: cands.map((c) => ({ name: c.name, path: c.path, score: c.score })),
    candidate_cad: [],
    match_confidence: opts.match_confidence ?? 0.95,
    has_program: cands.length > 0,
  };
}

// Canonical fixture corpus reused across the query-layer describe blocks.
// Program path uses backslashes on purpose so the case/slash-agnostic key
// normalization is exercised against a real Windows-style program path.
const ALCOA_PROGRAM = "H:\\PRISM\\JM DIE\\CNC LATHE\\ALCOA\\L-2845-D2.MIN";
const SFS_PROGRAM = "H:/PRISM/JM DIE/MILL/SFS/3120.NC";
const ITW_PROGRAM = "H:/PRISM/JM DIE/CNC LATHE/ITW/7700.MIN";

function writeFixtureJoin(name: string): string {
  return writeJSONL(name, [
    v6JoinRow({
      part_number: "2845",
      part_number_normalized: "2845",
      match_confidence: "exact",
      programs: [{ source_path: ALCOA_PROGRAM, customer: "ALCOA", via: "exact" }],
      blueprints: [{ doc_id: "doc-2845-p3", page_index: 3, drawing_score: 0.91 }],
      n_programs: 1,
      print_customers: ["ALCOA"],
    }),
    v6JoinRow({
      part_number: "L-3120-A2",
      part_number_normalized: "3120",
      match_confidence: "loose",
      programs: [{ source_path: SFS_PROGRAM, customer: "SFS" }],
      blueprints: [{ doc_id: "doc-3120-p1" }],
    }),
    // "garbage" is a v6-only match_confidence (~6.6% of the real corpus) — it
    // MUST load as a valid row, not be counted malformed (V6MatchConfidence).
    v6JoinRow({
      part_number: "OCR###JUNK",
      part_number_normalized: "OCRJUNK",
      match_confidence: "garbage",
      programs: [],
      blueprints: [],
    }),
  ]);
}

function writeFixtureTriples(name: string): string {
  return writeJSONL(name, [
    // Same PN as the v6 "2845" row AND the same program path → exercises the
    // "both" source on programForPrint and the dual-corpus links on printForProgram.
    trainingTriple({
      print_id: "tp-2845",
      tb_part_number: "2845",
      candidate_programs: [{ name: "L-2845-D2.MIN", path: ALCOA_PROGRAM, score: 0.99 }],
      match_confidence: 0.99,
    }),
    // PN present ONLY in the triples corpus → source "training_triple".
    trainingTriple({
      print_id: "tp-7700",
      tb_part_number: "7700",
      candidate_programs: [{ name: "7700.MIN", path: ITW_PROGRAM, score: 0.96 }],
      match_confidence: 0.96,
    }),
  ]);
}

describe("query layer — loadJoinIndex", () => {
  it("streams a v6 join JSONL into a queryable index keyed by normalized PN", async () => {
    const idx = await loadJoinIndex({ joinJsonlPath: writeFixtureJoin("ql-load-basic.jsonl") });
    expect(idx.stats.joinRows).toBe(3);
    expect(idx.stats.joinRowsMalformed).toBe(0);
    expect(idx.byNormalizedPN.has("2845")).toBe(true);
    expect(idx.byNormalizedPN.get("2845")!.match_confidence).toBe("exact");
    expect(idx.byNormalizedPN.get("3120")!.part_number).toBe("L-3120-A2");
  });

  it("accepts the v6-only 'garbage' match_confidence as a VALID row", async () => {
    const idx = await loadJoinIndex({ joinJsonlPath: writeFixtureJoin("ql-load-garbage.jsonl") });
    // garbage is in VALID_MATCH_CONFIDENCE — counted as a real row, not malformed.
    expect(idx.byNormalizedPN.has("OCRJUNK")).toBe(true);
    expect(idx.byNormalizedPN.get("OCRJUNK")!.match_confidence).toBe("garbage");
    expect(idx.stats.joinRowsMalformed).toBe(0);
  });

  it("counts a row with an out-of-union match_confidence as malformed", async () => {
    const p = writeJSONL("ql-load-bogus.jsonl", [
      v6JoinRow({ part_number: "1000", part_number_normalized: "1000" }),
      // "bogus" is NOT in VALID_MATCH_CONFIDENCE → isJoinIndexRow rejects it.
      v6JoinRow({ part_number: "2000", part_number_normalized: "2000", match_confidence: "bogus" }),
    ]);
    const idx = await loadJoinIndex({ joinJsonlPath: p });
    expect(idx.stats.joinRows).toBe(1);
    expect(idx.stats.joinRowsMalformed).toBe(1);
    expect(idx.byNormalizedPN.has("2000")).toBe(false);
  });

  it("streams the optional training-triples JSONL into triplesByPN", async () => {
    const idx = await loadJoinIndex({
      joinJsonlPath: writeFixtureJoin("ql-load-trip-join.jsonl"),
      triplesJsonlPath: writeFixtureTriples("ql-load-trip-trip.jsonl"),
    });
    expect(idx.stats.tripleRows).toBe(2);
    expect(idx.triplesByPN.has("2845")).toBe(true);
    expect(idx.triplesByPN.has("7700")).toBe(true);
    expect(idx.triplesByPN.get("7700")![0].print_id).toBe("tp-7700");
  });

  it("indexes program paths under a case/slash-normalized key", async () => {
    const idx = await loadJoinIndex({ joinJsonlPath: writeFixtureJoin("ql-load-paths.jsonl") });
    expect(idx.byProgramPath.has(normalizeProgramPathKey(ALCOA_PROGRAM))).toBe(true);
    expect(idx.byProgramPath.has(normalizeProgramPathKey(SFS_PROGRAM))).toBe(true);
  });

  it("FAIL-LOUD: throws when the join JSONL does not exist", async () => {
    await expect(
      loadJoinIndex({ joinJsonlPath: fix("ql-does-not-exist.jsonl") }),
    ).rejects.toThrow(/not found/);
  });

  it("FAIL-LOUD: throws when the join JSONL exists but yields 0 valid rows", async () => {
    const p = writeJSONL("ql-load-empty.jsonl", ["{not valid json", '{"part_number":"x"}']);
    await expect(loadJoinIndex({ joinJsonlPath: p })).rejects.toThrow(/0 valid rows/);
  });
});

describe("query layer — programForPrint", () => {
  let idx: Awaited<ReturnType<typeof loadJoinIndex>>;
  beforeAll(async () => {
    idx = await loadJoinIndex({
      joinJsonlPath: writeFixtureJoin("ql-pfp-join.jsonl"),
      triplesJsonlPath: writeFixtureTriples("ql-pfp-trip.jsonl"),
    });
  });

  it("resolves an exact normalized hit present in BOTH corpora", () => {
    const r = programForPrint("2845", idx);
    expect(r.found).toBe(true);
    expect(r.part_number_normalized).toBe("2845");
    expect(r.source).toBe("both"); // v6 join row + training triple tp-2845
    expect(r.match_confidence).toBe("exact");
    expect(r.programs).toHaveLength(1);
    expect(r.programs[0].customer).toBe("ALCOA");
    expect(r.n_programs).toBe(1);
    expect(r.print_customers).toEqual(["ALCOA"]);
    expect(r.training_programs).toHaveLength(1);
    expect(r.training_programs[0].path).toBe(ALCOA_PROGRAM);
  });

  it("resolves a loose-normalized query against the join row's normalized key", () => {
    // Raw query forms that all normalize to "3120" must hit the same v6 row.
    for (const raw of ["l-3120-a2", "3120-OP2", "  3120  "]) {
      const r = programForPrint(raw, idx);
      expect(r.found).toBe(true);
      expect(r.part_number_normalized).toBe("3120");
      expect(r.source).toBe("join_v6"); // no triple for 3120
      expect(r.match_confidence).toBe("loose");
      expect(r.programs[0].source_path).toBe(SFS_PROGRAM);
    }
  });

  it("returns a training-triple-only hit with an EMPTY programs[] array", () => {
    const r = programForPrint("7700", idx);
    expect(r.found).toBe(true);
    expect(r.source).toBe("training_triple");
    expect(r.programs).toHaveLength(0); // v6 join has no row for 7700
    expect(r.match_confidence).toBeNull();
    expect(r.training_programs).toHaveLength(1);
    expect(r.training_programs[0].name).toBe("7700.MIN");
  });

  it("returns found:false / source:none for a part number in neither corpus", () => {
    const r = programForPrint("NONEXISTENT-9999", idx);
    expect(r.found).toBe(false);
    expect(r.source).toBe("none");
    expect(r.match_confidence).toBeNull();
    expect(r.programs).toHaveLength(0);
    expect(r.training_programs).toHaveLength(0);
  });

  it("returns found:false on empty / whitespace part numbers", () => {
    expect(programForPrint("", idx).found).toBe(false);
    expect(programForPrint("   ", idx).found).toBe(false);
  });

  it("hands out spread-copied arrays — a mutated result cannot corrupt the cache", () => {
    const r1 = programForPrint("2845", idx);
    r1.programs.push({ source_path: "INJECTED" });
    r1.blueprints.push({ doc_id: "INJECTED", filename: "x", page_index: 0, drawing_score: 0 });
    const r2 = programForPrint("2845", idx);
    expect(r2.programs).toHaveLength(1); // unaffected by r1's mutation
    expect(r2.blueprints).toHaveLength(1);
  });
});

describe("query layer — printForProgram", () => {
  let idx: Awaited<ReturnType<typeof loadJoinIndex>>;
  beforeAll(async () => {
    idx = await loadJoinIndex({
      joinJsonlPath: writeFixtureJoin("ql-ptp-join.jsonl"),
      triplesJsonlPath: writeFixtureTriples("ql-ptp-trip.jsonl"),
    });
  });

  it("resolves a program path to its print(s), case- and slash-agnostically", () => {
    // Query with forward slashes + lowercase — must still hit the backslash key.
    const r = printForProgram("h:/prism/jm die/cnc lathe/alcoa/l-2845-d2.min", idx);
    expect(r.found).toBe(true);
    expect(r.program_path_key).toBe(normalizeProgramPathKey(ALCOA_PROGRAM));
    expect(r.links.length).toBeGreaterThan(0);
  });

  it("merges links from BOTH corpora for a path joined twice", () => {
    // ALCOA_PROGRAM appears in the v6 join row AND the tp-2845 training triple.
    const r = printForProgram(ALCOA_PROGRAM, idx);
    expect(r.found).toBe(true);
    const sources = r.links.map((l) => l.source).sort();
    expect(sources).toEqual(["join_v6", "training_triple"]);
    const v6Link = r.links.find((l) => l.source === "join_v6")!;
    expect(v6Link.print_doc_ids).toEqual(["doc-2845-p3"]);
    const tripleLink = r.links.find((l) => l.source === "training_triple")!;
    expect(tripleLink.print_disk_path).toBe("H:/Docustrata/prints/tp-2845.pdf");
    expect(tripleLink.print_id).toBe("tp-2845");
  });

  it("returns found:false / empty links for an unknown program path", () => {
    const r = printForProgram("H:/nowhere/unknown-program.min", idx);
    expect(r.found).toBe(false);
    expect(r.links).toHaveLength(0);
  });

  it("returns found:false / empty key for an empty path", () => {
    const r = printForProgram("   ", idx);
    expect(r.found).toBe(false);
    expect(r.program_path_key).toBe("");
  });
});

describe("query layer — getJoinIndex cache", () => {
  it("returns the same cached reference on a second call (mtime unchanged)", async () => {
    clearJoinIndexCache();
    const joinPath = writeFixtureJoin("ql-cache-hit.jsonl");
    const a = await getJoinIndex({ joinJsonlPath: joinPath });
    const b = await getJoinIndex(); // no opts — cache hit short-circuits
    expect(b).toBe(a);
  });

  it("reloads (new reference) when the join file's mtime changes", async () => {
    clearJoinIndexCache();
    const joinPath = writeFixtureJoin("ql-cache-mtime.jsonl");
    const a = await getJoinIndex({ joinJsonlPath: joinPath });
    // Bump the file's mtime into the future — the mtime guard must drop the cache.
    const future = new Date(Date.now() + 10_000);
    fs.utimesSync(joinPath, future, future);
    const b = await getJoinIndex({ joinJsonlPath: joinPath });
    expect(b).not.toBe(a); // fresh load
    expect(b.stats.joinRows).toBe(a.stats.joinRows); // same fixture content
  });

  it("clearJoinIndexCache forces a fresh load on the next call", async () => {
    clearJoinIndexCache();
    const joinPath = writeFixtureJoin("ql-cache-clear.jsonl");
    const a = await getJoinIndex({ joinJsonlPath: joinPath });
    clearJoinIndexCache();
    const c = await getJoinIndex({ joinJsonlPath: joinPath });
    expect(c).not.toBe(a);
  });

  afterAll(() => {
    // Leave the singleton clean for any later describe block in this file.
    clearJoinIndexCache();
  });
});

// ── Dispatcher round-trip (the unit's exit condition) ───────────────────────
// The dispatcher actions call queryProgramForPrint/queryPrintForProgram with NO
// path options — so they read getJoinIndex()'s singleton cache. We seed that
// cache from a fixture (getJoinIndex honors `options` on the initiating load),
// then every dispatcher call gets a cache HIT against the fixture data.

type DispHandler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createDispatcherHandler(register: (server: any) => void): Promise<DispHandler> {
  let resolve!: (h: DispHandler) => void;
  const handler = new Promise<DispHandler>((r) => (resolve = r));
  register({
    tool(_name: string, _desc: string, _schema: any, fn: DispHandler) {
      resolve(fn);
    },
  });
  return handler;
}

async function callDisp(
  handler: DispHandler,
  action: string,
  params: Record<string, any> = {},
): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text);
  } catch {
    return r;
  }
}

describe("query layer — prism_dev / prism_cam dispatcher round-trip", () => {
  let devHandler: DispHandler;
  let camHandler: DispHandler;

  beforeAll(async () => {
    // Seed the process-level singleton so the no-opts getJoinIndex() inside the
    // dispatcher cases resolves to the fixture, not the real 60 MB v6 join.
    clearJoinIndexCache();
    await getJoinIndex({
      joinJsonlPath: writeFixtureJoin("ql-disp-join.jsonl"),
      triplesJsonlPath: writeFixtureTriples("ql-disp-trip.jsonl"),
    });
    devHandler = await createDispatcherHandler(registerDevDispatcher);
    camHandler = await createDispatcherHandler(registerCamDispatcher);
  });

  afterAll(() => {
    clearJoinIndexCache();
  });

  it("prism_dev program_for_print returns a join hit through the dispatcher", async () => {
    const r = await callDisp(devHandler, "program_for_print", { part_number: "2845" });
    expect(r.success).toBe(true);
    expect(r.data.found).toBe(true);
    expect(r.data.source).toBe("both");
    expect(r.data.programs).toHaveLength(1);
    expect(r.data.programs[0].customer).toBe("ALCOA");
  });

  it("prism_dev print_for_program returns the print links through the dispatcher", async () => {
    const r = await callDisp(devHandler, "print_for_program", { program_path: ALCOA_PROGRAM });
    expect(r.success).toBe(true);
    expect(r.data.found).toBe(true);
    expect(r.data.links.map((l: any) => l.source).sort()).toEqual(["join_v6", "training_triple"]);
  });

  it("prism_dev program_for_print surfaces a training-triple-only hit through the dispatcher", async () => {
    // "7700" lives only in the triples corpus — the wire contract must still
    // report found:true / source:training_triple with the verified programs.
    const r = await callDisp(devHandler, "program_for_print", { part_number: "7700" });
    expect(r.success).toBe(true);
    expect(r.data.found).toBe(true);
    expect(r.data.source).toBe("training_triple");
    expect(r.data.training_programs).toHaveLength(1);
    expect(r.data.training_programs[0].name).toBe("7700.MIN");
  });

  it("prism_dev program_for_print returns found:false (not an error) for an unknown PN", async () => {
    // "no join row" is a valid answer, not a dispatcher error.
    const r = await callDisp(devHandler, "program_for_print", { part_number: "NONEXISTENT-9999" });
    expect(r.success).toBe(true);
    expect(r.data.found).toBe(false);
    expect(r.data.source).toBe("none");
  });

  it("prism_dev program_for_print rejects a missing required param (Zod gate)", async () => {
    const r = await callDisp(devHandler, "program_for_print", {});
    expect(r.success).not.toBe(true);
    expect(String(r.error)).toMatch(/invalid params/i);
  });

  it("prism_dev program_for_print rejects a whitespace-only part_number (case guard)", async () => {
    const r = await callDisp(devHandler, "program_for_print", { part_number: "   " });
    expect(r.success).not.toBe(true);
    expect(String(r.error)).toMatch(/part_number is required/i);
  });

  it("prism_dev print_for_program rejects a missing required param (Zod gate)", async () => {
    const r = await callDisp(devHandler, "print_for_program", {});
    expect(r.success).not.toBe(true);
    expect(String(r.error)).toMatch(/invalid params/i);
  });

  it("prism_cam cam_program_for_print returns a join hit through the dispatcher", async () => {
    const r = await callDisp(camHandler, "cam_program_for_print", { part_number: "2845" });
    expect(r.success).toBe(true);
    expect(r.data.found).toBe(true);
    expect(r.data.source).toBe("both");
    expect(r.data.programs[0].customer).toBe("ALCOA");
  });

  it("prism_cam cam_print_for_program returns the print links through the dispatcher", async () => {
    const r = await callDisp(camHandler, "cam_print_for_program", { program_path: ALCOA_PROGRAM });
    expect(r.success).toBe(true);
    expect(r.data.found).toBe(true);
    expect(r.data.links.map((l: any) => l.source).sort()).toEqual(["join_v6", "training_triple"]);
  });

  it("prism_cam cam_program_for_print rejects a missing required param", async () => {
    const r = await callDisp(camHandler, "cam_program_for_print", {});
    expect(r.success).not.toBe(true);
    expect(String(r.error)).toMatch(/invalid params/i);
  });

  it("prism_cam cam_print_for_program rejects a missing required param", async () => {
    const r = await callDisp(camHandler, "cam_print_for_program", {});
    expect(r.success).not.toBe(true);
    expect(String(r.error)).toMatch(/invalid params/i);
  });
});
