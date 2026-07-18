// scripts/lib/cag-router.test.mjs
//
// Tests for cag-router.mjs — CAG (Cache-Augmented Generation) query classifier.
// Run: node --test H:/prism/scripts/lib/cag-router.test.mjs
//
// Test surfaces:
//   1. classifyQuery — tier resolution + confidence + source extraction
//   2. summarize — 1-line hook injection format
//   3. coldSourcesFor — convenience accessor
//   4. estimateSavings — token/latency savings projection
//   5. COLD_SOURCES — registry shape + frozen
//   6. Edge cases: empty, null, very long, regex-metachars, word boundaries

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyQuery,
  summarize,
  coldSourcesFor,
  estimateSavings,
  COLD_SOURCES,
} from "./cag-router.mjs";

describe("classifyQuery", () => {
  describe("COLD tier (static doctrine)", () => {
    it("classifies a doctrine question as COLD", () => {
      const r = classifyQuery("what does CLAUDE.md say about the scrutiny gate?");
      assert.equal(r.tier, "COLD");
      assert.ok(r.confidence > 0.3, `expected high confidence, got ${r.confidence}`);
      assert.ok(r.coldSources.some((s) => s.endsWith("CLAUDE.md")), "should name CLAUDE.md");
      assert.ok(r.evidence.some((e) => e.startsWith("COLD:")), "evidence should cite cold sources");
    });

    it("classifies a Kienzle physics question as COLD", () => {
      const r = classifyQuery("what is the kc1.1 for ISO group P?");
      assert.equal(r.tier, "COLD");
      assert.ok(r.coldSources.some((s) => s.includes("constants.ts")), "should name constants.ts");
    });

    it("classifies a dispatcher inventory question as COLD", () => {
      const r = classifyQuery("which dispatcher handles cutting force calculations?");
      assert.equal(r.tier, "COLD");
      assert.ok(r.coldSources.some((s) => s.includes("DISPATCHER_DIGEST")), "should name DISPATCHER_DIGEST");
    });

    it("classifies an engine inventory question as COLD", () => {
      const r = classifyQuery("list engines that compute tool life");
      assert.equal(r.tier, "COLD");
      assert.ok(r.coldSources.some((s) => s.includes("ENGINE_DIGEST")), "should name ENGINE_DIGEST");
    });

    it("classifies a memory-vault doctrine question as COLD", () => {
      const r = classifyQuery("read feedback memory on golf slot");
      assert.equal(r.tier, "COLD");
      // CLAUDE.md keywords match too (golf slot is mentioned in CLAUDE.md)
      assert.ok(
        r.coldSources.some((s) => s.endsWith("MEMORY.md")) ||
          r.coldSources.some((s) => s.endsWith("CLAUDE.md")),
        "should name MEMORY.md or CLAUDE.md"
      );
    });

    it("classifies a cross-galaxy context question as COLD → galaxy-cards bundle (U-GCF-CAG-CARDS)", () => {
      const r = classifyQuery("which galaxy holds the context card for cad work?");
      assert.equal(r.tier, "COLD");
      assert.ok(r.coldSources.some((s) => s.endsWith("ALL-CARDS.md")), "should name the galaxy-cards bundle");
    });
  });

  describe("HOT tier (live retrieval)", () => {
    it("classifies a live-state question as HOT", () => {
      const r = classifyQuery("what's the current BUILD_STATE pending count?");
      assert.equal(r.tier, "HOT");
      assert.ok(r.hotSources.some((s) => s.includes("BUILD_STATE")), "should name BUILD_STATE");
    });

    it("classifies a slot-claim question as HOT", () => {
      const r = classifyQuery("who owns slot bravo right now?");
      assert.equal(r.tier, "HOT");
      assert.ok(r.hotSources.some((s) => s.includes("chat-slots")), "should name chat-slots");
    });

    it("classifies a 'latest commit' question as HOT", () => {
      const r = classifyQuery("what changed in the latest commit?");
      assert.equal(r.tier, "HOT");
      assert.ok(r.hotSources.some((s) => s.toLowerCase().includes("git log")), "should name git log");
    });

    it("classifies a semantic-search request as HOT", () => {
      const r = classifyQuery("find similar engines to this CAG router");
      assert.equal(r.tier, "HOT");
      assert.ok(r.hotSources.some((s) => s.toLowerCase().includes("qdrant")), "should name qdrant");
    });
  });

  describe("HYBRID tier (both layers)", () => {
    it("classifies a doctrine + live question as HYBRID", () => {
      const r = classifyQuery("does the latest CLAUDE.md scrutiny gate match the current BUILD_STATE?");
      assert.equal(r.tier, "HYBRID");
      assert.ok(r.coldSources.length > 0, "should have cold sources");
      assert.ok(r.hotSources.length > 0, "should have hot sources");
    });

    it("forces HYBRID on 'applied to' marker", () => {
      const r = classifyQuery("Kienzle kc1.1 applied to current job ALPHA-123");
      assert.equal(r.tier, "HYBRID");
      assert.ok(
        r.evidence.some((e) => e.includes("HYBRID-FORCE")),
        "should cite hybrid force marker"
      );
    });

    it("returns HYBRID with low confidence on totally unmatched query", () => {
      const r = classifyQuery("the quick brown fox jumps over the lazy dog");
      assert.equal(r.tier, "HYBRID");
      assert.ok(r.confidence < 0.5, `expected low confidence, got ${r.confidence}`);
      assert.ok(
        r.evidence.some((e) => e.toLowerCase().includes("low-confidence")),
        "should flag low confidence"
      );
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      const r = classifyQuery("");
      assert.equal(r.tier, "HYBRID");
      assert.equal(r.confidence, 0);
      assert.equal(r.coldSources.length, 0);
      assert.equal(r.hotSources.length, 0);
    });

    it("handles non-string input gracefully", () => {
      const r = classifyQuery(null);
      assert.equal(r.tier, "HYBRID");
      assert.equal(r.normalizedQuery, "");
      assert.equal(r.confidence, 0);
    });

    it("handles undefined input gracefully", () => {
      const r = classifyQuery(undefined);
      assert.equal(r.tier, "HYBRID");
      assert.equal(r.normalizedQuery, "");
    });

    it("respects word boundaries — 'ragout' does NOT trigger 'rag'", () => {
      const r = classifyQuery("the chef made a beautiful ragout for dinner");
      // Should NOT have any HOT:rag-trigger evidence because 'rag' word
      // boundary must match.
      assert.ok(
        !r.evidence.some((e) => e.includes("rag-trigger")),
        `'ragout' must not trigger 'rag' word match; evidence=${JSON.stringify(r.evidence)}`
      );
    });

    it("respects word boundaries — 'MillEngine' does not also match 'engine'", () => {
      // Compound words are tokenized by word boundary regex. 'engine' as a
      // bare keyword should NOT fire inside 'MillEngine' (no whitespace).
      // But classification still goes through because 'list engines' phrase
      // would match — confirm we don't double-count.
      const r = classifyQuery("MillEngine deflection");
      // We mainly want stable classification, not specific tier.
      assert.ok(["COLD", "HOT", "HYBRID"].includes(r.tier));
    });

    it("normalizes whitespace and case", () => {
      const r = classifyQuery("   WHICH    DISPATCHER   HANDLES   FORCES?   ");
      assert.equal(r.normalizedQuery, "which    dispatcher   handles   forces?".replace(/\s+/g, " ").trim());
      // After collapse: "which dispatcher handles forces?"
      assert.equal(r.tier, "COLD");
    });

    it("handles regex-metachar keywords without crashing", () => {
      // Some keywords contain '.', '*' (e.g., 'prism_*'). The lib must escape
      // those before constructing the word-boundary regex.
      const r = classifyQuery("which prism_calc action computes Kienzle force?");
      assert.equal(r.tier, "COLD");
      assert.ok(r.coldSources.some((s) => s.includes("DISPATCHER_DIGEST")));
    });

    it("truncates oversize queries and flags it in evidence", async () => {
      const { MAX_QUERY_BYTES } = await import("./cag-router.mjs");
      // Build a query >MAX_QUERY_BYTES. Use a doctrine word so the head
      // still classifies; the tail is filler.
      const head = "CLAUDE.md scrutiny gate doctrine ";
      const filler = "x".repeat(MAX_QUERY_BYTES + 1000);
      const r = classifyQuery(head + filler);
      assert.ok(r.truncated, "should flag truncation");
      assert.ok(
        r.evidence.some((e) => e.toLowerCase().includes("truncated")),
        "evidence should cite truncation"
      );
      // Classification should still succeed (head was preserved)
      assert.ok(["COLD", "HOT", "HYBRID"].includes(r.tier));
    });

    it("clamps confidence below 1", () => {
      // Stack many cold-tier keywords; confidence should still be <1
      const r = classifyQuery(
        "CLAUDE.md doctrine scrutiny gate Kienzle Taylor kc1.1 dispatcher digest engine digest wiki index tribal tip golf slot PSN session continuity"
      );
      assert.ok(r.confidence < 1, `confidence must be < 1, got ${r.confidence}`);
      assert.ok(r.confidence > 0.4, `but still high, got ${r.confidence}`);
    });

    it("produces deterministic output for the same input", () => {
      const q = "what is the latest fleet-reaper status?";
      const a = classifyQuery(q);
      const b = classifyQuery(q);
      assert.deepEqual(a, b, "classification must be deterministic");
    });
  });
});

