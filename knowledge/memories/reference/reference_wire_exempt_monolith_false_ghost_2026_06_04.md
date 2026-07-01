---
name: reference_wire_exempt_monolith_false_ghost_2026_06_04
description: WIRE-EXEMPT tags on 2 Monolith DB engines + systemic ghost.unwired false-positive finding (aggregator-wrapper reachability)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.266Z
aliases: reference_wire_exempt_monolith_false_ghost_2026_06_04
---


**[WIRING]/U-WIRE-EXEMPT-MONOLITH (slot:romeo, 2026-06-04).** Tagged `MonolithSurfaceFinishDatabaseEngine` + `MonolithToolTypesDatabaseEngine` `// WIRE-EXEMPT` — both carried `ghost.unwired` labels but are reachable via the WIRED `intelligenceDispatcher:catalog_unified_match` → `CatalogUnifiedQueryEngine.query()` aggregator, which calls `.search()` on each (sub-queries #8/#9, MONOLITH-WIRE / MONOLITH-WIRE-V2, `CatalogUnifiedQueryEngine.ts:279/294`).

**SYSTEMIC FINDING (the real value — for slot:sierra):** the system-viz `ghost.unwired` classifier follows only DIRECT dispatcher→engine edges; it MISSES indirect reachability through **aggregator wrappers**. Result: the awareness-snapshot "110 unwired engines" punch list is polluted with false positives. In the DB-gen domain alone, **5 false `ghost.unwired` labels** found across 2 romeo sessions: `MaterialHarvesterEngine`, `CAMCatalogPhysicsLinkerEngine` (last session — directly wired elsewhere), `MonolithSurfaceFinishDatabaseEngine`, `MonolithToolTypesDatabaseEngine` (this session — aggregator-reachable). Fix sierra should ship: make the classifier follow engine→engine calls into wired aggregators (CatalogUnifiedQueryEngine, and juliett's `monolith_query` which routes 12 OTHER Monolith engines by `subject` enum — controllers/machine_specs/stock_positions/roughing_configs/macro_schema/fusion_posts/mfr_catalog/gateway/zeni/consolidated/final/major_mfrs; NOTE surface_finish + tool_types are NOT in that enum — they go via catalog_unified_match instead).

**ERPImportEngine — flagged for slot:hotel (NOT wired by romeo).** Genuinely unwired, but `importWorkOrder()` OVERLAPS the existing `erp_import_wo` action (live in intelligenceDispatcher + integrationDispatcher, backed by a different engine). Wiring it = a confusing duplicate work-order-import surface (R7). It is business/ERP galaxy (hotel's domain) with real connect/config/sync plumbing. Its only UNIQUE capability is `transformFromERP`/`getFieldMappings` (7-system raw-ERP→PRISM field-name adapter: SAP AUFNR/Oracle WIP_ENTITY_NAME/JobBOSS Job/E2 JobNo/Epicor JobNum/Infor ORDER_NO). That adapter is a real gap but a hotel feature-design call, not a romeo orphan-closure.

**OPPORTUNITY handed to oscar/kilo:** the Monolith engines' richer pure surfaces are unexposed by `catalog_unified_match` (which only calls `.search()`): SurfaceFinish `parseCallout`/`findGrade`/`getRecommendedProcess` (drawing-callout → ISO N-grade — feeds blueprint→SFC) for oscar; ToolTypes type-taxonomy lookups for kilo CAM tool-select. Exposing those = consuming-galaxy feature decision, not a romeo wire.

**H8 ABSORPTION (regression-class, fail-loud):** my standalone `[WIRING]/U-WIRE-EXEMPT-MONOLITH` commit NEVER landed as its own commit. On the shared `cad-fusion-live-ms0` tree, the slot-commit-enforce hook blocked my first attempt (no `[BOOTSTRAP-SLOT-ENFORCE]` prefix) which UNSTAGED my files; restaging into the shared `.git/index` let slot:xray's concurrent commit `c8bb8a3a25` SWEEP my working-tree edits in. The WIRE-EXEMPT tags ARE live in HEAD (work preserved) — but attributed to xray's BLACKWELL-OCR commit, not romeo. **Lesson:** on the shared tree, include `[BOOTSTRAP-SLOT-ENFORCE]` on the FIRST commit attempt (so it is never blocked+unstaged), OR migrate to the slot worktree (`H:/prism-slot-romeo`). The block→unstage→restage dance is what feeds the absorption. See [[feedback_commit_prefix_main_on_shared_tree]] · [[reference_wire_shop_outcome_ingest_2026_06_04]].

**Romeo rigor paid off twice this session:** R8 read-before-write + verifying reachability (reading actual call sites, not trusting labels) prevented 3 duplicate/cross-domain wires. The "fabricated-unwired" / false-ghost class is REAL and recurring — every romeo pickup must independently verify the orphan label before wiring.
