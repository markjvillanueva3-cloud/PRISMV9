/**
 * ArchiveToPartsCatalogIngesterEngine — U-PPL-D3 (Track D) test suite
 * ====================================================================
 *
 * MS-PRINT-PROGRAM-LOOP / U-PPL-D3 — bridges the JM-Die archive disk-index
 * to the in-memory PartsLibraryEngine catalog. Tests cover:
 *
 *   • Happy paths (3)              — single entry, multi-PN grouping, link-enriched
 *   • Variability spans (3)        — non-program extension, multi-customer, dotless ext
 *   • Schema & input rejection (3) — non-array entries, no stem/name, no PN-like token
 *   • Adversarial edges (3)        — empty entries[], limit cap, idempotent re-run
 *   • Wiring regression (2)        — singleton + class wrapper both delegate
 *
 * @milestone MS-PRINT-PROGRAM-LOOP
 * @unit U-PPL-D3
 * @track D
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ingestArchive,
  archiveToPartsCatalogIngesterEngine,
  ArchiveToPartsCatalogIngesterEngine,
  DEFAULT_INGEST_LIMIT,
} from "../engines/ArchiveToPartsCatalogIngesterEngine.js";
import type { JMDieDiskIndexEntry } from "../engines/JMDieArchiveBackAnnotationEngine.js";
import type { ProgramPrintLinkIndex } from "../engines/ProgramPrintLinkIndexEngine.js";

// ─────────────────────────────────────────────────────────────────────
// Helpers — fixture builders + parts-library reset
// ─────────────────────────────────────────────────────────────────────

function entry(over: Partial<JMDieDiskIndexEntry>): JMDieDiskIndexEntry {
  return {
    path: "H:/PRISM/JM DIE/MILL/ITW/sample.MIN",
    name: "sample.MIN",
    stem: "sample",
    ext: ".MIN",
    customer: "ITW",
    machine: "mill",
    kind: "program",
    ...over,
  };
}

/**
 * Build a minimal ProgramPrintLinkIndex test double that resolves a specific
 * program path → print. The engine's lookupPrintForProgram normalizes the
 * program path key via lowercase + forward-slash before consulting
 * joinIndex.byProgramPath, so we use that same shape here.
 */
function makeLinkIndex(programPath: string, printId: string, confidence: string): ProgramPrintLinkIndex {
  // ProgramToPrintLink shape per BlueprintProgramJoinEngine.ts:625-639 —
  // print_id is TOP-LEVEL on the link (training-triple style), not nested
  // in a prints[] array. print_doc_ids carries v6 join blueprint-page ids.
  const normalizedKey = programPath.toLowerCase().replace(/\\/g, "/");
  return {
    joinIndex: {
      byProgramPath: new Map([[normalizedKey, [{
        program_path: programPath,
        part_number: "TESTPN",
        part_number_normalized: "TESTPN",
        source: "training_triple" as const,
        match_confidence: confidence,
        print_doc_ids: [],
        print_id: printId,
      }]]]),
      byNormalizedPN: new Map(),
      triplesByPN: new Map(),
      stats: {
        joinRows: 1,
        joinRowsMalformed: 0,
        tripleRows: 1,
        triplesRowsMalformed: 0,
        programPaths: 1,
        joinJsonlPath: "(test fixture)",
        triplesJsonlPath: null,
        joinMtimeMs: Date.now(),
        triplesMtimeMs: 0,
        loadedAt: Date.now(),
      },
    } as unknown as ProgramPrintLinkIndex["joinIndex"],
    seedLinksByPath: new Map(),
    seedLinksByPN: new Map(),
    stats: {
      joinRows: 1,
      programPaths: 1,
      tripleRows: 1,
      seedProgramsScanned: 0,
      seedNewLinks: 0,
      enhancedRescues: 0,
    } as unknown as ProgramPrintLinkIndex["stats"],
  };
}

beforeEach(async () => {
  const { partsLibraryEngine } = await import("../engines/PartsLibraryEngine.js");
  const internal = partsLibraryEngine as unknown as {
    parts: Map<string, unknown>;
    revisions: Map<string, unknown>;
    partNumberIndex: Map<string, unknown>;
  };
  internal.parts.clear();
  internal.revisions.clear();
  internal.partNumberIndex.clear();
});

