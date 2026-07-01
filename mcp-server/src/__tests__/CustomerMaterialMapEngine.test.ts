/**
 * CustomerMaterialMapEngine.test.ts — MS-PRINT-PROGRAM-LOOP / U-PPL-C2
 *
 * Covers the full public surface:
 *   - `extractMaterialFromFilename` (filename → MaterialHit | null) — happy path
 *     + thread-context disambiguation + MAX_FILENAME_LEN guard + word-boundary.
 *   - `extractMaterialFromCustomerFolder` (customer → MaterialHit | null).
 *   - `resolveEntryMaterial` — source-priority order (blueprint > filename > folder).
 *   - `buildCustomerMaterialMap` (entries[] → CustomerMaterialMap) — FAIL-LOUD on
 *     non-array, invalid-entry skipping, distribution math, coverage_pct rounding.
 *   - `lookupMaterialDistribution` — case-insensitive trim+upper lookup.
 *   - `CustomerMaterialMapEngine` class wrapper — instance methods delegate correctly.
 *   - `ProgramSampleEntrySchema` — Zod safeParse rejects malformed.
 *   - Lock tests — MATERIAL_KEYWORDS array order is load-bearing for the
 *     thread-context disambiguation; pin first-N entries so a future catalog
 *     reorder fails CI before silently re-prioritizing filename matches.
 *
 * Reference values pinned to real JM-Die customer names from
 * `LATHE_AI_TRAINING_REPORT.json` (TOPURA, ALCOA, NATHANS USB, etc.) so the
 * heuristic is anchored to the canonical test shop ([[reference_tribal_knowledge_search]]).
 *
 * Per CLAUDE.md PER-FILE SCRUTINY GATE: real-value assertions throughout —
 * no `toBeDefined()` stubs.
 */

import { describe, it, expect } from "vitest";
import {
  buildCustomerMaterialMap,
  customerMaterialMapEngine,
  CustomerMaterialMapEngine,
  extractMaterialFromCustomerFolder,
  extractMaterialFromFilename,
  ISO_GROUP_SCHEMA,
  lookupMaterialDistribution,
  ProgramSampleEntrySchema,
  resolveEntryMaterial,
  SOURCE_CONFIDENCE,
  type CustomerMaterialMap,
  type ProgramSampleEntry,
} from "../engines/CustomerMaterialMapEngine.js";
import { MATERIAL_KEYWORDS } from "../engines/MaterialResolverForProgramsEngine.js";

// ============================================================================
// LOCK TESTS — pin invariants that the engine's correctness depends on
// ============================================================================

describe("MATERIAL_KEYWORDS catalog lock — depended on by engine", () => {
  it("no MATERIAL_KEYWORDS pattern carries the /g flag (idempotence invariant)", () => {
    // The engine's `extractMaterialFromFilename` uses `kw.pattern.exec(test)`
    // which mutates `lastIndex` on /g regexes — that would break determinism
    // across calls. The engine module also asserts this at load time; this
    // test pins the catalog so the assertion never fires in production.
    const offending = MATERIAL_KEYWORDS.filter((kw) => kw.pattern.global);
    expect(offending.map((kw) => kw.name)).toEqual([]);
  });

  it("MATERIAL_KEYWORDS has the expected entries in the expected order", () => {
    // The thread-context disambiguation depends on alloy-specific patterns
    // coming BEFORE fallback patterns. If a future PR inserts a broad pattern
    // (e.g., a generic `\bSTEEL\b`) at index 0, every filename match would
    // re-prioritize silently. Pin the first 4 entries.
    // Actual catalog at the time of writing: 12 entries — Aluminum, Brass/Bronze,
    // Low-carbon, Medium-carbon, Alloy steel, Tool steel, Stainless, Cast iron,
    // Titanium, Superalloy, Hardened, Plastic. The >=12 floor catches accidental
    // deletions while permitting additive growth.
    expect(MATERIAL_KEYWORDS.length).toBeGreaterThanOrEqual(12);
    expect(MATERIAL_KEYWORDS[0].name).toBe("Aluminum");
    expect(MATERIAL_KEYWORDS[1].name).toBe("Brass/Bronze");
    expect(MATERIAL_KEYWORDS[2].name).toBe("Low-carbon steel");
    expect(MATERIAL_KEYWORDS[3].name).toBe("Medium-carbon steel");
  });
});

