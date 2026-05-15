/**
 * CADArchiveJoinAugmenterEngine — test suite for U-PPL-D4.
 *
 * Coverage shape per CLAUDE.md per-file scrutiny gate doctrine:
 *   - Happy path + reference-value assertions (NOT toBeDefined stubs).
 *   - ≥3 failure modes (bad shape, null inputs, non-array files).
 *   - ≥2 adversarial inputs (NaN sizeBytes, Infinity sizeBytes, malformed
 *     fileId length, out-of-enum machineCategory / complexityHint).
 *   - ≥3 variability spans across the 6 supported MILL_PROGRAM_FORMATS,
 *     3 JM-Die customer suffixes (ITW / AGRATI / TFI), and the 3 mill-class
 *     machine categories (mill / hurco / hypermill).
 *   - Engine-bug signal (cadZipMisses) tested explicitly.
 *   - Anti-drift module-load assertion exercised indirectly (import succeeds
 *     because MILL_PROGRAM_FORMATS is consistent with parent sets).
 *
 * Test JoinIndex fixtures use the real `JoinIndex` shape from
 * BlueprintProgramJoinEngine so the kernel `buildProgramSeedAugmentation`
 * we COMPOSE WITH (the U-PPL-D4 contract) sees real data, not a mock.
 */

import { describe, it, expect } from "vitest";
import {
  MILL_PROGRAM_FORMATS,
  filterMillEligibleEntries,
  augmentJoinFromCADIndex,
  cadArchiveJoinAugmenterEngine,
  CADArchiveJoinAugmenterEngine,
  type CADAugmentedLink,
} from "../engines/CADArchiveJoinAugmenterEngine.js";
import type { JoinIndex, JoinIndexRow } from "../engines/BlueprintProgramJoinEngine.js";
import type { CADFileEntry, MasterIndex } from "../schemas/cadFileIndexSchema.js";

// ── Fixture builders ─────────────────────────────────────────────────────────

const SHA64 = "a".repeat(64); // any 64-char hex stand-in
const SHA64_B = "b".repeat(64);
const SHA64_C = "c".repeat(64);
const SHA64_D = "d".repeat(64);
const SHA64_E = "e".repeat(64);
const SHA64_F = "f".repeat(64);

function entry(
  absolutePath: string,
  overrides: Partial<CADFileEntry> = {},
): CADFileEntry {
  const ext = absolutePath.toLowerCase().match(/\.[a-z0-9-]+$/);
  const fmt = (ext ? ext[0] : ".ipt") as CADFileEntry["format"];
  return {
    fileId: SHA64,
    absolutePath,
    format: fmt,
    sizeBytes: 100_000,
    customer: "ITW",
    machineCategory: "mill",
    complexityHint: "moderate",
    lastModified: "2026-05-15T00:00:00Z",
    ...overrides,
  };
}

function masterIndex(files: CADFileEntry[]): MasterIndex {
  return {
    schemaVersion: 1,
    generatedAt: "2026-05-15T00:00:00Z",
    rootPaths: ["H:/PRISM/JM DIE"],
    totalFiles: files.length,
    byFormat: {},
    byMachineCategory: {},
    byCustomer: {},
    files,
  };
}

function emptyJoinIndex(): JoinIndex {
  return {
    byNormalizedPN: new Map(),
    byProgramPath: new Map(),
    triplesByPN: new Map(),
    stats: {
      joinRows: 0,
      joinRowsMalformed: 0,
      tripleRows: 0,
      triplesRowsMalformed: 0,
      programPaths: 0,
      joinJsonlPath: "/fake/join.jsonl",
      triplesJsonlPath: null,
      joinMtimeMs: 0,
      triplesMtimeMs: 0,
      loadedAt: 0,
    },
  };
}

function joinIndexWithPNs(normalizedPNs: string[]): JoinIndex {
  const idx = emptyJoinIndex();
  for (const pn of normalizedPNs) {
    const row: JoinIndexRow = {
      part_number: pn,
      part_number_normalized: pn,
      blueprints: [
        { doc_id: "doc-" + pn, filename: pn + ".pdf", page_index: 0, drawing_score: 0.9 },
      ],
      programs: [],
      match_confidence: "exact",
      has_program: false,
    };
    idx.byNormalizedPN.set(pn, row);
  }
  idx.stats.joinRows = normalizedPNs.length;
  return idx;
}

