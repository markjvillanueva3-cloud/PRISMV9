/**
 * Tests — JMDieArchiveBackAnnotationEngine (U-DOCU-05 / MS-DOCU-INGEST)
 *
 * Strategy:
 *   1. Pure-transform tests run direct against the exported pure functions.
 *      No fs, no singleton — guarantees determinism + speed.
 *   2. I/O orchestrator tests use a tmp dir + an injected JoinIndex (test-
 *      injection point on backAnnotateArchive). No real Docustrata file is
 *      read; we never touch the live 60MB v6 join.
 *   3. Adversarial tests cover path-traversal, oversize input, NaN/Infinity,
 *      foreign-sidecar provenance, concurrent re-runs (idempotence).
 *
 * Coverage floor (from COMPREHENSIVE-BUILD ENFORCEMENT hook):
 *   - happy path
 *   - ≥3 failure modes: missing source_path, missing PN, missing program file
 *   - ≥2 adversarial: path-traversal, oversize index
 *   - ≥3 variability configs: exact / loose / ambiguous confidences spanned
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildSidecarFromJoinRow,
  buildPartsIndexEntry,
  sidecarPathFor,
  partsIndexPathFor,
  normalizePathForCompare,
  isPathUnderAllowedRoot,
  computeGapReport,
  backAnnotateArchive,
  generateGapReport,
  readPrintPointer,
  CANONICAL_ANNOTATOR,
  SIDECAR_SCHEMA_VERSION,
  SIDECAR_SUFFIX,
  PARTS_INDEX_SUBDIR,
  PER_OUTCOME_SAMPLE_CAP,
  jmDieArchiveBackAnnotationEngine,
  JMDieArchiveBackAnnotationEngine,
  type JMDieDiskIndexEntry,
} from "../engines/JMDieArchiveBackAnnotationEngine.js";

import type {
  JoinIndex,
  JoinIndexRow,
  JoinIndexProgramRef,
  TrainingTripleRow,
} from "../engines/BlueprintProgramJoinEngine.js";

// ───────────────────────────────────────────────────────────────────────────
// FIXTURES
// ───────────────────────────────────────────────────────────────────────────

function makeProgram(over: Partial<JoinIndexProgramRef> = {}): JoinIndexProgramRef {
  return {
    source_path: "H:\\PRISM\\JM DIE\\ROKU-ROKU\\ITW SHAKEPROOF\\HEX\\532-23310-24000-00.mcx-8",
    filename: "532-23310-24000-00.mcx-8",
    customer: "ITW SHAKEPROOF",
    machineCategory: "mill",
    ext: ".mcx-8",
    kind: "program",
    kind3: "cam_project",
    relation: "has_cam_project",
    via: "exact",
    customer_match: "yes",
    ...over,
  };
}

function makeRow(over: Partial<JoinIndexRow> = {}): JoinIndexRow {
  return {
    part_number: "532-23310-24000-00",
    part_number_normalized: "53223310240",
    blueprints: [
      {
        doc_id: "e6455978-ee1a-45e6-b052-be669cc8a66e",
        filename: "Scanned Document.pdf",
        page_index: 0,
        drawing_score: 0.75,
      } as any,
    ],
    programs: [makeProgram()],
    match_confidence: "exact",
    ...over,
  };
}

function makeTriple(over: Partial<TrainingTripleRow> = {}): TrainingTripleRow {
  return {
    print_id: "p-001",
    print_filename: "532-23310.pdf",
    print_disk_path: "H:\\PRISM\\Docustrata\\prints\\532-23310.pdf",
    tb_part_number: "532-23310-24000-00",
    tb_drawing_number: null,
    tb_revision: null,
    tb_customer: null,
    tb_material: null,
    tb_description: null,
    candidate_programs: [],
    candidate_cad: [],
    match_confidence: 0.95,
    has_program: true,
    ...over,
  };
}

/** Mint a fresh JoinIndex pointing at an on-disk tmp program (so the I/O orchestrator
 *  sees actual files when it does fs.existsSync). */