// ============================================================================
// extractMaterialFromFilename — happy paths
// ============================================================================

describe("extractMaterialFromFilename — happy paths", () => {
  it("matches 4140 alloy steel (P group, JM-Die's primary tool-die material)", () => {
    const hit = extractMaterialFromFilename("4140-ROLLER-OP10.MIN");
    expect(hit).not.toBeNull();
    expect(hit!.iso_group).toBe("P");
    expect(hit!.name).toBe("Alloy steel");
    expect(hit!.source).toBe("filename");
    expect(hit!.confidence).toBe(SOURCE_CONFIDENCE.filename);
    expect(hit!.raw_token).toBe("4140");
  });

  it("matches 6061 aluminum (N group)", () => {
    const hit = extractMaterialFromFilename("6061-HOUSING.MIN");
    expect(hit?.iso_group).toBe("N");
    expect(hit?.name).toBe("Aluminum");
    expect(hit?.raw_token).toBe("6061");
  });

  it("matches 303 stainless (M group)", () => {
    const hit = extractMaterialFromFilename("303-SHAFT-FINISH.MIN");
    expect(hit?.iso_group).toBe("M");
    expect(hit?.name).toBe("Stainless steel");
  });

  it("matches hardened steel via HRC pattern (H group)", () => {
    const hit = extractMaterialFromFilename("PUNCH-HRC58.MIN");
    expect(hit?.iso_group).toBe("H");
    expect(hit?.name).toBe("Hardened steel");
  });

  it("matches H13 tool steel (P group, JM-Die heavy-tool-steel-shop staple)", () => {
    // From [[user_shop_profile]]: JM Die uses H13, 4140, A2, D2, S7, M2, etc.
    const hit = extractMaterialFromFilename("H13-DIE-CAVITY.MIN");
    expect(hit?.iso_group).toBe("P");
    expect(hit?.name).toBe("Alloy steel");
    expect(hit?.raw_token).toBe("H13");
  });

  it("matches D2 tool steel (P group)", () => {
    const hit = extractMaterialFromFilename("D2-INSERT.MIN");
    expect(hit?.iso_group).toBe("P");
    expect(hit?.raw_token).toBe("D2");
  });

  it("matches titanium TI-6AL (S group)", () => {
    const hit = extractMaterialFromFilename("TI-6AL-4V-AERO-BRACKET.MIN");
    expect(hit?.iso_group).toBe("S");
  });

  it("matches inconel (S group)", () => {
    const hit = extractMaterialFromFilename("INCONEL-625-FLANGE.MIN");
    expect(hit?.iso_group).toBe("S");
  });

  it("matches brass (N group)", () => {
    const hit = extractMaterialFromFilename("BRASS-FITTING.MIN");
    expect(hit?.iso_group).toBe("N");
  });
});

// ============================================================================
// extractMaterialFromFilename — path stripping + case + boundary
// ============================================================================

describe("extractMaterialFromFilename — path + case + boundary handling", () => {
  it("strips forward-slash path before matching", () => {
    const hit = extractMaterialFromFilename("/some/where/4140-DEEP.MIN");
    expect(hit?.raw_token).toBe("4140");
  });

  it("strips Windows backslash path before matching", () => {
    const hit = extractMaterialFromFilename("H:\\PRISM\\JM DIE\\CNC LATHE\\ALCOA\\6061-HOUSING.MIN");
    expect(hit?.raw_token).toBe("6061");
  });

  it("is case-insensitive — lowercase alloy code", () => {
    const hit = extractMaterialFromFilename("4140-shaft.min");
    expect(hit?.iso_group).toBe("P");
  });

  it("word-boundary protects against substring false-positive — 1018ASCII", () => {
    // The catalog uses \b — '1018ASCII' has no word boundary between 1018
    // and ASCII so the digit run is a single word and `1018` does NOT match.
    // BUT '1018-ASCII' (with separator) DOES match — the boundary fires at '-'.
    const noHit = extractMaterialFromFilename("PROG1018ASCII.MIN");
    expect(noHit).toBeNull();
  });

  it("word-boundary still matches when separator is present — 1018-DEEP", () => {
    const hit = extractMaterialFromFilename("1018-DEEP.MIN");
    expect(hit?.raw_token).toBe("1018");
  });

  it("returns null for empty filename", () => {
    expect(extractMaterialFromFilename("")).toBeNull();
  });

  it("returns null for non-string input (runtime defends the TypeScript contract)", () => {
    expect(extractMaterialFromFilename(null as unknown as string)).toBeNull();
    expect(extractMaterialFromFilename(undefined as unknown as string)).toBeNull();
    expect(extractMaterialFromFilename(42 as unknown as string)).toBeNull();
  });

  it("returns null when no pattern matches (real JM-Die part-number-only filenames)", () => {
    // A0137471.MIN = ALCOA bestProgram, BU-1365-0000-002.MIN = TFI Aerospace
    // Both are pure part numbers with no material token in the filename.
    expect(extractMaterialFromFilename("A0137471.MIN")).toBeNull();
    expect(extractMaterialFromFilename("BU-1365-0000-002.MIN")).toBeNull();
  });
});