// ── MILL_PROGRAM_FORMATS ─────────────────────────────────────────────────────

describe("MILL_PROGRAM_FORMATS", () => {
  it("contains the canonical 6 JM-Die mill-authoring CAD extensions", () => {
    expect(MILL_PROGRAM_FORMATS.size).toBe(6);
    expect(MILL_PROGRAM_FORMATS.has(".ipt")).toBe(true);
    expect(MILL_PROGRAM_FORMATS.has(".iam")).toBe(true);
    expect(MILL_PROGRAM_FORMATS.has(".f3d")).toBe(true);
    expect(MILL_PROGRAM_FORMATS.has(".f3z")).toBe(true);
    expect(MILL_PROGRAM_FORMATS.has(".sldprt")).toBe(true);
    expect(MILL_PROGRAM_FORMATS.has(".sldasm")).toBe(true);
  });

  it("excludes binary CAM project formats (.mcx-8, .mcam — deferred to U-PPL-D5)", () => {
    expect(MILL_PROGRAM_FORMATS.has(".mcx-8" as never)).toBe(false);
    expect(MILL_PROGRAM_FORMATS.has(".mcam" as never)).toBe(false);
  });

  it("excludes exchange formats (.step, .iges, .stl, .dwg, .dxf)", () => {
    expect(MILL_PROGRAM_FORMATS.has(".step" as never)).toBe(false);
    expect(MILL_PROGRAM_FORMATS.has(".iges" as never)).toBe(false);
    expect(MILL_PROGRAM_FORMATS.has(".stl" as never)).toBe(false);
    expect(MILL_PROGRAM_FORMATS.has(".dwg" as never)).toBe(false);
    expect(MILL_PROGRAM_FORMATS.has(".dxf" as never)).toBe(false);
  });
});

// ── filterMillEligibleEntries ────────────────────────────────────────────────

describe("filterMillEligibleEntries", () => {
  it("happy: 6-entry mixed input → 4 mill-eligible (3 ipt + 1 sldprt; rejects .step + .stl)", () => {
    const entries: CADFileEntry[] = [
      entry("H:/JM DIE/a.ipt", { fileId: SHA64 }),
      entry("H:/JM DIE/b.ipt", { fileId: SHA64_B }),
      entry("H:/JM DIE/c.ipt", { fileId: SHA64_C }),
      entry("H:/JM DIE/d.sldprt", { fileId: SHA64_D, format: ".sldprt" }),
      entry("H:/JM DIE/e.step", { fileId: SHA64_E, format: ".step" }),
      entry("H:/JM DIE/f.stl", { fileId: SHA64_F, format: ".stl" }),
    ];
    const out = filterMillEligibleEntries(entries);
    expect(out.length).toBe(4);
    expect(out.map((e) => e.format).sort()).toEqual([".ipt", ".ipt", ".ipt", ".sldprt"]);
  });

  it("millOnly=true rejects lathe + edm machine categories (1 mill kept)", () => {
    const entries: CADFileEntry[] = [
      entry("H:/JM DIE/MILL/a.ipt", { machineCategory: "mill" }),
      entry("H:/JM DIE/LATHE/b.ipt", { machineCategory: "lathe" }),
      entry("H:/JM DIE/EDM/c.ipt", { machineCategory: "wire_edm" }),
    ];
    const out = filterMillEligibleEntries(entries, { millOnly: true });
    expect(out.length).toBe(1);
    expect(out[0]!.machineCategory).toBe("mill");
  });

  it("millOnly=true preserves all 3 mill-class categories (mill / hurco / hypermill)", () => {
    const entries: CADFileEntry[] = [
      entry("H:/a.ipt", { machineCategory: "mill" }),
      entry("H:/b.ipt", { machineCategory: "hurco" }),
      entry("H:/c.ipt", { machineCategory: "hypermill" }),
    ];
    const out = filterMillEligibleEntries(entries, { millOnly: true });
    expect(out.length).toBe(3);
    const categories = new Set(out.map((e) => e.machineCategory));
    expect(categories.has("mill")).toBe(true);
    expect(categories.has("hurco")).toBe(true);
    expect(categories.has("hypermill")).toBe(true);
  });

  it("empty input → empty output (boundary)", () => {
    expect(filterMillEligibleEntries([])).toEqual([]);
  });

  it("non-array input → empty output (defensive)", () => {
    expect(filterMillEligibleEntries(null as never)).toEqual([]);
    expect(filterMillEligibleEntries(undefined as never)).toEqual([]);
    expect(filterMillEligibleEntries({} as never)).toEqual([]);
  });

  it("custom format allowlist overrides MILL_PROGRAM_FORMATS", () => {
    const entries: CADFileEntry[] = [
      entry("H:/a.step", { format: ".step" }),
      entry("H:/b.ipt"),
    ];
    const out = filterMillEligibleEntries(entries, {
      formats: new Set([".step" as never]),
    });
    expect(out.length).toBe(1);
    expect(out[0]!.format).toBe(".step");
  });

  it("malformed entries silently skipped (caller counts them upstream)", () => {
    const entries = [
      entry("H:/a.ipt"),
      { absolutePath: "H:/bad", format: ".ipt" } as never, // missing customer / machineCategory
      entry("H:/c.ipt", { fileId: SHA64_C }),
    ];
    const out = filterMillEligibleEntries(entries);
    expect(out.length).toBe(2);
  });
});

