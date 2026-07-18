/**
 * QdrantFederatedRetrieverEngine tests -- CROSS-DOMAIN-RAG-FEDERATION-MS0/U-RAGFED-RETRIEVER
 *
 * Real reference-value coverage (R9): the RRF fused scores are hand-computed
 * from Cormack et al. 2009 (RRFscore = SUM w/(k+rank)), not asserted as
 * "toBeDefined". A FakeStore (an injected DEPENDENCY, not the SUT) + a fake
 * embedder exercise the I/O path without a live Qdrant/Ollama, so the fusion +
 * degrade logic is verifiable offline. The SUT (QdrantFederatedRetrieverEngine)
 * is never mocked.
 */

import { describe, it, expect } from "vitest";
import {
  QdrantFederatedRetrieverEngine,
  DEFAULT_RRF_K,
  type RankedList,
} from "../engines/QdrantFederatedRetrieverEngine.js";
import type {
  SearchHit,
  QdrantVectorStoreEngine,
} from "../engines/QdrantVectorStoreEngine.js";

// -- test doubles (dependency, not SUT) ---------------------------------------

type StoreResult =
  | { ok: true; value: SearchHit[] }
  | { ok: false; error: string };

interface SearchOpts {
  collection: string;
  vector: number[];
  limit?: number;
  filter?: Record<string, unknown>;
  withPayload?: boolean;
}

class FakeStore {
  searchCalls: string[] = [];
  lastLimits: Record<string, number> = {};
  constructor(
    private byCollection: Record<string, SearchHit[]>,
    private opts: { connected?: boolean; fail?: string[] } = {},
  ) {}
  isConnected(): boolean {
    return this.opts.connected ?? true;
  }
  async search(o: SearchOpts): Promise<StoreResult> {
    this.searchCalls.push(o.collection);
    if (o.limit !== undefined) this.lastLimits[o.collection] = o.limit;
    if ((this.opts.fail ?? []).includes(o.collection)) {
      return { ok: false, error: `fail:${o.collection}` };
    }
    return { ok: true, value: this.byCollection[o.collection] ?? [] };
  }
}

const hit = (id: string, score = 0.9, text?: string): SearchHit => ({
  id,
  score,
  payload: { text: text ?? `text-${id}` },
});

const embedder = async (_t: string): Promise<number[]> => [0.1, 0.2, 0.3];
// FakeStore implements the subset of QdrantVectorStoreEngine the SUT calls
// (isConnected + search); the structural cast keeps the SUT itself unmocked.
const asStore = (s: FakeStore): QdrantVectorStoreEngine =>
  s as unknown as QdrantVectorStoreEngine;

// -- RRF fusion core (pure, hand-computed reference values) -------------------

