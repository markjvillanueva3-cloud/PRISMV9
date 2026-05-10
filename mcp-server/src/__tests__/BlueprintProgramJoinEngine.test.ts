/**
 * BlueprintProgramJoinEngine — Phase 8 → JM Die join table tests
 *
 * Covers normalization, candidate extraction, program indexing, and the
 * full streaming join (happy path, failure modes, adversarial inputs,
 * cross-customer variability). All assertions check concrete values
 * (no presence-only / toBeDefined placeholders).
 */

import { describe, it, expect, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  blueprintProgramJoinEngine,
  normalizePartNumber,
  extractPartNumberCandidates,
  type ProgramFileRef,
} from "../engines/BlueprintProgramJoinEngine.js";

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