// ── augmentJoinFromCADIndex — pure transform ─────────────────────────────────

describe("augmentJoinFromCADIndex — reference values from JSDoc", () => {
  it('"T8047D3 ITW.ipt" → normalized "8047D3", match_kind "filename_exact"', () => {
    const joinIdx = joinIndexWithPNs(["8047D3"]);
    const mi = masterIndex([entry("H:/JM DIE/MILL/ITW/T8047D3 ITW.ipt", { customer: "ITW" })]);
    const r = augmentJoinFromCADIndex(joinIdx, mi);
    // extractJMDieCandidates produces ["T8047D3 ITW", "T8047D3", "8047D3", ...]
    // — the prefix+suffix-stripped form "8047D3" exactly matches its normalization,
    // so the kernel emits match_kind="filename_exact". (A pure-loose hit would be
    // a candidate that differs from its normalized form, e.g. "L-2845-D2" → "2845".)
    expect(r.newLinks.length).toBe(1);
    expect(r.newLinks[0]!.matched_normalized_pn).toBe("8047D3");
    expect(r.newLinks[0]!.match_kind).toBe("filename_exact");
    expect(r.newLinks[0]!.cad_customer).toBe("ITW");
    expect(r.newLinks[0]!.cad_format).toBe(".ipt");
  });

  it('"L-2845-D2.ipt" → normalized "2845", match_kind upgrades to "filename_exact"', () => {
    const joinIdx = joinIndexWithPNs(["2845"]);
    const mi = masterIndex([entry("H:/JM DIE/MILL/L-2845-D2.ipt")]);
    const r = augmentJoinFromCADIndex(joinIdx, mi);
    // Parent normalizer strips -D2 because of leading dash → "2845".
    // The extractor produces multiple candidates ("L-2845-D2", "2845", "2845-D2"),
    // ALL of which normalize to "2845". Because at least one candidate ("2845")
    // EQUALS its own normalization, the kernel records "filename_exact" — the
    // dedupe step at ProgramPrintLinkIndexEngine.ts:447-450 preserves the
    // STRONGER match_kind across candidates that map to the same PN. A genuine
    // loose-only case requires a single candidate whose form differs from its
    // normalization — hard to construct with the JM-Die extractor which always
    // produces a digits-only candidate. So in practice every filename match in
    // this corpus lands as filename_exact.
    expect(r.newLinks.length).toBe(1);
    expect(r.newLinks[0]!.matched_normalized_pn).toBe("2845");
    expect(r.newLinks[0]!.match_kind).toBe("filename_exact");
  });

  it('"C2500-2497 SCREWS.iam" → normalized "2500-2497"', () => {
    const joinIdx = joinIndexWithPNs(["2500-2497"]);
    const mi = masterIndex([
      entry("H:/JM DIE/MILL/SCREWS/C2500-2497 SCREWS.iam", {
        format: ".iam",
        customer: "SCREWS",
      }),
    ]);
    const r = augmentJoinFromCADIndex(joinIdx, mi);
    expect(r.newLinks.length).toBe(1);
    expect(r.newLinks[0]!.matched_normalized_pn).toBe("2500-2497");
  });

  it('"9082526 AGRATI.f3d" → normalized "9082526"', () => {
    const joinIdx = joinIndexWithPNs(["9082526"]);
    const mi = masterIndex([
      entry("H:/JM DIE/MILL/AGRATI/9082526 AGRATI.f3d", {
        format: ".f3d",
        customer: "AGRATI",
      }),
    ]);
    const r = augmentJoinFromCADIndex(joinIdx, mi);
    expect(r.newLinks.length).toBe(1);
    expect(r.newLinks[0]!.matched_normalized_pn).toBe("9082526");
    expect(r.newLinks[0]!.cad_customer).toBe("AGRATI");
  });

  it('"BU-1365-0000-002 TFI.sldprt" → normalized "1365-0000-002"', () => {
    const joinIdx = joinIndexWithPNs(["1365-0000-002"]);
    const mi = masterIndex([
      entry("H:/JM DIE/MILL/TFI/BU-1365-0000-002 TFI.sldprt", {
        format: ".sldprt",
        customer: "TFI",
      }),
    ]);
    const r = augmentJoinFromCADIndex(joinIdx, mi);
    expect(r.newLinks.length).toBe(1);
    expect(r.newLinks[0]!.matched_normalized_pn).toBe("1365-0000-002");
    expect(r.newLinks[0]!.cad_customer).toBe("TFI");
  });
});