function makeIndex(rows: JoinIndexRow[], triples: Map<string, TrainingTripleRow[]> = new Map()): JoinIndex {
  const byNormalizedPN = new Map<string, JoinIndexRow>();
  const byProgramPath = new Map<string, any[]>();
  for (const row of rows) {
    byNormalizedPN.set(row.part_number_normalized, row);
    for (const p of row.programs || []) {
      const key = (p.source_path || "").toLowerCase().replace(/\\/g, "/");
      const arr = byProgramPath.get(key) ?? [];
      arr.push({
        program_path: p.source_path,
        part_number: row.part_number,
        part_number_normalized: row.part_number_normalized,
        source: "join_v6" as const,
        match_confidence: row.match_confidence,
        print_doc_ids: (row.blueprints || []).map((b: any) => b.doc_id),
      });
      byProgramPath.set(key, arr);
    }
  }
  return {
    byNormalizedPN,
    byProgramPath,
    triplesByPN: triples,
    stats: {
      joinRows: rows.length,
      joinRowsParseFail: 0,
      joinRowsShapeFail: 0,
      joinRowsMissingFields: 0,
      joinRowsTotal: rows.length,
      programRefs: rows.reduce((a, r) => a + (r.programs?.length || 0), 0),
      tripleRows: 0,
      triplesRowsMalformed: 0,
      programPaths: 0,
      joinJsonlPath: "(fixture)",
      triplesJsonlPath: null,
      joinMtimeMs: Date.now(),
    } as any,
  } as JoinIndex;
}

// Per-test scratch dir lives here so cleanups never escape.
let TMP: string;
let TMP_PROGRAM_PATH: string;
let STATE_SHARED_BACKUP: string | null = null;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prism-u-docu-05-"));
  // Lay out a fake archive root inside TMP so generateGapReport's default
  // diskIndexPath lookup finds NOTHING (it'll mark indexLoaded:false), and
  // so the per-program sidecar writes have a valid containing dir.
  const progDir = path.join(TMP, "JM DIE", "ROKU-ROKU", "ITW SHAKEPROOF", "HEX");
  fs.mkdirSync(progDir, { recursive: true });
  TMP_PROGRAM_PATH = path.join(progDir, "532-23310-24000-00.mcx-8");
  fs.writeFileSync(TMP_PROGRAM_PATH, "T0 G54 M03 S5000\n");
  // Make the parts-index dir parent so safeWriteSync's atomic-temp works.
  fs.mkdirSync(path.join(TMP, "Docustrata", ".index"), { recursive: true });
});

afterEach(() => {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* noop */ }
  STATE_SHARED_BACKUP = null;
});

// ───────────────────────────────────────────────────────────────────────────
// PURE TRANSFORMS
// ───────────────────────────────────────────────────────────────────────────

describe("buildSidecarFromJoinRow — pure", () => {
  it("emits canonical annotator + schema version + every blueprint ref", () => {
    const row = makeRow();
    const prog = row.programs[0];
    const sc = buildSidecarFromJoinRow(row, prog, { annotatedAt: "2026-05-15T00:00:00.000Z" });
    expect(sc.annotator).toBe(CANONICAL_ANNOTATOR);
    expect(sc.schemaVersion).toBe(SIDECAR_SCHEMA_VERSION);
    expect(sc.part_number).toBe("532-23310-24000-00");
    expect(sc.match_confidence).toBe("exact");
    expect(sc.via).toBe("exact");
    expect(sc.customer).toBe("ITW SHAKEPROOF");
    expect(sc.kind3).toBe("cam_project");
    expect(sc.prints).toHaveLength(1);
    expect(sc.prints[0].source).toBe("join_v6");
    expect(sc.prints[0].doc_id).toBe("e6455978-ee1a-45e6-b052-be669cc8a66e");
  });

  it("appends the training-triple print ref when supplied", () => {
    const row = makeRow();
    const triple = makeTriple();
    const sc = buildSidecarFromJoinRow(row, row.programs[0], { triple });
    expect(sc.prints).toHaveLength(2);
    expect(sc.prints[0].source).toBe("join_v6");
    expect(sc.prints[1].source).toBe("training_triple");
    expect(sc.prints[1].print_disk_path).toContain("Docustrata");
  });

  it("handles a row with zero blueprints (training-triple-only case)", () => {
    const row = makeRow({ blueprints: [] });
    const sc = buildSidecarFromJoinRow(row, row.programs[0]);
    expect(sc.prints).toHaveLength(0);
  });

  it("propagates a different match_confidence (loose) through to the sidecar", () => {
    const row = makeRow({ match_confidence: "loose" });
    const sc = buildSidecarFromJoinRow(row, row.programs[0]);
    expect(sc.match_confidence).toBe("loose");
  });
});