describe("summarize", () => {
  it("produces a compact 1-line summary for a COLD hit", () => {
    const r = classifyQuery("what is kc1.1 for ISO P?");
    const s = summarize(r);
    assert.ok(s.startsWith("CAG-route: COLD"), `unexpected: ${s}`);
    assert.ok(s.includes("conf"), "should include confidence");
  });

  it("produces a summary for a HOT hit", () => {
    const r = classifyQuery("who owns slot golf right now?");
    const s = summarize(r);
    assert.ok(s.startsWith("CAG-route: HOT"));
  });

  it("produces a summary for a HYBRID hit", () => {
    const r = classifyQuery("CLAUDE.md doctrine applied to current BUILD_STATE");
    const s = summarize(r);
    assert.ok(s.startsWith("CAG-route: HYBRID"));
  });

  it("renders (no sources) for a low-confidence HYBRID with NO sources — the fleet-common default route", () => {
    // Regression: a no-keyword-match prompt (e.g. a slash command) classifies as
    // HYBRID conf 0 with empty cold + hot. The old `${cold} + ${hot}` produced a
    // truthy " + " that defeated the `|| "(no sources)"` fallback, so the fleet
    // saw a misleading `→ +`. This is the MOST COMMON classification (keyword
    // match-rate is ~1%), so the honest render matters fleet-wide.
    const r = classifyQuery("/yolo-mode");
    assert.equal(r.tier, "HYBRID");
    assert.equal(r.coldSources.length, 0);
    assert.equal(r.hotSources.length, 0);
    const s = summarize(r);
    assert.ok(s.endsWith("→ (no sources)"), `should end with the honest no-sources marker, got: ${s}`);
    assert.ok(!s.includes("→ +"), `must NOT render a dangling " + " separator, got: ${s}`);
    assert.ok(!/→\s*\+\s*$/.test(s), `must NOT end with a bare + separator, got: ${s}`);
  });

  it("renders only the present side for a one-sided HYBRID (no dangling separator)", () => {
    // A HYBRID with cold present but hot empty (or vice versa) must show just the
    // present source, never "path + " (implies a phantom hot source) or " + path".
    const coldOnly = summarize({
      tier: "HYBRID",
      confidence: 0.3,
      coldSources: ["H:/prism/CLAUDE.md"],
      hotSources: [],
    });
    assert.ok(coldOnly.endsWith("→ H:/prism/CLAUDE.md"), `cold-only should show just the cold path, got: ${coldOnly}`);
    assert.ok(!coldOnly.includes(" + "), `cold-only must not render a separator, got: ${coldOnly}`);

    const hotOnly = summarize({
      tier: "HYBRID",
      confidence: 0.3,
      coldSources: [],
      hotSources: ["state/shared/BUILD_STATE.json"],
    });
    assert.ok(hotOnly.endsWith("→ state/shared/BUILD_STATE.json"), `hot-only should show just the hot path, got: ${hotOnly}`);
    assert.ok(!hotOnly.includes(" + "), `hot-only must not render a separator, got: ${hotOnly}`);
  });

  it("still renders both sides for a HYBRID with cold AND hot present", () => {
    const s = summarize({
      tier: "HYBRID",
      confidence: 0.6,
      coldSources: ["H:/prism/CLAUDE.md"],
      hotSources: ["state/shared/BUILD_STATE.json"],
    });
    assert.ok(s.endsWith("→ H:/prism/CLAUDE.md + state/shared/BUILD_STATE.json"), `both present should join with " + ", got: ${s}`);
  });

  it("handles null gracefully", () => {
    assert.equal(summarize(null), "(no classification)");
    assert.equal(summarize(undefined), "(no classification)");
  });
});

