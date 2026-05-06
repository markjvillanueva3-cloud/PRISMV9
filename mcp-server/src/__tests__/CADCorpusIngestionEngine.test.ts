import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { CADCorpusIngestionEngine } from "../engines/CADCorpusIngestionEngine.js";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const engine = new CADCorpusIngestionEngine();

let TMP_ROOT: string;

beforeAll(() => {
  TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "cad-corpus-test-"));
  const tree: Array<[string, number]> = [
    ["BATCH 1/HPC ROTOR BLISK STAGE 4.step", 1024],
    ["BATCH 1/CENTRIFUGAL IMPELLER 4140.step", 2048],
    ["BATCH 1/HPT BLADE STAGE 1.step", 512],
    ["BATCH 1/STATOR VANE SEG 6.iges", 768],
    ["BATCH 1/TURBINE CASING REAR.step", 4096],
    ["MEDICAL/HIP STEM SIZE 5.step", 800],
    ["MEDICAL/CORTICAL SCREW 3.5MM.step", 200],
    ["MEDICAL/KELLY FORCEPS 6.5IN.sldprt", 600],
    ["AUTO/LS3 V8 ENGINE BLOCK.ipt", 8192],
    ["AUTO/HYDRAULIC VALVE BODY.step", 3072],
    ["AUTO/FRONT BRAKE CALIPER.step", 5000],
    ["AERO/AFT PRESSURE BULKHEAD.step", 16384],
    ["AERO/WING ATTACH CLEVIS LUG 7075-T6.step", 700],
    ["AERO/AVIONICS MOUNTING BRACKET.step", 1500],
    ["TOOLING/EXTRUDE PUNCH JM-2475.step", 350],
    ["TOOLING/FORMING DIE PLATE.step", 900],
    ["TOOLING/DRIVE SHAFT 4140.step", 1100],
    ["BATCH 1/readme.txt", 50],
    ["BATCH 1/spec.pdf", 100_000],
    ["MISC/widget_assembly.step", 600],
  ];
  for (const [rel, size] of tree) {
    const full = path.join(TMP_ROOT, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, "x".repeat(size));
  }
});

afterAll(() => {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
});

// ──────────────────────────────────────────────────────────────────
// classifyFile
// ──────────────────────────────────────────────────────────────────

describe("CADCorpusIngestionEngine.classifyFile", () => {
  it("classifies blisk filename to part_class=blisk at confidence 0.95", () => {
    const r = engine.classifyFile("/abs/HPC ROTOR BLISK STAGE 4.step", "BATCH 1/HPC ROTOR BLISK STAGE 4.step");
    expect(r.part_class).toBe("blisk");
    expect(r.confidence).toBe(0.95);
    expect(r.match?.toUpperCase().includes("BLISK")).toBe(true);
  });

  it("classifies impeller at confidence 0.9", () => {
    const r = engine.classifyFile("/abs/CENTRIFUGAL IMPELLER.step", "B1/CENTRIFUGAL IMPELLER.step");
    expect(r.part_class).toBe("impeller");
    expect(r.confidence).toBe(0.9);
  });

  it("classifies medical implant at confidence 0.85", () => {
    const r = engine.classifyFile("/abs/HIP STEM SIZE 5.step", "MEDICAL/HIP STEM SIZE 5.step");
    expect(r.part_class).toBe("medical_implant");
    expect(r.confidence).toBe(0.85);
  });

  it("classifies aerospace lug at confidence 0.8", () => {
    const r = engine.classifyFile("/abs/CLEVIS LUG.step", "AERO/CLEVIS LUG.step");
    expect(r.part_class).toBe("lug");
    expect(r.confidence).toBe(0.8);
  });

  it("classifies extrude punch at confidence 0.9", () => {
    const r = engine.classifyFile("/abs/EXTRUDE PUNCH JM-2475.step", "TOOLING/EXTRUDE PUNCH JM-2475.step");
    expect(r.part_class).toBe("extrude_punch");
    expect(r.confidence).toBe(0.9);
  });

  it("falls back to part_class=general at confidence 0 for unclassifiable name", () => {
    const r = engine.classifyFile("/abs/widget_xyz.step", "MISC/widget_xyz.step");
    expect(r.part_class).toBe("general");
    expect(r.confidence).toBe(0);
    expect(r.match ?? "ABSENT").toBe("ABSENT");
  });

  it("first-match-wins ordering — IMPELLER beats SHAFT when both could match", () => {
    const r = engine.classifyFile("/abs/IMPELLER SHAFT.step", "x/IMPELLER SHAFT.step");
    expect(r.part_class).toBe("impeller");
  });
});