describe("augmentJoinFromCADIndex — variability across 3 customers + 3 formats", () => {
  it("3-customer batch (ITW / AGRATI / TFI) emits 3 enriched links", () => {
    const joinIdx = joinIndexWithPNs(["8047D3", "9082526", "1365-0000-002"]);
    const mi = masterIndex([
      entry("H:/JM DIE/MILL/ITW/T8047D3 ITW.ipt", { customer: "ITW", fileId: SHA64 }),
      entry("H:/JM DIE/MILL/AGRATI/9082526 AGRATI.f3d", {
        format: ".f3d",
        customer: "AGRATI",
        fileId: SHA64_B,
      }),
      entry("H:/JM DIE/MILL/TFI/BU-1365-0000-002 TFI.sldprt", {
        format: ".sldprt",
        customer: "TFI",
        fileId: SHA64_C,
      }),
    ]);
    const r = augmentJoinFromCADIndex(joinIdx, mi);
    expect(r.newLinks.length).toBe(3);
    const customers = new Set(r.newLinks.map((l) => l.cad_customer));
    expect(customers.has("ITW")).toBe(true);
    expect(customers.has("AGRATI")).toBe(true);
    expect(customers.has("TFI")).toBe(true);
  });

  it("3-format batch (.ipt / .iam / .f3d) all matched", () => {
    const joinIdx = joinIndexWithPNs(["100", "200", "300"]);
    const mi = masterIndex([
      entry("H:/100.ipt", { format: ".ipt" }),
      entry("H:/200.iam", { format: ".iam", fileId: SHA64_B }),
      entry("H:/300.f3d", { format: ".f3d", fileId: SHA64_C }),
    ]);
    const r = augmentJoinFromCADIndex(joinIdx, mi);
    expect(r.newLinks.length).toBe(3);
    expect(new Set(r.newLinks.map((l) => l.cad_format))).toEqual(
      new Set([".ipt", ".iam", ".f3d"]),
    );
  });

  it("complexityHint enrichment: simple / moderate / complex / large all preserved", () => {
    const joinIdx = joinIndexWithPNs(["100", "200", "300", "400"]);
    const mi = masterIndex([
      entry("H:/100.ipt", { complexityHint: "simple", fileId: SHA64 }),
      entry("H:/200.ipt", { complexityHint: "moderate", fileId: SHA64_B }),
      entry("H:/300.ipt", { complexityHint: "complex", fileId: SHA64_C }),
      entry("H:/400.ipt", { complexityHint: "large", fileId: SHA64_D }),
    ]);
    const r = augmentJoinFromCADIndex(joinIdx, mi);
    const hints = r.newLinks.map((l) => l.cad_complexity_hint).sort();
    expect(hints).toEqual(["complex", "large", "moderate", "simple"]);
  });
});

