/**
 * MillProgramCorpusEngine tests.
 *
 * Verifies the PRODUCER for print-to-program replication:
 *  - injected-reader unit tests (discovery, fail-soft, requireOperations gate,
 *    confidence gate, stats, persist/load round-trip, calculate routing),
 *  - a REAL-`.hmc` end-to-end (skip-loud when the JM corpus is not on this host —
 *    the "ship a real-data E2E for injected-reader engines" rule), and
 *  - the producer→consumer SEAM: a record this engine builds is actually
 *    retrievable + replicable by the wired MillProgramReplicationEngine.
 */

import { describe, it, expect, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  millProgramCorpusEngine,
  type CorpusFileEntry,
  type CorpusParser,
} from "../engines/MillProgramCorpusEngine.js";
import { millProgramReplicationEngine } from "../engines/MillProgramReplicationEngine.js";
import { hmcProjectParserEngine, type FeatureSequenceRecord } from "../engines/hypermill/HMCProjectParserEngine.js";
import type { RecognizedFeature } from "../engines/FeatureRecognitionEngine.js";

// ── fixtures ──────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];
function freshTmpDir(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "mill-corpus-test-"));
  tmpDirs.push(d);
  return d;
}
afterAll(() => {
  for (const d of tmpDirs) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }
  }
});

function makeFeature(id: string, axis: RecognizedFeature["orientation"]["axis"] = "z"): RecognizedFeature {
  return {
    id,
    type: "face",
    confidence: 0.9,
    dimensions: { width_mm: 50, length_mm: 50, depth_mm: 5 },
    position: { x: 0, y: 0, z: 0 },
    orientation: { axis },
    notes: [],
  };
}

/** Build a structurally-valid FeatureSequenceRecord (3-axis by default). */
function makeRecord(over: Partial<FeatureSequenceRecord> = {}): FeatureSequenceRecord {
  return {
    id: over.id ?? `rec_${Math.random().toString(36).slice(2, 8)}`,
    source: over.source ?? "hmc_project",
    partType: over.partType ?? "prismatic",
    partName: over.partName ?? "TEST PUNCH BLOCK",
    stock: over.stock ?? { type: "rectangular", dimensions: { x: 100, y: 80, z: 25 }, material: "D2", isoGroup: "K" },
    wcsList: over.wcsList ?? [],
    features: over.features ?? [makeFeature("f1"), makeFeature("f2")],
    operations: over.operations ?? [
      {
        index: 0, name: "Face rough", cycleCode: "MAXX_ROUGHING", operationType: "roughing",
        tool: { toolNumber: 1, name: "EM12", type: "endmill_flat", diameterMm: 12 },
        parameters: { feedrate: 800 }, targetFeatures: ["face"], dependsOn: [], estimatedCycleTimeSec: 60,
      },
    ],
    totalCycleTimeSec: over.totalCycleTimeSec ?? 60,
    toolChangeCount: over.toolChangeCount ?? 1,
    uniqueToolCount: over.uniqueToolCount ?? 1,
    createdAt: over.createdAt ?? "2026-01-01T00:00:00.000Z",
    complexityScore: over.complexityScore ?? 3,
    warnings: over.warnings ?? [],
  };
}

// ── unit: build orchestration (injected readers) ────────────────────────────────

