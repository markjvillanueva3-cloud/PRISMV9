---
name: reference-lathe-vendor-graph-node-design-2026-05-27
description: Design notes for U-LATHE-VENDOR-GRAPH-NODE — surface 14-vendor lathe corpus as `ghost.lathe_vendors` roost in /system-viz with operator-clickable drill-down to per-vendor grade tables, application notes, and corpus references.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:09.192Z
aliases: reference_lathe_vendor_graph_node_design_2026_05_27
---


# Lathe-vendor /system-viz roost design

## Why this exists

`/system-viz` is PRISM's canonical visual map. Today the 14-vendor lathe corpus is reachable only via direct JSON file read or tribal-query dispatcher (iter111 design). A `ghost.lathe_vendors` roost makes the corpus operator-discoverable + clickable + cross-linkable to JM-Die programs.

## Node structure

```
ghost.lathe_vendors (root)
  ├── tier_a/  (14 vendors — indexed with grade tables)
  │   ├── kennametal       (87 grades, ISO-P/M/K/N/S coverage)
  │   ├── sandvik          (full coverage)
  │   ├── seco-tools       (broad coverage)
  │   ├── iscar            (operator-named priority)
  │   ├── widia            (operator-named)
  │   ├── mitsubishi
  │   ├── sumitomo         (CBN specialist per iter115)
  │   ├── tungaloy
  │   ├── kyocera
  │   ├── ingersoll        (operator-named)
  │   ├── walter           (Tiger-tec)
  │   ├── ceratizit
  │   ├── greenleaf        (high-temp specialist)
  │   └── pramet
  │
  ├── tier_b/  (11 vendors — known but thin coverage)
  │   ├── dapra            (operator-named priority for next harvest)
  │   ├── pts-tools        (operator-named)
  │   └── ...
  │
  ├── operator_named_priority/
  │   └── (cross-links: Dapra, Sandvik, PTS-Tools, Widia, Ingersoll, Iscar)
  │
  └── corpus_evidence/  (links to video/PDF extracts that reference each vendor)
      ├── iter84-carbide-deep-dive (mentions: Sandvik, Kennametal, ISCAR, Walter)
      ├── iter57-parting-comparison (mentions: Kennametal, Sumitomo, generic-import)
      └── ...
```

## Per-node payload

```json
{
  "node_id": "ghost.lathe_vendors.tier_a.kennametal",
  "type": "vendor",
  "vendor_name": "Kennametal",
  "tier": "A",
  "grade_count": 87,
  "iso_groups_covered": ["P", "M", "K", "N", "S"],
  "coatings_offered": ["PVD-TiAlN", "CVD-Al2O3-Ti(C,N)", "PVD-AlCrN", "uncoated"],
  "operator_named_priority": false,
  "corpus_references": [
    { "iter": 57, "video_id": "8ysxbKjsWuQ", "context": "parting comparison vs eBay" },
    { "iter": 84, "video_id": "JDpBf6DySUE", "context": "comprehensive carbide tutorial" }
  ],
  "wizard_query_count": 12,
  "jm_die_program_count": 0,  // populated after AB-locator runs
  "wiki_links": ["[[kennametal-overview]]"],
  "drill_down_url": "/system-viz/node/ghost.lathe_vendors.tier_a.kennametal"
}
```

## Drill-down (operator-clickable)

Clicking a vendor node opens a detail panel showing:
1. **Grade table** — full 87-grade list with sortable columns (ISO group, ANSI geom, coating, SFM range)
2. **Application notes** — copy-pasted from `lathe-tribal-master-index-2026-05-26.json` body field
3. **Corpus references** — links to wiki video-extract entries that mention this vendor
4. **JM-Die job overlap** — after AB-version locator runs (iter109), which customers use this vendor
5. **Substitution map** — which other vendor grades are equivalent (for inventory flexibility)

## Wiring

- Add `ghost.lathe_vendors` to the /system-viz graph schema
- Source data from `mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json`
- Regenerate via `node scripts/regen-system-viz.mjs` (existing pipeline)
- Hermetic test: 14 nodes exist, each has full payload, drill-down URLs resolve

## Why P2 not P0

Operator can already query the corpus via:
- Direct JSON read (slow but functional)
- Tribal-query dispatcher (iter111) when built (P0)
- Lathe-wizard internal lookup (iter110) when built (P0)

The /system-viz roost is a UX enhancement — discovery + visual cross-linking — not a blocker to wizard correctness. Hence P2.

## Estimated scope

- Graph schema additions: ~50 LOC
- Payload generator: ~150 LOC
- Drill-down UI integration: ~100 LOC (depends on /system-viz existing component patterns)
- Tests: ~120 LOC / 14 cases (one per vendor node + 4 schema validation)
- Total: ~420 LOC, ~3 hours

## Related

- [[reference_shop_tool_library_bridge_design_2026_05_27]] — corpus_evidence cross-link source
- [[reference_lathe_wizard_vendor_lookup_design_2026_05_27]] — wizard_query_count tracker
- [[reference_lathe_ab_version_locator_design_2026_05_27]] — provides jm_die_program_count
- [[reference_lathe_h_class_cbn_expansion_design_2026_05_27]] — adds 12 H-grade nodes to Sumitomo + Mitsubishi + Sandvik sub-trees
- [[reference_whiskey_lathe_corpus_state_2026_05_27_iter101]] — corpus from iter40-iter114
- `mcp-server/data/ingestion_cache/lathe-vendor-expansion-2026-05-26.json` — tier-A/tier-B breadth source
- `mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json` — per-vendor grade data source
