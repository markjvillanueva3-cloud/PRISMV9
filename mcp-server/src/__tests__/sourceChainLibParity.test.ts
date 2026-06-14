/**
 * sourceChainLibParity.test.ts — DRIFT LOCK (R7) for the .mjs source-chain mirror.
 *
 * scripts/lib/source-chain-lib.mjs re-implements SourceChainEngine's pure core in
 * dependency-light .mjs because the per-prompt inject hooks (bare .mjs, no build
 * step) cannot import this TypeScript engine. Two implementations of the same
 * deterministic contract = the classic "two brains that disagree" risk. This test
 * asserts the mirror's digest() / renderMarkdown() / decorate().digest are
 * BYTE-IDENTICAL to the canonical engine for VALID citations. Change one side
 * without the other → this test goes red. (The mirror's fail-soft handling of
 * INVALID citations — where the TS engine throws — is a documented divergence
 * covered by scripts/lib/source-chain-lib.test.mjs, NOT here.)
 */
import { describe, it, expect } from "vitest";
import { SourceChainEngine, type Citation } from "../engines/SourceChainEngine.js";
import * as mirror from "../../../scripts/lib/source-chain-lib.mjs";

// Fully-valid citations (every one passes SourceChainEngine.CitationSchema):
// all six source_type enum members, a falsy-but-valid score=0, an exact score=1,
// a no-score citation, and used_for present/absent — the fields digest +
// renderMarkdown actually read.
const VALID: Citation[] = [
  { path: "eng.mill", source_type: "engine", score: 0.913, retrieved_at: "2026-06-06T00:00:00.000Z", used_for: "mill lookup" },
  { path: "disp.prism_calc", source_type: "dispatcher", score: 0, retrieved_at: "2026-06-06T00:00:01.000Z" },
  { path: "feedback/feedback_psn_definition", source_type: "memory", retrieved_at: "2026-06-06T00:00:02.000Z" },
  { path: "tribal-tip-00042", source_type: "tribal", score: 1, retrieved_at: "2026-06-06T00:00:03.000Z", used_for: "discharge gotcha" },
  { path: "knowledge/wiki/architecture/nn-graph-ms0.md", source_type: "wiki", score: 0.5, retrieved_at: "2026-06-06T00:00:04.000Z" },
  { path: "https://example.com/spec", source_type: "external", retrieved_at: "2026-06-06T00:00:05.000Z" },
];

// Subsets that exercise empty / single / reverse-order (digest is order-independent).
const SUBSETS: Citation[][] = [
  [],
  [VALID[0]],
  VALID.slice(0, 3),
  VALID,
  [...VALID].reverse(),
];

describe("source-chain-lib ↔ SourceChainEngine parity (drift lock)", () => {
  it("digest() is byte-identical for every valid subset", () => {
    for (const cites of SUBSETS) {
      expect(mirror.digest(cites)).toBe(SourceChainEngine.digest(cites));
    }
  });

  it("digest() is order-independent and identical across both impls", () => {
    const a = mirror.digest(VALID);
    const b = mirror.digest([...VALID].reverse());
    expect(a).toBe(b); // mirror is order-independent
    expect(a).toBe(SourceChainEngine.digest([...VALID].reverse())); // and matches the engine
  });

  it("renderMarkdown() is byte-identical for every valid subset", () => {
    for (const cites of SUBSETS) {
      expect(mirror.renderMarkdown(cites)).toBe(SourceChainEngine.renderMarkdown(cites));
    }
  });

  it("renderMarkdown() empty-set sentinel matches", () => {
    expect(mirror.renderMarkdown([])).toBe("_(no sources cited)_");
    expect(mirror.renderMarkdown([])).toBe(SourceChainEngine.renderMarkdown([]));
  });

  it("decorate(value, validCitations).digest matches the engine", () => {
    for (const cites of SUBSETS) {
      const mine = mirror.decorate({ q: "x" }, cites);
      const theirs = SourceChainEngine.decorate({ q: "x" }, cites);
      expect(mine.digest).toBe(theirs.digest);
      expect(mine.value).toEqual(theirs.value);
      expect(mine.sources.length).toBe(theirs.sources.length);
    }
  });

  it("every CITATION_SOURCE_TYPES member is accepted by the engine schema (enum parity)", () => {
    for (const t of mirror.CITATION_SOURCE_TYPES) {
      const c = { path: "p", source_type: t, retrieved_at: "2026-06-06T00:00:00.000Z" };
      // Engine validate() throws if source_type is not in its enum — so a clean
      // round-trip proves the mirror's enum matches the engine's exactly.
      expect(() => SourceChainEngine.validate(c)).not.toThrow();
      expect(SourceChainEngine.digest([c])).toBe(mirror.digest([c]));
    }
  });
});
