/**
 * MasterIndexFilters.dispatcher.e2e.test.ts — true dispatcher round-trip for
 * prism_session.master_index_query proving the documented filter surface
 * (layers / sources / min_utilization / min_confidence / build_classes) really
 * does pass through the schema → dispatcher → engine chain.
 *
 * WHY this exists (OBSIDIAN-PRISM-OS-MS0/U-MASTER-INDEX wiring regression):
 *   - MasterIndexEngine.query has supported these filters since v1.0.0 (lines
 *     199-213 of MasterIndexEngine.ts).
 *   - sessionActionSchemas.ts already declares each one (lines 660-671).
 *   - sessionDispatcher.ts already wires snake_case → camelCase in the case
 *     body (lines 1430-1442).
 *   - But no test pinned the chain end-to-end. A silent schema regression
 *     (e.g. someone drops `sources` from the z.object) or a silent dispatcher
 *     regression (e.g. someone forgets `opts.sources = params.sources`) would
 *     leave the engine able to filter but the dispatcher unable to ask — and
 *     every chat would quietly fall back to dumping 50K+ hits.
 *
 * The test mocks McpServer.tool() to capture the registered prism_session
 * handler, then invokes it with real {action, params} so the ACTIONS enum,
 * the per-action Zod schema, the switch/case body, the lazy
 * `await import("../engines/MasterIndexEngine.js")`, and the response shaping
 * all run through production code paths.
 *
 * Assertions use RELATIVE invariants (filtered.totalHits <= unfiltered.totalHits)
 * not absolute counts, so the test is stable against graph regeneration.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";
import { ACTION_SESSION_SCHEMAS } from "../schemas/sessionActionSchemas.js";

type McpHandler = (args: { action: string; params?: Record<string, unknown> }) => Promise<
  { content?: Array<{ type: "text"; text: string }>; isError?: boolean } | Record<string, unknown>
>;

interface MasterIndexHit {
  source: "graph_node" | "engine" | "action" | "hook" | "skill" | "wiki" | "memory";
  id: string;
  label: string;
  layer?: string;
  confidence: number;
  utilization: number;
  buildClass: "wired" | "unwired" | "pending" | "frontend" | "unknown";
  wikiEntries?: string[];
  memoryEntries?: string[];
}

interface MasterIndexResult {
  query: string;
  totalHits: number;
  hits: MasterIndexHit[];
  bySource: Record<string, number>;
  byBuildClass: Record<string, number>;
  topUtilized?: MasterIndexHit[];
  underUtilized?: MasterIndexHit[];
  generatedAt: string;
  cacheHit: boolean;
  graphMtime: string | null;
  warnings?: string[];
}

function captureHandler(): { handler: McpHandler; schemaActions: readonly string[] } {
  let handler: McpHandler | null = null;
  let enumValues: readonly string[] = [];
  const server = {
    tool(_name: string, _description: string, schema: Record<string, unknown>, cb: McpHandler) {
      handler = cb;
      const action = (schema as { action?: { _def?: { values?: readonly string[]; entries?: Record<string, string> } } }).action;
      if (action?._def?.values) enumValues = action._def.values;
      else if (action?._def?.entries) enumValues = Object.keys(action._def.entries);
    },
  };
  registerSessionDispatcher(server as unknown as Parameters<typeof registerSessionDispatcher>[0]);
  if (!handler) throw new Error("registerSessionDispatcher did not register a handler");
  return { handler, schemaActions: enumValues };
}

async function invoke(handler: McpHandler, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const result = await handler({ action, params });
  const content = (result as { content?: Array<{ text: string }> }).content;
  if (!Array.isArray(content)) return result as Record<string, unknown>;
  return JSON.parse(content[0]?.text ?? "{}");
}

/**
 * Pulls the inner `data` payload from the dispatcher's {success, data, …}
 * envelope, with a graceful fallback if a future refactor flattens it.
 */
function unwrap(envelope: Record<string, unknown>): MasterIndexResult {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return envelope.data as MasterIndexResult;
  }
  return envelope as unknown as MasterIndexResult;
}

/**
 * Tolerate the engine's documented behavior of OMITTING `hits` when totalHits=0
 * (instead of emitting an empty array). This is a real R12 inconsistency in
 * MasterIndexEngine.query that this test pins down — a future engine fix
 * should align on `hits:[]` always. Until then, treat absent as empty.
 */
