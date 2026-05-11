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

// ============================================================================
// PHASE 15 INGEST TESTS — deep-rescan aggregator (U-INGEST-PHASE15)
// ============================================================================

const samplePhase15Drawing = {
  doc_id: "p15-doc-1",
  filename: "BATCH-2024.pdf",
  disk_path: "H:\\Docustrata\\BATCH-2024.pdf",
  page_index: 5,
  fields: {
    part_numbers: ["DC-12345", "PF-998"],
    garbage_partnums: [],
    drawing_number: "DC-12345-A",
    revision: "B",
    material: "4140 PRE-HARD",
    customer: "ITW SHAKEPROOF",
    strong_indicators: 3,
    is_drawing_likely: true,
    ocr_chars: 1240,
  },
};

const samplePhase15NonDrawing = {
  doc_id: "p15-doc-2",
  filename: "BATCH-2024.pdf",
  disk_path: "H:\\Docustrata\\BATCH-2024.pdf",
  page_index: 0,
  fields: {
    part_numbers: [],
    garbage_partnums: [],
    drawing_number: null,
    revision: null,
    material: null,
    customer: null,
    strong_indicators: 0,
    is_drawing_likely: false,
    ocr_chars: 80,
  },
};

const samplePhase15ErrorRow = {
  doc_id: "p15-doc-3",
  page_index: 12,
  error: "page: FzErrorSystem: code=2: malloc (36049464 bytes) failed",
};

const samplePhase15NoPN = {
  doc_id: "p15-doc-4",
  filename: "MISC.pdf",
  disk_path: "H:\\Docustrata\\MISC.pdf",
  page_index: 3,
  fields: {
    part_numbers: [],
    garbage_partnums: ["19", "20"],
    drawing_number: null,
    revision: "A",
    material: null,
    customer: "VALLEY FASTENER GROUP",
    strong_indicators: 2,
    is_drawing_likely: true,
    ocr_chars: 480,
  },
};

describe("BlueprintOCREngine.ingestPhase15JSONL — happy path", () => {
  it("admits a drawing-likely row with part numbers and indexes by PN + customer", async () => {
    const file = writeJSONL("p15-happy.jsonl", [samplePhase15Drawing]);
    const { summary, byPartNumber, byCustomer } =
      await blueprintOCREngine.ingestPhase15JSONL(file);

    expect(summary.total_lines).toBe(1);
    expect(summary.parsed).toBe(1);
    expect(summary.drawing_pages).toBe(1);
    expect(summary.pages_with_pns).toBe(1);
    expect(summary.pages_with_customer).toBe(1);
    expect(summary.pages_with_drawing_number).toBe(1);
    expect(summary.pages_with_revision).toBe(1);
    expect(summary.pages_with_material).toBe(1);
    expect(summary.unique_part_numbers).toBe(2);
    expect(summary.unique_customers).toBe(1);
    expect(summary.unique_docs).toBe(1);
    expect(byPartNumber["DC-12345"]).toHaveLength(1);
    expect(byPartNumber["PF-998"]).toHaveLength(1);
    expect(byPartNumber["DC-12345"][0].drawing_number).toBe("DC-12345-A");
    expect(byPartNumber["DC-12345"][0].revision).toBe("B");
    expect(byPartNumber["DC-12345"][0].material).toBe("4140 PRE-HARD");
    expect(byCustomer["ITW SHAKEPROOF"]).toHaveLength(1);
  });

  it("indexes drawing-likely pages WITHOUT part numbers under __unknown__", async () => {
    const file = writeJSONL("p15-no-pn.jsonl", [samplePhase15NoPN]);
    const { summary, byPartNumber, byCustomer } =
      await blueprintOCREngine.ingestPhase15JSONL(file);

    expect(summary.drawing_pages).toBe(1);
    expect(summary.pages_with_pns).toBe(0);
    expect(summary.unique_part_numbers).toBe(0);
    expect(byPartNumber["__unknown__"]).toHaveLength(1);
    expect(byPartNumber["__unknown__"][0].revision).toBe("A");
    expect(byCustomer["VALLEY FASTENER GROUP"]).toHaveLength(1);
  });

  it("writes one IngestedPhase15Page JSONL line per admitted page when outPath set", async () => {
    const file = writeJSONL("p15-out.jsonl", [samplePhase15Drawing, samplePhase15NonDrawing]);
    const outFile = fixturePath("p15-out-ingested.jsonl");
    await blueprintOCREngine.ingestPhase15JSONL(file, { outPath: outFile });
    const lines = fs.readFileSync(outFile, "utf-8").trim().split("\n");
    expect(lines).toHaveLength(1); // only the drawing row admitted
    const row = JSON.parse(lines[0]);
    expect(row.doc_id).toBe("p15-doc-1");
    expect(row.part_numbers).toEqual(["DC-12345", "PF-998"]);
    expect(row.customer).toBe("ITW SHAKEPROOF");
  });

  it("aggregates the same part_number across multiple pages from different docs", async () => {
    const second = { ...samplePhase15Drawing, doc_id: "p15-doc-1b", page_index: 7 };
    const file = writeJSONL("p15-multipage.jsonl", [samplePhase15Drawing, second]);
    const { byPartNumber, summary } = await blueprintOCREngine.ingestPhase15JSONL(file);
    expect(byPartNumber["DC-12345"]).toHaveLength(2);
    expect(byPartNumber["DC-12345"][0].page_index).toBe(5);
    expect(byPartNumber["DC-12345"][1].page_index).toBe(7);
    expect(summary.unique_docs).toBe(2);
  });
});

