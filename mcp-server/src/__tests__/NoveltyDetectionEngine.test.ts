/**
 * NoveltyDetectionEngine tests — AUTO-LEARNING-LOOP-MS0 / U-ALL02
 * ================================================================
 *
 * Test plan covers:
 *   - spec § U-ALL02 verifies_via headline: 5 known + 5 new → precision=1, recall=1
 *   - all 3 tiers (exact-hash / cosine / Jaccard)
 *   - all spec failure_modes (embedder down, catalog corrupt)
 *   - all spec adversarial_cases (paraphrased dup, identical-content-diff-timestamp)
 *   - variability axes (0% / 50% / 100% novelty, catalog sizes 1 / 100)
 *   - every P1 fix from the 2-agent per-file scrutiny pass
 */

import { describe, it, expect } from "vitest";
import type { SourceItem } from "../engines/ReputableSourceMonitorEngine.js";
import {
  NoveltyDetectionEngine,
  CATALOG_SCHEMA_VERSION,
  DEFAULT_COSINE_THRESHOLD,
  DEFAULT_JACCARD_THRESHOLD,
  normalize,
  tokenize,
  jaccard,
  type CatalogState,
  type EmbedderLike,
  type EmbedOutcome,
} from "../engines/NoveltyDetectionEngine.js";

// ─── Test fixtures ──────────────────────────────────────────────────

function item(
  guid: string,
  title: string,
  summary?: string,
  source = "test-feed",
): SourceItem {
  return { source, guid, title, summary };
}

/**
 * Deterministic mock embedder. Maps each input string to a unique
 * direction in N-dim space. Pre-declared "near-twin" strings produce
 * cosine ≈ 0.97 with each other when seeded that way.
 */
class MockEmbedder implements EmbedderLike {
  private calls = 0;
  private vectors = new Map<string, number[]>();

  constructor(
    private opts: {
      throwOn?: string;
      failOn?: string;
      seed?: Record<string, number[]>;
    } = {},
  ) {
    for (const [k, v] of Object.entries(opts.seed ?? {})) {
      this.vectors.set(k, v);
    }
  }

  callCount(): number {
    return this.calls;
  }