describe("QdrantFederatedRetrieverEngine.reciprocalRankFusion", () => {
  const eng = new QdrantFederatedRetrieverEngine();

  it("fuses by reciprocal rank -- a doc in BOTH lists outranks higher single-list docs", () => {
    // List a: [doc1, doc2, doc3] (ranks 1,2,3); List b: [doc2, doc4] (ranks 1,2); k=60.
    // doc2 = 1/62 + 1/61 = 0.0325225 ; doc1 = 1/61 = 0.0163934
    // doc4 = 1/62 = 0.0161290 ; doc3 = 1/63 = 0.0158730
    const lists: RankedList[] = [
      { collection: "a", weight: 1, hits: [hit("doc1"), hit("doc2"), hit("doc3")] },
      { collection: "b", weight: 1, hits: [hit("doc2"), hit("doc4")] },
    ];
    const fused = eng.reciprocalRankFusion(lists, 60);
    expect(fused.map((h) => h.id)).toEqual(["doc2", "doc1", "doc4", "doc3"]);
    expect(fused[0].score).toBeCloseTo(1 / 62 + 1 / 61, 9);
    expect(fused[1].score).toBeCloseTo(1 / 61, 9); // doc1
    expect(fused[2].score).toBeCloseTo(1 / 62, 9); // doc4
    expect(fused[3].score).toBeCloseTo(1 / 63, 9); // doc3
  });

  it("merges a doc seen in two collections (corroboration): collections + perCollection populated", () => {
    const fused = eng.reciprocalRankFusion(
      [
        { collection: "a", weight: 1, hits: [hit("doc1"), hit("doc2")] },
        { collection: "b", weight: 1, hits: [hit("doc2")] },
      ],
      60,
    );
    const doc2 = fused.find((h) => h.id === "doc2");
    expect(doc2?.id).toBe("doc2");
    expect(doc2?.collections.slice().sort()).toEqual(["a", "b"]);
    expect(doc2?.perCollection).toHaveLength(2);
    expect(doc2?.bestRank).toBe(1); // rank1 in b beats rank2 in a
    expect(doc2?.score).toBeCloseTo(1 / 62 + 1 / 61, 9);
  });

  it("keeps text/payload from the BEST (lowest) rank occurrence", () => {
    const fused = eng.reciprocalRankFusion(
      [
        { collection: "a", weight: 1, hits: [hit("x"), hit("y"), hit("z", 0.5, "from-A-rank3")] },
        { collection: "b", weight: 1, hits: [hit("z", 0.9, "from-B-rank1")] },
      ],
      60,
    );
    const z = fused.find((h) => h.id === "z");
    expect(z?.text).toBe("from-B-rank1");
    expect(z?.bestRank).toBe(1);
  });

  it("renders text tolerantly from name/description and node_id payloads", () => {
    const fused = eng.reciprocalRankFusion(
      [
        {
          collection: "c",
          weight: 1,
          hits: [
            { id: "n1", score: 1, payload: { name: "Engine A", description: "does X" } },
            { id: "n2", score: 1, payload: { node_id: "node-42" } },
          ],
        },
      ],
      60,
    );
    expect(fused.find((h) => h.id === "n1")?.text).toBe("Engine A - does X");
    expect(fused.find((h) => h.id === "n2")?.text).toBe("node-42");
  });

  it("applies per-list weights to the reciprocal-rank contribution", () => {
    // weight 2 doubles the contribution: doc at rank1 weight2 = 2/61.
    const fused = eng.reciprocalRankFusion(
      [{ collection: "boosted", weight: 2, hits: [hit("d")] }],
      60,
    );
    expect(fused[0].score).toBeCloseTo(2 / 61, 9);
  });

  it("returns [] for no lists and uses DEFAULT_RRF_K when k omitted", () => {
    expect(eng.reciprocalRankFusion([])).toEqual([]);
    const fused = eng.reciprocalRankFusion([{ collection: "a", weight: 1, hits: [hit("d")] }]);
    expect(fused[0].score).toBeCloseTo(1 / (DEFAULT_RRF_K + 1), 9);
  });
});

// -- domain inference + affinity weighting (pure) -----------------------------

describe("QdrantFederatedRetrieverEngine domain affinity", () => {
  const eng = new QdrantFederatedRetrieverEngine();

  it("infers the domain implied by a query", () => {
    expect(eng.inferDomains("how do tribal chatter rules apply to lathe?")).toContain("lathe");
    expect(eng.inferDomains("end mill feeds for the vmc")).toContain("mill");
    expect(eng.inferDomains("wire edm flushing pressure")).toContain("wedm");
    expect(eng.inferDomains("a query with no domain words")).toEqual([]);
  });

  it("ADVERSARIAL: does NOT cross-match short tokens inside larger words", () => {
    // word-boundary guard: "turn" must not fire on "returning", etc.
    expect(eng.inferDomains("returning customer")).toEqual([]);
    expect(eng.inferDomains("camera calibration")).toEqual([]);
    expect(eng.inferDomains("dosage in milligrams")).toEqual([]);
    // the real domain word still matches at a boundary
    expect(eng.inferDomains("turning the part")).toContain("lathe");
  });

  it("boosts collections whose name matches the inferred domain", () => {
    const w = eng.domainWeights("lathe chatter", ["prism_lathe_knowledge", "prism_mill_knowledge"], 0.5);
    expect(w.get("prism_lathe_knowledge")).toBe(1.5);
    expect(w.get("prism_mill_knowledge")).toBe(1);
  });

  it("leaves all weights at 1 when the query implies no domain", () => {
    const w = eng.domainWeights("generic question", ["prism_lathe_knowledge", "prism_mill_knowledge"]);
    expect(w.get("prism_lathe_knowledge")).toBe(1);
    expect(w.get("prism_mill_knowledge")).toBe(1);
  });
});