describe("BlueprintOCREngine.ingestPhase15JSONL — failure modes", () => {
  it("throws when JSONL file does not exist", async () => {
    await expect(
      blueprintOCREngine.ingestPhase15JSONL(fixturePath("p15-missing.jsonl")),
    ).rejects.toThrow(/Phase 15 JSONL not found/);
  });

  it("counts malformed JSON lines and continues parsing the rest", async () => {
    const file = writeJSONL("p15-malformed.jsonl", [
      "this is not json",
      samplePhase15Drawing,
      "{unclosed",
    ]);
    const { summary } = await blueprintOCREngine.ingestPhase15JSONL(file);
    expect(summary.total_lines).toBe(3);
    expect(summary.malformed).toBe(2);
    expect(summary.parsed).toBe(1);
    expect(summary.drawing_pages).toBe(1);
  });

  it("filters out error rows (worker render_failed_oom, FzError) from the index", async () => {
    const file = writeJSONL("p15-errors.jsonl", [
      samplePhase15Drawing,
      samplePhase15ErrorRow,
      samplePhase15ErrorRow,
    ]);
    const { summary, byPartNumber } = await blueprintOCREngine.ingestPhase15JSONL(file);
    expect(summary.parsed).toBe(3);
    expect(summary.error_rows).toBe(2);
    expect(summary.drawing_pages).toBe(1);
    // Error rows must NOT pollute the index — only the 1 drawing row's PNs appear
    const allKeys = Object.keys(byPartNumber);
    expect(allKeys.sort()).toEqual(["DC-12345", "PF-998"]);
  });

  it("skips non-drawing rows when drawingOnly default (true)", async () => {
    const file = writeJSONL("p15-nondraw.jsonl", [samplePhase15NonDrawing]);
    const { summary, byPartNumber } = await blueprintOCREngine.ingestPhase15JSONL(file);
    expect(summary.parsed).toBe(1);
    expect(summary.drawing_pages).toBe(0);
    expect(Object.keys(byPartNumber)).toHaveLength(0);
  });

  it("admits non-drawing rows when drawingOnly=false", async () => {
    const file = writeJSONL("p15-nondraw-permissive.jsonl", [samplePhase15NonDrawing]);
    const { summary } = await blueprintOCREngine.ingestPhase15JSONL(file, { drawingOnly: false });
    expect(summary.drawing_pages).toBe(1);
  });
});

describe("BlueprintOCREngine.ingestPhase15JSONL — adversarial + filter inputs", () => {
  it("treats lines exceeding maxLineBytes as malformed (no JSON parse attempt)", async () => {
    const huge = "x".repeat(2000);
    const file = writeJSONL("p15-huge.jsonl", [huge, samplePhase15Drawing]);
    const { summary } = await blueprintOCREngine.ingestPhase15JSONL(file, { maxLineBytes: 1024 });
    expect(summary.malformed).toBe(1);
    expect(summary.drawing_pages).toBe(1);
  });

  it("rejects rows lacking required structural fields (doc_id / page_index)", async () => {
    const file = writeJSONL("p15-bad-struct.jsonl", [
      { page_index: 1 }, // missing doc_id
      { doc_id: "x", page_index: "not-a-number" }, // bad page_index type
      { doc_id: "y" }, // missing page_index
      samplePhase15Drawing,
    ]);
    const { summary } = await blueprintOCREngine.ingestPhase15JSONL(file);
    expect(summary.malformed).toBe(3);
    expect(summary.parsed).toBe(1);
  });

  it("minStrongIndicators raises the admit threshold above is_drawing_likely default", async () => {
    const weak = {
      ...samplePhase15Drawing,
      doc_id: "p15-weak",
      fields: { ...samplePhase15Drawing.fields, strong_indicators: 1 },
    };
    const file = writeJSONL("p15-strong.jsonl", [weak, samplePhase15Drawing]);
    // Default (minStrong=0) admits both
    const r1 = await blueprintOCREngine.ingestPhase15JSONL(file);
    expect(r1.summary.drawing_pages).toBe(2);
    // minStrong=2 excludes the weak row
    const r2 = await blueprintOCREngine.ingestPhase15JSONL(file, { minStrongIndicators: 2 });
    expect(r2.summary.drawing_pages).toBe(1);
  });

  it("handles empty file gracefully (zero counts, empty maps)", async () => {
    // Write a truly empty file (zero bytes) — writeJSONL appends a trailing
    // newline which counts as a line, so write directly here to test the
    // pure no-content case.
    const file = fixturePath("p15-empty.jsonl");
    fs.writeFileSync(file, "", "utf-8");
    const { summary, byPartNumber, byCustomer } = await blueprintOCREngine.ingestPhase15JSONL(file);
    expect(summary.total_lines).toBe(0);
    expect(summary.parsed).toBe(0);
    expect(summary.drawing_pages).toBe(0);
    expect(Object.keys(byPartNumber)).toHaveLength(0);
    expect(Object.keys(byCustomer)).toHaveLength(0);
  });
});