// ============================================================================
// extractMaterialFromFilename — thread-context disambiguation (P0 fix)
// ============================================================================

describe("extractMaterialFromFilename — thread-context disambiguation (Reviewer A P0-2 fix)", () => {
  it("rejects M2-TAPTITE as material — M2 is the thread spec, not M2 tool steel", () => {
    // M2 alone would match the alloy-steel pattern. TAPTITE is a thread-forming
    // fastener brand → THREAD_CONTEXT_REGEX hits → match rejected.
    const hit = extractMaterialFromFilename("M2-TAPTITE-CASE.MIN");
    expect(hit).toBeNull();
  });

  it("rejects M5-SCREW as material — M5 is thread size (real TOPURA file)", () => {
    // From TOPURA's real C-159-7-M5-TAPTITE2000-CASE.min in LATHE_AI_TRAINING_REPORT.
    const hit = extractMaterialFromFilename("C-159-7-M5-TAPTITE2000-CASE.MIN");
    expect(hit).toBeNull();
  });

  it("rejects S7-BOLT-HEX as material — S7 is socket-head size 7", () => {
    const hit = extractMaterialFromFilename("S7-BOLT-HEX-HEAD.MIN");
    expect(hit).toBeNull();
  });

  it("rejects M8-NUT-THREAD as material — M8 is thread size, fastener context", () => {
    const hit = extractMaterialFromFilename("M8-NUT-THREAD-FORM.MIN");
    expect(hit).toBeNull();
  });

  it("ACCEPTS M2-CAP-SCREW-4140 — thread context triggers M2 rejection but 4140 still wins", () => {
    // "CAP SCREW" supplies the thread context (CAP[\s-]?SCREW token in
    // THREAD_CONTEXT_REGEX). M2 is rejected, then the SAME alloy-steel pattern
    // continues scanning past the rejected M2 and matches 4140 later in the
    // string. Verifies the inner while loop in extractMaterialFromFilename —
    // re-exec on the tail substring after a skipped ambiguous match.
    const hit = extractMaterialFromFilename("M2-CAP-SCREW-4140-SHAFT.MIN");
    expect(hit).not.toBeNull();
    expect(hit?.raw_token).toBe("4140");
  });

  it("ACCEPTS M2-DIE-CAVITY — no fastener context → M2 tool steel match stands", () => {
    // No SCREW/BOLT/THREAD/etc → the M2 ambiguity filter does NOT fire.
    const hit = extractMaterialFromFilename("M2-DIE-CAVITY.MIN");
    expect(hit?.iso_group).toBe("P");
    expect(hit?.raw_token).toBe("M2");
  });
});

// ============================================================================
// extractMaterialFromFilename — MAX_FILENAME_LEN ReDoS guard
// ============================================================================

describe("extractMaterialFromFilename — MAX_FILENAME_LEN guard (Reviewer B P1-4)", () => {
  it("returns null for filenames longer than 1024 bytes (free safety vs. ReDoS)", () => {
    const huge = "4140-" + "X".repeat(2000) + ".MIN";
    expect(huge.length).toBeGreaterThan(1024);
    expect(extractMaterialFromFilename(huge)).toBeNull();
  });

  it("matches a 1024-char filename that ends with a real alloy code (boundary holds)", () => {
    // Word-boundary (\b) requires a transition between \w and \W. "A".repeat(N)
    // followed directly by "4140" is all word-chars — no boundary. Insert "-"
    // before "4140" so the alloy regex's \b actually fires.
    const tail = "-4140.MIN";
    const padding = "A".repeat(1024 - tail.length);
    const filename = padding + tail;  // exactly 1024 chars
    expect(filename.length).toBe(1024);
    const hit = extractMaterialFromFilename(filename);
    expect(hit?.raw_token).toBe("4140");
  });
});

