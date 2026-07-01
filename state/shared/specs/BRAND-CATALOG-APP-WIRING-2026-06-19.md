# Brand-tool-catalog -> app wiring (cross-domain coordination spec)

> Author: slot romeo (claude-b27b087a), 2026-06-19. Romeo delivered the upstream artifact
> (72K-tool brand catalog + index); this spec routes the remaining CONSUMPTION wiring to the
> owning slots per the operator's "coordinate with the rest of the fleet" directive.

## What romeo shipped (DONE, committed on cad-fusion-live-ms0)
- `state/shared/tool-libraries/brand-tool-catalog-index.json` -- **TRACKED** app-bridge index:
  `totals` + `byCategory` matrix + per-brand counts + file pointers for all 7 emit lanes.
- 7 emit lanes (Fusion/hyperMILL/Mastercam TOOLS + Mastercam/hyperMILL INSERTS + HOLDERS),
  72,406 unique tools / 26 brands. Emitter/harness/placement/cron + 93 tests. See
  `scripts/emit-brand-tool-libraries.mjs`, `scripts/build-brand-tool-catalog-index.mjs`,
  memory `reference_brand_cam_tool_libraries_2026_06_19`.
- **Caveat for consumers:** the 72K tool ROWS live in **gitignored** generated lane files
  (`state/shared/tool-libraries/<format>/PRISM_*.{tools,hmt.sql,csv}`); only the index SUMMARY
  json + MANIFEST are tracked. A consumer needing the rows must either run the cron
  (`node scripts/cam-tool-library-cron.mjs`) to regenerate them or ingest them into a tracked store.

## The gap (verified)
The web app's tool-catalog UI ("Search tool catalog (75K+ tools)") fetches via
`mcp-server/web/src/api/calculatorData.ts` -> `fetchAllLiveToolRows()` -> `POST /tool/search`
(paginated `{query:'*',limit,offset}`, expects `{result:{... ,total,hasMore}}`).
That route (`mcp-server/src/routes/data.ts:57`) serves **`toolRegistry`**
(`mcp-server/src/registries/ToolRegistry.js`, loaded from `PATHS.TOOLS_DB` + `DATA_DIR/tools`),
**NOT** the 72K brand catalog. No engine currently reads `brand-tool-catalog-index.json`.

## Prior art / duplication surfaces (CHECK before building -- do NOT duplicate)
- `CAMToolLibraryEngine.ts::searchTools()` -- but queries a STATIC sample set, not a live corpus;
  wired to `camDispatcher`.
- `cam_fusion_tool_library_*` dispatcher actions (get_sources / harvest / parse_csv /
  find_by_description / filter_by_category) -- Fusion-specific harvest/query surface already built.
- `TOOL-CATALOG-INGEST-MS0` (slot juliett, 2026-05-24) -- prior tool-catalog ingest into ToolRegistry
  (`mcp-server/data/tool-catalog-inventory.json` = 45-catalog meta inventory).
- Graph nodes: `tool-catalog-search`, `tool-unified-search`, `erp-tool-search`, `CATALOG-APP-WIRING-MS0`.

## Task breakdown by owner (coordinate via chat-bus)
1. **juliett (database-expansion)** -- DECIDE + ingest: either (a) ingest the brand catalog rows into
   `toolRegistry`'s tracked data dir (schema-mapped to the registry's tool record), or (b) stand up a
   separate tracked queryable store for the 72K vendor corpus. Reconcile with TOOL-CATALOG-INGEST-MS0
   so this is an EXTENSION, not a parallel store. Resolve the gitignored-rows durability (a tracked
   ingest removes the runtime-regenerate dependency).
2. **CAM-owner (kilo) / dispatcher-owner** -- expose the ingested corpus via a dispatcher action
   (extend the existing `cam_fusion_tool_library_*` surface or add `*_brand_catalog_search`), with a
   round-trip test. Avoid duplicating `CAMToolLibraryEngine.searchTools`.
3. **quebec (frontend)** -- once a real backend source serves the corpus, point `fetchAllLiveToolRows`
   / the `/tool/search` body at it (or add a `source:'brand-catalog'` param mirroring the
   `/machine/search` `calculatorCatalog` flag pattern). Frontend-only; do not edit web/ from romeo.

## Romeo's stance (R7/R8/duplication-guard)
Romeo is the wiring specialist and does not own engine-creation, DB ingestion, or frontend. The
upstream artifact (catalog + index + cron) is delivered + scrutinized; the consumption wiring is
multi-owner and partially pre-built, so romeo routes rather than unilaterally builds (avoids
duplication + cross-domain overreach). Pick-up owners above.