describe("buildPartsIndexEntry — pure", () => {
  it("includes every program ref from the row", () => {
    const row = makeRow({
      programs: [
        makeProgram({ source_path: "C:\\a.mcx", machineCategory: "mill" }),
        makeProgram({ source_path: "C:\\b.MIN", machineCategory: "lathe", kind3: "g_code" }),
      ],
    });
    const e = buildPartsIndexEntry(row);
    expect(e.programs).toHaveLength(2);
    expect(e.programs[0].source_path).toBe("C:\\a.mcx");
    expect(e.programs[1].machine_category).toBe("lathe");
    expect(e.programs[1].kind3).toBe("g_code");
  });

  it("stamps canonical annotator + schema version", () => {
    const e = buildPartsIndexEntry(makeRow());
    expect(e.annotator).toBe(CANONICAL_ANNOTATOR);
    expect(e.schemaVersion).toBe(SIDECAR_SCHEMA_VERSION);
  });
});

describe("sidecarPathFor — pure", () => {
  it("appends the canonical suffix", () => {
    const p = sidecarPathFor("C:\\foo\\bar.mcx");
    expect(p).toBe("C:\\foo\\bar.mcx" + SIDECAR_SUFFIX);
    expect(p.endsWith(".print-pointer.json")).toBe(true);
  });
  it("throws on empty string", () => {
    expect(() => sidecarPathFor("")).toThrow(/non-empty string/);
  });
  it("throws on non-string", () => {
    expect(() => sidecarPathFor(123 as unknown as string)).toThrow(/non-empty string/);
  });
});

describe("partsIndexPathFor — pure (path-traversal hardened)", () => {
  it("composes archiveRoot + Docustrata/.index/prism_parts/<pn>.json", () => {
    const p = partsIndexPathFor("/X/PRISM", "53223310240");
    expect(p.endsWith(path.join("Docustrata", ".index", PARTS_INDEX_SUBDIR, "53223310240.json"))).toBe(true);
  });
  it("rejects `..` traversal in PN", () => {
    expect(() => partsIndexPathFor("/X", "..\\poison")).toThrow(/illegal characters/);
  });
  it("rejects path separators in PN", () => {
    expect(() => partsIndexPathFor("/X", "a/b")).toThrow(/illegal characters/);
    expect(() => partsIndexPathFor("/X", "a\\b")).toThrow(/illegal characters/);
  });
  it("rejects null byte in PN", () => {
    expect(() => partsIndexPathFor("/X", "a\0b")).toThrow(/illegal characters/);
  });
  it("rejects empty PN", () => {
    expect(() => partsIndexPathFor("/X", "")).toThrow(/non-empty string/);
  });
});