// ============================================================================
// extractMaterialFromCustomerFolder
// ============================================================================

describe("extractMaterialFromCustomerFolder", () => {
  it("returns null for plain customer names (the common case)", () => {
    expect(extractMaterialFromCustomerFolder("ALCOA")).toBeNull();
    expect(extractMaterialFromCustomerFolder("TOPURA")).toBeNull();
    expect(extractMaterialFromCustomerFolder("JACOBSON")).toBeNull();
  });

  it("matches a folder name that encodes material (rare)", () => {
    const hit = extractMaterialFromCustomerFolder("STAINLESS-DIVISION");
    expect(hit?.iso_group).toBe("M");
    expect(hit?.source).toBe("folder");
    expect(hit?.confidence).toBe(SOURCE_CONFIDENCE.folder);
  });

  it("returns null for empty / whitespace customer names", () => {
    expect(extractMaterialFromCustomerFolder("")).toBeNull();
    expect(extractMaterialFromCustomerFolder("   ")).toBeNull();
  });
});

// ============================================================================
// resolveEntryMaterial — source-priority order
// ============================================================================

describe("resolveEntryMaterial — source priority blueprint > filename > folder", () => {
  it("blueprint material wins over filename token (different ISO groups)", () => {
    // Filename says 6061 (N), blueprint says 4140 (P). Blueprint wins.
    const entry: ProgramSampleEntry = {
      customer: "ALCOA",
      filename: "6061-HOUSING.MIN",
      back_annotated_material: "4140",
      back_annotated_iso_group: "P",
    };
    const hit = resolveEntryMaterial(entry);
    expect(hit?.source).toBe("blueprint");
    expect(hit?.iso_group).toBe("P");
    expect(hit?.confidence).toBe(SOURCE_CONFIDENCE.blueprint);
  });

  it("filename match used when blueprint not supplied", () => {
    const entry: ProgramSampleEntry = {
      customer: "ALCOA",
      filename: "6061-HOUSING.MIN",
    };
    const hit = resolveEntryMaterial(entry);
    expect(hit?.source).toBe("filename");
    expect(hit?.iso_group).toBe("N");
  });

  it("folder fallback used when filename has no material token", () => {
    const entry: ProgramSampleEntry = {
      customer: "BRASS-WORKS-LLC",
      filename: "BR-12345.MIN",  // No material in filename
    };
    const hit = resolveEntryMaterial(entry);
    expect(hit?.source).toBe("folder");
    expect(hit?.iso_group).toBe("N");
  });

  it("returns null when no source fires", () => {
    const entry: ProgramSampleEntry = {
      customer: "ALCOA",
      filename: "A0137471.MIN",  // Real ALCOA bestProgram filename, no material
    };
    expect(resolveEntryMaterial(entry)).toBeNull();
  });

  it("blueprint requires BOTH back_annotated_material AND back_annotated_iso_group", () => {
    // Partial blueprint annotation → falls through to filename.
    const entry: ProgramSampleEntry = {
      customer: "ALCOA",
      filename: "6061-HOUSING.MIN",
      back_annotated_material: "Mystery Material",
      // iso_group missing — must NOT take blueprint path
    };
    const hit = resolveEntryMaterial(entry);
    expect(hit?.source).toBe("filename");
    expect(hit?.iso_group).toBe("N");
  });
});

// ============================================================================
// buildCustomerMaterialMap — FAIL-LOUD + distribution math
// ============================================================================

