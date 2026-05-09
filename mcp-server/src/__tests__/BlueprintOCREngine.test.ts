/**
 * BlueprintOCREngine — Phase 8 ingestion + analyzer tests
 *
 * Covers Phase 8 JSONL streaming ingestion (happy path, 3 failure modes,
 * 2 adversarial inputs) and the analyzer surface so the engine ships with
 * a matching test file (Stop hook wiring gate).
 */

import { describe, it, expect, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { blueprintOCREngine, type IngestedBlueprintRow } from "../engines/BlueprintOCREngine.js";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "blueprint-ocr-test-"));
const fixturePath = (name: string) => path.join(TMP, name);

function writeJSONL(file: string, rows: unknown[]): string {
  const p = fixturePath(file);
  fs.writeFileSync(
    p,
    rows.map((r) => (typeof r === "string" ? r : JSON.stringify(r))).join("\n") + "\n",
    "utf-8",
  );
  return p;
}

const sampleDrawingRow = {
  doc_id: "doc-1",
  filename: "PART-001.pdf",
  disk_path: "H:\\drawings\\PART-001.pdf",
  page_index: 0,
  tier1: { drawing_score: 0.85, black_density: 0.05, edge_density: 4.2, width_px: 850, height_px: 1100 },
  tier2: {
    is_drawing_likely: true,
    strong_indicators: 3,
    keyword_hits: 5,
    part_numbers: ["PART-001"],
    ocr_chars: 480,
    ocr_excerpt: "PART-001 REV A MATERIAL: 6061-T6 ALUMINUM 12.50 mm DIAMETER FLATNESS 0.05",
    part_numbers_clean: ["PART-001"],
  },
};

const sampleLowScoreRow = {
  doc_id: "doc-2",
  filename: "cover.pdf",
  disk_path: "H:\\drawings\\cover.pdf",
  page_index: 0,
  tier1: { drawing_score: 0.05, black_density: 0.001, edge_density: 0.4, width_px: 850, height_px: 1100 },
  tier2: { part_numbers_clean: [] },
};