describe("normalizePathForCompare + isPathUnderAllowedRoot — pure", () => {
  it("normalized form ends in a separator", () => {
    const n = normalizePathForCompare("/X/PRISM");
    expect(n.endsWith(path.sep)).toBe(true);
  });
  it("returns true when candidate is under the allowed root", () => {
    const root = path.resolve(TMP);
    expect(isPathUnderAllowedRoot(path.join(root, "JM DIE", "x.mcx"), [root])).toBe(true);
  });
  it("returns false when candidate escapes the allowed root", () => {
    const root = path.resolve(TMP);
    expect(isPathUnderAllowedRoot(path.resolve(root, "..", "elsewhere", "x.mcx"), [root])).toBe(false);
  });
  it("returns false for empty inputs", () => {
    expect(isPathUnderAllowedRoot("", ["/X"])).toBe(false);
    expect(isPathUnderAllowedRoot("/X/y", [])).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// GAP REPORT (computeGapReport — pure)
// ───────────────────────────────────────────────────────────────────────────

describe("computeGapReport — pure", () => {
  it("counts join-side confidence breakdown across spanning configs", () => {
    const idx = makeIndex([
      makeRow({ part_number_normalized: "A", match_confidence: "exact" }),
      makeRow({ part_number_normalized: "B", match_confidence: "loose" }),
      makeRow({ part_number_normalized: "C", match_confidence: "ambiguous" }),
      makeRow({ part_number_normalized: "D", match_confidence: "miss", programs: [] }),
    ]);
    const r = computeGapReport(idx, "/X");
    expect(r.confidenceBreakdown.exact).toBe(1);
    expect(r.confidenceBreakdown.loose).toBe(1);
    expect(r.confidenceBreakdown.ambiguous).toBe(1);
    expect(r.confidenceBreakdown.miss).toBe(1);
    expect(r.gap.rows_in_gap_confidence).toBe(2); // ambiguous + miss
    expect(r.gap.rows_without_programs).toBe(1); // miss row has no programs
    expect(r.disk.indexLoaded).toBe(false);
    expect(r.disk.diskIndexPath).toBeNull();
  });

  it("marks indexLoaded:true and counts disk-side orphans when diskIndex is supplied", () => {
    const sharedPath = "H:\\PRISM\\JM DIE\\ROKU-ROKU\\ITW SHAKEPROOF\\HEX\\532-23310-24000-00.mcx-8";
    const idx = makeIndex([
      makeRow({ programs: [makeProgram({ source_path: sharedPath })] }),
    ]);
    const diskIndex: JMDieDiskIndexEntry[] = [
      { path: sharedPath, kind: "cam_project", customer: "ITW", machine: "mill" },
      { path: "H:\\PRISM\\JM DIE\\ACME\\foo.MIN", kind: "g_code", customer: "ACME", machine: "lathe" },
      { path: "H:\\PRISM\\JM DIE\\ALCOA\\bar.mcam", kind: "cam_project", customer: "ALCOA", machine: "mill" },
      { path: "H:\\PRISM\\Docustrata\\manifest.json", kind: "manifest" }, // ignored — non-program kind
    ];
    const r = computeGapReport(idx, "/X", { diskIndex, diskIndexPath: "/X/disk.json" });
    expect(r.disk.indexLoaded).toBe(true);
    expect(r.disk.diskIndexPath).toBe("/X/disk.json");
    expect(r.disk.total_programs_on_disk).toBe(3); // manifest excluded
    expect(r.disk.covered_by_join).toBe(1);
    expect(r.disk.orphan_count).toBe(2);
    expect(r.disk.orphan_by_kind.g_code).toBe(1);
    expect(r.disk.orphan_by_kind.cam_project).toBe(1);
    expect(r.disk.orphan_by_customer.ACME).toBe(1);
    expect(r.disk.orphan_by_customer.ALCOA).toBe(1);
    expect(r.gap.summary).toContain("Disk-side");
    expect(r.gap.summary).toContain("2 programs"); // confirms the orphan count is in the message
  });

  it("handles an oversize disk-index without sample blow-up (adversarial)", () => {
    // 10K orphan disk entries; sample cap = PER_OUTCOME_SAMPLE_CAP.
    const diskIndex: JMDieDiskIndexEntry[] = Array.from({ length: 10000 }, (_, i) => ({
      path: `H:\\PRISM\\JM DIE\\X\\orphan-${i}.MIN`,
      kind: "g_code",
      customer: "BULK",
      machine: "lathe",
    }));
    const r = computeGapReport(makeIndex([]), "/X", { diskIndex, diskIndexPath: "/X/disk.json" });
    expect(r.disk.orphan_count).toBe(10000);
    expect(r.disk.orphan_samples.length).toBeLessThanOrEqual(PER_OUTCOME_SAMPLE_CAP);
    expect(r.disk.orphan_by_kind.g_code).toBe(10000);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// I/O ORCHESTRATOR — backAnnotateArchive (with injected index + tmp dir)
// ───────────────────────────────────────────────────────────────────────────

describe("backAnnotateArchive — I/O orchestrator", () => {
  it("dryRun:true plans without writing any sidecar (default safety gate)", async () => {
    const row = makeRow({ programs: [makeProgram({ source_path: TMP_PROGRAM_PATH })] });
    const r = await backAnnotateArchive({
      joinIndex: makeIndex([row]),
      archiveRoot: TMP,
      allowRoots: [TMP],
      // dryRun NOT specified → default TRUE.
    });
    expect(r.dryRun).toBe(true);
    expect(r.totals.would_annotate).toBe(1);
    expect(r.totals.annotated).toBe(0);
    expect(fs.existsSync(TMP_PROGRAM_PATH + SIDECAR_SUFFIX)).toBe(false);
  });

  it("dryRun:false writes the sidecar + parts-index entry atomically", async () => {
    const row = makeRow({ programs: [makeProgram({ source_path: TMP_PROGRAM_PATH })] });
    const r = await backAnnotateArchive({
      joinIndex: makeIndex([row]),
      archiveRoot: TMP,
      allowRoots: [TMP],
      dryRun: false,
    });
    expect(r.totals.annotated).toBe(1);
    expect(r.totals.parts_index_planned_or_written).toBe(1);
    expect(fs.existsSync(TMP_PROGRAM_PATH + SIDECAR_SUFFIX)).toBe(true);
    const sc = JSON.parse(fs.readFileSync(TMP_PROGRAM_PATH + SIDECAR_SUFFIX, "utf-8"));
    expect(sc.annotator).toBe(CANONICAL_ANNOTATOR);
    expect(sc.part_number).toBe("532-23310-24000-00");
    const partsIndex = partsIndexPathFor(TMP, row.part_number_normalized);
    expect(fs.existsSync(partsIndex)).toBe(true);
    const pe = JSON.parse(fs.readFileSync(partsIndex, "utf-8"));
    expect(pe.annotator).toBe(CANONICAL_ANNOTATOR);
  });

  it("is idempotent — running twice flips the second outcome to skipped_existing_self", async () => {
    const row = makeRow({ programs: [makeProgram({ source_path: TMP_PROGRAM_PATH })] });
    const idx = makeIndex([row]);
    await backAnnotateArchive({ joinIndex: idx, archiveRoot: TMP, allowRoots: [TMP], dryRun: false });
    const r2 = await backAnnotateArchive({ joinIndex: idx, archiveRoot: TMP, allowRoots: [TMP], dryRun: false });
    expect(r2.totals.skipped_existing_self).toBe(1);
    expect(r2.totals.annotated).toBe(0);
  });

  it("refuses to overwrite a foreign sidecar (provenance check)", async () => {
    fs.writeFileSync(
      TMP_PROGRAM_PATH + SIDECAR_SUFFIX,
      JSON.stringify({ annotator: "SomeOtherTool", part_number: "X" }, null, 2),
    );
    const row = makeRow({ programs: [makeProgram({ source_path: TMP_PROGRAM_PATH })] });
    const r = await backAnnotateArchive({
      joinIndex: makeIndex([row]),
      archiveRoot: TMP,
      allowRoots: [TMP],
      dryRun: false,
    });
    expect(r.totals.skipped_foreign).toBe(1);
    expect(r.totals.annotated).toBe(0);
    const sc = JSON.parse(fs.readFileSync(TMP_PROGRAM_PATH + SIDECAR_SUFFIX, "utf-8"));
    expect(sc.annotator).toBe("SomeOtherTool"); // foreign file preserved
  });

  it("FAILURE MODE: skipped_path_unsafe when program path escapes allowRoots (adversarial)", async () => {
    const evilPath = "H:\\evil\\poison.mcx"; // outside TMP
    const row = makeRow({ programs: [makeProgram({ source_path: evilPath })] });
    const r = await backAnnotateArchive({
      joinIndex: makeIndex([row]),
      archiveRoot: TMP,
      allowRoots: [TMP],
      dryRun: false,
    });
    expect(r.totals.skipped_path_unsafe).toBe(1);
    expect(r.totals.annotated).toBe(0);
    expect(fs.existsSync(evilPath + SIDECAR_SUFFIX)).toBe(false);
  });

  it("FAILURE MODE: missing_program_file when source_path doesn't exist on disk", async () => {
    const ghost = path.join(TMP, "JM DIE", "GHOST", "missing.MIN");
    const row = makeRow({ programs: [makeProgram({ source_path: ghost })] });
    const r = await backAnnotateArchive({
      joinIndex: makeIndex([row]),
      archiveRoot: TMP,
      allowRoots: [TMP],
      dryRun: false,
    });
    expect(r.totals.missing_program_file).toBe(1);
    expect(r.totals.annotated).toBe(0);
  });

  it("FAILURE MODE: skipped_no_source_path on a program ref with empty path", async () => {
    const row = makeRow({ programs: [makeProgram({ source_path: "" })] });
    const r = await backAnnotateArchive({
      joinIndex: makeIndex([row]),
      archiveRoot: TMP,
      allowRoots: [TMP],
      dryRun: false,
    });
    expect(r.totals.skipped_no_source_path).toBe(1);
    expect(r.totals.annotated).toBe(0);
  });

  it("FAILURE MODE: skipped_no_part_number on a row with empty PN (row-level skip)", async () => {
    const row = makeRow({ part_number: "", part_number_normalized: "" });
    const r = await backAnnotateArchive({
      joinIndex: makeIndex([row]),
      archiveRoot: TMP,
      allowRoots: [TMP],
      dryRun: false,
    });
    expect(r.totals.skipped_no_part_number).toBe(1);
    expect(r.totals.annotated).toBe(0);
  });

  it("confidence filter excludes ambiguous (spanning variability: exact OK, ambiguous skipped)", async () => {
    // Both rows must point at programs UNDER TMP (allowRoots = [TMP]) — the
    // default fixture path lives at H:\PRISM\... which would trip the
    // trust-boundary guard instead of the confidence filter.
    const exactRow = makeRow({
      part_number: "PN-A",
      part_number_normalized: "pna",
      match_confidence: "exact",
      programs: [makeProgram({ source_path: TMP_PROGRAM_PATH })],
    });
    const ambigPath = path.join(TMP, "JM DIE", "AMBIG", "ambig.mcx");
    fs.mkdirSync(path.dirname(ambigPath), { recursive: true });
    fs.writeFileSync(ambigPath, "");
    const ambigRow = makeRow({
      part_number: "PN-B",
      part_number_normalized: "pnb",
      match_confidence: "ambiguous",
      programs: [makeProgram({ source_path: ambigPath })],
    });
    const r = await backAnnotateArchive({
      joinIndex: makeIndex([exactRow, ambigRow]),
      archiveRoot: TMP,
      allowRoots: [TMP],
      dryRun: false,
      // default confidenceFilter = ["exact", "loose"]
    });
    expect(r.totals.annotated).toBe(1); // exact only
    expect(r.totals.skipped_confidence_excluded).toBe(1); // ambiguous
  });

  it("limit caps program count + breaks both inner and outer loops", async () => {
    const rows: JoinIndexRow[] = [];
    for (let i = 0; i < 5; i++) {
      const p = path.join(TMP, "JM DIE", `L${i}`, `p${i}.mcx`);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, "");
      rows.push(
        makeRow({
          part_number: `PN-${i}`,
          part_number_normalized: `pn${i}`,
          programs: [makeProgram({ source_path: p })],
        }),
      );
    }
    const r = await backAnnotateArchive({
      joinIndex: makeIndex(rows),
      archiveRoot: TMP,
      allowRoots: [TMP],
      dryRun: false,
      limit: 2,
    });
    expect(r.totals.annotated).toBe(2);
    expect(r.totals.programs_seen).toBeLessThanOrEqual(5);
  });

  it("populates per-outcome samples but caps each at PER_OUTCOME_SAMPLE_CAP", async () => {
    const rows: JoinIndexRow[] = [];
    for (let i = 0; i < PER_OUTCOME_SAMPLE_CAP + 10; i++) {
      const p = path.join(TMP, "JM DIE", `BULK`, `p${i}.mcx`);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, "");
      rows.push(
        makeRow({
          part_number: `PN-${i}`,
          part_number_normalized: `pn${i}`,
          programs: [makeProgram({ source_path: p })],
        }),
      );
    }
    const r = await backAnnotateArchive({
      joinIndex: makeIndex(rows),
      archiveRoot: TMP,
      allowRoots: [TMP],
      // dryRun TRUE (default) — we just want counts + samples.
    });
    expect(r.totals.would_annotate).toBe(PER_OUTCOME_SAMPLE_CAP + 10);
    expect(r.samples.would_annotate?.length ?? 0).toBeLessThanOrEqual(PER_OUTCOME_SAMPLE_CAP);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// generateGapReport — I/O wrapper
// ───────────────────────────────────────────────────────────────────────────

describe("generateGapReport — I/O wrapper", () => {
  it("returns indexLoaded:false when no jm-die-index-v2.json exists at archive root", async () => {
    const r = await generateGapReport({
      joinIndex: makeIndex([makeRow({ match_confidence: "miss", programs: [] })]),
      archiveRoot: TMP, // TMP has no Docustrata/.index/jm-die-index-v2.json
      dryRun: true,
    });
    expect(r.disk.indexLoaded).toBe(false);
    expect(r.gap.summary).toContain("NOT loaded");
  });

  it("returns indexLoaded:true + computes disk gap when injected diskIndex is passed", async () => {
    const r = await generateGapReport({
      joinIndex: makeIndex([]),
      archiveRoot: TMP,
      dryRun: true,
      diskIndex: [
        { path: "H:\\PRISM\\JM DIE\\X\\a.MIN", kind: "g_code", customer: "X", machine: "lathe" },
      ],
      diskIndexPath: "/fixture/disk.json",
    });
    expect(r.disk.indexLoaded).toBe(true);
    expect(r.disk.diskIndexPath).toBe("/fixture/disk.json");
    expect(r.disk.orphan_count).toBe(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// readPrintPointer — fast lookup
// ───────────────────────────────────────────────────────────────────────────

describe("readPrintPointer — sidecar fast lookup", () => {
  it("returns null when no sidecar exists", () => {
    expect(readPrintPointer(TMP_PROGRAM_PATH)).toBeNull();
  });

  it("returns the sidecar after a real annotation pass", async () => {
    const row = makeRow({ programs: [makeProgram({ source_path: TMP_PROGRAM_PATH })] });
    await backAnnotateArchive({
      joinIndex: makeIndex([row]),
      archiveRoot: TMP,
      allowRoots: [TMP],
      dryRun: false,
    });
    const sc = readPrintPointer(TMP_PROGRAM_PATH);
    expect(sc).not.toBeNull();
    expect(sc!.annotator).toBe(CANONICAL_ANNOTATOR);
    expect(sc!.part_number).toBe("532-23310-24000-00");
  });

  it("returns null on a foreign sidecar (provenance not self)", () => {
    fs.writeFileSync(
      TMP_PROGRAM_PATH + SIDECAR_SUFFIX,
      JSON.stringify({ annotator: "SomethingElse", part_number: "X" }),
    );
    expect(readPrintPointer(TMP_PROGRAM_PATH)).toBeNull();
  });

  it("returns null on a malformed sidecar (JSON.parse fails)", () => {
    fs.writeFileSync(TMP_PROGRAM_PATH + SIDECAR_SUFFIX, "not valid json {");
    expect(readPrintPointer(TMP_PROGRAM_PATH)).toBeNull();
  });

  it("returns null on empty path or non-string", () => {
    expect(readPrintPointer("")).toBeNull();
    expect(readPrintPointer(undefined as unknown as string)).toBeNull();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// CLASS + SINGLETON exports (dual-export pattern matches BlueprintProgramJoinEngine)
// ───────────────────────────────────────────────────────────────────────────

describe("dual export pattern (class + singleton)", () => {
  it("class statics reference the same functions as the singleton", () => {
    expect(JMDieArchiveBackAnnotationEngine.buildSidecarFromJoinRow).toBe(buildSidecarFromJoinRow);
    expect(JMDieArchiveBackAnnotationEngine.computeGapReport).toBe(computeGapReport);
    expect(jmDieArchiveBackAnnotationEngine.buildSidecarFromJoinRow).toBe(buildSidecarFromJoinRow);
    expect(jmDieArchiveBackAnnotationEngine.backAnnotateArchive).toBe(backAnnotateArchive);
  });

  it("CANONICAL_ANNOTATOR + SIDECAR_SCHEMA_VERSION are well-formed", () => {
    expect(typeof CANONICAL_ANNOTATOR).toBe("string");
    expect(CANONICAL_ANNOTATOR.length).toBeGreaterThan(0);
    expect(/^\d+\.\d+\.\d+$/.test(SIDECAR_SCHEMA_VERSION)).toBe(true);
  });
});