describe("buildCustomerMaterialMap — FAIL-LOUD on bad input", () => {
  it("throws TypeError when entries is not an array", () => {
    expect(() => buildCustomerMaterialMap(null as unknown as ProgramSampleEntry[]))
      .toThrow(TypeError);
    expect(() => buildCustomerMaterialMap("nope" as unknown as ProgramSampleEntry[]))
      .toThrow(/expected an Array/);
    expect(() => buildCustomerMaterialMap({} as unknown as ProgramSampleEntry[]))
      .toThrow(/expected an Array/);
  });

  it("returns valid empty map when entries is empty array", () => {
    const map = buildCustomerMaterialMap([]);
    expect(map.schemaVersion).toBe("1.0.0");
    expect(map.customers).toEqual({});
    expect(map.stats.customer_count).toBe(0);
    expect(map.stats.programs_total).toBe(0);
    expect(map.stats.coverage_pct).toBe(0);
  });

  it("counts invalid entries (missing customer, bad shape) without throwing", () => {
    const map = buildCustomerMaterialMap([
      { customer: "ALCOA", filename: "6061.MIN" },
      { customer: "", filename: "x.MIN" },  // empty customer — invalid
      { customer: " ", filename: "y.MIN" },  // whitespace — invalid
      { filename: "z.MIN" } as unknown as ProgramSampleEntry,  // missing customer
      null as unknown as ProgramSampleEntry,  // null entry
      { customer: "X", filename: "" } as unknown as ProgramSampleEntry,  // 1-char customer
    ]);
    expect(map.stats.invalid_entries).toBe(5);
    expect(map.stats.customer_count).toBe(1);  // only ALCOA survived
  });
});

