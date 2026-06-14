/**
 * SourceChainEngine tests — provenance / citation-chain decorator.
 *
 * Covers Voxyz Layer 8 source-chain semantics:
 *   - happy path (decorate value + 2 citations)
 *   - empty citation set (legitimate for pure-calculation engines)
 *   - rejects invalid citations: empty path, NaN score, out-of-range score,
 *     oversize excerpt, unknown source_type
 *   - deduplication keeps highest-score per path (insertion-order preserved)
 *   - merge produces union with deterministic digest
 *   - digest is order-independent + deterministic + diverges on citation change
 *   - filterByType is correct on single-type filter
 *   - renderMarkdown produces operator-readable output, handles empty input
 */
import { describe, it, expect } from "vitest";
import { SourceChainEngine, type Citation, CitationSchema } from "../engines/SourceChainEngine.js";

const ISO = "2026-05-24T06:00:00.000Z";

const cWiki: Citation = {
  path: "knowledge/wiki/architecture/source-chain.md",
  source_type: "wiki",
  score: 0.92,
  retrieved_at: ISO,
  used_for: "citation-pattern doctrine",
};
const cMemory: Citation = {
  path: "reference_hermes_capability_expansion_ms0_2026_05_24.md",
  source_type: "memory",
  score: 0.74,
  retrieved_at: ISO,
};
const cTribal: Citation = {
  path: "tribal/kienzle-coefficient-lookups",
  source_type: "tribal",
  score: 0.41,
  retrieved_at: ISO,
};

describe("SourceChainEngine.decorate", () => {
  it("attaches a citation chain to the value and produces a non-empty digest", () => {
    const result = SourceChainEngine.decorate({ kc11: 1800 }, [cWiki, cMemory]);
    expect(result.value).toEqual({ kc11: 1800 });
    expect(result.sources).toHaveLength(2);
    expect(result.sources[0].path).toBe(cWiki.path);
    expect(result.sources[1].path).toBe(cMemory.path);
    expect(result.digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("accepts an empty citation array (pure-calculation engine result)", () => {
    const r = SourceChainEngine.decorate(42, []);
    expect(r.value).toBe(42);
    expect(r.sources).toEqual([]);
    expect(r.digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects a citation with an empty path", () => {
    expect(() =>
      SourceChainEngine.decorate(1, [{ ...cWiki, path: "" }]),
    ).toThrow();
  });

  it("rejects a citation with NaN score (adversarial input)", () => {
    expect(() =>
      SourceChainEngine.decorate(1, [{ ...cWiki, score: NaN }]),
    ).toThrow();
  });

  it("rejects a citation with score > 1 (boundary)", () => {
    expect(() =>
      SourceChainEngine.decorate(1, [{ ...cWiki, score: 1.5 }]),
    ).toThrow();
  });

  it("rejects an oversize excerpt (>500 chars, adversarial input)", () => {
    const big = "x".repeat(501);
    expect(() =>
      SourceChainEngine.decorate(1, [{ ...cWiki, excerpt: big }]),
    ).toThrow();
  });

  it("rejects unknown source_type", () => {
    expect(() =>
      SourceChainEngine.validate({ ...cWiki, source_type: "blockchain" }),
    ).toThrow();
  });
});

describe("SourceChainEngine.deduplicate", () => {
  it("keeps the highest-score entry when paths collide and preserves first-seen order", () => {
    const dup1: Citation = { ...cWiki, score: 0.4 };
    const dup2: Citation = { ...cWiki, score: 0.9, used_for: "later" };
    const out = SourceChainEngine.deduplicate([dup1, cMemory, dup2]);
    expect(out).toHaveLength(2);
    expect(out[0].path).toBe(cWiki.path);
    expect(out[0].score).toBe(0.9);
    expect(out[0].used_for).toBe("later");
    expect(out[1].path).toBe(cMemory.path);
  });

  it("returns empty when given empty input", () => {
    expect(SourceChainEngine.deduplicate([])).toEqual([]);
  });
});

describe("SourceChainEngine.merge", () => {
  it("produces a union of citations across N decorated results", () => {
    const a = SourceChainEngine.decorate("first", [cWiki, cMemory]);
    const b = SourceChainEngine.decorate("second", [cTribal]);
    const merged = SourceChainEngine.merge([a, b]);
    expect(merged.value).toEqual(["first", "second"]);
    expect(merged.sources).toHaveLength(3);
    const paths = merged.sources.map((c) => c.path).sort();
    expect(paths).toEqual([cMemory.path, cTribal.path, cWiki.path].sort());
  });
});

describe("SourceChainEngine.digest", () => {
  it("is deterministic — same citation set produces the same digest", () => {
    const d1 = SourceChainEngine.digest([cWiki, cMemory]);
    const d2 = SourceChainEngine.digest([cWiki, cMemory]);
    expect(d1).toBe(d2);
  });

  it("is order-independent — reordered citations produce the same digest", () => {
    const d1 = SourceChainEngine.digest([cWiki, cMemory, cTribal]);
    const d2 = SourceChainEngine.digest([cTribal, cWiki, cMemory]);
    expect(d1).toBe(d2);
  });

  it("diverges when any citation changes (score change → digest change)", () => {
    const d1 = SourceChainEngine.digest([cWiki]);
    const d2 = SourceChainEngine.digest([{ ...cWiki, score: 0.1 }]);
    expect(d1).not.toBe(d2);
  });
});

describe("SourceChainEngine.filterByType", () => {
  it("returns only citations matching the requested source_type", () => {
    const cs = [cWiki, cMemory, cTribal];
    expect(SourceChainEngine.filterByType(cs, "wiki")).toEqual([cWiki]);
    expect(SourceChainEngine.filterByType(cs, "memory")).toEqual([cMemory]);
    expect(SourceChainEngine.filterByType(cs, "external")).toEqual([]);
  });
});

describe("SourceChainEngine.renderMarkdown", () => {
  it("renders one bullet per citation with source_type, path, score, and used_for", () => {
    const md = SourceChainEngine.renderMarkdown([cWiki]);
    expect(md).toContain("**Sources:**");
    expect(md).toContain("[wiki]");
    expect(md).toContain(cWiki.path);
    expect(md).toContain("0.920");
    expect(md).toContain("citation-pattern doctrine");
  });

  it("handles the empty citation case gracefully", () => {
    expect(SourceChainEngine.renderMarkdown([])).toBe("_(no sources cited)_");
  });
});

describe("CitationSchema", () => {
  it("exports a Zod schema that round-trips a valid citation", () => {
    const parsed = CitationSchema.parse(cWiki);
    expect(parsed).toEqual(cWiki);
  });
});