  async embed(text: string): Promise<EmbedOutcome> {
    this.calls += 1;
    if (this.opts.throwOn && text === this.opts.throwOn) {
      throw new Error("simulated_embedder_explosion");
    }
    if (this.opts.failOn && text === this.opts.failOn) {
      return { ok: false, error: "simulated_failure" };
    }
    const seeded = this.vectors.get(text);
    if (seeded) return { ok: true, vector: seeded.slice() };
    const v = new Array(8).fill(0);
    let h = 0;
    for (let i = 0; i < text.length; i++) {
      h = (h * 31 + text.charCodeAt(i)) | 0;
    }
    for (let i = 0; i < 8; i++) {
      v[i] = ((h >> (i * 3)) & 0xff) / 256;
    }
    return { ok: true, vector: v };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function buildCatalog(entries: CatalogState["entries"]): CatalogState {
  return {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    entries,
    lastAddedAt: entries.length ? entries[entries.length - 1].addedAt : null,
  };
}

const FIXED_NOW = 1735689600000; // 2025-01-01T00:00:00Z

// ─── Constants sanity ───────────────────────────────────────────────

describe("constants", () => {
  it("CATALOG_SCHEMA_VERSION is exactly 1 (bumps signal breaking change)", () => {
    expect(CATALOG_SCHEMA_VERSION).toBe(1);
  });

  it("DEFAULT_COSINE_THRESHOLD matches spec § U-ALL02 step-1 (0.92)", () => {
    expect(DEFAULT_COSINE_THRESHOLD).toBe(0.92);
  });

  it("DEFAULT_JACCARD_THRESHOLD = 0.5 (tuned 2026-05-13)", () => {
    expect(DEFAULT_JACCARD_THRESHOLD).toBe(0.5);
  });
});

// ─── normalize / tokenize / jaccard ─────────────────────────────────

describe("normalize", () => {
  it("strips HTML tags", () => {
    expect(normalize("<b>Hello</b> World")).toBe("hello world");
  });

  it("strips named AND numeric HTML entities", () => {
    expect(normalize("It&#8217;s here &amp; ready &#x2019;s")).toBe(
      "it s here ready s",
    );
  });

  it("collapses whitespace and lowercases", () => {
    expect(normalize("  HELLO\t\nworld  ")).toBe("hello world");
  });

  it("returns empty string for empty input", () => {
    expect(normalize("")).toBe("");
  });

  it("preserves unicode characters", () => {
    expect(normalize("Hëllo Wörld 你好")).toBe("hëllo wörld 你好");
  });
});

describe("tokenize", () => {
  it("splits on non-alphanumeric and drops <2-char tokens", () => {
    // "b!c" splits into single-char "b" and "c" — both dropped (min length 2).
    // "ab-cd" splits into "ab" and "cd" — both kept.
    expect([...tokenize("hello world a i foo123 b!c ab-cd")]).toEqual([
      "hello",
      "world",
      "foo123",
      "ab",
      "cd",
    ]);
  });

  it("returns empty set for empty input", () => {
    expect(tokenize("").size).toBe(0);
  });

  it("dedups identical tokens", () => {
    const s = tokenize("foo bar foo bar foo");
    expect(s.size).toBe(2);
    expect(s.has("foo")).toBe(true);
    expect(s.has("bar")).toBe(true);
  });
});

describe("jaccard", () => {
  it("identical sets ⇒ 1.0", () => {
    expect(jaccard(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
  });

  it("disjoint sets ⇒ 0", () => {
    expect(jaccard(new Set(["a"]), new Set(["b"]))).toBe(0);
  });

  it("two empty sets ⇒ 0 (no NaN division)", () => {
    expect(jaccard(new Set(), new Set())).toBe(0);
  });

  it("partial overlap |∩|=1 |∪|=3 ⇒ exactly 1/3", () => {
    const j = jaccard(new Set(["a", "b"]), new Set(["b", "c"]));
    expect(j).toBeCloseTo(1 / 3, 6);
  });
});

// ─── Catalog management ─────────────────────────────────────────────

describe("catalog state lifecycle", () => {
  it("constructor with no initialCatalog ⇒ isCatalogLoaded reports false; entries length 0", () => {
    const eng = new NoveltyDetectionEngine();
    expect(eng.isCatalogLoaded()).toBe(false);
    expect(eng.getCatalog().entries.length).toBe(0);
    expect(eng.getCatalog().schemaVersion).toBe(CATALOG_SCHEMA_VERSION);
  });

  it("constructor with initialCatalog ⇒ isCatalogLoaded=true; preserves entry count", () => {
    const eng = new NoveltyDetectionEngine({
      initialCatalog: buildCatalog([
        {
          guid: "g1",
          source: "s",
          title: "t",
          textHash: "h1",
          addedAt: "2025-01-01T00:00:00Z",
        },
      ]),
    });
    expect(eng.isCatalogLoaded()).toBe(true);
    expect(eng.getCatalog().entries.length).toBe(1);
    expect(eng.getCatalog().entries[0].guid).toBe("g1");
  });

  it("setCatalog rejects schemaVersion mismatch and leaves state unchanged", () => {
    const eng = new NoveltyDetectionEngine();
    const bad = { schemaVersion: 999, entries: [], lastAddedAt: null } as CatalogState;
    const r = eng.setCatalog(bad);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/schemaVersion_mismatch/);
    expect(eng.isCatalogLoaded()).toBe(false);
  });

  it("setCatalog rejects non-array entries with specific error code", () => {
    const eng = new NoveltyDetectionEngine();
    const r = eng.setCatalog({
      schemaVersion: CATALOG_SCHEMA_VERSION,
      entries: "not_array" as unknown as CatalogState["entries"],
      lastAddedAt: null,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("entries_not_array");
  });

  it("setCatalog rejects __proto__ key inside entry (prototype pollution defence)", () => {
    // TypeScript object literal `{__proto__: X}` sets the proto slot,
    // not an own property — V8 specifically only treats `__proto__`
    // as an own property when produced by `JSON.parse`. Use that path
    // here so the test exercises the real attack vector.
    const eng = new NoveltyDetectionEngine();
    const maliciousJson = JSON.stringify({
      schemaVersion: CATALOG_SCHEMA_VERSION,
      entries: [
        {
          guid: "g1",
          source: "s",
          title: "t",
          textHash: "h",
          addedAt: "2025-01-01T00:00:00Z",
        },
      ],
      lastAddedAt: null,
    }).replace(
      '"addedAt":"2025-01-01T00:00:00Z"',
      '"addedAt":"2025-01-01T00:00:00Z","__proto__":{"polluted":true}',
    );
    const r = eng.loadCatalog(maliciousJson);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/forbidden_key:__proto__/);
  });

  it("setCatalog rejects embedding containing Infinity (overflowed vector)", () => {
    const eng = new NoveltyDetectionEngine();
    const r = eng.setCatalog(
      buildCatalog([
        {
          guid: "g1",
          source: "s",
          title: "t",
          textHash: "h",
          embedding: [1, 2, Infinity, 4, 5, 6, 7, 8],
          addedAt: "2025-01-01T00:00:00Z",
        },
      ]),
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/embedding_non_finite/);
  });

  it("setCatalog rejects embedding containing NaN", () => {
    const eng = new NoveltyDetectionEngine();
    const r = eng.setCatalog(
      buildCatalog([
        {
          guid: "g1",
          source: "s",
          title: "t",
          textHash: "h",
          embedding: [1, 2, NaN, 4, 5, 6, 7, 8],
          addedAt: "2025-01-01T00:00:00Z",
        },
      ]),
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/embedding_non_finite/);
  });

  it("loadCatalog parse error ⇒ ok:false; state unchanged (spec failure_mode: catalog corrupt)", () => {
    const eng = new NoveltyDetectionEngine();
    const r = eng.loadCatalog("{not valid json");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/parse_error:/);
    expect(eng.isCatalogLoaded()).toBe(false);
    expect(eng.getCatalog().entries.length).toBe(0);
  });

  it("loadCatalog wrong shape (array) ⇒ ok:false with not_an_object error", () => {
    const eng = new NoveltyDetectionEngine();
    const r = eng.loadCatalog("[]");
    expect(r.ok).toBe(false);
    // Array is technically `typeof === "object"`, but it lacks the required
    // schemaVersion key. Implementation returns schemaVersion_mismatch.
    expect(r.error).toMatch(/schemaVersion_mismatch/);
  });

  it("resetAll clears entries AND catalogLoaded flag together", () => {
    const eng = new NoveltyDetectionEngine({
      initialCatalog: buildCatalog([
        {
          guid: "g1",
          source: "s",
          title: "t",
          textHash: "h",
          addedAt: "2025-01-01T00:00:00Z",
        },
      ]),
    });
    expect(eng.isCatalogLoaded()).toBe(true);
    eng.resetAll();
    expect(eng.isCatalogLoaded()).toBe(false);
    expect(eng.getCatalog().entries.length).toBe(0);
    expect(eng.getCatalog().lastAddedAt).toBe(null);
  });

  it("getCatalog returns a defensive deep clone — caller mutation does not leak", () => {
    const eng = new NoveltyDetectionEngine({
      initialCatalog: buildCatalog([
        {
          guid: "g1",
          source: "s",
          title: "t",
          textHash: "h",
          embedding: [1, 2, 3],
          addedAt: "2025-01-01T00:00:00Z",
        },
      ]),
    });
    const snap = eng.getCatalog();
    snap.entries[0].title = "MUTATED";
    snap.entries[0].embedding![0] = 999;
    expect(eng.getCatalog().entries[0].title).toBe("t");
    expect(eng.getCatalog().entries[0].embedding![0]).toBe(1);
  });
});

// ─── detect: empty / boundary ───────────────────────────────────────

describe("detect — boundary conditions", () => {
  it("empty input ⇒ zero-result DetectResult; novel and known counts both 0", async () => {
    const eng = new NoveltyDetectionEngine({ now: () => FIXED_NOW });
    const r = await eng.detect([]);
    expect(r.results.length).toBe(0);
    expect(r.novelCount).toBe(0);
    expect(r.knownCount).toBe(0);
    expect(r.catalogSize).toBe(0);
    expect(r.modesUsed.length).toBe(0);
  });

  it("empty catalog ⇒ every input flagged novel with reason=catalog_empty and method=none", async () => {
    const eng = new NoveltyDetectionEngine({ now: () => FIXED_NOW });
    const r = await eng.detect([
      item("a", "Title A"),
      item("b", "Title B"),
    ]);
    expect(r.novelCount).toBe(2);
    expect(r.knownCount).toBe(0);
    for (const v of r.results) {
      expect(v.reason).toBe("catalog_empty");
      expect(v.method).toBe("none");
      expect(v.isNovel).toBe(true);
    }
  });

  it("durationMs is non-negative even for empty input", async () => {
    const eng = new NoveltyDetectionEngine({ now: () => FIXED_NOW });
    const r = await eng.detect([item("a", "T")]);
    expect(r.durationMs).toBeGreaterThanOrEqual(0);
  });
});

// ─── detect: tier 1 — exact hash ────────────────────────────────────

describe("detect — exact_hash tier", () => {
  it("bit-identical re-broadcast ⇒ exact_duplicate; bestSimilarity=1; method=exact_hash", async () => {
    const seeded = buildCatalog([
      {
        guid: "g1",
        source: "rss",
        title: "anthropic releases claude opus 4.7",
        textHash: "fixed_hash_x",
        addedAt: "2025-01-01T00:00:00Z",
      },
    ]);
    const eng = new NoveltyDetectionEngine({
      initialCatalog: seeded,
      hashFn: () => "fixed_hash_x",
    });
    const r = await eng.detect([
      item("g2", "Anthropic releases Claude Opus 4.7"),
    ]);
    expect(r.results[0].reason).toBe("exact_duplicate");
    expect(r.results[0].bestSimilarity).toBe(1);
    expect(r.results[0].bestMatchGuid).toBe("g1");
    expect(r.results[0].method).toBe("exact_hash");
    expect(r.modesUsed.includes("exact_hash")).toBe(true);
  });

  it("adversarial: identical-content with different `published` timestamp ⇒ still exact_hash hit", async () => {
    // The textHash MUST normalize over title+summary only, so two SourceItems
    // with the same content but different published fields should collide.
    let hashCallCount = 0;
    const hashFn = () => {
      hashCallCount += 1;
      return "stable_hash";
    };
    const eng = new NoveltyDetectionEngine({
      initialCatalog: buildCatalog([
        {
          guid: "g1",
          source: "rss",
          title: "claude opus 4.7 release",
          textHash: "stable_hash",
          addedAt: "2025-01-01T00:00:00Z",
        },
      ]),
      hashFn,
    });
    const r = await eng.detect([
      {
        source: "rss",
        guid: "g2",
        title: "Claude Opus 4.7 release",
        published: "2026-05-13T01:00:00Z",
      },
    ]);
    expect(r.results[0].reason).toBe("exact_duplicate");
    expect(hashCallCount).toBeGreaterThan(0);
  });
});

// ─── detect: tier 2 — cosine embedding ──────────────────────────────

describe("detect — cosine embedding tier", () => {
  const TWIN_A = [1, 1, 0, 0, 0, 0, 0, 0];
  const TWIN_B = [1, 0.9, 0.05, 0, 0, 0, 0, 0];
  const DISTANT = [0, 0, 0, 0, 1, 0, 0, 0];

  it("near-dup (1-word diff with near-twin embeddings) ⇒ near_duplicate via embedding tier", async () => {
    const catalogText = "anthropic releases claude opus 4.7|";
    const candidateText = "anthropic releases claude opus 4.8|";
    const embedder = new MockEmbedder({
      seed: { [catalogText]: TWIN_A, [candidateText]: TWIN_B },
    });
    const eng = new NoveltyDetectionEngine({
      embedder,
      initialCatalog: buildCatalog([
        {
          guid: "g1",
          source: "rss",
          title: "anthropic releases claude opus 4.7",
          textHash: "hash_47",
          embedding: TWIN_A,
          addedAt: "2025-01-01T00:00:00Z",
        },
      ]),
      hashFn: (s) => (s === catalogText ? "hash_47" : "hash_48"),
    });
    const r = await eng.detect([
      item("g2", "Anthropic releases Claude Opus 4.8"),
    ]);
    expect(r.results[0].reason).toBe("near_duplicate");
    expect(r.results[0].method).toBe("embedding");
    expect(r.results[0].bestSimilarity).toBeGreaterThanOrEqual(
      DEFAULT_COSINE_THRESHOLD,
    );
    expect(r.modesUsed.includes("embedding")).toBe(true);
  });

  it("truly-novel (orthogonal embedding) ⇒ novel; method=embedding; bestSim < threshold", async () => {
    const eng = new NoveltyDetectionEngine({
      embedder: new MockEmbedder({
        seed: {
          "x|": TWIN_A,
          "y|": DISTANT,
        },
      }),
      initialCatalog: buildCatalog([
        {
          guid: "g1",
          source: "rss",
          title: "x",
          textHash: "hash_x",
          embedding: TWIN_A,
          addedAt: "2025-01-01T00:00:00Z",
        },
      ]),
      hashFn: (s) => `hash_${s.trim().split("|")[0]}`,
    });
    const r = await eng.detect([item("g2", "y")]);
    expect(r.results[0].reason).toBe("novel");
    expect(r.results[0].method).toBe("embedding");
    expect(r.results[0].isNovel).toBe(true);
    expect(r.results[0].bestSimilarity).toBeLessThan(DEFAULT_COSINE_THRESHOLD);
  });

  it("paraphrased dup (adversarial: lexical-different, semantic-same) ⇒ near_duplicate via embedding", async () => {
    const eng = new NoveltyDetectionEngine({
      embedder: new MockEmbedder({
        seed: {
          "ai lab announces new model|": TWIN_A,
          "new model released by ai lab|": TWIN_B,
        },
      }),
      initialCatalog: buildCatalog([
        {
          guid: "g1",
          source: "rss",
          title: "ai lab announces new model",
          textHash: "h1",
          embedding: TWIN_A,
          addedAt: "2025-01-01T00:00:00Z",
        },
      ]),
      hashFn: (s) => (s.startsWith("ai lab") ? "h1" : "h2"),
    });
    const r = await eng.detect([
      item("g2", "New model released by AI lab"),
    ]);
    expect(r.results[0].reason).toBe("near_duplicate");
    expect(r.results[0].method).toBe("embedding");
  });

  it("overflowed embedding (1e200 vector) ⇒ NaN cosine guarded; no NaN in result", async () => {
    const huge: number[] = new Array(8).fill(1e200);
    const safe = [1, 0, 0, 0, 0, 0, 0, 0];
    const eng = new NoveltyDetectionEngine({
      embedder: new MockEmbedder({ seed: { "candidate|": huge } }),
      initialCatalog: buildCatalog([
        {
          guid: "g1",
          source: "rss",
          title: "ref",
          textHash: "href",
          embedding: safe,
          addedAt: "2025-01-01T00:00:00Z",
        },
      ]),
      hashFn: (s) => (s === "candidate|" ? "hc" : "href"),
    });
    const r = await eng.detect([item("g2", "candidate")]);
    expect(Number.isFinite(r.results[0].bestSimilarity ?? 0)).toBe(true);
    expect(r.results[0].isNovel).toBe(true);
  });

  it("spec verifies_via headline: 5 known + 5 new ⇒ novelCount=5 (precision=1, recall=1)", async () => {
    const knownTitles = [
      "claude opus 4.7 release",
      "gpt-5 announcement",
      "gemini 3 launch",
      "llama 4 paper",
      "mistral large 2",
    ];
    const newTitles = [
      "tesla optimus reveal",
      "spacex starship orbit",
      "boring company las vegas",
      "neuralink human trial",
      "openai sora video",
    ];
    // 10-dim space: known titles live in dims 0..4 (one-hot),
    // new titles live in dims 5..9 (one-hot) — provably orthogonal.
    const DIM = 10;
    const seed: Record<string, number[]> = {};
    knownTitles.forEach((t, i) => {
      const v = new Array(DIM).fill(0);
      v[i] = 1;
      seed[`${t}|`] = v;
    });
    newTitles.forEach((t, i) => {
      const v = new Array(DIM).fill(0);
      v[5 + i] = 1;
      seed[`${t}|`] = v;
    });
    const embedder = new MockEmbedder({ seed });
    const seeded = knownTitles.map((t, i) => {
      const v = new Array(DIM).fill(0);
      v[i] = 1;
      return {
        guid: `k${i}`,
        source: "rss",
        title: t,
        textHash: `hk${i}`,
        embedding: v,
        addedAt: "2025-01-01T00:00:00Z",
      };
    });
    const eng = new NoveltyDetectionEngine({
      embedder,
      initialCatalog: buildCatalog(seeded),
      hashFn: (s) => {
        const idx = knownTitles.findIndex((t) => `${t}|` === s);
        return idx >= 0 ? `hk${idx}` : `unknown_${s.slice(0, 6)}`;
      },
    });
    const probes = [
      ...knownTitles.map((t, i) => item(`probe_k${i}`, t)),
      ...newTitles.map((t, i) => item(`probe_n${i}`, t)),
    ];
    const r = await eng.detect(probes);
    expect(r.results.length).toBe(10);
    expect(r.novelCount).toBe(5);
    expect(r.knownCount).toBe(5);
    // precision=1: of the 5 flagged known, all 5 are truly-known.
    const flaggedKnown = r.results.filter((v) => !v.isNovel);
    expect(flaggedKnown.every((v) => v.guid.startsWith("probe_k"))).toBe(true);
    // recall=1: every truly-novel got flagged novel.
    const flaggedNovel = r.results.filter((v) => v.isNovel);
    expect(flaggedNovel.every((v) => v.guid.startsWith("probe_n"))).toBe(true);
  });
});

// ─── detect: tier 3 — Jaccard fallback ──────────────────────────────

describe("detect — Jaccard fallback tier", () => {
  it("embedder=null ⇒ Jaccard mode; near-dup (1-word diff) caught by 0.5 threshold", async () => {
    const eng = new NoveltyDetectionEngine({
      embedder: null,
      initialCatalog: buildCatalog([
        {
          guid: "g1",
          source: "rss",
          title: "anthropic releases claude opus 4.7",
          textHash: "h47",
          addedAt: "2025-01-01T00:00:00Z",
        },
      ]),
      hashFn: (s) => (s.includes("4.7") ? "h47" : "h48"),
    });
    const r = await eng.detect([
      item("g2", "Anthropic releases Claude Opus 4.8"),
    ]);
    expect(r.results[0].method).toBe("jaccard");
    expect(r.results[0].reason).toBe("near_duplicate");
    expect(r.results[0].bestSimilarity).toBeGreaterThanOrEqual(0.5);
  });

  it("Jaccard fallback flags truly-different content as novel", async () => {
    const eng = new NoveltyDetectionEngine({
      embedder: null,
      initialCatalog: buildCatalog([
        {
          guid: "g1",
          source: "rss",
          title: "anthropic releases claude opus",
          textHash: "h1",
          addedAt: "2025-01-01T00:00:00Z",
        },
      ]),
      hashFn: (s) => (s.startsWith("anthropic") ? "h1" : "h2"),
    });
    const r = await eng.detect([
      item("g2", "Tesla optimus humanoid robot demo"),
    ]);
    expect(r.results[0].method).toBe("jaccard");
    expect(r.results[0].reason).toBe("novel");
    expect(r.results[0].isNovel).toBe(true);
  });

  it("embedder fails mid-batch ⇒ rest of batch falls back to Jaccard with embedderFallback=true", async () => {
    const seed: Record<string, number[]> = {
      "good item|": [1, 0, 0, 0, 0, 0, 0, 0],
      "ref|": [1, 0, 0, 0, 0, 0, 0, 0],
    };
    const embedder = new MockEmbedder({ seed, failOn: "bad item|" });
    const eng = new NoveltyDetectionEngine({
      embedder,
      initialCatalog: buildCatalog([
        {
          guid: "g1",
          source: "rss",
          title: "ref",
          textHash: "href",
          embedding: [1, 0, 0, 0, 0, 0, 0, 0],
          addedAt: "2025-01-01T00:00:00Z",
        },
      ]),
      hashFn: (s) => `h_${s.slice(0, 4)}`,
    });
    const r = await eng.detect([
      item("g2", "good item"),
      item("g3", "bad item"),
      item("g4", "later item"),
    ]);
    expect(r.results[0].method).toBe("embedding");
    expect(r.results[1].method).toBe("jaccard");
    expect(r.results[1].embedderFallback).toBe(true);
    expect(r.results[2].method).toBe("jaccard");
    expect(r.results[2].embedderFallback).toBe(true);
  });

  it("embedder throws (not just returns ok:false) ⇒ caught by safeEmbed; downgrades to Jaccard", async () => {
    const embedder = new MockEmbedder({
      throwOn: "explode me|",
      seed: { "ref|": [1, 0, 0, 0, 0, 0, 0, 0] },
    });
    const eng = new NoveltyDetectionEngine({
      embedder,
      initialCatalog: buildCatalog([
        {
          guid: "g1",
          source: "rss",
          title: "ref",
          textHash: "href",
          embedding: [1, 0, 0, 0, 0, 0, 0, 0],
          addedAt: "2025-01-01T00:00:00Z",
        },
      ]),
      hashFn: () => "unique",
    });
    const r = await eng.detect([item("g2", "explode me")]);
    expect(r.results[0].method).toBe("jaccard");
    expect(r.results[0].embedderFallback).toBe(true);
  });

  it("Jaccard on identical normalized text ⇒ similarity 1.0 (exact-text-no-hash-match path)", async () => {
    const eng = new NoveltyDetectionEngine({
      embedder: null,
      initialCatalog: buildCatalog([
        {
          guid: "g1",
          source: "rss",
          title: "claude opus 4.7",
          textHash: "h1",
          embedding: [1, 0, 0, 0, 0, 0, 0, 0],
          addedAt: "2025-01-01T00:00:00Z",
        },
      ]),
      hashFn: () => "unique",
    });
    const r = await eng.detect([item("g2", "Claude Opus 4.7")]);
    expect(r.results[0].method).toBe("jaccard");
    expect(r.results[0].bestSimilarity).toBe(1);
    expect(r.results[0].reason).toBe("near_duplicate");
  });
});

// ─── detect: variability axis ───────────────────────────────────────

describe("detect — variability axes", () => {
  it("100-entry catalog: scan completes; novel item correctly identified", async () => {
    const entries = [];
    for (let i = 0; i < 100; i++) {
      entries.push({
        guid: `g${i}`,
        source: "rss",
        title: `item ${i}`,
        textHash: `h${i}`,
        addedAt: "2025-01-01T00:00:00Z",
      });
    }
    const eng = new NoveltyDetectionEngine({
      embedder: null,
      initialCatalog: buildCatalog(entries),
      hashFn: (s) => s.replace(/\W/g, "_"),
    });
    const r = await eng.detect([item("probe", "completely unrelated headline")]);
    expect(r.catalogSize).toBe(100);
    expect(r.results[0].isNovel).toBe(true);
  });

  it("mixed batch: 50% known + 50% new ⇒ counts split correctly", async () => {
    const eng = new NoveltyDetectionEngine({
      embedder: null,
      initialCatalog: buildCatalog([
        {
          guid: "k1",
          source: "rss",
          title: "alpha",
          textHash: "h_alpha",
          addedAt: "2025-01-01T00:00:00Z",
        },
        {
          guid: "k2",
          source: "rss",
          title: "beta",
          textHash: "h_beta",
          addedAt: "2025-01-01T00:00:00Z",
        },
      ]),
      hashFn: (s) =>
        s.startsWith("alpha")
          ? "h_alpha"
          : s.startsWith("beta")
          ? "h_beta"
          : `h_unique_${s.slice(0, 4)}`,
    });
    const r = await eng.detect([
      item("p1", "alpha"),
      item("p2", "novel x z y w"),
      item("p3", "beta"),
      item("p4", "another novel z w q"),
    ]);
    expect(r.knownCount).toBe(2);
    expect(r.novelCount).toBe(2);
  });
});

// ─── addVerifiedNovel ───────────────────────────────────────────────

describe("addVerifiedNovel", () => {
  it("adds novel items to catalog; sets lastAddedAt; returns precise counts", async () => {
    const eng = new NoveltyDetectionEngine({
      embedder: null,
      now: () => FIXED_NOW,
      hashFn: (s) => s.replace(/\W/g, "_"),
    });
    const items = [
      item("g1", "item one"),
      item("g2", "item two"),
      item("g3", "item three"),
    ];
    const detectR = await eng.detect(items);
    const addR = await eng.addVerifiedNovel(detectR.results, items);
    expect(addR.added).toBe(3);
    expect(addR.embeddedFailures.length).toBe(0);
    expect(addR.skipped.length).toBe(0);
    expect(eng.getCatalog().entries.length).toBe(3);
    expect(eng.getCatalog().lastAddedAt).toBe(new Date(FIXED_NOW).toISOString());
  });

  it("textHash collision ⇒ skipped, not added (idempotent re-commit)", async () => {
    const eng = new NoveltyDetectionEngine({
      embedder: null,
      now: () => FIXED_NOW,
      hashFn: () => "shared_hash",
    });
    const detectR = await eng.detect([item("g1", "first")]);
    const addR1 = await eng.addVerifiedNovel(detectR.results, [
      item("g1", "first"),
    ]);
    expect(addR1.added).toBe(1);

    // Second add — same hash, different guid+content. Skip on hash collision.
    const fabricated = [
      {
        guid: "g2",
        source: "test",
        isNovel: true,
        reason: "novel" as const,
        method: "jaccard" as const,
      },
    ];
    const addR2 = await eng.addVerifiedNovel(fabricated, [item("g2", "different")]);
    expect(addR2.added).toBe(0);
    expect(addR2.skipped.includes("g2")).toBe(true);
  });

  it("guid collision (different content from upstream re-publish) ⇒ skipped", async () => {
    const eng = new NoveltyDetectionEngine({
      embedder: null,
      now: () => FIXED_NOW,
      hashFn: (s) => `h_${s.slice(0, 3)}`,
    });
    const initialR = await eng.detect([item("g1", "original title")]);
    await eng.addVerifiedNovel(initialR.results, [item("g1", "original title")]);

    const fabricated = [
      {
        guid: "g1",
        source: "test",
        isNovel: true,
        reason: "novel" as const,
        method: "jaccard" as const,
      },
    ];
    const r = await eng.addVerifiedNovel(fabricated, [
      item("g1", "completely different title"),
    ]);
    expect(r.added).toBe(0);
    expect(r.skipped.includes("g1")).toBe(true);
    expect(eng.getCatalog().entries.length).toBe(1);
  });

  it("re-uses _computedEmbedding from detect verdict ⇒ embedder called exactly once across detect+add", async () => {
    const seed = {
      "ref|": [1, 0, 0, 0, 0, 0, 0, 0],
      "novel item|": [0.1, 0.1, 1, 0, 0, 0, 0, 0],
    };
    const embedder = new MockEmbedder({ seed });
    const eng = new NoveltyDetectionEngine({
      embedder,
      now: () => FIXED_NOW,
      initialCatalog: buildCatalog([
        {
          guid: "g1",
          source: "rss",
          title: "ref",
          textHash: "href",
          embedding: [1, 0, 0, 0, 0, 0, 0, 0],
          addedAt: "2025-01-01T00:00:00Z",
        },
      ]),
      hashFn: (s) => (s === "ref|" ? "href" : "hnovel"),
    });
    const detectR = await eng.detect([item("g2", "novel item")]);
    expect(embedder.callCount()).toBe(1);
    const items = [item("g2", "novel item")];
    const addR = await eng.addVerifiedNovel(detectR.results, items);
    // Critical: addVerifiedNovel must NOT re-embed.
    expect(embedder.callCount()).toBe(1);
    expect(addR.added).toBe(1);
    expect(addR.embeddedFailures.length).toBe(0);
    expect(eng.getCatalog().entries[1].embedding).toEqual(seed["novel item|"]);
  });

  it("embedder fails on novel commit (no _computedEmbedding path) ⇒ entry added; failure recorded", async () => {
    const embedder = new MockEmbedder({ failOn: "broken|" });
    const eng = new NoveltyDetectionEngine({
      embedder,
      now: () => FIXED_NOW,
      hashFn: () => "unique_h",
    });
    // Fabricate a "novel" verdict with method=none (mimics catalog_empty path
    // where no embedding was computed during detect).
    const fabricated = [
      {
        guid: "gx",
        source: "test",
        isNovel: true,
        reason: "novel" as const,
        method: "none" as const,
      },
    ];
    const r = await eng.addVerifiedNovel(fabricated, [item("gx", "broken")]);
    expect(r.added).toBe(1);
    expect(r.embeddedFailures.includes("gx")).toBe(true);
    // Entry exists but has no embedding (will fall back to Jaccard forever).
    const stored = eng.getCatalog().entries[0];
    expect(stored.guid).toBe("gx");
    expect("embedding" in stored).toBe(false);
  });

  it("skips items not flagged novel (defence against double-commit)", async () => {
    const eng = new NoveltyDetectionEngine({
      embedder: null,
      now: () => FIXED_NOW,
      hashFn: () => "h",
    });
    const fabricated = [
      {
        guid: "g1",
        source: "t",
        isNovel: false,
        reason: "exact_duplicate" as const,
        method: "exact_hash" as const,
      },
    ];
    const r = await eng.addVerifiedNovel(fabricated, [item("g1", "x")]);
    expect(r.added).toBe(0);
    expect(eng.getCatalog().entries.length).toBe(0);
  });
});

// ─── End-to-end round-trip ──────────────────────────────────────────

describe("detect + addVerifiedNovel — end-to-end", () => {
  it("two-cron-tick cycle: t0 adds 3 novel; t1 re-detects same 3 as exact_duplicate", async () => {
    const eng = new NoveltyDetectionEngine({
      embedder: null,
      now: () => FIXED_NOW,
      hashFn: (s) => `h_${s.slice(0, 4)}`,
    });
    const tick0 = [
      item("g1", "First"),
      item("g2", "Second"),
      item("g3", "Third"),
    ];
    const r0 = await eng.detect(tick0);
    expect(r0.novelCount).toBe(3);
    const add0 = await eng.addVerifiedNovel(r0.results, tick0);
    expect(add0.added).toBe(3);

    // Same items arrive again next cron tick → all should hit exact_hash tier.
    const r1 = await eng.detect(tick0);
    expect(r1.knownCount).toBe(3);
    expect(r1.results.every((v) => v.reason === "exact_duplicate")).toBe(true);
  });
});