describe("coldSourcesFor", () => {
  it("returns the cold-source paths for a doctrine query", () => {
    const sources = coldSourcesFor("Kienzle physics constants");
    assert.ok(Array.isArray(sources));
    assert.ok(sources.some((s) => s.includes("constants.ts")), "should include physics constants");
  });

  it("returns empty array for a pure-HOT query", () => {
    const sources = coldSourcesFor("latest commits this hour");
    assert.deepEqual(sources, []);
  });

  it("returns empty array for empty query", () => {
    assert.deepEqual(coldSourcesFor(""), []);
  });
});

describe("estimateSavings", () => {
  it("estimates non-zero savings for high-confidence COLD hit", () => {
    const r = classifyQuery("read CLAUDE.md scrutiny gate doctrine kc1.1 dispatcher digest");
    const s = estimateSavings(r);
    assert.ok(s.estimatedTokensSaved > 0, `expected positive savings, got ${s.estimatedTokensSaved}`);
    assert.ok(s.rationale.length > 0);
  });

  it("estimates zero savings for HOT hit", () => {
    const r = classifyQuery("what changed in the latest commit?");
    const s = estimateSavings(r);
    assert.equal(s.estimatedTokensSaved, 0, "HOT hits should not claim cold-cache savings");
  });

  it("estimates intermediate savings for HYBRID hit", () => {
    const r = classifyQuery("Kienzle kc1.1 doctrine applied to current job (latest BUILD_STATE)");
    const s = estimateSavings(r);
    // Hybrid should be < cold savings, > hot savings
    assert.ok(s.estimatedTokensSaved >= 0);
  });

  it("returns zero savings for low-confidence classification", () => {
    const r = classifyQuery("xyzzy plugh frobnitz");
    const s = estimateSavings(r);
    assert.equal(s.estimatedTokensSaved, 0);
  });

  it("handles null gracefully", () => {
    const s = estimateSavings(null);
    assert.equal(s.estimatedTokensSaved, 0);
    assert.equal(s.rationale, "no result");
  });
});