// ─────────────────────────────────────────────────────────────────────
// 1. Happy paths (3)
// ─────────────────────────────────────────────────────────────────────
describe("U-PPL-D3 happy paths", () => {
  it("single entry → one unique PN, one created (dryRun=false)", async () => {
    const result = ingestArchive({
      entries: [entry({ stem: "9082526", path: "H:/jm/9082526.MIN" })],
      dryRun: false,
    });
    expect(result.entries_seen).toBe(1);
    expect(result.unique_pns).toBe(1);
    expect(result.outcomes.created).toBe(1);
    expect(result.outcomes.error).toBe(0);
    expect(result.per_pn[0]!.part_number_normalized).toBe("9082526");
    expect(result.per_pn[0]!.outcome).toBe("created");
    // part_id must be a non-empty UUID string (not a dryRun placeholder).
    expect(typeof result.per_pn[0]!.part_id).toBe("string");
    expect(result.per_pn[0]!.part_id!.length).toBeGreaterThan(8);
    expect(result.per_pn[0]!.part_id).not.toMatch(/dryRun/);

    const { partsLibraryEngine } = await import("../engines/PartsLibraryEngine.js");
    const search = partsLibraryEngine.search({ query: "9082526" });
    expect(search.parts.length).toBe(1);
    expect(search.parts[0]!.part_number).toBe("9082526");
    expect(search.parts[0]!.tags).toContain("jm-die");
    expect(search.parts[0]!.tags).toContain("archive-ingest");
  });

  it("multi-entry → grouped by normalized PN (multiple files for same PN collapse)", () => {
    const result = ingestArchive({
      entries: [
        entry({ stem: "T8047D3 ITW", path: "H:/jm/T8047D3 ITW.MIN" }),
        entry({ stem: "8047D3-R", path: "H:/jm/8047D3-R.MIN" }),
        entry({ stem: "9082526 AGRATI", path: "H:/jm/9082526 AGRATI.MIN" }),
      ],
      dryRun: true,
    });
    expect(result.entries_seen).toBe(3);
    expect(result.unique_pns).toBe(2);
    const pns = result.per_pn.map((r) => r.part_number_normalized).sort();
    expect(pns).toEqual(["8047D3", "9082526"]);
    const t8 = result.per_pn.find((r) => r.part_number_normalized === "8047D3")!;
    expect(t8.program_count).toBe(2);
  });

  it("link-enriched → primary program's print_id flows to drawing_file_id (dryRun=false)", async () => {
    const programPath = "H:/jm/9082526.MIN";
    const linkIndex = makeLinkIndex(programPath, "print-doc-9082526", "exact");
    const result = ingestArchive({
      entries: [entry({ stem: "9082526", path: programPath })],
      linkIndex,
      dryRun: false,
    });
    expect(result.outcomes.created).toBe(1);
    const rec = result.per_pn[0]!;
    expect(rec.print_id).toBe("print-doc-9082526");
    expect(rec.match_confidence).toBe("exact");

    const { partsLibraryEngine } = await import("../engines/PartsLibraryEngine.js");
    const got = partsLibraryEngine.get(rec.part_id!);
    expect(got).not.toBeNull();
    expect(got!.part.drawing_file_id).toBe("print-doc-9082526");
    expect(got!.part.tags).toContain("link:exact");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Variability spans (3)
// ─────────────────────────────────────────────────────────────────────
describe("U-PPL-D3 variability spans", () => {
  it("non-program extension (.txt, .pdf, .doc) → counted as skipped_not_program", () => {
    const result = ingestArchive({
      entries: [
        entry({ stem: "9082526", ext: ".txt", path: "H:/jm/9082526.txt" }),
        entry({ stem: "8047D3", ext: ".pdf", path: "H:/jm/8047D3.pdf" }),
        entry({ stem: "C2500", ext: ".doc", path: "H:/jm/C2500.doc" }),
      ],
      dryRun: true,
    });
    expect(result.unique_pns).toBe(0);
    expect(result.outcomes.skipped_not_program).toBe(3);
    expect(result.outcomes.created).toBe(0);
  });

  it("multi-customer span — customer tag survives on each created Part", async () => {
    const result = ingestArchive({
      entries: [
        entry({ stem: "9082526", customer: "ITW", path: "H:/jm/itw/9082526.MIN" }),
        entry({ stem: "8047D3", customer: "ALCOA", path: "H:/jm/alcoa/8047D3.MIN" }),
        entry({ stem: "C2500-2497", customer: "OPTIMAS", path: "H:/jm/optimas/C2500-2497.MIN" }),
      ],
      dryRun: false,
    });
    expect(result.outcomes.created).toBe(3);
    const { partsLibraryEngine } = await import("../engines/PartsLibraryEngine.js");
    const all = partsLibraryEngine.search({});
    const customers = all.parts.map((p) => p.customer_id).sort();
    expect(customers).toEqual(["ALCOA", "ITW", "OPTIMAS"]);
    for (const p of all.parts) {
      expect(p.tags).toContain(`customer:${(p.customer_id ?? "").toLowerCase()}`);
    }
  });

  it("dotless extension ('min' instead of '.min') still recognized as program file", () => {
    const result = ingestArchive({
      entries: [entry({ stem: "9082526", ext: "min", path: "H:/jm/9082526.min" })],
      dryRun: true,
    });
    expect(result.unique_pns).toBe(1);
    expect(result.outcomes.skipped_not_program).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. Input rejection (3)
// ─────────────────────────────────────────────────────────────────────
describe("U-PPL-D3 input rejection", () => {
  it("non-array entries → throws (FAIL-LOUD per CLAUDE.md R12)", () => {
    expect(() =>
      // @ts-expect-error — intentional runtime type fuzz
      ingestArchive({ entries: null }),
    ).toThrow();
    expect(() =>
      // @ts-expect-error — intentional runtime type fuzz
      ingestArchive({ entries: "not-an-array" }),
    ).toThrow();
  });

  it("entry with no stem AND no name → skipped_no_pn", () => {
    const result = ingestArchive({
      entries: [entry({ stem: undefined, name: undefined, path: "H:/jm/anonymous.MIN" })],
      dryRun: true,
    });
    expect(result.outcomes.skipped_no_pn).toBe(1);
    expect(result.unique_pns).toBe(0);
  });

  it("filename below MIN_PN_REMAINDER_LENGTH (single-char stem) → skipped_no_pn", () => {
    const result = ingestArchive({
      entries: [entry({ stem: "x", path: "H:/jm/x.MIN" })],
      dryRun: true,
    });
    expect(result.outcomes.error).toBe(0);
    expect(result.outcomes.skipped_no_pn).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Adversarial edge cases (3)
// ─────────────────────────────────────────────────────────────────────
describe("U-PPL-D3 adversarial edges", () => {
  it("empty entries[] → zero-count result, no error, no mutation", async () => {
    const result = ingestArchive({ entries: [], dryRun: false });
    expect(result.entries_seen).toBe(0);
    expect(result.unique_pns).toBe(0);
    expect(result.outcomes.created).toBe(0);
    expect(result.outcomes.error).toBe(0);
    const { partsLibraryEngine } = await import("../engines/PartsLibraryEngine.js");
    expect(partsLibraryEngine.search({}).parts.length).toBe(0);
  });

  it("limit cap is honored (limit=2 from 5 entries → only 2 processed)", () => {
    const entries = [
      entry({ stem: "9082526", path: "H:/jm/a.MIN" }),
      entry({ stem: "8047D3", path: "H:/jm/b.MIN" }),
      entry({ stem: "C2500-2497", path: "H:/jm/c.MIN" }),
      entry({ stem: "BU-1365-0000-002 TFI", path: "H:/jm/d.MIN" }),
      entry({ stem: "T9999", path: "H:/jm/e.MIN" }),
    ];
    const result = ingestArchive({ entries, dryRun: true, limit: 2 });
    expect(result.entries_seen).toBe(2);
    expect(result.unique_pns).toBe(2);
  });

  it("idempotent — re-running on same archive does not duplicate parts (dryRun=false)", async () => {
    const entries = [entry({ stem: "9082526", path: "H:/jm/9082526.MIN" })];
    const r1 = ingestArchive({ entries, dryRun: false });
    expect(r1.outcomes.created).toBe(1);
    const firstPartId = r1.per_pn[0]!.part_id;
    expect(typeof firstPartId).toBe("string");
    expect(firstPartId!.length).toBeGreaterThan(8);

    const r2 = ingestArchive({ entries, dryRun: false });
    expect(r2.outcomes.created).toBe(0);
    expect(r2.outcomes.skipped_already_present).toBe(1);
    // The re-ingest returns the SAME part_id (not a new one).
    expect(r2.per_pn[0]!.part_id).toBe(firstPartId);

    const { partsLibraryEngine } = await import("../engines/PartsLibraryEngine.js");
    const search = partsLibraryEngine.search({ query: "9082526" });
    expect(search.parts.length).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Wiring regression (2)
// ─────────────────────────────────────────────────────────────────────
describe("U-PPL-D3 wiring regression", () => {
  it("singleton delegates to module-level ingestArchive (same outcome counts)", () => {
    const entries = [entry({ stem: "9082526", path: "H:/jm/9082526.MIN" })];
    const direct = ingestArchive({ entries, dryRun: true });
    const viaSingleton = archiveToPartsCatalogIngesterEngine.ingestArchive({ entries, dryRun: true });
    expect(viaSingleton.unique_pns).toBe(direct.unique_pns);
    expect(viaSingleton.outcomes.created).toBe(direct.outcomes.created);
    expect(viaSingleton.outcomes.skipped_not_program).toBe(direct.outcomes.skipped_not_program);
    expect(viaSingleton.outcomes.skipped_no_pn).toBe(direct.outcomes.skipped_no_pn);
  });

  it("class wrapper exposes the same surfaces; DEFAULT_INGEST_LIMIT is exported as 0", () => {
    expect(typeof DEFAULT_INGEST_LIMIT).toBe("number");
    expect(DEFAULT_INGEST_LIMIT).toBe(0);
    const w = new ArchiveToPartsCatalogIngesterEngine();
    const r = w.groupByNormalizedPN([
      entry({ stem: "9082526", path: "H:/jm/9082526.MIN" }),
      entry({ stem: "8047D3", path: "H:/jm/8047D3.MIN" }),
    ]);
    expect(r.groups.size).toBe(2);
    expect(r.groups.has("9082526")).toBe(true);
    expect(r.groups.has("8047D3")).toBe(true);
  });
});