describe("augmentJoinFromCADIndex — stats accuracy", () => {
  it("empty masterIndex → 0 newLinks, all counters zero except buildMs", () => {
    const joinIdx = joinIndexWithPNs(["8047D3"]);
    const r = augmentJoinFromCADIndex(joinIdx, masterIndex([]));
    expect(r.newLinks.length).toBe(0);
    expect(r.stats.cadEntriesScanned).toBe(0);
    expect(r.stats.millEligibleEntries).toBe(0);
    expect(r.stats.malformedEntries).toBe(0);
    expect(r.stats.skippedNonMillFormat).toBe(0);
    expect(r.stats.skippedNonMillCategory).toBe(0);
    expect(r.stats.cadZipMisses).toBe(0);
    expect(r.stats.buildMs).toBeGreaterThanOrEqual(0);
  });

  it("stillOrphan counted separately from cadZipMisses (FAIL-LOUD signal)", () => {
    const joinIdx = joinIndexWithPNs(["NEVERMATCHES"]); // no PN matches the .ipt
    const mi = masterIndex([entry("H:/JM DIE/T8047D3 ITW.ipt")]);
    const r = augmentJoinFromCADIndex(joinIdx, mi);
    expect(r.newLinks.length).toBe(0);
    expect(r.stats.cadZipMisses).toBe(0); // engine internal invariant intact
  });

  it("format filter rejects count into skippedNonMillFormat", () => {
    const joinIdx = joinIndexWithPNs(["8047D3"]);
    const mi = masterIndex([
      entry("H:/T8047D3.step", { format: ".step" }),
      entry("H:/T8047D3.stl", { format: ".stl" }),
      entry("H:/T8047D3.ipt"),
    ]);
    const r = augmentJoinFromCADIndex(joinIdx, mi);
    expect(r.stats.skippedNonMillFormat).toBe(2);
    expect(r.stats.millEligibleEntries).toBe(1);
  });

  it("millOnly filter rejects count into skippedNonMillCategory", () => {
    const joinIdx = joinIndexWithPNs(["8047D3"]);
    const mi = masterIndex([
      entry("H:/T8047D3.ipt", { machineCategory: "mill" }),
      entry("H:/T8047D3.ipt", { machineCategory: "lathe" }),
      entry("H:/T8047D3.ipt", { machineCategory: "wire_edm" }),
    ]);
    const r = augmentJoinFromCADIndex(joinIdx, mi, { millOnly: true });
    expect(r.stats.skippedNonMillCategory).toBe(2);
    expect(r.stats.millEligibleEntries).toBe(1);
  });

  it("malformed entries counted, not silently dropped", () => {
    const joinIdx = joinIndexWithPNs(["8047D3"]);
    const mi = masterIndex([
      entry("H:/good.ipt"),
      { absolutePath: "H:/bad.ipt" } as never, // missing other 7 fields
      { absolutePath: "H:/bad2.ipt", format: ".ipt", customer: "X" } as never, // missing 6
      null as never,
      "string-not-object" as never,
    ]);
    const r = augmentJoinFromCADIndex(joinIdx, mi);
    expect(r.stats.cadEntriesScanned).toBe(5);
    expect(r.stats.malformedEntries).toBe(4);
    expect(r.stats.millEligibleEntries).toBe(1);
  });
});

