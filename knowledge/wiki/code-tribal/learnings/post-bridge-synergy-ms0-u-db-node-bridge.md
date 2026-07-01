# POST-BRIDGE-SYNERGY-MS0/U-DB-NODE-BRIDGE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-DB-NODE-BRIDGE (slot:echo /loop iter37 /yolo): unified node-bridge contract — single entry-point for 23 scattered DB reads.

**Commit:** `0c7fd44bb0ae` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T02:40:25-05:00
**Tags:** post-bridge-synergy-ms0, u-db-node-bridge, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-DB-NODE-BRIDGE (slot:echo /loop iter37 /yolo): unified node-bridge contract — single entry-point for 23 scattered DB reads.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-DB-NODE-BRIDGE (slot:echo /loop iter37 /yolo): unified node-bridge contract — single entry-point for 23 scattered DB reads.

Audit-named scope: 23 different DB-read code paths scattered across the
codebase (each consumer — CAM, post, quoting, calculator, shop floor —
reaches directly into its preferred catalog: tool DB, material DB,
machine DB, holder DB, controller DB, fixture DB, ...). That produces:
  (a) inconsistent result shapes per consumer,
  (b) duplicated cache/error/timeout logic 23 times,
  (c) provenance drift (no audit trail of which DB returned what),
  (d) silent staleness when one source updates and others don't sync.

This iter ships scripts/lib/db-node-bridge.mjs — the unifying contract:

  KNOWN_DB_SOURCES (23-entry whitelist):
    tool_catalog · tool_inventory · holder_catalog · holder_inventory ·
    material_catalog · material_substitution · machine_capability ·
    machine_profile · controller_profile · controller_dialect ·
    post_processor · post_dialect · fixture_catalog ·
    workholding_catalog · coolant_catalog · coating_catalog ·
    insert_catalog · sample_program · tribal_tip · manual_extract ·
    kienzle_lookup · taylor_lookup · speed_feed_table

  REQUIRED_RESOLVER_METHODS = ['resolve', 'describe'] — fail-loud at
  registerSource() if an impl is missing either method (NOT mid-query)

  ALLOWED_QUERY_KINDS = ['lookup', 'search', 'list', 'describe']

  createNodeBridge() → immutable bridge instance
  registerSource(bridge, sourceId, resolver):
    • refuses sourceId not in KNOWN_DB_SOURCES (no silent shadow-DB)
    • refuses resolver that fails validateContract (no boot-time mystery)
    • initializes hitTally[sourceId]=0 atomically with registration
    • returns null on failure (caller MUST check), bridge on success
  routeQuery(bridge, {sourceId, kind, ...}) → {ok, sourceId, result, error}
    • try/catch around resolver.resolve() so a thrown resolver doesn't
      crash the bridge — surfaces as ok=false + 'resolver threw: <msg>'
  recordHit() / tallyHits() — per-source telemetry, sorted desc
  mergeResults(bundles[]) — multi-source merge with per-row _provenance
    {sourceId, retrievedAtIso} so downstream can trace WHERE each row
    came from (closes the audit-trail drift gap)
  summarizeBridge() — coveragePct = registered/23 for dashboard
    visibility into how many of the 23 sources are bridge-wired

The bridge does NOT itself fetch data — it routes to a registered
resolver function. This keeps the bridge pure-fn while letting the
consumer wire in real I/O at the edge.

14 exports. 51 concrete-value tests covering: 8 constant invariants
(23-entry KNOWN_DB_SOURCES, kienzle/taylor/material/tool inclusion,
4-entry ALLOWED_QUERY_KINDS), 5 createNodeBridge cases, 5
validateContract fault cases (missing describe, missing resolve, null,
non-function), 6 registerSource cases (immutability, unknown source
refused, invalid resolver refused, 3-source incremental), 8 routeQuery
cases (happy path, unknown sourceId, unknown kind, unregistered source,
resolver throws → caught, null query, null bridge), 3 recordHit cases,
6 mergeResults cases (provenance attached, failed bundle skipped, null,
retrievedAtIso preserved), 2 tallyHits cases (sorted desc, empty), 6
summarizeBridge cases (coveragePct math = 3/23, totalHits aggregation,
topSources cap=5).

Next: U-WIZARD-NODE-BRIDGE (iter38, mill/lathe/wire wizard contract),
U-SFC-NODE-BRIDGE (iter39, kills 5+ duplicate SF paths), U-POST-GEN-BRIDGE
(iter40, postgen ↔ bridge unification).
```

## Files touched (3)
- scripts/lib/db-node-bridge.mjs      | 210 +++++++++++++++++++++++
- scripts/lib/db-node-bridge.test.mjs | 320 ++++++++++++++++++++++++++++++++++++
- 2 files changed, 530 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0c7fd44bb0ae`
- Milestone envelope: `mcp-server/data/milestones/POST-BRIDGE-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._