// ──────────────────────────────────────────────────────────────────
// ingestDirectory
// ──────────────────────────────────────────────────────────────────

describe("CADCorpusIngestionEngine.ingestDirectory", () => {
  it("walks the synthetic tree and ingests CAD files (>= 17 entries)", () => {
    const m = engine.ingestDirectory(TMP_ROOT);
    expect(m.total_entries).toBeGreaterThanOrEqual(17);
    expect(m.total_entries).toBeLessThanOrEqual(20);
    expect(m.schema_version).toBe("1.0.0");
    expect(m.root.endsWith(path.basename(TMP_ROOT))).toBe(true);
  });

  it("skips non-CAD files (.txt, .pdf) — count of those extensions is 0", () => {
    const m = engine.ingestDirectory(TMP_ROOT);
    expect(m.entries.filter((e) => e.ext === ".txt").length).toBe(0);
    expect(m.entries.filter((e) => e.ext === ".pdf").length).toBe(0);
  });

  it("populates by_class with synthetic-tree counts", () => {
    const m = engine.ingestDirectory(TMP_ROOT);
    expect(m.by_class.blisk).toBe(1);
    expect(m.by_class.impeller).toBe(1);
    expect(m.by_class.medical_implant).toBe(1);
    expect(m.by_class.engine_block).toBe(1);
    expect(m.by_class.bulkhead).toBe(1);
    expect(m.by_class.lug).toBe(1);
    expect(m.by_class.extrude_punch).toBe(1);
  });

  it("populates by_format with extension counts (.step >= 10, .sldprt = 1, .ipt = 1)", () => {
    const m = engine.ingestDirectory(TMP_ROOT);
    expect((m.by_format[".step"] ?? 0)).toBeGreaterThan(10);
    expect(m.by_format[".sldprt"]).toBe(1);
    expect(m.by_format[".ipt"]).toBe(1);
  });

  it("each entry carries non-zero size_bytes and mtime_ms", () => {
    const m = engine.ingestDirectory(TMP_ROOT);
    const first = m.entries[0]!;
    expect(first.size_bytes).toBeGreaterThan(0);
    expect(first.mtime_ms).toBeGreaterThan(0);
  });

  it("rel_path uses forward slashes regardless of platform", () => {
    const m = engine.ingestDirectory(TMP_ROOT);
    const backslashCount = m.entries.filter((e) => e.rel_path.includes("\\")).length;
    expect(backslashCount).toBe(0);
  });

  it("respects max_files cap (limit=5 → at most 5 entries)", () => {
    const m = engine.ingestDirectory(TMP_ROOT, { max_files: 5 });
    expect(m.total_entries).toBeLessThanOrEqual(5);
  });

  it("respects skip_segments (case-insensitive substring 'medical' filters MEDICAL/)", () => {
    const m = engine.ingestDirectory(TMP_ROOT, { skip_segments: ["medical"] });
    const medicalCount = m.entries.filter((e) => e.rel_path.toLowerCase().includes("medical")).length;
    expect(medicalCount).toBe(0);
  });

  it("throws when root does not exist", () => {
    expect(() => engine.ingestDirectory(path.join(TMP_ROOT, "does-not-exist"))).toThrow(/does not exist/);
  });

  it("throws when root is a file, not directory", () => {
    const filePath = path.join(TMP_ROOT, "BATCH 1/readme.txt");
    expect(() => engine.ingestDirectory(filePath)).toThrow(/not a directory/);
  });
});