// -- federatedRetrieve (I/O path via injected FakeStore) ----------------------

describe("QdrantFederatedRetrieverEngine.federatedRetrieve", () => {
  it("fans out to all collections in parallel and fuses (happy path)", async () => {
    const store = new FakeStore({
      col_a: [hit("doc1"), hit("doc2"), hit("doc3")],
      col_b: [hit("doc2"), hit("doc4")],
    });
    const eng = new QdrantFederatedRetrieverEngine({ store: asStore(store), embedder });
    const r = await eng.federatedRetrieve({
      query: "generic query",
      collections: ["col_a", "col_b"],
      domainAffinity: false,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.hits.map((h) => h.id)).toEqual(["doc2", "doc1", "doc4", "doc3"]);
      expect(r.value.collectionsQueried).toBe(2);
      expect(r.value.collectionsSucceeded).toBe(2);
      expect(r.value.degraded).toBe(false);
      expect(r.value.collectionsFailed).toEqual([]);
    }
    expect(store.searchCalls.slice().sort()).toEqual(["col_a", "col_b"]);
  });

  it("truncates to limit", async () => {
    const store = new FakeStore({
      col_a: [hit("d1"), hit("d2"), hit("d3"), hit("d4")],
    });
    const eng = new QdrantFederatedRetrieverEngine({ store: asStore(store), embedder });
    const r = await eng.federatedRetrieve({
      query: "q",
      collections: ["col_a"],
      limit: 2,
      domainAffinity: false,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.hits).toHaveLength(2);
  });

  it("derives perCollectionLimit = max(limit*2, 20), honoring an explicit override", async () => {
    const store = new FakeStore({ col_a: [hit("d")] });
    const eng = new QdrantFederatedRetrieverEngine({ store: asStore(store), embedder });
    await eng.federatedRetrieve({ query: "q", collections: ["col_a"], limit: 3, domainAffinity: false });
    expect(store.lastLimits.col_a).toBe(20); // max(6,20)
    await eng.federatedRetrieve({ query: "q", collections: ["col_a"], limit: 15, domainAffinity: false });
    expect(store.lastLimits.col_a).toBe(30); // max(30,20)
    await eng.federatedRetrieve({
      query: "q",
      collections: ["col_a"],
      perCollectionLimit: 5,
      domainAffinity: false,
    });
    expect(store.lastLimits.col_a).toBe(5);
  });

  it("ADVERSARIAL: domain affinity changes the fused ranking", async () => {
    const store = new FakeStore({
      lathe_knowledge: [hit("L1")],
      mill_knowledge: [hit("M1")],
    });
    const eng = new QdrantFederatedRetrieverEngine({ store: asStore(store), embedder });
    const q = "turning chatter on the lathe";
    const withAff = await eng.federatedRetrieve({
      query: q,
      collections: ["lathe_knowledge", "mill_knowledge"],
      domainAffinity: true,
    });
    const without = await eng.federatedRetrieve({
      query: q,
      collections: ["lathe_knowledge", "mill_knowledge"],
      domainAffinity: false,
    });
    expect(withAff.ok).toBe(true);
    expect(without.ok).toBe(true);
    if (withAff.ok && without.ok) {
      // affinity: L1 = 1.5/61 outranks M1 = 1/61
      expect(withAff.value.hits[0].id).toBe("L1");
      expect(withAff.value.hits[0].score).toBeCloseTo(1.5 / 61, 9);
      expect(withAff.value.inferredDomains).toContain("lathe");
      // no affinity: both 1/61, no boost
      expect(without.value.hits[0].score).toBeCloseTo(1 / 61, 9);
      expect(without.value.hits[1].score).toBeCloseTo(1 / 61, 9);
      expect(without.value.inferredDomains).toEqual([]);
    }
  });

  it("graceful-degrades: fuses survivors when SOME collections fail", async () => {
    const store = new FakeStore(
      { col_a: [hit("doc1"), hit("doc2")], col_b: [hit("doc9")] },
      { fail: ["col_b"] },
    );
    const eng = new QdrantFederatedRetrieverEngine({ store: asStore(store), embedder });
    const r = await eng.federatedRetrieve({
      query: "q",
      collections: ["col_a", "col_b"],
      domainAffinity: false,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.degraded).toBe(true);
      expect(r.value.collectionsFailed).toEqual(["col_b"]);
      expect(r.value.collectionsSucceeded).toBe(1);
      expect(r.value.hits.map((h) => h.id)).toEqual(["doc1", "doc2"]); // doc9 absent
    }
  });

  it("errors when ALL collections fail (R12 fail-loud, not silent empty)", async () => {
    const store = new FakeStore({ col_a: [hit("d")] }, { fail: ["col_a", "col_b"] });
    const eng = new QdrantFederatedRetrieverEngine({ store: asStore(store), embedder });
    const r = await eng.federatedRetrieve({ query: "q", collections: ["col_a", "col_b"] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/all 2 collection\(s\) failed/);
  });

  it("rejects empty collections", async () => {
    const store = new FakeStore({});
    const eng = new QdrantFederatedRetrieverEngine({ store: asStore(store), embedder });
    const r = await eng.federatedRetrieve({ query: "q", collections: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/collections required/);
  });

  it("rejects empty query", async () => {
    const store = new FakeStore({ col_a: [hit("d")] });
    const eng = new QdrantFederatedRetrieverEngine({ store: asStore(store), embedder });
    const r = await eng.federatedRetrieve({ query: "   ", collections: ["col_a"] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/query required/);
  });

  it("errors when no embedder configured", async () => {
    const store = new FakeStore({ col_a: [hit("d")] });
    const eng = new QdrantFederatedRetrieverEngine({ store: asStore(store) }); // no embedder
    const r = await eng.federatedRetrieve({ query: "q", collections: ["col_a"] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/embedder not configured/);
  });

  it("errors when the store is not connected", async () => {
    const store = new FakeStore({ col_a: [hit("d")] }, { connected: false });
    const eng = new QdrantFederatedRetrieverEngine({ store: asStore(store), embedder });
    const r = await eng.federatedRetrieve({ query: "q", collections: ["col_a"] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/not connected/);
  });

  it("errors (with cause) when the embedder throws", async () => {
    const store = new FakeStore({ col_a: [hit("d")] });
    const throwEmb = async (): Promise<number[]> => {
      throw new Error("embed boom");
    };
    const eng = new QdrantFederatedRetrieverEngine({ store: asStore(store), embedder: throwEmb });
    const r = await eng.federatedRetrieve({ query: "q", collections: ["col_a"] });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("embed failed");
      expect(r.cause).toBeInstanceOf(Error);
    }
  });

  it("errors when the embedder returns an empty vector", async () => {
    const store = new FakeStore({ col_a: [hit("d")] });
    const emptyEmb = async (): Promise<number[]> => [];
    const eng = new QdrantFederatedRetrieverEngine({ store: asStore(store), embedder: emptyEmb });
    const r = await eng.federatedRetrieve({ query: "q", collections: ["col_a"] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/0-d vector/);
  });
});

// -- review-hardened cases (per-file scrutiny findings) -----------------------

describe("QdrantFederatedRetrieverEngine review-hardened cases", () => {
  it("dedups repeated collection names (no double-scored RRF)", async () => {
    const store = new FakeStore({ col_a: [hit("d1"), hit("d2")] });
    const eng = new QdrantFederatedRetrieverEngine({ store: asStore(store), embedder });
    const r = await eng.federatedRetrieve({
      query: "q",
      collections: ["col_a", "col_a"],
      domainAffinity: false,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.collectionsQueried).toBe(1);
      // d1 scored ONCE at rank1 = 1/61, not doubled to 2/61.
      expect(r.value.hits[0].score).toBeCloseTo(1 / 61, 9);
      expect(r.value.hits[0].collections).toEqual(["col_a"]);
    }
    expect(store.searchCalls).toEqual(["col_a"]); // one search, not two
  });

  it("rejects a non-positive/non-integer perCollectionLimit (no uncaught throw)", async () => {
    const store = new FakeStore({ col_a: [hit("d")] });
    const eng = new QdrantFederatedRetrieverEngine({ store: asStore(store), embedder });
    for (const bad of [0, -5, 1.5]) {
      const r = await eng.federatedRetrieve({
        query: "q",
        collections: ["col_a"],
        perCollectionLimit: bad,
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/perCollectionLimit must be positive integer/);
    }
  });

  it("graceful-degrades when a collection search THROWS (mirrors real store)", async () => {
    // The real QdrantVectorStoreEngine.validateSearchOptions throws OUTSIDE its
    // try block; a bare Promise.all would reject the whole call. The fan-out's
    // per-collection try/catch must funnel the throw into failures[].
    class ThrowingStore {
      isConnected(): boolean {
        return true;
      }
      async search(o: SearchOpts): Promise<StoreResult> {
        if (o.collection === "boom") throw new Error("validateSearchOptions: bad limit");
        return { ok: true, value: [hit("ok1")] };
      }
    }
    const eng = new QdrantFederatedRetrieverEngine({
      store: new ThrowingStore() as unknown as QdrantVectorStoreEngine,
      embedder,
    });
    const r = await eng.federatedRetrieve({
      query: "q",
      collections: ["good", "boom"],
      domainAffinity: false,
    });
    expect(r.ok).toBe(true); // did NOT reject
    if (r.ok) {
      expect(r.value.degraded).toBe(true);
      expect(r.value.collectionsFailed).toEqual(["boom"]);
      expect(r.value.failures[0]).toMatchObject({ collection: "boom" });
      expect(r.value.failures[0].error).toMatch(/validateSearchOptions/);
      expect(r.value.hits.map((h) => h.id)).toEqual(["ok1"]);
    }
  });

  it("returns ok with empty hits when every connected collection is empty", async () => {
    const store = new FakeStore({ col_a: [], col_b: [] });
    const eng = new QdrantFederatedRetrieverEngine({ store: asStore(store), embedder });
    const r = await eng.federatedRetrieve({
      query: "q",
      collections: ["col_a", "col_b"],
      domainAffinity: false,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.hits).toEqual([]);
      expect(r.value.degraded).toBe(false);
      expect(r.value.collectionsSucceeded).toBe(2);
    }
  });

  it("honors an explicit domainBoost override", () => {
    const eng = new QdrantFederatedRetrieverEngine();
    const w = eng.domainWeights("lathe work", ["prism_lathe_knowledge"], 2);
    expect(w.get("prism_lathe_knowledge")).toBe(3); // 1 + 2
  });

  it("does NOT merge a numeric id with the string of the same digits", () => {
    const eng = new QdrantFederatedRetrieverEngine();
    const fused = eng.reciprocalRankFusion(
      [
        { collection: "a", weight: 1, hits: [{ id: 42, score: 1, payload: { text: "numeric-42" } }] },
        { collection: "b", weight: 1, hits: [{ id: "42", score: 1, payload: { text: "string-42" } }] },
      ],
      60,
    );
    expect(fused).toHaveLength(2); // distinct docs, type-tagged key prevents collision
  });
});