describe("MillProgramCorpusEngine.buildCorpus (injected readers)", () => {
  const goodEntry: CorpusFileEntry = { path: "/fake/good.hmc", ext: ".hmc", stem: "good", customer: "ACME", machine: "mill_haas" };
  const failEntry: CorpusFileEntry = { path: "/fake/unreadable.hmc", ext: ".hmc", stem: "unreadable" };
  const emptyOpsEntry: CorpusFileEntry = { path: "/fake/noops.hmc", ext: ".hmc", stem: "noops" };

  const indexReader = () => [goodEntry, failEntry, emptyOpsEntry];
  const fileReader = (p: string): string => {
    if (p === failEntry.path) throw new Error("EACCES");
    return `<hmc>${p}</hmc>`;
  };
  const parser: CorpusParser = (_content, opts) => {
    if (opts?.projectName === "noops") {
      return { record: makeRecord({ partName: "noops", operations: [] }), confidence: 0.9 };
    }
    return { record: makeRecord({ partName: opts?.projectName ?? "x" }), confidence: 0.9 };
  };

  it("discovers, parses, and counts fail-soft + empty-ops skips", () => {
    const r = millProgramCorpusEngine.buildCorpus({ indexReader, fileReader, parser });
    expect(r.ok).toBe(true);
    expect(r.stats.filesDiscovered).toBe(3);
    expect(r.records.length).toBe(1);                 // good only
    expect(r.stats.filesParsed).toBe(1);
    expect(r.stats.filesFailed).toBe(1);              // unreadable.hmc → read threw
    expect(r.stats.filesSkippedNoOperations).toBe(1); // noops.hmc → empty operations
    expect(r.failures[0].path).toBe(failEntry.path);
    expect(r.failures[0].reason).toMatch(/read failed/i);
    expect(r.stats.byAxis["3"]).toBe(1);              // record is 3-axis
    // provenance tagged onto the kept record
    expect((r.records[0] as Record<string, unknown>).sourceFile).toBe(goodEntry.path);
    expect((r.records[0] as Record<string, unknown>).sourceMachine).toBe("mill_haas");
  });

  it("keeps empty-ops records when requireOperations=false", () => {
    const r = millProgramCorpusEngine.buildCorpus({ indexReader, fileReader, parser, requireOperations: false });
    expect(r.records.length).toBe(2);                 // good + noops, fail still drops
    expect(r.stats.filesSkippedNoOperations).toBe(0);
    expect(r.stats.filesFailed).toBe(1);
  });

  it("honors the confidence gate", () => {
    const lowConf: CorpusParser = () => ({ record: makeRecord(), confidence: 0.1 });
    const r = millProgramCorpusEngine.buildCorpus({
      indexReader: () => [goodEntry], fileReader, parser: lowConf, minConfidence: 0.5,
    });
    expect(r.records.length).toBe(0);
    expect(r.stats.filesSkippedLowConfidence).toBe(1);
  });

  it("treats empty discovery as ok-with-warning (not an error)", () => {
    const r = millProgramCorpusEngine.buildCorpus({ indexReader: () => [], fileReader, parser });
    expect(r.ok).toBe(true);
    expect(r.records.length).toBe(0);
    expect(r.warnings.some((w) => /no source files/i.test(w))).toBe(true);
  });

  it("fails loud when the index file cannot be read", () => {
    const r = millProgramCorpusEngine.buildCorpus({ indexPath: path.join(os.tmpdir(), "definitely-missing-index.jsonl") });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/failed to read files index/i);
  });

  it("respects maxFiles and reports the cap", () => {
    const r = millProgramCorpusEngine.buildCorpus({ indexReader, fileReader, parser, maxFiles: 1 });
    expect(r.stats.filesDiscovered).toBe(3);
    expect(r.records.length).toBe(1);                 // only the first (good) entry parsed
    expect(r.warnings.some((w) => /capped at 1\/3/.test(w))).toBe(true);
  });

  it("classifies axis count from operations and features", () => {
    const five = makeRecord({
      operations: [{
        index: 0, name: "5x", cycleCode: "SWARF", operationType: "5axis",
        tool: { toolNumber: 1, name: "BM6", type: "endmill_ball", diameterMm: 6 },
        parameters: {}, targetFeatures: [], dependsOn: [],
      }],
    });
    const four = makeRecord({ features: [makeFeature("rot", "custom")] });
    const stats = millProgramCorpusEngine.computeStats([makeRecord(), four, five]);
    expect(stats.byAxis["3"]).toBe(1);
    expect(stats.byAxis["4"]).toBe(1);
    expect(stats.byAxis["5"]).toBe(1);
    expect(stats.withOperations).toBe(3);
    expect(stats.totalOperations).toBe(3);
  });
});

// ── unit: persistence round-trip + calculate routing ───────────────────────────