// ──────────────────────────────────────────────────────────────────
// findByClass + summarize
// ──────────────────────────────────────────────────────────────────

describe("CADCorpusIngestionEngine.findByClass", () => {
  it("returns only entries of the given class (1 blisk in synthetic corpus)", () => {
    const m = engine.ingestDirectory(TMP_ROOT);
    const blisks = engine.findByClass(m, "blisk");
    expect(blisks.length).toBe(1);
    expect(blisks[0]?.part_class).toBe("blisk");
  });

  it("returns empty array (length 0) when no entries match", () => {
    const m = engine.ingestDirectory(TMP_ROOT, { skip_segments: ["batch 1"] });
    expect(engine.findByClass(m, "blisk").length).toBe(0);
  });

  it("respects limit param (limit=1 → length <= 1)", () => {
    const m = engine.ingestDirectory(TMP_ROOT);
    const allGeneral = engine.findByClass(m, "general", 1);
    expect(allGeneral.length).toBeLessThanOrEqual(1);
  });
});

describe("CADCorpusIngestionEngine.summarize", () => {
  it("classified + unclassified equals total", () => {
    const m = engine.ingestDirectory(TMP_ROOT);
    const s = engine.summarize(m);
    expect(s.total).toBe(m.total_entries);
    expect(s.classified + s.unclassified).toBe(s.total);
    expect(s.unclassified).toBeGreaterThanOrEqual(1);
  });

  it("by_class is sorted descending by count", () => {
    const m = engine.ingestDirectory(TMP_ROOT);
    const s = engine.summarize(m);
    for (let i = 1; i < s.by_class.length; i++) {
      expect(s.by_class[i - 1]!.count >= s.by_class[i]!.count).toBe(true);
    }
  });

  it("by_format is sorted descending by count", () => {
    const m = engine.ingestDirectory(TMP_ROOT);
    const s = engine.summarize(m);
    for (let i = 1; i < s.by_format.length; i++) {
      expect(s.by_format[i - 1]!.count >= s.by_format[i]!.count).toBe(true);
    }
  });
});

// ──────────────────────────────────────────────────────────────────
// saveManifest + loadManifest
// ──────────────────────────────────────────────────────────────────

describe("CADCorpusIngestionEngine.saveManifest / loadManifest", () => {
  it("round-trips manifest through disk preserving entries, counts, and schema", () => {
    const m1 = engine.ingestDirectory(TMP_ROOT);
    const filePath = path.join(TMP_ROOT, "_manifest.json");
    engine.saveManifest(m1, filePath);
    const m2 = engine.loadManifest(filePath);
    const m2NonNull = m2 ?? { total_entries: -1, schema_version: "MISSING", by_class: {} as Record<string, number> };
    expect(m2NonNull.total_entries).toBe(m1.total_entries);
    expect(m2NonNull.schema_version).toBe(m1.schema_version);
    expect(m2NonNull.by_class.blisk ?? 0).toBe(m1.by_class.blisk ?? 0);
  });

  it("loadManifest returns null sentinel when file is absent", () => {
    const out = engine.loadManifest(path.join(TMP_ROOT, "no-manifest.json"));
    expect(out === null).toBe(true);
  });

  it("loadManifest rejects schema_version mismatch (returns null)", () => {
    const filePath = path.join(TMP_ROOT, "_old_manifest.json");
    fs.writeFileSync(filePath, JSON.stringify({ schema_version: "0.0.1", entries: [] }), "utf8");
    expect(engine.loadManifest(filePath) === null).toBe(true);
  });

  it("loadManifest rejects malformed JSON (returns null)", () => {
    const filePath = path.join(TMP_ROOT, "_bad_manifest.json");
    fs.writeFileSync(filePath, "{ not json }", "utf8");
    expect(engine.loadManifest(filePath) === null).toBe(true);
  });
});