afterAll(() => {
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe("BlueprintOCREngine.ingestPhase8JSONL — happy path", () => {
  it("parses a valid drawing row and emits one analyzed entry", async () => {
    const file = writeJSONL("happy.jsonl", [sampleDrawingRow]);
    const { summary, byPartNumber } = await blueprintOCREngine.ingestPhase8JSONL(file);

    expect(summary.total_lines).toBe(1);
    expect(summary.parsed).toBe(1);
    expect(summary.analyzed).toBe(1);
    expect(summary.malformed).toBe(0);
    expect(summary.unique_part_numbers).toBe(1);
    expect(byPartNumber["PART-001"]).toHaveLength(1);
    expect(byPartNumber["PART-001"][0].drawing_score).toBeCloseTo(0.85, 5);
    expect(byPartNumber["PART-001"][0].doc_id).toBe("doc-1");
  });

  it("skips low-score rows below default minDrawingScore=0.3", async () => {
    const file = writeJSONL("lowscore.jsonl", [sampleLowScoreRow]);
    const { summary, byPartNumber } = await blueprintOCREngine.ingestPhase8JSONL(file);

    expect(summary.parsed).toBe(1);
    expect(summary.analyzed).toBe(0);
    expect(Object.keys(byPartNumber)).toHaveLength(0);
  });

  it("aggregates multiple pages under the same part number", async () => {
    const r2 = { ...sampleDrawingRow, page_index: 1 };
    const file = writeJSONL("agg.jsonl", [sampleDrawingRow, r2]);
    const { byPartNumber, summary } = await blueprintOCREngine.ingestPhase8JSONL(file);

    expect(summary.analyzed).toBe(2);
    expect(byPartNumber["PART-001"]).toHaveLength(2);
    expect(byPartNumber["PART-001"][0].page_index).toBe(0);
    expect(byPartNumber["PART-001"][1].page_index).toBe(1);
  });

  it("writes an output JSONL when outPath is provided", async () => {
    const file = writeJSONL("out_in.jsonl", [sampleDrawingRow]);
    const outFile = fixturePath("out.jsonl");
    await blueprintOCREngine.ingestPhase8JSONL(file, { outPath: outFile });

    expect(fs.existsSync(outFile)).toBe(true);
    const lines = fs.readFileSync(outFile, "utf-8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]) as IngestedBlueprintRow;
    expect(parsed.doc_id).toBe("doc-1");
    expect(parsed.page_index).toBe(0);
    expect(parsed.drawing_score).toBeCloseTo(0.85, 5);
    expect(parsed.part_numbers).toEqual(["PART-001"]);
    expect(typeof parsed.analysis.summary.total_dimensions).toBe("number");
    expect(parsed.analysis.summary.total_dimensions).toBeGreaterThanOrEqual(0);
  });

  it("respects minDrawingScore option override", async () => {
    const mid = { ...sampleDrawingRow, tier1: { ...sampleDrawingRow.tier1, drawing_score: 0.2 } };
    const file = writeJSONL("mid.jsonl", [mid]);

    const { summary: s1 } = await blueprintOCREngine.ingestPhase8JSONL(file);
    expect(s1.analyzed).toBe(0);

    const { summary: s2 } = await blueprintOCREngine.ingestPhase8JSONL(file, { minDrawingScore: 0.1 });
    expect(s2.analyzed).toBe(1);
  });

  it("buckets pages without a part number under '__unknown__' and excludes from unique count", async () => {
    const noPart = {
      ...sampleDrawingRow,
      tier2: { ...sampleDrawingRow.tier2, ocr_excerpt: "12.5 mm DIA", part_numbers_clean: [] },
    };
    const file = writeJSONL("nopart.jsonl", [noPart]);
    const { summary, byPartNumber } = await blueprintOCREngine.ingestPhase8JSONL(file);

    expect(summary.analyzed).toBe(1);
    expect(byPartNumber["__unknown__"]).toHaveLength(1);
    expect(byPartNumber["__unknown__"][0].doc_id).toBe("doc-1");
    expect(summary.unique_part_numbers).toBe(0);
  });
});

describe("BlueprintOCREngine.ingestPhase8JSONL — failure modes", () => {
  it("throws when the input file does not exist", async () => {
    await expect(
      blueprintOCREngine.ingestPhase8JSONL(fixturePath("does-not-exist.jsonl")),
    ).rejects.toThrow(/not found/);
  });

  it("counts malformed JSON lines without aborting the stream", async () => {
    const file = writeJSONL("malformed.jsonl", ["{not valid json", JSON.stringify(sampleDrawingRow)]);
    const { summary } = await blueprintOCREngine.ingestPhase8JSONL(file);

    expect(summary.malformed).toBe(1);
    expect(summary.parsed).toBe(1);
    expect(summary.analyzed).toBe(1);
  });

  it("treats rows missing required fields as malformed (no crash)", async () => {
    const missingTier1 = { doc_id: "x", filename: "x.pdf", disk_path: "x", page_index: 0 };
    const file = writeJSONL("missing.jsonl", [missingTier1, sampleDrawingRow]);
    const { summary } = await blueprintOCREngine.ingestPhase8JSONL(file);

    expect(summary.malformed).toBe(1);
    expect(summary.analyzed).toBe(1);
  });

  it("skips rows with empty OCR excerpt AND no part numbers", async () => {
    const empty = {
      ...sampleDrawingRow,
      tier2: { part_numbers_clean: [], ocr_excerpt: "" },
    };
    const file = writeJSONL("empty-ocr.jsonl", [empty]);
    const { summary } = await blueprintOCREngine.ingestPhase8JSONL(file);

    expect(summary.parsed).toBe(1);
    expect(summary.analyzed).toBe(0);
    expect(summary.skipped_no_text).toBe(1);
  });
});

describe("BlueprintOCREngine.ingestPhase8JSONL — adversarial inputs", () => {
  it("treats non-numeric drawing_score as malformed (Number.isFinite guard)", async () => {
    const nanRow = {
      ...sampleDrawingRow,
      tier1: { ...sampleDrawingRow.tier1, drawing_score: "NaN" },
    };
    const file = writeJSONL("nan.jsonl", [nanRow]);
    const { summary } = await blueprintOCREngine.ingestPhase8JSONL(file);
    expect(summary.malformed).toBe(1);
    expect(summary.analyzed).toBe(0);
  });

  it("rejects oversize lines beyond maxLineBytes and continues stream", async () => {
    const oversize = "{\"a\":\"" + "X".repeat(2048) + "\"}";
    const file = writeJSONL("oversize.jsonl", [oversize, JSON.stringify(sampleDrawingRow)]);
    const { summary } = await blueprintOCREngine.ingestPhase8JSONL(file, { maxLineBytes: 1024 });

    expect(summary.malformed).toBe(1);
    expect(summary.analyzed).toBe(1);
  });
});

describe("BlueprintOCREngine — analyzer surface", () => {
  it("analyzeBlueprint returns populated summary fields with correct types", () => {
    const text = "PART-001 REV A 12.50 mm DIA FLATNESS 0.05 6061-T6 ALUMINUM";
    const r = blueprintOCREngine.analyzeBlueprint(text);
    expect(typeof r.summary.total_dimensions).toBe("number");
    expect(typeof r.summary.total_gdt).toBe("number");
    expect(typeof r.summary.total_notes).toBe("number");
    expect(Array.isArray(r.dimensions)).toBe(true);
    expect(Array.isArray(r.gdt_frames)).toBe(true);
  });

  it("detectUnit returns 'mm' on neutral text (default branch)", () => {
    expect(blueprintOCREngine.detectUnit("part with no units")).toBe("mm");
  });

  it("detectUnit picks 'in' on imperial-styled text", () => {
    expect(blueprintOCREngine.detectUnit("0.5000 INCHES BORE")).toBe("in");
  });
});