describe("buildCustomerMaterialMap — distribution math", () => {
  it("builds a per-customer distribution with correct shares + primary", () => {
    const entries: ProgramSampleEntry[] = [
      { customer: "JACOBSON", filename: "4140-ROD-A.MIN" },     // P
      { customer: "JACOBSON", filename: "4140-ROD-B.MIN" },     // P
      { customer: "JACOBSON", filename: "4140-ROD-C.MIN" },     // P
      { customer: "JACOBSON", filename: "303-SHAFT.MIN" },      // M
      { customer: "JACOBSON", filename: "6061-CAP.MIN" },       // N
    ];
    const map = buildCustomerMaterialMap(entries);
    const j = map.customers["JACOBSON"]!;
    expect(j.sample_count).toBe(5);
    expect(j.with_material).toBe(5);
    expect(j.without_material).toBe(0);
    expect(j.iso_group_share.P).toBe(0.6);
    expect(j.iso_group_share.M).toBe(0.2);
    expect(j.iso_group_share.N).toBe(0.2);
    expect(j.primary_iso_group).toBe("P");
    expect(j.primary_confidence).toBe(0.6);
    expect(j.material_counts[0].name).toBe("Alloy steel");
    expect(j.material_counts[0].count).toBe(3);
    expect(j.material_counts[0].share).toBe(0.6);
  });

  it("primary falls back to P group (the canonical default) when with_material=0", () => {
    // P is the ISO 513 'Plain steel' group — not specifically medium-carbon. The
    // default matches MaterialResolverForProgramsEngine.resolve()'s fallback at
    // line ~185 ("defaulting to medium-carbon steel (P group)"), but the
    // distribution's primary_iso_group is the GROUP, not the specific alloy.
    const entries: ProgramSampleEntry[] = [
      { customer: "ALCOA", filename: "A0137471.MIN" },  // No material signal
      { customer: "ALCOA", filename: "A0137472.MIN" },
    ];
    const map = buildCustomerMaterialMap(entries);
    const a = map.customers["ALCOA"]!;
    expect(a.with_material).toBe(0);
    expect(a.without_material).toBe(2);
    expect(a.primary_iso_group).toBe("P");
    expect(a.primary_confidence).toBe(0);
  });

  it("ISO_GROUPS iteration breaks ties — when P and M tie, primary stays P (declaration order)", () => {
    // NOTE: This case has the P seed working in its favour — `primary_iso_group`
    // is initialized to "P" in `aggregateCustomerEntries`, so a P-vs-M tie keeps
    // P even WITHOUT the strict `>` comparison. Use the next test for a fuller
    // invariant exercise (M-vs-N, where neither benefits from the seed).
    const entries: ProgramSampleEntry[] = [
      { customer: "TIE", filename: "4140-ONE.MIN" },     // P
      { customer: "TIE", filename: "303-TWO.MIN" },      // M
    ];
    const map = buildCustomerMaterialMap(entries);
    const t = map.customers["TIE"]!;
    expect(t.iso_group_share.P).toBe(0.5);
    expect(t.iso_group_share.M).toBe(0.5);
    expect(t.primary_iso_group).toBe("P");  // P comes first in ISO_GROUPS
    expect(t.primary_confidence).toBe(0.5);
  });

  it("ISO_GROUPS iteration breaks ties — M-vs-N tie picks M (true ordering invariant test)", () => {
    // Reviewer B P1-1 fix: the previous P-vs-M tie test could pass even if
    // ISO_GROUPS were reversed because the seed primary is "P". This case
    // has NO P signal — only M (stainless) and N (aluminum) — so the result
    // depends purely on the iteration order of ISO_GROUPS. M comes before
    // N in ISO_GROUPS = ["P","M","K","N","S","H"], so M must win.
    const entries: ProgramSampleEntry[] = [
      { customer: "TIE_MN", filename: "303-ONE.MIN" },   // M
      { customer: "TIE_MN", filename: "6061-TWO.MIN" },  // N
    ];
    const map = buildCustomerMaterialMap(entries);
    const t = map.customers["TIE_MN"]!;
    expect(t.iso_group_share.M).toBe(0.5);
    expect(t.iso_group_share.N).toBe(0.5);
    expect(t.primary_iso_group).toBe("M");  // M precedes N in ISO_GROUPS
    expect(t.primary_confidence).toBe(0.5);
  });

  it("aggregates source_counts correctly when sources mix", () => {
    const entries: ProgramSampleEntry[] = [
      { customer: "MIX", filename: "4140.MIN" },  // filename
      {
        customer: "MIX",
        filename: "x.MIN",
        back_annotated_material: "303",
        back_annotated_iso_group: "M",
      },  // blueprint
      { customer: "BRASS-WORKS", filename: "BR-1.MIN" },  // folder
    ];
    const map = buildCustomerMaterialMap(entries);
    expect(map.stats.source_breakdown.blueprint).toBe(1);
    expect(map.stats.source_breakdown.filename).toBe(1);
    expect(map.stats.source_breakdown.folder).toBe(1);
  });

  it("groups multiple entries by trimmed customer key (' ALCOA ' === 'ALCOA')", () => {
    const entries: ProgramSampleEntry[] = [
      { customer: " ALCOA ", filename: "6061-A.MIN" },
      { customer: "ALCOA", filename: "6061-B.MIN" },
    ];
    const map = buildCustomerMaterialMap(entries);
    expect(map.stats.customer_count).toBe(1);
    expect(map.customers["ALCOA"]?.sample_count).toBe(2);
  });

  it("coverage_pct rounds to 1 decimal", () => {
    // 1 of 3 with material → 33.333...% → 33.3. Use a 2+ char customer name
    // ("XX") so it passes MIN_CUSTOMER_NAME_LENGTH and survives aggregation.
    const entries: ProgramSampleEntry[] = [
      { customer: "XX", filename: "4140.MIN" },
      { customer: "XX", filename: "noMat.MIN" },
      { customer: "XX", filename: "alsoNoMat.MIN" },
    ];
    const map = buildCustomerMaterialMap(entries);
    expect(map.stats.coverage_pct).toBe(33.3);
  });

  it("material_counts sorted descending by count, name asc for ties", () => {
    // 2-char "QQ" customer survives MIN_CUSTOMER_NAME_LENGTH check.
    const entries: ProgramSampleEntry[] = [
      { customer: "QQ", filename: "4140-1.MIN" },        // Alloy steel × 3
      { customer: "QQ", filename: "4140-2.MIN" },
      { customer: "QQ", filename: "4140-3.MIN" },
      { customer: "QQ", filename: "6061-1.MIN" },        // Aluminum × 2
      { customer: "QQ", filename: "6061-2.MIN" },
      { customer: "QQ", filename: "303-1.MIN" },         // Stainless × 1
    ];
    const map = buildCustomerMaterialMap(entries);
    const counts = map.customers["QQ"]!.material_counts;
    expect(counts[0].name).toBe("Alloy steel");
    expect(counts[0].count).toBe(3);
    expect(counts[1].name).toBe("Aluminum");
    expect(counts[1].count).toBe(2);
    expect(counts[2].name).toBe("Stainless steel");
    expect(counts[2].count).toBe(1);
  });
});

// ============================================================================
// lookupMaterialDistribution
// ============================================================================