function hitsOf(r: MasterIndexResult): MasterIndexHit[] {
  return Array.isArray(r.hits) ? r.hits : [];
}

/**
 * NON-stopword query vocabulary. The engine internally drops `engine`,
 * `engines`, `feature`, `features`, `system`, `systems`, `node`, `label`,
 * `info`, `wiki`, `memory`, `prism` from tokenization (see MasterIndexEngine.ts
 * STOPWORDS at line 98-104). Tests below MUST use terms outside this set or
 * they degrade to zero-token zero-hit results that test nothing.
 */
const Q = {
  knowledge: "knowledge obsidian vault dispatcher",
  physics: "kienzle cutting force taylor",
  dispatch: "dispatcher action handler routing",
  cross: "dispatcher knowledge obsidian",
};

describe("prism_session.master_index_query — dispatcher round-trip filter wiring", () => {
  let handler: McpHandler;
  let schemaActions: readonly string[];

  beforeAll(() => {
    const captured = captureHandler();
    handler = captured.handler;
    schemaActions = captured.schemaActions;
  });

  // ==========================================================================
  // WIRING — every layer of the chain must declare the action
  // ==========================================================================

  it("wiring: master_index_query is in the prism_session ACTIONS enum", () => {
    expect(schemaActions).toContain("master_index_query");
  });

  it("wiring: ACTION_SESSION_SCHEMAS.master_index_query parses every documented filter", () => {
    const schema = ACTION_SESSION_SCHEMAS.master_index_query;
    expect(typeof schema.parse).toBe("function");
    const parsed = schema.parse({
      query: "anything",
      limit: 5,
      layers: ["L4", "L5"],
      sources: ["engine", "action"],
      min_utilization: 0.1,
      min_confidence: 0.2,
      build_classes: ["wired"],
    }) as Record<string, unknown>;
    expect(parsed.query).toBe("anything");
    expect(parsed.layers).toEqual(["L4", "L5"]);
    expect(parsed.sources).toEqual(["engine", "action"]);
    expect(parsed.build_classes).toEqual(["wired"]);
  });

  it("wiring: schema accepts `q` as alias for `query`", () => {
    const schema = ACTION_SESSION_SCHEMAS.master_index_query;
    const parsed = schema.parse({ q: "alias check" }) as Record<string, unknown>;
    expect(parsed.q).toBe("alias check");
  });

  // ==========================================================================
  // HAPPY PATH — a wide query returns hits with the expected envelope shape
  // ==========================================================================

  // 60s budget: this is the FIRST query in the suite, so the engine pays the
  // full cost of (a) reading the ~25MB system-graph.json, (b) building the
  // inverted index, (c) running the wrapped PRISMSelfAwarenessEngine.findCapabilities
  // call. iter-2 (U-MIQ-STOPWORDS-CONFIG) made the index richer (added ~9
  // PRISM-meta buckets) so first-build is ~30s on a 20K-node graph; subsequent
  // queries hit the cache and finish in <100ms.
  it("happy path: an unfiltered non-stopword query returns hits with provenance + utilization + buildClass", async () => {
    const data = unwrap(await invoke(handler, "master_index_query", {
      query: Q.cross,
      limit: 20,
    }));
    expect(typeof data.totalHits).toBe("number");
    expect(data.totalHits).toBeGreaterThan(0); // non-stopword query MUST hit something in the live graph
    expect(Array.isArray(hitsOf(data))).toBe(true);
    expect(hitsOf(data).length).toBeGreaterThan(0);
    expect(typeof data.bySource).toBe("object");
    expect(typeof data.byBuildClass).toBe("object");
    expect(typeof data.cacheHit).toBe("boolean");
    const h = hitsOf(data)[0];
    expect(typeof h.id).toBe("string");
    expect(typeof h.confidence).toBe("number");
    expect(typeof h.utilization).toBe("number");
    expect(["wired", "unwired", "pending", "frontend", "unknown"]).toContain(h.buildClass);
  }, 60000);

  // ==========================================================================
  // FILTER WIRING — each documented filter must actually narrow the result set
  // (or at minimum: never broaden it beyond the unfiltered baseline)
  // ==========================================================================

  it("filter wiring: `sources: ['engine']` only returns engine hits and never exceeds the unfiltered baseline", async () => {
    const unfiltered = unwrap(await invoke(handler, "master_index_query", {
      query: Q.knowledge, limit: 50,
    }));
    const filtered = unwrap(await invoke(handler, "master_index_query", {
      query: Q.knowledge, limit: 50, sources: ["engine"],
    }));
    expect(filtered.totalHits).toBeLessThanOrEqual(unfiltered.totalHits);
    for (const hit of hitsOf(filtered)) {
      expect(hit.source).toBe("engine");
    }
  });

  it("filter wiring: `layers: ['L5']` only returns L5 graph nodes (engines), provided graph nodes exist", async () => {
    const filtered = unwrap(await invoke(handler, "master_index_query", {
      query: Q.dispatch, limit: 30, layers: ["L5"],
    }));
    for (const hit of hitsOf(filtered)) {
      // Non-graph sources don't carry a layer; graph_node hits must match the filter.
      if (hit.source === "graph_node") {
        expect(hit.layer).toBe("L5");
      }
    }
  });

  it("filter wiring: `min_confidence` strictly drops every hit below the threshold", async () => {
    const filtered = unwrap(await invoke(handler, "master_index_query", {
      query: Q.cross, limit: 50, min_confidence: 0.5,
    }));
    for (const hit of hitsOf(filtered)) {
      expect(hit.confidence).toBeGreaterThanOrEqual(0.5);
    }
  });

  it("filter wiring: `min_utilization` strictly drops graph_node hits below the threshold (capability hits exempt per iter-3 U-MIQ-CAPABILITY-MIN-UTIL)", async () => {
    // Iter-3 changed the contract: minUtilization is a graph-node concept
    // (utilization = log-normalized edge in-degree). Capability hits
    // (engine/action/skill/hook from PRISMSelfAwarenessEngine) hard-code
    // utilization=0 as a SENTINEL for "no edge-graph data" — not a real
    // measurement. Pre-iter-3, the engine ran the sentinel through the
    // filter and silently dropped every capability hit at minUtilization>0.
    // Post-iter-3, capability hits bypass the filter; only graph_node hits
    // are asserted >= threshold here. The capability-exempt invariant is
    // exercised + asserted in the "capability min_utilization exemption"
    // describe block below (3 dedicated cases).
    const filtered = unwrap(await invoke(handler, "master_index_query", {
      query: Q.dispatch, limit: 50, min_utilization: 0.3,
    }));
    for (const hit of hitsOf(filtered)) {
      if (hit.source === "graph_node") {
        expect(hit.utilization).toBeGreaterThanOrEqual(0.3);
      }
    }
  });

  it("filter wiring: `build_classes: ['wired']` returns only wired hits", async () => {
    const filtered = unwrap(await invoke(handler, "master_index_query", {
      query: Q.dispatch, limit: 50, build_classes: ["wired"],
    }));
    for (const hit of hitsOf(filtered)) {
      expect(hit.buildClass).toBe("wired");
    }
  });

  it("filter wiring: combined filters compose (sources + min_confidence) without broadening the result set", async () => {
    const broad = unwrap(await invoke(handler, "master_index_query", {
      query: Q.knowledge, limit: 50, sources: ["engine"],
    }));
    const narrow = unwrap(await invoke(handler, "master_index_query", {
      query: Q.knowledge, limit: 50, sources: ["engine"], min_confidence: 0.3,
    }));
    expect(narrow.totalHits).toBeLessThanOrEqual(broad.totalHits);
    for (const hit of hitsOf(narrow)) {
      expect(hit.source).toBe("engine");
      expect(hit.confidence).toBeGreaterThanOrEqual(0.3);
    }
  });

  it("filter wiring: `limit` is honored (caller's cap, not the engine default)", async () => {
    const data = unwrap(await invoke(handler, "master_index_query", {
      query: Q.dispatch, limit: 3,
    }));
    expect(hitsOf(data).length).toBeLessThanOrEqual(3);
  });

  // ==========================================================================
  // FAILURE MODES — bad input must degrade gracefully, never throw
  // ==========================================================================

  it("failure mode: empty query returns totalHits=0 + a warning, with hits absent or empty", async () => {
    const data = unwrap(await invoke(handler, "master_index_query", { query: "" }));
    expect(data.totalHits).toBe(0);
    expect(hitsOf(data).length).toBe(0);
    // engine emits a structured warning instead of throwing — surfacing this
    // contract so a future "silently drop warnings" refactor breaks the test.
    expect(Array.isArray(data.warnings)).toBe(true);
    expect((data.warnings || []).join(" ")).toMatch(/no tokens|stopword|length/i);
  });

  it("failure mode: a layer filter that matches nothing returns an empty set, not all hits", async () => {
    const data = unwrap(await invoke(handler, "master_index_query", {
      query: Q.dispatch, layers: ["L_DEFINITELY_NOT_A_LAYER"], limit: 10,
    }));
    for (const hit of hitsOf(data)) {
      if (hit.source === "graph_node") {
        // graph nodes must be filtered out — non-graph hits are exempt by design
        throw new Error(`bad filter let through a graph_node: ${hit.id} layer=${hit.layer}`);
      }
    }
  });

  it("failure mode: oversized query (>500 chars) is truncated by the engine, never throws", async () => {
    const giant = "knowledge ".repeat(200); // ~2000 chars
    const data = unwrap(await invoke(handler, "master_index_query", { query: giant, limit: 5 }));
    // truncated query still produces a well-formed envelope (totalHits >= 0)
    expect(typeof data.totalHits).toBe("number");
    expect(data.totalHits).toBeGreaterThanOrEqual(0);
  });

  it("failure mode: schema rejects an unknown `sources` enum value", () => {
    const schema = ACTION_SESSION_SCHEMAS.master_index_query;
    expect(() => schema.parse({ query: "x", sources: ["not_a_real_source"] })).toThrow();
  });

  it("failure mode: schema rejects an unknown `build_classes` enum value", () => {
    const schema = ACTION_SESSION_SCHEMAS.master_index_query;
    expect(() => schema.parse({ query: "x", build_classes: ["not_a_class"] })).toThrow();
  });

  // ==========================================================================
  // ADVERSARIAL — NaN / Infinity / null / extreme bounds
  // ==========================================================================

  it("adversarial: NaN limit doesn't blow up (dispatcher coerces via Number())", async () => {
    const data = unwrap(await invoke(handler, "master_index_query", {
      query: Q.dispatch, limit: "not-a-number",
    }));
    // engine clamps/defaults bad limits; envelope is still well-formed.
    expect(typeof data.totalHits).toBe("number");
    expect(data.totalHits).toBeGreaterThanOrEqual(0);
  });

  it("adversarial: min_confidence above 1.0 returns 0 hits (no negative-bound silent broadening)", async () => {
    const data = unwrap(await invoke(handler, "master_index_query", {
      query: Q.dispatch, min_confidence: 2.0, limit: 20,
    }));
    expect(hitsOf(data).length).toBe(0);
  });

  it("adversarial: combined source+build_class filter that mutually excludes (engine + frontend) returns 0 hits", async () => {
    // 'engine' source hits come from capability search and always carry buildClass='unknown';
    // requiring buildClass='frontend' is mutually exclusive → must drop them all.
    const data = unwrap(await invoke(handler, "master_index_query", {
      query: Q.dispatch, sources: ["engine"], build_classes: ["frontend"], limit: 50,
    }));
    expect(hitsOf(data).length).toBe(0);
  });

  // ==========================================================================
  // STOPWORDS CONFIGURABILITY (iter-2: U-MIQ-STOPWORDS-CONFIG)
  // Default behavior must be byte-identical to pre-iter-2 (back-compat); the
  // new `stopwords` option lets callers lift the unconditional drop of
  // PRISM-meta tokens (engine/system/wiki/memory/prism/feature/node).
  // ==========================================================================

  describe("stopwords configurability", () => {
    // The cached inverted index built earlier in this test run (during the
    // happy-path / filter wiring tests) was constructed with the pre-iter-2
    // stopword set baked in. iter-2 changed the index-build call to use
    // STOPWORDS_MINIMAL so PRISM-meta tokens become queryable — but the
    // cache from earlier tests is stale relative to that change.
    // Invalidate it once before exercising the new contract.
    beforeAll(async () => {
      const mod = await import("../engines/MasterIndexEngine.js");
      mod.masterIndexEngine.clearCache();
    });

    it("wiring: schema accepts 'default' | 'minimal' | 'off' + a custom string[]", () => {
      const schema = ACTION_SESSION_SCHEMAS.master_index_query;
      expect(() => schema.parse({ query: "x", stopwords: "default" })).not.toThrow();
      expect(() => schema.parse({ query: "x", stopwords: "minimal" })).not.toThrow();
      expect(() => schema.parse({ query: "x", stopwords: "off" })).not.toThrow();
      expect(() => schema.parse({ query: "x", stopwords: ["foo", "bar"] })).not.toThrow();
    });

    it("wiring: schema rejects an unknown stopwords string mode", () => {
      const schema = ACTION_SESSION_SCHEMAS.master_index_query;
      expect(() => schema.parse({ query: "x", stopwords: "fullbore" })).toThrow();
    });

    it("back-compat: a default-mode query is BYTE-IDENTICAL to no-opts (totalHits must match)", async () => {
      const noOpt = unwrap(await invoke(handler, "master_index_query", { query: Q.cross, limit: 20 }));
      const defOpt = unwrap(await invoke(handler, "master_index_query", { query: Q.cross, limit: 20, stopwords: "default" }));
      // Different generatedAt + cacheHit, but the hit set must be identical
      // size since the same tokenization runs through the same scoring path.
      expect(defOpt.totalHits).toBe(noOpt.totalHits);
    });

    it("contract: stopwords='minimal' lets a PRISM-meta-only query reach the inverted index where 'default' degrades it to zero", async () => {
      // 'engine' + 'system' are BOTH in STOPWORDS_DEFAULT. A query of just
      // those two words tokenizes to [] in default mode (zero hits via
      // the empty-token warning path) but tokenizes to ['engine','system']
      // in minimal mode (real hits in the graph).
      const def = unwrap(await invoke(handler, "master_index_query", {
        query: "engine system", limit: 5, stopwords: "default",
      }));
      const min = unwrap(await invoke(handler, "master_index_query", {
        query: "engine system", limit: 5, stopwords: "minimal",
      }));
      expect(def.totalHits).toBe(0);
      expect(min.totalHits).toBeGreaterThan(0);
    });

    it("contract: stopwords='off' is at least as permissive as 'minimal'", async () => {
      const min = unwrap(await invoke(handler, "master_index_query", {
        query: "the engine system", limit: 5, stopwords: "minimal",
      }));
      const off = unwrap(await invoke(handler, "master_index_query", {
        query: "the engine system", limit: 5, stopwords: "off",
      }));
      expect(off.totalHits).toBeGreaterThanOrEqual(min.totalHits);
    });

    it("contract: a custom string[] suppresses exactly the named tokens (engine kept, dispatcher dropped)", async () => {
      // Custom set drops 'dispatcher' but NOT 'engine' → query degrades to
      // just ['engine'] which (a) is non-empty and (b) doesn't match the
      // graph nodes that contain 'dispatcher' as their dominant feature.
      const wide = unwrap(await invoke(handler, "master_index_query", {
        query: "engine dispatcher routing", limit: 5,
        stopwords: ["a", "the"], // English noise only — both engine + dispatcher reach the index
      }));
      const narrow = unwrap(await invoke(handler, "master_index_query", {
        query: "engine dispatcher routing", limit: 5,
        stopwords: ["a", "the", "dispatcher"], // explicitly suppress 'dispatcher'
      }));
      // Removing a high-frequency match term must not BROADEN the hit set.
      expect(narrow.totalHits).toBeLessThanOrEqual(wide.totalHits);
    });

    it("defensive: schema-valid edge inputs (empty string entries, mixed case) round-trip without throwing", async () => {
      // The schema (z.array(z.string())) rejects null/number entries BEFORE
      // they reach the engine — that's correct strict validation. This test
      // covers the engine's INTERNAL defensive layer (resolveStopwords)
      // which lowercases entries and drops empty strings. Pass schema-valid
      // strings — including empty and odd-case ones — and assert the
      // envelope is well-formed (engine never throws on weird input shapes).
      const data = unwrap(await invoke(handler, "master_index_query", {
        query: Q.cross, limit: 5,
        stopwords: ["", "TheCAPS", "  ", "ALSO_VALID"],
      }));
      expect(typeof data.totalHits).toBe("number");
      expect(data.totalHits).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // CAPABILITY MIN_UTILIZATION EXEMPTION (iter-3: U-MIQ-CAPABILITY-MIN-UTIL)
  // Capability hits (source: engine|action|skill|hook from
  // PRISMSelfAwarenessEngine) hard-code utilization=0 as a SENTINEL for "N/A"
  // — they have no edge-graph utilization. Pre-iter-3, the engine ran the
  // sentinel through the minUtilization filter (line 809), silently dropping
  // every capability hit when a caller asked for `min_utilization > 0`. That
  // was a R12 contract violation in the same class as iter-0's blend bug —
  // the user contract says "min_utilization filters by utilization", and
  // capability hits don't have utilization, so they should be EXEMPT from
  // the filter (not silently nuked by it). The fix scopes minUtilization to
  // graph-node hits only.
  // ==========================================================================

  describe("capability min_utilization exemption", () => {
    it("contract: a query that matches a real engine/skill capability still returns capability hits when min_utilization > 0", async () => {
      // Pre-iter-3 BUG: every capability hit was hard-coded utilization=0 and
      // then dropped by the minUtilization>0 check, so the result silently
      // contained ZERO capability hits — even when the query strongly matched
      // an engine or skill. Post-fix: capability hits bypass the filter.
      // Query uses non-stopword terms that match real PRISM capabilities.
      const filtered = unwrap(await invoke(handler, "master_index_query", {
        query: Q.knowledge, limit: 50, min_utilization: 0.1,
      }));
      const capabilityHits = hitsOf(filtered).filter((h) =>
        h.source === "engine" || h.source === "action" || h.source === "skill" || h.source === "hook",
      );
      // The fix's load-bearing invariant: at least ONE capability hit survives
      // a minUtilization>0 filter on a query that matches real capabilities.
      // A zero result here would mean the regression is back.
      expect(capabilityHits.length).toBeGreaterThan(0);
    });

    it("contract: graph_node hits still respect min_utilization (the fix didn't break the filter for the source it applies to)", async () => {
      // The minUtilization filter is a graph-node concept and MUST still
      // filter graph_node hits correctly. The fix only exempts capabilities.
      const filtered = unwrap(await invoke(handler, "master_index_query", {
        query: Q.dispatch, limit: 50, min_utilization: 0.3,
      }));
      for (const hit of hitsOf(filtered)) {
        if (hit.source === "graph_node") {
          expect(hit.utilization).toBeGreaterThanOrEqual(0.3);
        }
      }
    });

    it("contract: capability hits keep utilization=0 in the API response (the surfaced value didn't change, only the filter behavior)", async () => {
      // The fix is a FILTER-LEVEL change, not a schema change. Capability
      // hits still surface utilization=0 (the documented sentinel for "N/A");
      // a future caller relying on `hit.utilization === 0` as a "is this a
      // capability?" probe still works. The shape contract is preserved.
      const filtered = unwrap(await invoke(handler, "master_index_query", {
        query: Q.knowledge, limit: 50, min_utilization: 0.1,
      }));
      for (const hit of hitsOf(filtered)) {
        if (hit.source === "engine" || hit.source === "action" || hit.source === "skill" || hit.source === "hook") {
          expect(hit.utilization).toBe(0);
        }
      }
    });
  });

  // ==========================================================================
  // VARIABILITY FLOOR — exercise ≥3 spanning combinations
  // ==========================================================================

  describe("variability: queries spanning 3+ domains all return well-formed envelopes", () => {
    // Each query MUST use ≥1 non-stopword (engine drops engine/feature/system/
    // node/wiki/memory/prism on tokenization — see STOPWORDS at MasterIndexEngine.ts L98-104).
    const queries = [
      { q: "kienzle cutting force taylor", note: "physics-domain query" },
      { q: "obsidian vault knowledge dispatcher", note: "knowledge-domain query" },
      { q: "dispatcher action handler routing", note: "dev-domain query" },
    ];
    for (const { q, note } of queries) {
      it(`variability — ${note}: '${q}'`, async () => {
        const data = unwrap(await invoke(handler, "master_index_query", {
          query: q, limit: 5, sources: ["engine"], min_confidence: 0.05,
        }));
        expect(typeof data.totalHits).toBe("number");
        expect(data.totalHits).toBeGreaterThanOrEqual(0);
        for (const hit of hitsOf(data)) {
          expect(hit.source).toBe("engine");
          expect(hit.confidence).toBeGreaterThanOrEqual(0.05);
        }
      });
    }
  });
});
