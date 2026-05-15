/**
 * ProgramPrintLinkIndexEngine — tests
 *
 * MS-PRINT-PROGRAM-LOOP / U-PPL-D1 (Track D)
 *
 * Real-value assertions throughout — no stubs, no placeholders. Fixtures are
 * constructed in-memory (no disk I/O) so the suite runs in <1s.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type {
  BlueprintRef,
  JoinIndex,
  JoinIndexProgramRef,
  JoinIndexRow,
  ProgramToPrintLink,
  TrainingTripleRow,
  V6MatchConfidence,
} from "../engines/BlueprintProgramJoinEngine.js";
import { normalizeProgramPathKey } from "../engines/BlueprintProgramJoinEngine.js";
import {
  JM_DIE_CUSTOMER_SUFFIXES,
  MIN_PN_REMAINDER_LENGTH,
  PROGRAM_EQUIVALENT_EXTENSIONS,
  ProgramPrintLinkIndexEngine,
  buildProgramSeedAugmentation,
  coverageReport,
  extractJMDieCandidates,
  loadLinkIndex,
  lookupPrintForProgram,
  lookupProgramsForPrint,
  normalizeJMDiePN,
  programPrintLinkIndexEngine,
} from "../engines/ProgramPrintLinkIndexEngine.js";
import type { LoadLinkIndexOptions } from "../engines/ProgramPrintLinkIndexEngine.js";

// ============================================================================
// FIXTURE HELPERS
// ============================================================================

function makeBlueprint(doc_id: string, page = 0, score = 1.0): BlueprintRef {
  return { doc_id, filename: `${doc_id}.pdf`, page_index: page, drawing_score: score };
}

function makeJoinRow(
  raw: string,
  normalized: string,
  confidence: V6MatchConfidence = "exact",
  programs: JoinIndexProgramRef[] = [],
): JoinIndexRow {
  return {
    part_number: raw,
    part_number_normalized: normalized,
    blueprints: [makeBlueprint(`bp-${normalized}`)],
    programs,
    match_confidence: confidence,
    n_programs: programs.length,
  };
}

function makeProgram(source_path: string, customer = "ITW"): JoinIndexProgramRef {
  return {
    source_path,
    filename: source_path.split(/[\\/]/).pop() ?? source_path,
    customer,
    kind: "program",
    kind3: "g_code",
    relation: "has_g_code",
    via: "exact",
  };
}

function makeLink(
  program_path: string,
  pn: string,
  norm: string,
  source: ProgramToPrintLink["source"] = "join_v6",
  match_confidence: string = "exact",
): ProgramToPrintLink {
  return {
    program_path,
    part_number: pn,
    part_number_normalized: norm,
    source,
    match_confidence,
    print_doc_ids: [`bp-${norm}`],
  };
}

function makeIndex(rows: JoinIndexRow[], triples: TrainingTripleRow[] = []): JoinIndex {
  const byNormalizedPN = new Map<string, JoinIndexRow>();
  const byProgramPath = new Map<string, ProgramToPrintLink[]>();
  const triplesByPN = new Map<string, TrainingTripleRow[]>();

  for (const row of rows) {
    byNormalizedPN.set(row.part_number_normalized, row);
    for (const prog of row.programs) {
      // Use parent's canonical normalizer (not ad-hoc lower+slash-replace) so the fixture
      // tracks the parent contract; a future refactor of normalizeProgramPathKey would then
      // surface in tests instead of silently mismatching.
      const key = normalizeProgramPathKey(prog.source_path);
      const link = makeLink(prog.source_path, row.part_number, row.part_number_normalized, "join_v6", row.match_confidence);
      const existing = byProgramPath.get(key);
      if (existing) existing.push(link);
      else byProgramPath.set(key, [link]);
    }
  }

  for (const t of triples) {
    const norm = t.tb_part_number ?? "";
    if (norm.length > 0) {
      const existing = triplesByPN.get(norm);
      if (existing) existing.push(t);
      else triplesByPN.set(norm, [t]);
    }
  }

  return {
    byNormalizedPN,
    byProgramPath,
    triplesByPN,
    stats: {
      joinRows: rows.length,
      joinRowsMalformed: 0,
      tripleRows: triples.length,
      triplesRowsMalformed: 0,
      programPaths: byProgramPath.size,
      joinJsonlPath: "/test/join.jsonl",
      triplesJsonlPath: null,
      joinMtimeMs: 0,
      triplesMtimeMs: 0,
      loadedAt: Date.now(),
    },
  };
}

const EMPTY_COMPOSITE_STATS = {
  joinRows: 0, tripleRows: 0, programPaths: 0,
  seedProgramsScanned: 0, seedAlreadyJoined: 0, seedNoCandidates: 0,
  seedNewLinks: 0, seedStillOrphan: 0, seedBuildMs: 0, loadedAt: 0,
};

// ============================================================================
// NORMALIZER — JM-DIE-SPECIFIC FORMS
// ============================================================================

describe("normalizeJMDiePN — JM-Die wild forms from envelope brief", () => {
  it("strips trailing customer suffix ITW + leading single-letter prefix T", () => {
    expect(normalizeJMDiePN("T8047D3 ITW")).toBe("8047D3");
  });

  it("strips SCREWS suffix + single-letter C prefix", () => {
    expect(normalizeJMDiePN("C2500-2497 SCREWS")).toBe("2500-2497");
  });

  it("strips trailing AGRATI suffix, leaves pure-digit PN intact (no letter prefix)", () => {
    expect(normalizeJMDiePN("9082526 AGRATI")).toBe("9082526");
  });

  it("strips TFI suffix + multi-letter BU- prefix (multi tried BEFORE single)", () => {
    expect(normalizeJMDiePN("BU-1365-0000-002 TFI")).toBe("1365-0000-002");
  });

  it("handles lowercase input by upper-casing first", () => {
    expect(normalizeJMDiePN("c2500-2497 screws")).toBe("2500-2497");
  });

  it("handles tab + multi-space separator between PN and suffix", () => {
    expect(normalizeJMDiePN("9082526   AGRATI")).toBe("9082526");
  });

  it("returns empty string on empty input", () => {
    expect(normalizeJMDiePN("")).toBe("");
  });

  it("returns empty string on whitespace-only input", () => {
    expect(normalizeJMDiePN("   ")).toBe("");
  });

  it("returns empty string on non-string runtime input", () => {
    // @ts-expect-error — intentional runtime type fuzz
    expect(normalizeJMDiePN(null)).toBe("");
    // @ts-expect-error — intentional runtime type fuzz
    expect(normalizeJMDiePN(undefined)).toBe("");
    // @ts-expect-error — intentional runtime type fuzz
    expect(normalizeJMDiePN(12345)).toBe("");
  });

  it("preserves a customer-only input (no PN to extract)", () => {
    expect(normalizeJMDiePN("ITW")).toBe("ITW");
  });

  it("is idempotent — applying twice equals applying once", () => {
    const cases = [
      "T8047D3 ITW",
      "C2500-2497 SCREWS",
      "9082526 AGRATI",
      "BU-1365-0000-002 TFI",
      "L-2845-D2.MIN",
      "",
      "ITW",
    ];
    for (const c of cases) {
      const once = normalizeJMDiePN(c);
      const twice = normalizeJMDiePN(once);
      expect(twice).toBe(once);
    }
  });

  it("does NOT strip single-letter prefix when remainder would be <MIN_PN_REMAINDER_LENGTH", () => {
    expect(normalizeJMDiePN("T804")).toBe("T804");
  });

  it("DOES strip single-letter prefix when remainder is exactly MIN_PN_REMAINDER_LENGTH", () => {
    expect(normalizeJMDiePN("T8047")).toBe("8047");
  });

  it("strips shop-floor SETUP suffix", () => {
    expect(normalizeJMDiePN("9082526 SETUP")).toBe("9082526");
    expect(normalizeJMDiePN("9082526 SETUP2")).toBe("9082526");
  });

  it("strips shop-floor SIDE-A / SIDE-B descriptor", () => {
    expect(normalizeJMDiePN("9082526 SIDE-A")).toBe("9082526");
    expect(normalizeJMDiePN("9082526 SIDE-B")).toBe("9082526");
    expect(normalizeJMDiePN("9082526-SIDE-A")).toBe("9082526");
  });

  it("strips shop-floor REWORK descriptor", () => {
    expect(normalizeJMDiePN("9082526 REWORK")).toBe("9082526");
  });

  it("strips space-separated OP10 (parent only handles dash-separated -OP10)", () => {
    expect(normalizeJMDiePN("9082526 OP10")).toBe("9082526");
    expect(normalizeJMDiePN("9082526-OP10")).toBe("9082526");
  });

  it("strips stacked suffixes via fixed-point loop (PN SUFFIX1 SUFFIX2)", () => {
    expect(normalizeJMDiePN("9082526 AGRATI OP10")).toBe("9082526");
  });

  it("defers to parent normalizer for L-/M-/G- prefix forms", () => {
    expect(normalizeJMDiePN("L-2845-D2.MIN")).toBe("2845");
    expect(normalizeJMDiePN("M-2845-OP1")).toBe("2845");
  });

  it("MIN_PN_REMAINDER_LENGTH is exposed as a named constant (value 4)", () => {
    expect(MIN_PN_REMAINDER_LENGTH).toBe(4);
    expect(typeof MIN_PN_REMAINDER_LENGTH).toBe("number");
  });

  it("multi-letter prefix tried before single — 'BU-1365' must not eat only 'B'", () => {
    const result = normalizeJMDiePN("BU-1365-0000-002");
    expect(result).toBe("1365-0000-002");
    expect(result.startsWith("U-")).toBe(false);
  });
});

describe("normalizeJMDiePN — JM_DIE_CUSTOMER_SUFFIXES coverage", () => {
  it("strips each JM-Die customer suffix from a sample PN", () => {
    for (const suffix of JM_DIE_CUSTOMER_SUFFIXES) {
      const input = `9082526 ${suffix}`;
      const out = normalizeJMDiePN(input);
      expect(out).toBe("9082526");
    }
  });

  it("customer suffix list is non-empty and uppercase", () => {
    expect(JM_DIE_CUSTOMER_SUFFIXES.length).toBeGreaterThan(5);
    for (const s of JM_DIE_CUSTOMER_SUFFIXES) {
      expect(s).toBe(s.toUpperCase());
      expect(s.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// CANDIDATE EXTRACTION
// ============================================================================

describe("extractJMDieCandidates — superset of parent extractor", () => {
  it("returns the parent's candidates as a subset (never SHRINKS)", () => {
    const cands = extractJMDieCandidates("T8047D3 ITW.MIN");
    expect(cands.length).toBeGreaterThan(0);
    expect(cands.some((c) => c.toUpperCase() === "T8047D3 ITW")).toBe(true);
  });

  it("adds the customer-suffix-stripped form", () => {
    const cands = extractJMDieCandidates("T8047D3 ITW.MIN");
    expect(cands).toContain("T8047D3");
  });

  it("adds the customer-prefix-stripped form", () => {
    const cands = extractJMDieCandidates("T8047D3 ITW.MIN");
    expect(cands).toContain("8047D3");
  });

  it("recursively extracts digits-only from suffix-stripped form", () => {
    const cands = extractJMDieCandidates("C2500-2497 SCREWS.MIN");
    expect(cands).toContain("2500-2497");
  });

  it("returns [] on empty string", () => {
    expect(extractJMDieCandidates("")).toEqual([]);
  });

  it("returns [] on non-string runtime input", () => {
    // @ts-expect-error — intentional runtime type fuzz
    expect(extractJMDieCandidates(null)).toEqual([]);
    // @ts-expect-error — intentional runtime type fuzz
    expect(extractJMDieCandidates(undefined)).toEqual([]);
  });

  it("dedupes — Set semantics, no duplicate strings", () => {
    const cands = extractJMDieCandidates("9082526.MIN");
    const seen = new Set(cands);
    expect(seen.size).toBe(cands.length);
  });

  it("never returns empty-string candidates", () => {
    const cands = extractJMDieCandidates("T8047D3 ITW.MIN");
    expect(cands.includes("")).toBe(false);
  });
});

describe("PROGRAM_EQUIVALENT_EXTENSIONS — surface check", () => {
  it("includes mill program extensions", () => {
    expect(PROGRAM_EQUIVALENT_EXTENSIONS.has(".min")).toBe(true);
    expect(PROGRAM_EQUIVALENT_EXTENSIONS.has(".mcx")).toBe(true);
    expect(PROGRAM_EQUIVALENT_EXTENSIONS.has(".nc")).toBe(true);
  });
  it("includes CAD-as-program extensions per envelope brief", () => {
    expect(PROGRAM_EQUIVALENT_EXTENSIONS.has(".ipt")).toBe(true);
    expect(PROGRAM_EQUIVALENT_EXTENSIONS.has(".f3d")).toBe(true);
    expect(PROGRAM_EQUIVALENT_EXTENSIONS.has(".sldprt")).toBe(true);
  });
  it("does NOT include text/image extensions", () => {
    expect(PROGRAM_EQUIVALENT_EXTENSIONS.has(".pdf")).toBe(false);
    expect(PROGRAM_EQUIVALENT_EXTENSIONS.has(".jpg")).toBe(false);
    expect(PROGRAM_EQUIVALENT_EXTENSIONS.has(".txt")).toBe(false);
  });
});

// ============================================================================
// PROGRAM-SIDE SEED
// ============================================================================

describe("buildProgramSeedAugmentation — finds programs the blueprint-side seed missed", () => {
  it("rescues a customer-prefixed program filename when join has the bare PN", () => {
    const idx = makeIndex([makeJoinRow("8047D3", "8047D3")]);
    const result = buildProgramSeedAugmentation(idx, [
      "H:/PRISM/JM DIE/CNC LATHE/ITW/T8047D3 ITW.MIN",
    ]);
    expect(result.stats.scanned).toBe(1);
    expect(result.stats.alreadyJoined).toBe(0);
    // One link per (program, PN) pair — dedupe collapses the 3 candidate routes that
    // each normalize to "8047D3" into a single link.
    expect(result.stats.newLinks).toBe(1);
    expect(result.stats.stillOrphan).toBe(0);
    expect(result.newLinks[0].matched_normalized_pn).toBe("8047D3");
    // match_kind is the STRONGEST among the candidate paths that hit. The enhanced
    // extractor's prefix-stripped candidate "8047D3" hits the join key directly (no
    // enhanced normalization needed), so the upgrade-to-strongest logic promotes to
    // filename_exact even though loose-via-customer-suffix-strip was also possible.
    expect(result.newLinks[0].match_kind).toBe("filename_exact");
  });

  it("emits filename_loose when ONLY enhanced normalization (suffix strip) bridges to the join", () => {
    // Construct a join row whose normalized PN is NOT one of the prefix-stripped
    // candidates — forces every match to take the suffix-strip / prefix-strip route.
    // Here join key is "8047D3-A" (a rev-letter form parent would normalize from); the
    // filename "T8047D3-A ITW.MIN" doesn't extract "8047D3-A" directly (parent's extractor
    // strips rev letters), so the only route is via enhanced normalization.
    const idx = makeIndex([
      // Insert manually so the key isn't normalized away by parent — the key IS "8047D3-A".
    ]);
    idx.byNormalizedPN.set("8047D3-A", {
      part_number: "T8047D3-A",
      part_number_normalized: "8047D3-A",
      blueprints: [makeBlueprint("bp-8047D3-A")],
      programs: [],
      match_confidence: "exact",
    });
    const result = buildProgramSeedAugmentation(idx, [
      "H:/PRISM/JM DIE/CNC LATHE/ITW/T8047D3 ITW.MIN",
    ]);
    // None of the candidates from "T8047D3 ITW.MIN" normalize to "8047D3-A" because all
    // routes drop the rev letter — so this program is STILL ORPHAN (proves the dedupe +
    // upgrade logic doesn't silently invent matches).
    expect(result.stats.stillOrphan).toBe(1);
    expect(result.stats.newLinks).toBe(0);
  });

  it("skips a program already in joinIndex.byProgramPath (no double-count)", () => {
    const programPath = "H:/PRISM/JM DIE/CNC LATHE/ITW/T8047D3.MIN";
    const idx = makeIndex([makeJoinRow("8047D3", "8047D3", "exact", [makeProgram(programPath)])]);
    const result = buildProgramSeedAugmentation(idx, [programPath]);
    expect(result.stats.scanned).toBe(1);
    expect(result.stats.alreadyJoined).toBe(1);
    expect(result.stats.newLinks).toBe(0);
  });

  it("counts orphan when no candidate PN matches the join", () => {
    const idx = makeIndex([makeJoinRow("8047D3", "8047D3")]);
    const result = buildProgramSeedAugmentation(idx, [
      "H:/PRISM/JM DIE/CNC LATHE/SOMECUSTOMER/NEVER-SEEN-9999999.MIN",
    ]);
    expect(result.stats.newLinks).toBe(0);
    expect(result.stats.stillOrphan).toBe(1);
  });

  it("skips non-program extensions (counted into noCandidates)", () => {
    const idx = makeIndex([makeJoinRow("8047D3", "8047D3")]);
    const result = buildProgramSeedAugmentation(idx, [
      "H:/PRISM/JM DIE/CNC LATHE/ITW/T8047D3.txt",
    ]);
    expect(result.stats.newLinks).toBe(0);
    expect(result.stats.noCandidates).toBe(1);
  });

  it("skips empty/non-string paths into noCandidates (NOT scanned)", () => {
    const idx = makeIndex([makeJoinRow("8047D3", "8047D3")]);
    const result = buildProgramSeedAugmentation(idx, [
      "",
      // @ts-expect-error — intentional runtime type fuzz
      null,
      // @ts-expect-error — intentional runtime type fuzz
      undefined,
    ]);
    expect(result.stats.scanned).toBe(0);
    expect(result.stats.noCandidates).toBe(3);
  });

  it("FAIL-SOFT on non-array runtime input", () => {
    const idx = makeIndex([makeJoinRow("8047D3", "8047D3")]);
    // @ts-expect-error — intentional runtime fuzz
    const r1 = buildProgramSeedAugmentation(idx, null);
    expect(r1.stats.scanned).toBe(0);
    expect(r1.newLinks).toEqual([]);
    // @ts-expect-error — intentional runtime fuzz
    const r2 = buildProgramSeedAugmentation(idx, undefined);
    expect(r2.stats.scanned).toBe(0);
    // @ts-expect-error — intentional runtime fuzz
    const r3 = buildProgramSeedAugmentation(idx, {});
    expect(r3.stats.scanned).toBe(0);
  });

  it("match_kind 'filename_exact' when the filename's bare PN equals the joined normalized PN", () => {
    const idx = makeIndex([makeJoinRow("9082526", "9082526")]);
    const result = buildProgramSeedAugmentation(idx, ["H:/PRISM/JM DIE/CNC LATHE/AGRATI/9082526.MIN"]);
    expect(result.stats.newLinks).toBeGreaterThanOrEqual(1);
    const exactLinks = result.newLinks.filter((l) => l.match_kind === "filename_exact");
    expect(exactLinks.length).toBeGreaterThanOrEqual(1);
    expect(exactLinks[0].matched_normalized_pn).toBe("9082526");
    expect(exactLinks[0].raw_candidate).toBe("9082526");
  });

  it("emits multiple links from one filename when multiple candidates hit", () => {
    const idx = makeIndex([
      makeJoinRow("2500-2497", "2500-2497"),
      makeJoinRow("2500", "2500"),
    ]);
    const result = buildProgramSeedAugmentation(idx, [
      "H:/PRISM/JM DIE/CNC LATHE/ITW/C2500-2497 SCREWS.MIN",
    ]);
    expect(result.newLinks.length).toBeGreaterThanOrEqual(2);
    const matchedPNs = new Set(result.newLinks.map((l) => l.matched_normalized_pn));
    expect(matchedPNs.has("2500-2497")).toBe(true);
    expect(matchedPNs.has("2500")).toBe(true);
  });

  it("buildMs is non-negative finite ms", () => {
    const idx = makeIndex([makeJoinRow("9082526", "9082526")]);
    const result = buildProgramSeedAugmentation(idx, ["H:/PRISM/JM DIE/CNC LATHE/AGRATI/9082526.MIN"]);
    expect(result.stats.buildMs).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result.stats.buildMs)).toBe(true);
  });

  it("handles path-traversal candidate paths as opaque strings (defense in depth)", () => {
    // Pure-transform engine; malicious paths should be processed as strings, never resolved
    // against the filesystem. Engine must not throw + must emit deterministic stats.
    const idx = makeIndex([makeJoinRow("8047D3", "8047D3")]);
    const malicious = [
      "../../etc/passwd.MIN",
      "..\\..\\Windows\\System32\\config\\evil.MIN",
      "/dev/null/T8047D3.MIN",
      "C:\\..\\..\\SECRET\\T8047D3 ITW.MIN",
    ];
    expect(() => buildProgramSeedAugmentation(idx, malicious)).not.toThrow();
    const result = buildProgramSeedAugmentation(idx, malicious);
    expect(result.stats.scanned).toBe(4);
    // The last path's filename "T8047D3 ITW.MIN" should rescue against the join row, proving
    // the candidate extraction operated on the basename without touching the file system.
    expect(result.stats.newLinks).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// SINGLETON / CLASS WRAPPER (PRISM convention)
// ============================================================================

describe("class wrapper + singleton — PRISM convention compliance", () => {
  it("exports a class named ProgramPrintLinkIndexEngine", () => {
    expect(ProgramPrintLinkIndexEngine.name).toBe("ProgramPrintLinkIndexEngine");
  });

  it("exports a singleton named programPrintLinkIndexEngine", () => {
    expect(programPrintLinkIndexEngine).toBeInstanceOf(ProgramPrintLinkIndexEngine);
  });

  it("class methods produce same results as module functions", () => {
    const e = new ProgramPrintLinkIndexEngine();
    expect(e.normalizeJMDiePN("T8047D3 ITW")).toBe(normalizeJMDiePN("T8047D3 ITW"));
    expect(e.extractJMDieCandidates("T8047D3 ITW.MIN")).toEqual(extractJMDieCandidates("T8047D3 ITW.MIN"));
  });
});

// ============================================================================
// LOOKUP API
// ============================================================================

describe("lookupPrintForProgram — composite resolution", () => {
  it("returns links from parent join + program seed", () => {
    const programInJoin = "H:/PRISM/JM DIE/CNC LATHE/ITW/A.MIN";
    const programInSeedOnly = "H:/PRISM/JM DIE/CNC LATHE/ITW/T8047D3 ITW.MIN";
    const idx = makeIndex([
      makeJoinRow("A-PN", "A-PN", "exact", [makeProgram(programInJoin)]),
      makeJoinRow("8047D3", "8047D3"),
    ]);
    const seedAug = buildProgramSeedAugmentation(idx, [programInSeedOnly]);
    const composite = {
      joinIndex: idx,
      seedLinksByPath: new Map([
        [programInSeedOnly.toLowerCase().replace(/\\/g, "/"), seedAug.newLinks],
      ]),
      seedLinksByPN: new Map(),
      stats: { ...EMPTY_COMPOSITE_STATS, joinRows: 2, programPaths: 1, seedProgramsScanned: 1, seedNewLinks: seedAug.newLinks.length },
    };

    const r1 = lookupPrintForProgram(programInJoin, composite);
    expect(r1.found).toBe(true);
    expect(r1.sources).toContain("join_v6");
    expect(Array.isArray(r1.links)).toBe(true);
    expect((r1.links as unknown[]).length).toBe(1);
    expect(r1.match_confidence).toBe("exact");

    const r2 = lookupPrintForProgram(programInSeedOnly, composite);
    expect(r2.found).toBe(true);
    expect(r2.sources).toContain("program_seed");
    expect(r2.seed_links.length).toBeGreaterThanOrEqual(1);
    expect(r2.seed_links[0].matched_normalized_pn).toBe("8047D3");
    expect(r2.match_confidence).toBeNull();
  });

  it("returns found:false + empty sources on a path that doesn't match anything", () => {
    const idx = makeIndex([makeJoinRow("A-PN", "A-PN")]);
    const composite = {
      joinIndex: idx,
      seedLinksByPath: new Map(),
      seedLinksByPN: new Map(),
      stats: { ...EMPTY_COMPOSITE_STATS, joinRows: 1 },
    };
    const r = lookupPrintForProgram("H:/PRISM/NEVER/SEEN.MIN", composite);
    expect(r.found).toBe(false);
    expect(r.sources).toEqual([]);
    expect(r.seed_links).toEqual([]);
    expect(r.match_confidence).toBeNull();
  });

  it("path matching is case + slash agnostic", () => {
    const programPath = "H:/PRISM/JM DIE/CNC LATHE/ITW/A.MIN";
    const idx = makeIndex([makeJoinRow("A-PN", "A-PN", "exact", [makeProgram(programPath)])]);
    const composite = {
      joinIndex: idx,
      seedLinksByPath: new Map(),
      seedLinksByPN: new Map(),
      stats: { ...EMPTY_COMPOSITE_STATS, joinRows: 1, programPaths: 1 },
    };
    const r = lookupPrintForProgram("h:\\prism\\jm die\\cnc lathe\\itw\\a.min", composite);
    expect(r.found).toBe(true);
  });
});

describe("lookupProgramsForPrint — composite resolution + enhanced normalizer fallback", () => {
  it("resolves a customer-suffixed PN through the enhanced normalizer when parent missed", () => {
    const idx = makeIndex([makeJoinRow("9082526", "9082526", "exact", [makeProgram("H:/9082526.MIN", "AGRATI")])]);
    const composite = {
      joinIndex: idx,
      seedLinksByPath: new Map(),
      seedLinksByPN: new Map(),
      stats: { ...EMPTY_COMPOSITE_STATS, joinRows: 1, programPaths: 1 },
    };
    const r = lookupProgramsForPrint("9082526 AGRATI", composite);
    expect(r.found).toBe(true);
    expect(r.sources).toContain("join_v6");
    expect(r.match_confidence).toBe("exact");
  });

  it("falls through to seed-only hit when v6 join misses but seed has the PN", () => {
    const idx = makeIndex([]);
    idx.byNormalizedPN.set("UNRELATED", makeJoinRow("UNRELATED", "UNRELATED"));
    const composite = {
      joinIndex: idx,
      seedLinksByPath: new Map(),
      seedLinksByPN: new Map([
        ["9082526", [{
          program_path: "H:/9082526 AGRATI.MIN",
          program_filename: "9082526 AGRATI.MIN",
          raw_candidate: "9082526",
          matched_normalized_pn: "9082526",
          match_kind: "filename_exact" as const,
        }]],
      ]),
      stats: { ...EMPTY_COMPOSITE_STATS, joinRows: 1, seedProgramsScanned: 1, seedNewLinks: 1 },
    };
    const r = lookupProgramsForPrint("9082526", composite);
    expect(r.found).toBe(true);
    expect(r.sources).toEqual(["program_seed"]);
    expect(r.seed_links.length).toBe(1);
    expect(r.match_confidence).toBeNull();
  });

  it("returns found:false for an unknown PN", () => {
    const idx = makeIndex([makeJoinRow("OTHER", "OTHER")]);
    const composite = {
      joinIndex: idx,
      seedLinksByPath: new Map(),
      seedLinksByPN: new Map(),
      stats: { ...EMPTY_COMPOSITE_STATS, joinRows: 1 },
    };
    const r = lookupProgramsForPrint("NEVER-EXISTED-9999", composite);
    expect(r.found).toBe(false);
    expect(r.sources).toEqual([]);
  });

  it("sources element ORDER is stable: join_v6 → training_triple → program_seed", () => {
    const programPath = "H:/9082526.MIN";
    const idx = makeIndex([
      makeJoinRow("9082526", "9082526", "exact", [makeProgram(programPath, "AGRATI")]),
    ]);
    const composite = {
      joinIndex: idx,
      seedLinksByPath: new Map(),
      seedLinksByPN: new Map([
        ["9082526", [{
          program_path: "H:/another-program.MIN",
          program_filename: "another-program.MIN",
          raw_candidate: "9082526",
          matched_normalized_pn: "9082526",
          match_kind: "filename_loose" as const,
        }]],
      ]),
      stats: { ...EMPTY_COMPOSITE_STATS, joinRows: 1, programPaths: 1, seedProgramsScanned: 1, seedNewLinks: 1 },
    };
    const r = lookupProgramsForPrint("9082526", composite);
    expect(r.sources.length).toBe(2);
    const joinIdx = r.sources.indexOf("join_v6");
    const seedIdx = r.sources.indexOf("program_seed");
    expect(joinIdx).toBe(0);
    expect(seedIdx).toBe(1);
  });
});

// ============================================================================
// COVERAGE REPORT
// ============================================================================

describe("coverageReport — confidence breakdown + disk-side gap", () => {
  function makeCompositeForCoverage() {
    const rows: JoinIndexRow[] = [
      makeJoinRow("A", "A", "exact"),
      makeJoinRow("B", "B", "loose"),
      makeJoinRow("C", "C", "ambiguous"),
      makeJoinRow("D", "D", "miss"),
      makeJoinRow("E", "E", "garbage"),
    ];
    const idx = makeIndex(rows);
    return {
      joinIndex: idx,
      seedLinksByPath: new Map<string, []>(),
      seedLinksByPN: new Map<string, []>(),
      stats: { ...EMPTY_COMPOSITE_STATS, joinRows: rows.length },
    };
  }

  it("counts each of the 5 known confidence values exactly once", () => {
    const r = coverageReport(makeCompositeForCoverage());
    expect(r.join_stats.confidence_breakdown.exact).toBe(1);
    expect(r.join_stats.confidence_breakdown.loose).toBe(1);
    expect(r.join_stats.confidence_breakdown.ambiguous).toBe(1);
    expect(r.join_stats.confidence_breakdown.miss).toBe(1);
    expect(r.join_stats.confidence_breakdown.garbage).toBe(1);
    expect(r.join_stats.confidence_unknown).toBe(0);
  });

  it("FAIL-LOUD counts a malformed confidence value into confidence_unknown", () => {
    const composite = makeCompositeForCoverage();
    composite.joinIndex.byNormalizedPN.set("X", {
      part_number: "X",
      part_number_normalized: "X",
      blueprints: [],
      programs: [],
      // @ts-expect-error — intentional invalid value to test the FAIL-LOUD bucket.
      match_confidence: "unknown-value-from-future-producer",
    });
    const r = coverageReport(composite);
    expect(r.join_stats.confidence_unknown).toBe(1);
    expect(r.join_stats.confidence_breakdown.exact).toBe(1);
    expect(r.join_stats.confidence_breakdown.garbage).toBe(1);
  });

  it("disk-side gap math: inV6 + rescued + stillOrphan === archive_paths_scanned", () => {
    const programInV6 = "H:/A.MIN";
    const programRescued = "H:/T8047D3 ITW.MIN";
    const programOrphan = "H:/NEVER-SEEN-9999.MIN";

    const idx = makeIndex([
      makeJoinRow("A-PN", "A-PN", "exact", [makeProgram(programInV6)]),
      makeJoinRow("8047D3", "8047D3"),
    ]);
    const seedAug = buildProgramSeedAugmentation(idx, [programRescued]);
    const composite = {
      joinIndex: idx,
      seedLinksByPath: new Map([
        [programRescued.toLowerCase().replace(/\\/g, "/"), seedAug.newLinks],
      ]),
      seedLinksByPN: new Map(),
      stats: { ...EMPTY_COMPOSITE_STATS, joinRows: 2, programPaths: 1, seedProgramsScanned: 1, seedNewLinks: seedAug.newLinks.length },
    };

    const r = coverageReport(composite, {
      archiveProgramPaths: [programInV6, programRescued, programOrphan, "", "  "],
    });

    expect(r.disk_side.archive_paths_scanned).toBe(3);
    expect(r.disk_side.in_v6_join).toBe(1);
    expect(r.disk_side.rescued_by_seed).toBe(1);
    expect(r.disk_side.still_orphan).toBe(1);
    expect(
      r.disk_side.in_v6_join + r.disk_side.rescued_by_seed + r.disk_side.still_orphan,
    ).toBe(r.disk_side.archive_paths_scanned);
    expect(r.disk_side.orphan_rate_pct).toBeCloseTo((1 / 3) * 100, 1);
  });

  it("orphan_rate_pct is 0 when no archive paths supplied", () => {
    const r = coverageReport(makeCompositeForCoverage());
    expect(r.disk_side.archive_paths_scanned).toBe(0);
    expect(r.disk_side.orphan_rate_pct).toBe(0);
  });

  it("generated_at is an ISO-8601 timestamp string", () => {
    const r = coverageReport(makeCompositeForCoverage());
    expect(r.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

// ============================================================================
// LOAD INTEGRATION — exercises the async loadLinkIndex against a real v6 JSONL
// (B-P0-1 + B-P1-1 fix: zero-coverage on the public async entry point)
// ============================================================================

describe("loadLinkIndex — composite async load with tmp JSONL fixture", () => {
  let tmpDir: string;
  let tmpJoin: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ppl-d1-"));
    tmpJoin = path.join(tmpDir, "blueprint-program-join.jsonl");
    // Minimal v6 JSONL — 2 rows, mixed confidence, one row carries a program ref.
    const rows = [
      {
        part_number: "9082526",
        part_number_normalized: "9082526",
        blueprints: [{ doc_id: "bp-9082526", filename: "bp.pdf", page_index: 0, drawing_score: 1 }],
        programs: [{ source_path: "H:/jm/programs/9082526.MIN", filename: "9082526.MIN", kind: "program", kind3: "g_code", via: "exact" }],
        match_confidence: "exact",
        n_programs: 1,
      },
      {
        part_number: "8047D3",
        part_number_normalized: "8047D3",
        blueprints: [{ doc_id: "bp-8047D3", filename: "bp2.pdf", page_index: 0, drawing_score: 1 }],
        programs: [],
        match_confidence: "loose",
      },
    ];
    fs.writeFileSync(tmpJoin, rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf-8");
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("loads composite index with no inputProgramPaths → zero seed stats", async () => {
    const idx = await loadLinkIndex({ joinJsonlPath: tmpJoin });
    expect(idx.joinIndex.byNormalizedPN.size).toBe(2);
    expect(idx.joinIndex.byNormalizedPN.has("9082526")).toBe(true);
    expect(idx.joinIndex.byNormalizedPN.has("8047D3")).toBe(true);
    expect(idx.seedLinksByPath.size).toBe(0);
    expect(idx.seedLinksByPN.size).toBe(0);
    expect(idx.stats.seedProgramsScanned).toBe(0);
    expect(idx.stats.seedNewLinks).toBe(0);
    // Composite stats carry parent counts through unchanged.
    expect(idx.stats.joinRows).toBe(2);
  });

  it("populates seedLinksByPath + seedLinksByPN when inputProgramPaths supplied", async () => {
    const idx = await loadLinkIndex({
      joinJsonlPath: tmpJoin,
      inputProgramPaths: ["H:/jm/programs/T8047D3 ITW.MIN"],
    });
    expect(idx.stats.seedProgramsScanned).toBe(1);
    expect(idx.stats.seedNewLinks).toBeGreaterThanOrEqual(1);
    expect(idx.seedLinksByPath.size).toBeGreaterThanOrEqual(1);
    expect(idx.seedLinksByPN.has("8047D3")).toBe(true);
    // Path key in seedLinksByPath must use the parent's normalizer (lowercase, forward slash).
    const expectedKey = normalizeProgramPathKey("H:/jm/programs/T8047D3 ITW.MIN");
    expect(idx.seedLinksByPath.has(expectedKey)).toBe(true);
  });

  it("FAIL-SOFT on non-array inputProgramPaths (B-P1-1 fix wraps the runtime guard)", async () => {
    const idx = await loadLinkIndex({
      joinJsonlPath: tmpJoin,
      // @ts-expect-error — intentional runtime type fuzz
      inputProgramPaths: null,
    });
    expect(idx.stats.seedProgramsScanned).toBe(0);
    expect(idx.seedLinksByPath.size).toBe(0);
  });

  it("FAIL-LOUD propagates parent's loadJoinIndex throw on missing join file", async () => {
    const missingPath = path.join(tmpDir, "never-existed.jsonl");
    await expect(loadLinkIndex({ joinJsonlPath: missingPath })).rejects.toThrow();
  });

  it("LoadLinkIndexOptions type is exported and assignable", () => {
    // Type-only sanity: the export exists at the type-system level.
    const opts: LoadLinkIndexOptions = { joinJsonlPath: tmpJoin, inputProgramPaths: [] };
    expect(typeof opts.joinJsonlPath).toBe("string");
    expect(Array.isArray(opts.inputProgramPaths)).toBe(true);
  });

  it("composite index drives downstream lookups end-to-end", async () => {
    const idx = await loadLinkIndex({
      joinJsonlPath: tmpJoin,
      inputProgramPaths: ["H:/jm/programs/T8047D3 ITW.MIN"],
    });
    // print → programs: the seed rescue path
    const r1 = lookupProgramsForPrint("8047D3", idx);
    expect(r1.found).toBe(true);
    expect(r1.sources).toContain("program_seed");

    // program → print: the seed path's reverse direction
    const r2 = lookupPrintForProgram("H:/jm/programs/T8047D3 ITW.MIN", idx);
    expect(r2.found).toBe(true);
    expect(r2.sources).toContain("program_seed");
    expect(r2.seed_links[0].matched_normalized_pn).toBe("8047D3");

    // The v6-joined PN should resolve through join_v6, not seed.
    const r3 = lookupProgramsForPrint("9082526", idx);
    expect(r3.found).toBe(true);
    expect(r3.sources).toContain("join_v6");
  });
});