describe("lookupMaterialDistribution", () => {
  const map: CustomerMaterialMap = buildCustomerMaterialMap([
    { customer: "ALCOA", filename: "6061-A.MIN" },
    { customer: "TOPURA", filename: "4140-T.MIN" },
  ]);

  it("returns the distribution for a known customer (exact case)", () => {
    expect(lookupMaterialDistribution(map, "ALCOA")?.primary_iso_group).toBe("N");
  });

  it("is case-insensitive over trim+upper", () => {
    expect(lookupMaterialDistribution(map, "alcoa")?.primary_iso_group).toBe("N");
    expect(lookupMaterialDistribution(map, " AlCoA ")?.primary_iso_group).toBe("N");
  });

  it("returns null for unknown customer", () => {
    expect(lookupMaterialDistribution(map, "NEVER-HEARD-OF")).toBeNull();
  });

  it("returns null for empty / whitespace / non-string input", () => {
    expect(lookupMaterialDistribution(map, "")).toBeNull();
    expect(lookupMaterialDistribution(map, "   ")).toBeNull();
    expect(lookupMaterialDistribution(map, null as unknown as string)).toBeNull();
  });
});

// ============================================================================
// CustomerMaterialMapEngine class wrapper — delegation
// ============================================================================

describe("CustomerMaterialMapEngine class wrapper", () => {
  it("singleton instance delegates buildMap to the pure function", () => {
    const entries: ProgramSampleEntry[] = [{ customer: "ALCOA", filename: "6061.MIN" }];
    const fromSingleton = customerMaterialMapEngine.buildMap(entries);
    const fromPure = buildCustomerMaterialMap(entries);
    // Compare structural content (generatedAt differs by ISO timestamp).
    expect(fromSingleton.customers).toEqual(fromPure.customers);
    expect(fromSingleton.stats).toEqual(fromPure.stats);
  });

  it("class can be instantiated independently", () => {
    const engine = new CustomerMaterialMapEngine();
    const hit = engine.extractFromFilename("4140.MIN");
    expect(hit?.iso_group).toBe("P");
  });

  it("class exposes lookup + extract + resolve methods that match pure functions", () => {
    const map = customerMaterialMapEngine.buildMap([{ customer: "X", filename: "4140.MIN" }]);
    const fromClass = customerMaterialMapEngine.lookup(map, "X");
    const fromPure = lookupMaterialDistribution(map, "X");
    expect(fromClass).toEqual(fromPure);

    const folderClass = customerMaterialMapEngine.extractFromCustomerFolder("BRASS-DIVISION");
    const folderPure = extractMaterialFromCustomerFolder("BRASS-DIVISION");
    expect(folderClass).toEqual(folderPure);

    const resolveClass = customerMaterialMapEngine.resolveEntry({
      customer: "X", filename: "4140.MIN",
    });
    expect(resolveClass?.iso_group).toBe("P");
  });
});

// ============================================================================
// ProgramSampleEntrySchema Zod — input validation
// ============================================================================

describe("ProgramSampleEntrySchema (Zod) — boundary validation for dispatcher", () => {
  it("safeParse succeeds for a well-formed entry", () => {
    const result = ProgramSampleEntrySchema.safeParse({
      customer: "ALCOA",
      filename: "6061-HOUSING.MIN",
    });
    expect(result.success).toBe(true);
  });

  it("safeParse succeeds with optional blueprint fields", () => {
    const result = ProgramSampleEntrySchema.safeParse({
      customer: "TOPURA",
      filename: "C-159.MIN",
      back_annotated_material: "4140",
      back_annotated_iso_group: "P",
    });
    expect(result.success).toBe(true);
  });

  it("safeParse rejects 1-char customer (below MIN_CUSTOMER_NAME_LENGTH)", () => {
    const result = ProgramSampleEntrySchema.safeParse({
      customer: "X",
      filename: "a.MIN",
    });
    expect(result.success).toBe(false);
  });

  it("safeParse rejects empty filename", () => {
    const result = ProgramSampleEntrySchema.safeParse({
      customer: "ALCOA",
      filename: "",
    });
    expect(result.success).toBe(false);
  });

  it("safeParse rejects out-of-enum ISO group", () => {
    const result = ProgramSampleEntrySchema.safeParse({
      customer: "ALCOA",
      filename: "x.MIN",
      back_annotated_iso_group: "Z" as unknown as "P",
    });
    expect(result.success).toBe(false);
  });

  it("ISO_GROUP_SCHEMA accepts all 6 canonical groups", () => {
    for (const g of ["P", "M", "K", "N", "S", "H"] as const) {
      expect(ISO_GROUP_SCHEMA.safeParse(g).success).toBe(true);
    }
    expect(ISO_GROUP_SCHEMA.safeParse("X").success).toBe(false);
  });
});

