# BLUEPRINT-VISION-OCR/U-XRAY-CAD-REGISTRY-IMPL — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-CAD-REGISTRY-IMPL (slot:xray): implement 4 dark cad_registry_* actions (scan/get/search/stats)

**Commit:** `af53d5ce23db` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T11:34:01-05:00
**Tags:** blueprint-vision-ocr, u-xray-cad-registry-impl, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-CAD-REGISTRY-IMPL (slot:xray): implement 4 dark cad_registry_* actions (scan/get/search/stats)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-CAD-REGISTRY-IMPL (slot:xray): implement 4 dark cad_registry_* actions (scan/get/search/stats)

The prism_cad cad_registry_scan/search/get/stats actions (cadDispatcher.ts:2207-2243)
called scan/get/search/stats on the universalCADIndexEngine singleton -- but those
methods were NEVER implemented (a dark capability that threw "is not a function" at
runtime, tsc-blind because getEngine() returns any). Surfaced by bravo's static
detector `node scripts/audit-dispatcher-engine-methods.mjs` (cadDispatcher MISSING 5->1,
fleet 53->49 after this fix; see reference_dispatcher_method_drift_fleet_audit_2026_06_24).

Implemented the 4 methods on UniversalCADIndexEngine (a facade over CADFileIndexerEngine).
No dispatcher change -- the dispatcher already calls them with these exact signatures:
- scan(rootPaths, options): async positional alias over index() (rootPaths applied only
  when non-empty; defaults to UNIVERSAL_ROOT_PATHS).
- get(absolutePath): loads the persisted MasterIndex, exact-matches the absolutePath key
  (case/separator-sensitive, documented), returns the CADFileEntry or null.
- search({query, format, customer, limit}): loads + filters (query=path substring ci,
  format=exact, customer=exact ci, AND-combined); `total` = full match count, `results`
  = sliced to limit (default 50, Math.max(0,limit) guard for <=0).
- stats(): loads + summarizes (totalFiles, byFormat, byCustomer, byMachineCategory,
  coveragePct).
All three query methods FAIL SOFT when no index is persisted (get->null,
search->{results:[],total:0}, stats->zeros) -- no throw. Additive only: index/
computeCoverage/load/hasUniversalCoverage and the other consumers (cadAutomationDispatcher,
ProgramEquivalentIndexEngine) are untouched.

15 real tests (constructor-injected stub indexer; hit/miss/empty/no-index get, all 5
search filters incl. the limit:0/-1 guard lock + AND semantics, stats summary + fail-soft,
scan delegation). tsc-clean on changed files. Per-file 2-arm scrutiny PASS (code-analyzer
+ reviewer, 0 P0/P1).

P2 follow-up (PRE-EXISTING, not this diff, logged for an owner): cadActionSchemas.ts:553
cadRegistryScanSchema advertises an `options.formats` field the indexer never reads (it
uses extensions/maxDepth/batchSize) -- a silent no-op to align or document separately.
```

## Files touched (3)
- mcp-server/src/__tests__/UniversalCADIndexEngine.registry.test.ts | 122 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/UniversalCADIndexEngine.ts                 |  90 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 212 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show af53d5ce23db`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._