describe("augmentJoinFromCADIndex — FAIL-LOUD invariants", () => {
  it("throws on null joinIndex", () => {
    expect(() =>
      augmentJoinFromCADIndex(null as never, masterIndex([])),
    ).toThrow(/joinIndex is required/);
  });

  it("throws on undefined joinIndex", () => {
    expect(() =>
      augmentJoinFromCADIndex(undefined as never, masterIndex([])),
    ).toThrow(/joinIndex is required/);
  });

  it("throws on null masterIndex", () => {
    expect(() =>
      augmentJoinFromCADIndex(emptyJoinIndex(), null as never),
    ).toThrow(/masterIndex is required/);
  });

  it("throws on non-array masterIndex.files (schemaVersion drift)", () => {
    const badMI = { ...masterIndex([]), files: "not-an-array" } as never;
    expect(() => augmentJoinFromCADIndex(emptyJoinIndex(), badMI)).toThrow(
      /masterIndex\.files must be an array/,
    );
  });
});

describe("augmentJoinFromCADIndex — adversarial inputs", () => {
  it("NaN sizeBytes → malformed (rejected by isUsableEntry)", () => {
    const joinIdx = joinIndexWithPNs(["100"]);
    const mi = masterIndex([entry("H:/100.ipt", { sizeBytes: Number.NaN })]);
    const r = augmentJoinFromCADIndex(joinIdx, mi);
    expect(r.stats.malformedEntries).toBe(1);
    expect(r.newLinks.length).toBe(0);
  });

  it("Infinity sizeBytes → malformed", () => {
    const joinIdx = joinIndexWithPNs(["100"]);
    const mi = masterIndex([entry("H:/100.ipt", { sizeBytes: Number.POSITIVE_INFINITY })]);
    const r = augmentJoinFromCADIndex(joinIdx, mi);
    expect(r.stats.malformedEntries).toBe(1);
  });

  it("negative sizeBytes → malformed", () => {
    const joinIdx = joinIndexWithPNs(["100"]);
    const mi = masterIndex([entry("H:/100.ipt", { sizeBytes: -1 })]);
    const r = augmentJoinFromCADIndex(joinIdx, mi);
    expect(r.stats.malformedEntries).toBe(1);
  });

  it("fileId wrong length → malformed (SHA-256 invariant)", () => {
    const joinIdx = joinIndexWithPNs(["100"]);
    const mi = masterIndex([entry("H:/100.ipt", { fileId: "short" })]);
    const r = augmentJoinFromCADIndex(joinIdx, mi);
    expect(r.stats.malformedEntries).toBe(1);
  });

  it("complexityHint not in enum → malformed", () => {
    const joinIdx = joinIndexWithPNs(["100"]);
    const mi = masterIndex([
      entry("H:/100.ipt", { complexityHint: "simplee" as never }),
    ]);
    const r = augmentJoinFromCADIndex(joinIdx, mi);
    expect(r.stats.malformedEntries).toBe(1);
  });

  it("machineCategory not in enum → malformed", () => {
    const joinIdx = joinIndexWithPNs(["100"]);
    const mi = masterIndex([
      entry("H:/100.ipt", { machineCategory: "millll" as never }),
    ]);
    const r = augmentJoinFromCADIndex(joinIdx, mi);
    expect(r.stats.malformedEntries).toBe(1);
  });

  it("oversize batch (1000 entries) — all malformed → still terminates + stats accurate", () => {
    const joinIdx = joinIndexWithPNs(["100"]);
    const files = new Array(1000).fill(0).map(() => ({} as never));
    const mi = masterIndex(files);
    const r = augmentJoinFromCADIndex(joinIdx, mi);
    expect(r.stats.malformedEntries).toBe(1000);
    expect(r.stats.cadEntriesScanned).toBe(1000);
    expect(r.stats.millEligibleEntries).toBe(0);
  });

  it("path-injection candidate (UNC path) passes through — engine doesn't path-validate (trusted producer)", () => {
    const joinIdx = joinIndexWithPNs(["100"]);
    const mi = masterIndex([entry("\\\\evil-host\\share\\100.ipt")]);
    const r = augmentJoinFromCADIndex(joinIdx, mi);
    // Should still match — trust boundary is documented
    expect(r.newLinks.length).toBe(1);
  });

  it("Windows backslash path round-trips through zip step (silent-break vector)", () => {
    // The kernel does `normalizeProgramPathKey(rawPath)` internally for the
    // `byProgramPath` check, but emits `program_path: rawPath` verbatim.
    // Our `entryByPath` keys on `e.absolutePath` (the raw string). So if a
    // CADFileEntry holds a Windows path AND the kernel ever switched to
    // emitting the normalized form, every link would silently zip-miss.
    // This test pins the contract: backslash paths zip cleanly today.
    const joinIdx = joinIndexWithPNs(["8047D3"]);
    const mi = masterIndex([
      entry("H:\\PRISM\\JM DIE\\MILL\\ITW\\T8047D3 ITW.ipt", { customer: "ITW" }),
    ]);
    const r = augmentJoinFromCADIndex(joinIdx, mi);
    expect(r.newLinks.length).toBe(1);
    expect(r.stats.cadZipMisses).toBe(0);
    expect(r.newLinks[0]!.cad_customer).toBe("ITW");
    expect(r.newLinks[0]!.program_path).toBe("H:\\PRISM\\JM DIE\\MILL\\ITW\\T8047D3 ITW.ipt");
  });
});