describe("MillProgramCorpusEngine persistence + dispatcher routing", () => {
  it("persists to JSONL + manifest and loads back identically", () => {
    const outDir = freshTmpDir();
    const records = [makeRecord({ id: "a" }), makeRecord({ id: "b", operations: [
      { index: 0, name: "5x", cycleCode: "C", operationType: "5axis",
        tool: { toolNumber: 1, name: "t", type: "endmill_ball", diameterMm: 6 },
        parameters: {}, targetFeatures: [], dependsOn: [] },
    ] })];
    const p = millProgramCorpusEngine.persist(records, outDir);
    expect(p.ok).toBe(true);
    expect(p.count).toBe(2);
    expect(fs.existsSync(p.corpusPath)).toBe(true);
    expect(fs.existsSync(p.manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(p.manifestPath, "utf8"));
    expect(manifest.schemaVersion).toBe("1.0.0");
    expect(manifest.count).toBe(2);
    expect(manifest.stats.byAxis["5"]).toBe(1);
    expect(manifest.owner_slot).toBe("foxtrot");

    const loaded = millProgramCorpusEngine.load(p.corpusPath);
    expect(loaded.map((r) => r.id).sort()).toEqual(["a", "b"]);
    expect(loaded.find((r) => r.id === "a")?.operations.length).toBe(1);
  });

  it("load() returns [] for an absent corpus and re-reads after persist invalidates cache", () => {
    const outDir = freshTmpDir();
    const corpusPath = path.join(outDir, "jm-mill-corpus.jsonl");
    expect(millProgramCorpusEngine.load(corpusPath)).toEqual([]);     // absent → []
    millProgramCorpusEngine.persist([makeRecord({ id: "z" })], outDir);
    expect(millProgramCorpusEngine.load(corpusPath).map((r) => r.id)).toEqual(["z"]); // cache invalidated
  });

  it("calculate() routes corpus_stats and rejects unknown actions", () => {
    const outDir = freshTmpDir();
    millProgramCorpusEngine.persist([makeRecord(), makeRecord()], outDir);
    const stats = millProgramCorpusEngine.calculate("corpus_stats", {
      corpus_path: path.join(outDir, "jm-mill-corpus.jsonl"),
    }) as { ok: boolean; exists: boolean; total: number };
    expect(stats.ok).toBe(true);
    expect(stats.exists).toBe(true);
    expect(stats.total).toBe(2);

    const missing = millProgramCorpusEngine.calculate("corpus_stats", { corpus_path: "/nope.jsonl" }) as {
      exists: boolean; total: number;
    };
    expect(missing.exists).toBe(false);
    expect(missing.total).toBe(0);

    const build = millProgramCorpusEngine.calculate("corpus_build", { index_path: "/definitely/missing.jsonl" }) as {
      ok: boolean;
    };
    expect(build.ok).toBe(false);                 // index read fails → ok:false routed through

    expect(() => millProgramCorpusEngine.calculate("bogus_action", {})).toThrow(/unknown action/i);
  });
});

// ── seam: producer → consumer (the whole point) ────────────────────────────────

describe("MillProgramCorpusEngine → MillProgramReplicationEngine seam", () => {
  it("a built corpus record is retrievable + replicable by the replication engine", () => {
    const features = [makeFeature("f1"), makeFeature("f2")];
    const record = makeRecord({ id: "src1", partName: "SALVI PUNCH BLOCK", features });

    // Build a corpus the way production would (injected sources), then feed it
    // to the consumer exactly as the dispatcher will (no inline corpus from the
    // caller — it comes from the producer).
    const built = millProgramCorpusEngine.buildCorpus({
      indexReader: () => [{ path: "/fake/src1.hmc", ext: ".hmc", stem: "SALVI PUNCH BLOCK" }],
      fileReader: () => "<hmc/>",
      parser: () => ({ record, confidence: 0.95 }),
    });
    expect(built.records.length).toBe(1);

    const result = millProgramReplicationEngine.replicateFromPrint({
      partName: "NEW SALVI BLOCK",
      material: "D2",
      isoGroup: "K",
      dimensions: { x: 100, y: 80, z: 25 },
      features,                         // same features → strong similarity to src1
      corpus: built.records,            // the producer's output is the consumer's fuel
      targetAxisCount: 3,
      minScore: 1,
    });

    expect(result.ok).toBe(true);
    expect(result.provenance.sourceProgramId).toBe("src1");
    expect(result.provenance.sourceProgramName).toBe("SALVI PUNCH BLOCK");
    expect(result.provenance.sourceAxisCount).toBe(3);
    expect(result.candidatesEvaluated).toBe(1);
    expect(result.candidatesRejectedByAxis).toBe(0);
  });

  it("axis-gate rejects a corpus that needs more axes than the target machine", () => {
    const features = [makeFeature("f1")];
    const fiveAxisRecord = makeRecord({
      id: "five", features,
      operations: [{
        index: 0, name: "swarf", cycleCode: "SWARF_5X", operationType: "5axis",
        tool: { toolNumber: 1, name: "BM6", type: "endmill_ball", diameterMm: 6 },
        parameters: {}, targetFeatures: [], dependsOn: [],
      }],
    });
    const result = millProgramReplicationEngine.replicateFromPrint({
      partName: "p", material: "D2", isoGroup: "K",
      dimensions: { x: 100, y: 80, z: 25 },
      features, corpus: [fiveAxisRecord], targetAxisCount: 3, minScore: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.candidatesRejectedByAxis).toBe(1);
    expect(result.reason).toMatch(/axis gate/i);
  });
});

// ── real-data E2E (skip-loud when the JM corpus is not on this host) ────────────

/** Find a real, readable JM `.hmc` via juliett's index; null when unavailable. */
function findRealHmc(): { indexEntry: CorpusFileEntry; content: string } | null {
  const candidates = [
    path.resolve(__dirname, "../../data/jm-die-database/tables/files.jsonl"),
    path.resolve(process.cwd(), "data/jm-die-database/tables/files.jsonl"),
  ];
  const indexPath = candidates.find((c) => { try { return fs.existsSync(c); } catch { return false; } });
  if (!indexPath) return null;
  let lines: string[];
  try { lines = fs.readFileSync(indexPath, "utf8").split("\n"); } catch { return null; }
  for (const line of lines) {
    if (!line.includes(".hmc")) continue;
    let row: { path?: string; ext?: string; stem?: string; machine?: string };
    try { row = JSON.parse(line); } catch { continue; }
    if (row.ext !== ".hmc" || typeof row.path !== "string") continue;
    try {
      const content = fs.readFileSync(row.path, "utf8");
      if (content.trim() !== "") {
        return { indexEntry: { path: row.path, ext: ".hmc", stem: row.stem, machine: row.machine }, content };
      }
    } catch { /* file listed but not on disk — try the next */ }
  }
  return null;
}

const realHmc = findRealHmc();
if (!realHmc) {
  // SKIP-LOUD: surface that the real-data arm did not run rather than hiding it.
  console.warn(
    "[MillProgramCorpusEngine.test] SKIP-LOUD: no readable JM .hmc found on this host — " +
      "ran injected-reader + producer→consumer seam coverage only (real-data E2E skipped).",
  );
}

describe("MillProgramCorpusEngine real-data E2E", () => {
  (realHmc ? it : it.skip)("parses a REAL JM .hmc through the production path with no silent loss", () => {
    const rh = realHmc as NonNullable<typeof realHmc>;

    // 1. the real HMC parser handles the real file content
    const direct = hmcProjectParserEngine.parse(rh.content, { projectName: rh.indexEntry.stem });
    expect(direct.record.source).toBe("hmc_project");

    // 2. the engine's production path (real fileReader + real parser) discovers
    //    and FULLY accounts for the file (no silent loss), keeping it iff it
    //    carries operations — tied to the real parse result above.
    const built = millProgramCorpusEngine.buildCorpus({ indexReader: () => [rh.indexEntry] });
    expect(built.ok).toBe(true);
    expect(built.stats.filesDiscovered).toBe(1);
    expect(built.stats.filesParsed + built.stats.filesFailed + built.stats.filesSkippedNoOperations).toBe(1);

    const expectKept = direct.record.operations.length > 0 ? 1 : 0;
    expect(built.records.length).toBe(expectKept);
    expect(built.stats.filesParsed).toBe(expectKept);
  });
});
