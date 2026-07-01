---
name: reference-lathe-tribal-query-dispatcher-design-2026-05-27
description: Design notes for U-LATHE-TRIBAL-QUERY-DISPATCHER — expose lathe tribal corpus via prism_lathe:query_vendor_tribal MCP action. Makes the 432-video corpus + 14-vendor index AI-queryable by Claude + other AI systems.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.641Z
aliases: reference_lathe_tribal_query_dispatcher_design_2026_05_27
---


# Tribal-query MCP dispatcher design

## Why this exists

Operator directive (paraphrased from session): *"make sure tribal knowledge is easily accessible by AI systems and Claude for when we finally start testing the system in full."*

Today the corpus lives as JSON files. Claude can `Read` them but at 100K+ chars they overflow context. Other AI systems (Codex, Ollama, NN/GNN tier-5) have no canonical access path. A dispatcher action that takes a structured query + returns the top-K relevant entries is the bridge.

## Dispatcher signature

```ts
// prism_lathe:query_vendor_tribal action
{
  action: "query_vendor_tribal",
  query: {
    iso_group?: "P" | "M" | "K" | "N" | "S" | "H",
    operation?: "facing" | "roughing" | "finishing" | "grooving" | "threading" | "parting" | "boring" | "drilling",
    material?: string,
    insert_geometry?: "C" | "W" | "D" | "S" | "T" | "V" | "R" | "K",
    coating?: "PVD-TiAlN" | "CVD-Al2O3" | "uncoated" | "CBN",
    vendor?: string,
    controller?: "fanuc" | "haas" | "okuma" | "mazak" | "doosan",
    topic?: string,                  // free-text search over body
    top_k?: number                   // default 5
  },
  include_sources?: boolean          // include source video_id / pdf_path
}
```

## Response shape

```ts
{
  hits: [
    {
      kind: "vendor_grade" | "tribal_tip" | "video_segment" | "pdf_page",
      content: string,               // the relevant snippet
      tags: string[],                // iso_group, operation, controller, etc.
      source: { video_id?, pdf_path?, page?, segment? },
      relevance_score: number,        // 0..1
      vendor_grade_payload?: {       // if kind === vendor_grade
        ansi: string, geometry: string, vendor: string,
        suggested_vc_sfm: [number, number], suggested_fz_ipr: [number, number],
        life_minutes_at_target_vc: number, iso_group_fit: string[]
      }
    }
  ],
  total_corpus_size: number,
  query_latency_ms: number,
  confidence: number                  // overall, averaged top-K
}
```

## Index layer (already partly built)

This dispatcher draws from 4 corpus sources:
1. **lathe-tribal-master-index-2026-05-26.json** — 14 vendors / 87+ grades (vendor_grade hits)
2. **lathe-videos-tribal-2026-05-26.json** — 432 video records (video_segment hits)
3. **PDF page-by-page extracts** (8752 page records from lima's pypdf pipeline)
4. **Wiki entries** (`knowledge/wiki/lessons/video-extract-*.md` and `pdf-extract-*.md`)

Query routing:
- Strict-constraint queries (iso_group + operation + geometry) → master-index first
- Free-text/topic queries → keyword + semantic search across all 4 sources
- Vendor-or-grade-specific queries → master-index direct lookup

## Search implementation tiers

### Tier 1: Exact-match index lookup (sub-millisecond)
For queries with hard constraints, use the pre-built indexes in master-index JSON:
- `indexes.grades_by_iso_p[]` etc.
- `indexes.grades_by_coating_cvd[]` etc.
- `wizard_query_records[]` direct shape match

### Tier 2: Keyword scan (10-100ms)
For free-text + topic queries:
- Tokenize query → score each corpus entry by Jaccard over topic tokens
- Filter by tag constraints
- Return top-K

### Tier 3: Semantic (later — depends on NN/GNN being functional)
- Embed query + corpus entries (Ollama mxbai-embed-large)
- Cosine similarity ranking
- Currently NN/GNN UNGRADED per PSN-LEG-STATE — wait for U-[[reference_nn_predictor_embed_wire_2026_05_23|NN-PREDICTOR-EMBED-WIRE]] fix before exposing

## Tests + R12

- Hermetic synthetic corpus (15 vendor grades + 8 video records + 6 PDF pages)
- Test every query path: ISO-only, operation-only, vendor-only, free-text, combined
- Verify response shape contract (no missing fields, scores in [0,1])
- R12 fail-loud when corpus empty or query returns zero hits → never silent

## Wiring sequence

1. Create `LatheTribalQueryEngine.ts` (pure)
2. Implement Tier 1 + Tier 2 (skip Tier 3 until NN gate clears)
3. Wire `prism_lathe` dispatcher action `query_vendor_tribal`
4. Tests in `src/__tests__/LatheTribalQueryEngine.test.ts`
5. Update dispatcher schema + action enum
6. Add to `DISPATCHER_DIGEST.md`
7. Smoke test: dispatcher round-trip via MCP

## Estimated scope

- Engine: ~200 LOC
- Dispatcher wiring: ~50 LOC
- Tests: ~300 LOC / 35 cases
- Total: ~550 LOC, ~4 hours including tests

This sits in dependency tree:
```
shop-tool-library-bridge (iter108)
    ↓
wizard-vendor-lookup (iter110) ← tribal-query-dispatcher (iter111) → external AI
                                  ↑
                          AB-version locator (iter109)
```

## Related

- [[reference_shop_tool_library_bridge_design_2026_05_27]] — co-source (Layer 2 data)
- [[reference_lathe_wizard_vendor_lookup_design_2026_05_27]] — internal consumer
- [[reference_lathe_ab_version_locator_design_2026_05_27]] — produces additional corpus
- [[reference_whiskey_lathe_corpus_state_2026_05_27_iter101]] — corpus snapshot to query against
- [[reference_psn_definition]] — leg #5 (Tribal) — this dispatcher IS the tribal-leg query surface
- `mcp-server/src/tools/dispatchers/prism_lathe.ts` — wiring target