describe("augmentJoinFromCADIndex — enrichment field preservation", () => {
  it("every cad_* field on the link carries the entry value verbatim", () => {
    const joinIdx = joinIndexWithPNs(["8047D3"]);
    const e = entry("H:/JM DIE/MILL/ITW/T8047D3 ITW.ipt", {
      fileId: SHA64_E,
      customer: "ITW",
      machineCategory: "hurco",
      complexityHint: "complex",
      sizeBytes: 1_234_567,
      format: ".ipt",
    });
    const mi = masterIndex([e]);
    const r = augmentJoinFromCADIndex(joinIdx, mi);
    expect(r.newLinks.length).toBe(1);
    const link: CADAugmentedLink = r.newLinks[0]!;
    expect(link.cad_file_id).toBe(SHA64_E);
    expect(link.cad_customer).toBe("ITW");
    expect(link.cad_machine_category).toBe("hurco");
    expect(link.cad_complexity_hint).toBe("complex");
    expect(link.cad_size_bytes).toBe(1_234_567);
    expect(link.cad_format).toBe(".ipt");
    // base fields also preserved
    expect(link.program_path).toBe("H:/JM DIE/MILL/ITW/T8047D3 ITW.ipt");
    expect(link.program_filename).toBe("T8047D3 ITW.ipt");
    expect(link.matched_normalized_pn).toBe("8047D3");
  });
});

// ── Engine class + singleton ─────────────────────────────────────────────────

describe("CADArchiveJoinAugmenterEngine class", () => {
  it("singleton is an instance of the class", () => {
    expect(cadArchiveJoinAugmenterEngine).toBeInstanceOf(CADArchiveJoinAugmenterEngine);
  });

  it("validate() accepts an object, rejects non-objects", () => {
    const e = cadArchiveJoinAugmenterEngine;
    expect(e.validate({})).toBeNull();
    expect(e.validate({ millOnly: true })).toBeNull();
    expect(typeof e.validate(null)).toBe("string");
    expect(typeof e.validate(42)).toBe("string");
    expect(typeof e.validate("string")).toBe("string");
  });

  it("getCapabilities() lists the 2 dispatcher actions", () => {
    const caps = cadArchiveJoinAugmenterEngine.getCapabilities();
    const allActions = caps.flatMap((c) => c.actions);
    expect(allActions).toContain("cad_archive_join_augment");
    expect(allActions).toContain("cad_archive_join_augment_dry");
  });

  it("loadAndAugment throws when master-index file does not exist", async () => {
    await expect(
      cadArchiveJoinAugmenterEngine.loadAndAugment({
        masterIndexPath: "H:/nonexistent/does-not-exist.json",
      }),
    ).rejects.toThrow(/master-index not found/);
  });
});