// ============================================================================
// Adversarial inputs — defensive coverage
// ============================================================================

describe("buildCustomerMaterialMap — adversarial inputs", () => {
  it("handles a 1000-entry oversize input without OOM / hang", () => {
    const entries: ProgramSampleEntry[] = [];
    for (let i = 0; i < 1000; i++) {
      entries.push({
        customer: i % 10 === 0 ? "TOPURA" : "NATHANS USB",
        filename: `${i % 3 === 0 ? "4140" : i % 3 === 1 ? "6061" : "noMat"}-${i}.MIN`,
      });
    }
    const map = buildCustomerMaterialMap(entries);
    expect(map.stats.programs_total).toBe(1000);
    expect(map.stats.customer_count).toBe(2);
  });

  it("preserves Unicode customer names (no normalization beyond trim)", () => {
    const map = buildCustomerMaterialMap([
      { customer: "Müller GmbH", filename: "4140.MIN" },
    ]);
    const mueller = map.customers["Müller GmbH"];
    expect(mueller?.primary_iso_group).toBe("P");
    expect(mueller?.sample_count).toBe(1);
  });

  it("tolerates non-string filename in raw input (counted invalid)", () => {
    const map = buildCustomerMaterialMap([
      { customer: "X", filename: 42 as unknown as string },
      { customer: "X", filename: null as unknown as string },
    ]);
    expect(map.stats.invalid_entries).toBe(2);
    expect(map.stats.customer_count).toBe(0);
  });

  it("filename with multiple alloy tokens picks the FIRST matching pattern (deterministic)", () => {
    // "6061-4140.MIN" — 6061 is in pattern 0 (aluminum), 4140 in pattern 4 (alloy).
    // Iteration order is by pattern, so aluminum (pattern 0) wins.
    const hit = extractMaterialFromFilename("6061-4140.MIN");
    expect(hit?.raw_token).toBe("6061");
    expect(hit?.iso_group).toBe("N");
  });
});

// ============================================================================
// Integration — end-to-end small map build
// ============================================================================

describe("integration — small end-to-end build matches expected reference values", () => {
  it("produces a 3-customer map with correct primary groups", () => {
    const entries: ProgramSampleEntry[] = [
      // JACOBSON — mostly 4140 rollers (P) with one 303 shaft (M)
      { customer: "JACOBSON", filename: "J-4140-A.MIN" },
      { customer: "JACOBSON", filename: "J-4140-B.MIN" },
      { customer: "JACOBSON", filename: "J-303-C.MIN" },
      // ALCOA — aluminum housings (N)
      { customer: "ALCOA", filename: "AL-6061-A.MIN" },
      { customer: "ALCOA", filename: "AL-6061-B.MIN" },
      // TFI Aerospace — titanium (S) with explicit blueprint material
      {
        customer: "TFI Aerospace",
        filename: "BU-1365-0000-002.MIN",
        back_annotated_material: "Ti-6Al-4V",
        back_annotated_iso_group: "S",
      },
    ];
    const map = buildCustomerMaterialMap(entries);
    expect(map.stats.customer_count).toBe(3);
    expect(map.stats.programs_total).toBe(6);
    expect(map.stats.programs_with_material).toBe(6);
    expect(map.stats.coverage_pct).toBe(100);

    expect(map.customers["JACOBSON"]!.primary_iso_group).toBe("P");
    expect(map.customers["JACOBSON"]!.primary_confidence).toBeCloseTo(0.6667, 3);
    expect(map.customers["ALCOA"]!.primary_iso_group).toBe("N");
    expect(map.customers["ALCOA"]!.primary_confidence).toBe(1);
    expect(map.customers["TFI Aerospace"]!.primary_iso_group).toBe("S");
    expect(map.customers["TFI Aerospace"]!.primary_confidence).toBe(1);

    expect(map.stats.source_breakdown).toEqual({
      blueprint: 1,
      filename: 5,
      folder: 0,
    });
  });
});