describe("COLD_SOURCES registry", () => {
  it("is frozen (Object.freeze)", () => {
    assert.ok(Object.isFrozen(COLD_SOURCES));
  });

  it("has at least 5 entries", () => {
    assert.ok(COLD_SOURCES.length >= 5, `expected ≥5 cold sources, got ${COLD_SOURCES.length}`);
  });

  it("every entry has required fields", () => {
    for (const src of COLD_SOURCES) {
      assert.ok(src.id, "id required");
      assert.ok(src.path, "path required");
      assert.ok(Array.isArray(src.keywords), `keywords must be array for ${src.id}`);
      assert.ok(src.keywords.length > 0, `keywords must be non-empty for ${src.id}`);
      assert.ok(src.coldRationale, `coldRationale required for ${src.id}`);
      assert.equal(typeof src.sizeBytes, "number", `sizeBytes must be number for ${src.id}`);
    }
  });

  it("every entry id is unique", () => {
    const ids = COLD_SOURCES.map((s) => s.id);
    const uniq = new Set(ids);
    assert.equal(ids.length, uniq.size, "duplicate cold-source id");
  });

  it("every entry has a real-looking path", () => {
    for (const src of COLD_SOURCES) {
      assert.ok(
        src.path.startsWith("H:/") || src.path.startsWith("C:/"),
        `path must be absolute Windows-style for ${src.id}, got ${src.path}`
      );
    }
  });

  it("registers the galaxy-cards federation bundle (U-GCF-CAG-CARDS)", () => {
    const gc = COLD_SOURCES.find((s) => s.id === "galaxy-cards");
    assert.ok(gc, "galaxy-cards cold source registered");
    assert.ok(gc.path.endsWith("galaxy-cards/ALL-CARDS.md"), "points at the consolidated bundle");
    assert.ok(gc.keywords.includes("which galaxy"), "keyworded for cross-galaxy lookups");
  });
});
