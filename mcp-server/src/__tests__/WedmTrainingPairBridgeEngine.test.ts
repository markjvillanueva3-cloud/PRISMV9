/**
 * Tests for WedmTrainingPairBridgeEngine (U-OSC9-13).
 *
 * Coverage:
 *   - Singleton + shape
 *   - Schema validation (stem_match_mode enum, top_k bounds)
 *   - Index load: parses *-phase-a1.json, ignores other files
 *   - Pair mapping: pair_stem + reference_program_path required; missing → skipped
 *   - Customer extraction from program path (_PART LIBRARY\<X>\ OR WIRE EDM\<X>\)
 *   - Filters: stem (exact + prefix), customer (case-insensitive substring), parse_ok_only
 *   - Sort: parse_ok first, then confidence high>medium>low, then stem ASC
 *   - top_k cap
 *   - Cache: re-uses index across calls (no file re-read when dir mtime unchanged)
 *   - Missing dir → empty + warning
 *   - Malformed JSON → skipped + warning
 *   - Gated real-corpus test against operator's 99-pair corpus
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  wedmTrainingPairBridgeEngine,
  WedmTrainingPairBridgeEngine,
  WedmTrainingLookupInputSchema,
} from "../engines/WedmTrainingPairBridgeEngine.js";

// ============================================================================
// FIXTURES — mirrors live operator pair shape (schema 1.1.0, 2026-05-23)
// ============================================================================

function pairFixture(opts: {
  stem: string;
  customer: string;
  confidence?: string;
  parse_ok?: boolean;
  wizard_ok?: boolean;
}) {
  const customer = opts.customer.toUpperCase();
  return {
    schema_version: "1.1.0",
    phase: "A.1",
    pair_stem: opts.stem,
    pair_tier: "substring",
    pair_confidence: opts.confidence ?? "high",
    blueprint_paths: [`H:\\prism\\JM DIE\\_PART LIBRARY\\${customer}\\${opts.stem}\\${opts.stem}__p1.pdf`],
    reference_program_path: `H:\\prism\\JM DIE\\WIRE EDM\\${customer}\\${opts.stem}.mcx-8`,
    reference_metadata: {
      ok: true,
      format: ".mcx-8",
      bytes_total: 432226,
      magic_verified: true,
    },
    parse: opts.parse_ok
      ? { ok: true }
      : { ok: false, gap: true, gap_reason: "blueprint set has no .dxf — only PDF/STEP/IGES variants present." },
    wizard: opts.wizard_ok
      ? { ok: true }
      : { ok: false, skipped: true, skip_reason: "no DXF blueprint to parse" },
    compare: { done: false, gap_reason: "wizard skipped" },
  };
}

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "wedm-corpus-"));
  wedmTrainingPairBridgeEngine.resetCache();
});

afterEach(() => {
  wedmTrainingPairBridgeEngine.resetCache();
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
});

function writePair(p: ReturnType<typeof pairFixture>): void {
  writeFileSync(join(tmp, `${p.pair_stem}-phase-a1.json`), JSON.stringify(p));
}

// ============================================================================
// TESTS
// ============================================================================

describe("WedmTrainingPairBridgeEngine — singleton + shape", () => {
  it("exports singleton instance of class", () => {
    expect(wedmTrainingPairBridgeEngine).toBeInstanceOf(WedmTrainingPairBridgeEngine);
  });

  it("exposes run() + extractCustomer() + resetCache()", () => {
    expect(typeof wedmTrainingPairBridgeEngine.run).toBe("function");
    expect(typeof wedmTrainingPairBridgeEngine.extractCustomer).toBe("function");
    expect(typeof wedmTrainingPairBridgeEngine.resetCache).toBe("function");
  });
});

describe("WedmTrainingLookupInputSchema — Zod validation", () => {
  it("applies stem_match_mode default 'prefix' + top_k default 25", () => {
    const parsed = WedmTrainingLookupInputSchema.parse({});
    expect(parsed.stem_match_mode).toBe("prefix");
    expect(parsed.top_k).toBe(25);
    expect(parsed.parse_ok_only).toBe(false);
  });

  it("rejects bad stem_match_mode", () => {
    expect(() =>
      WedmTrainingLookupInputSchema.parse({ stem_match_mode: "fuzzy" as unknown as "exact" }),
    ).toThrow();
  });

  it("rejects top_k > 200", () => {
    expect(() => WedmTrainingLookupInputSchema.parse({ top_k: 500 })).toThrow();
  });
});

describe("WedmTrainingPairBridgeEngine.extractCustomer()", () => {
  it("extracts from _PART LIBRARY path", () => {
    expect(
      wedmTrainingPairBridgeEngine.extractCustomer(
        "H:\\prism\\JM DIE\\_PART LIBRARY\\ALCOA\\0137471\\file.pdf",
      ),
    ).toBe("ALCOA");
  });

  it("extracts from WIRE EDM path", () => {
    expect(
      wedmTrainingPairBridgeEngine.extractCustomer(
        "H:\\prism\\JM DIE\\WIRE EDM\\ALCOA FASTENING\\0137471.mcx-8",
      ),
    ).toBe("ALCOA FASTENING");
  });

  it("returns undefined when no JM-Die marker present", () => {
    expect(wedmTrainingPairBridgeEngine.extractCustomer("C:\\unrelated\\path.pdf")).toEqual(undefined);
  });

  it("returns undefined on empty input", () => {
    expect(wedmTrainingPairBridgeEngine.extractCustomer("")).toEqual(undefined);
  });
});

describe("WedmTrainingPairBridgeEngine.run() — index load + corpus parse", () => {
  it("loads + maps multiple pair files", () => {
    writePair(pairFixture({ stem: "0137471", customer: "ALCOA" }));
    writePair(pairFixture({ stem: "1505889", customer: "AGRATI" }));
    writePair(pairFixture({ stem: "9101970", customer: "ABB" }));

    const result = wedmTrainingPairBridgeEngine.run({ corpus_dir: tmp });
    expect(result.summary.corpus_total).toBe(3);
    expect(result.pairs.length).toBe(3);
    expect(result.pairs.map((p) => p.pair_stem).sort()).toEqual(["0137471", "1505889", "9101970"]);
  });

  it("ignores non-pair files in the dir (e.g. _sweep-summary.json)", () => {
    writePair(pairFixture({ stem: "0137471", customer: "ALCOA" }));
    writeFileSync(join(tmp, "_sweep-summary.json"), JSON.stringify({ stats: { pairs_total: 1 } }));
    writeFileSync(join(tmp, "README.md"), "not a pair");

    const result = wedmTrainingPairBridgeEngine.run({ corpus_dir: tmp });
    expect(result.summary.corpus_total).toBe(1);
  });

  it("populates customer field from program-path extraction", () => {
    writePair(pairFixture({ stem: "0137471", customer: "ALCOA" }));
    const result = wedmTrainingPairBridgeEngine.run({ corpus_dir: tmp });
    expect(result.pairs[0].customer).toBe("ALCOA");
  });

  it("captures parse-gap reason verbatim for downstream display", () => {
    writePair(pairFixture({ stem: "0137471", customer: "ALCOA", parse_ok: false }));
    const result = wedmTrainingPairBridgeEngine.run({ corpus_dir: tmp });
    expect(result.pairs[0].parse_ok).toBe(false);
    expect(result.pairs[0].parse_gap_reason).toMatch(/no \.dxf/);
  });

  it("skips pair files missing pair_stem or reference_program_path", () => {
    writeFileSync(join(tmp, "missing-stem-phase-a1.json"), JSON.stringify({ reference_program_path: "x" }));
    writeFileSync(join(tmp, "missing-prog-phase-a1.json"), JSON.stringify({ pair_stem: "y" }));
    writePair(pairFixture({ stem: "valid", customer: "X" }));

    const result = wedmTrainingPairBridgeEngine.run({ corpus_dir: tmp });
    expect(result.summary.corpus_total).toBe(1);
    expect(result.pairs[0].pair_stem).toBe("valid");
  });

  it("warns + skips on malformed JSON", () => {
    writeFileSync(join(tmp, "broken-phase-a1.json"), "{ not valid json");
    writePair(pairFixture({ stem: "good", customer: "X" }));

    const result = wedmTrainingPairBridgeEngine.run({ corpus_dir: tmp });
    expect(result.summary.corpus_total).toBe(1);
    expect(result.warnings.some((w) => /failed to parse broken-phase-a1\.json/.test(w))).toBe(true);
  });

  it("returns empty + warning when corpus dir missing", () => {
    const result = wedmTrainingPairBridgeEngine.run({ corpus_dir: join(tmp, "does-not-exist") });
    expect(result.summary.corpus_total).toBe(0);
    expect(result.warnings.some((w) => /corpus dir not found/.test(w))).toBe(true);
  });
});

describe("WedmTrainingPairBridgeEngine.run() — filters", () => {
  beforeEach(() => {
    writePair(pairFixture({ stem: "0137471", customer: "ALCOA" }));
    writePair(pairFixture({ stem: "0137472", customer: "ALCOA" }));
    writePair(pairFixture({ stem: "1505889", customer: "AGRATI" }));
    writePair(pairFixture({ stem: "ABB-30135", customer: "ABB" }));
  });

  it("stem exact match", () => {
    const result = wedmTrainingPairBridgeEngine.run({
      corpus_dir: tmp,
      stem: "0137471",
      stem_match_mode: "exact",
    });
    expect(result.pairs.map((p) => p.pair_stem)).toEqual(["0137471"]);
  });

  it("stem prefix match (default mode)", () => {
    const result = wedmTrainingPairBridgeEngine.run({
      corpus_dir: tmp,
      stem: "01374",
    });
    expect(result.pairs.map((p) => p.pair_stem).sort()).toEqual(["0137471", "0137472"]);
  });

  it("customer match is case-insensitive substring", () => {
    const result = wedmTrainingPairBridgeEngine.run({ corpus_dir: tmp, customer: "alcoa" });
    expect(result.pairs.length).toBe(2);
    expect(result.pairs.every((p) => p.customer === "ALCOA")).toBe(true);
  });

  it("customer + stem filters combine (AND)", () => {
    const result = wedmTrainingPairBridgeEngine.run({
      corpus_dir: tmp,
      customer: "ALCOA",
      stem: "0137472",
      stem_match_mode: "exact",
    });
    expect(result.pairs.map((p) => p.pair_stem)).toEqual(["0137472"]);
  });
});

describe("WedmTrainingPairBridgeEngine.run() — parse_ok_only filter", () => {
  it("filters to pairs with parse_ok && wizard_ok", () => {
    writePair(pairFixture({ stem: "gap1", customer: "X", parse_ok: false }));
    writePair(pairFixture({ stem: "gap2", customer: "X", parse_ok: false }));
    writePair(pairFixture({ stem: "full", customer: "X", parse_ok: true, wizard_ok: true }));

    const result = wedmTrainingPairBridgeEngine.run({ corpus_dir: tmp, parse_ok_only: true });
    expect(result.pairs.length).toBe(1);
    expect(result.pairs[0].pair_stem).toBe("full");
    expect(result.summary.parse_ok_count).toBe(1);
    expect(result.summary.parse_gap_count).toBe(2);
  });
});

describe("WedmTrainingPairBridgeEngine.run() — sort + top_k", () => {
  it("parse_ok pairs sort first, then by confidence high>medium>low, then stem ASC", () => {
    writePair(pairFixture({ stem: "z-gap-low", customer: "X", parse_ok: false, confidence: "low" }));
    writePair(pairFixture({ stem: "a-gap-high", customer: "X", parse_ok: false, confidence: "high" }));
    writePair(pairFixture({ stem: "m-full-medium", customer: "X", parse_ok: true, wizard_ok: true, confidence: "medium" }));
    writePair(pairFixture({ stem: "b-full-high", customer: "X", parse_ok: true, wizard_ok: true, confidence: "high" }));

    const result = wedmTrainingPairBridgeEngine.run({ corpus_dir: tmp });
    // Expected order: b-full-high (parse_ok+high), m-full-medium (parse_ok+medium), a-gap-high (gap+high), z-gap-low (gap+low)
    expect(result.pairs.map((p) => p.pair_stem)).toEqual([
      "b-full-high",
      "m-full-medium",
      "a-gap-high",
      "z-gap-low",
    ]);
  });

  it("top_k caps the result count", () => {
    for (let i = 0; i < 10; i++) {
      writePair(pairFixture({ stem: `pair-${String(i).padStart(3, "0")}`, customer: "X" }));
    }
    const result = wedmTrainingPairBridgeEngine.run({ corpus_dir: tmp, top_k: 3 });
    expect(result.pairs.length).toBe(3);
    expect(result.summary.filtered).toBe(10);
  });
});

describe("WedmTrainingPairBridgeEngine.run() — cache behavior", () => {
  it("reuses cached index on subsequent calls with same dir", () => {
    writePair(pairFixture({ stem: "0137471", customer: "ALCOA" }));
    const first = wedmTrainingPairBridgeEngine.run({ corpus_dir: tmp });
    expect(first.summary.corpus_total).toBe(1);

    // Simulate cache hit — call again immediately, no fs writes between.
    const second = wedmTrainingPairBridgeEngine.run({ corpus_dir: tmp });
    expect(second.summary.corpus_total).toBe(1);
    expect(second.pairs[0].source_file).toBe(first.pairs[0].source_file);
  });

  it("resetCache forces a fresh walk", () => {
    writePair(pairFixture({ stem: "a", customer: "X" }));
    wedmTrainingPairBridgeEngine.run({ corpus_dir: tmp });
    wedmTrainingPairBridgeEngine.resetCache();
    writePair(pairFixture({ stem: "b", customer: "X" }));

    // mtime-based cache may or may not invalidate depending on FS resolution,
    // but resetCache forces a re-load regardless.
    const result = wedmTrainingPairBridgeEngine.run({ corpus_dir: tmp });
    expect(result.summary.corpus_total).toBe(2);
  });
});

describe("WedmTrainingPairBridgeEngine — real corpus (gated)", () => {
  it("reads the operator's wedm-training-corpus without throwing when present", async () => {
    const { existsSync } = await import("fs");
    const realDir = "H:/prism/state/shared/wedm-training-corpus";
    if (!existsSync(realDir)) return;

    wedmTrainingPairBridgeEngine.resetCache();
    const result = wedmTrainingPairBridgeEngine.run({ corpus_dir: realDir });

    // Operator has ~98 pairs; require at least 10 to confirm we're reading the real corpus.
    expect(result.summary.corpus_total).toBeGreaterThanOrEqual(10);
    // Each returned pair must have the canonical fields populated.
    for (const p of result.pairs) {
      expect(typeof p.pair_stem).toBe("string");
      expect(p.pair_stem.length).toBeGreaterThan(0);
      expect(typeof p.reference_program_path).toBe("string");
      expect(p.reference_program_path.length).toBeGreaterThan(0);
    }
    // At least one pair should resolve a customer from the real path.
    const withCustomer = result.pairs.filter((p) => p.customer !== undefined);
    expect(withCustomer.length).toBeGreaterThan(0);
  });
});
