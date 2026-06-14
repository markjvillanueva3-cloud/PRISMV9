---
name: jm-die-shop-page-e2e-verified-2026-05-24
description: "JM-Die shop page (JMDieShopPage.tsx) is end-to-end wired across backend→REST→frontend after slot:romeo iter6-iter20. 30/30 E2E verify-harness PASS, 18 tabs, 10 REST endpoints, 8 native panels (Dashboard/Programs/Posts/Search/Prices/Portal/Quote/ToolLife/ToolRecommend). Manifest reports training-readiness=partial honestly — that's R12 fail-loud, not a wiring failure."
aliases: reference_jm_die_shop_page_e2e_verified_2026_05_24
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.168Z
---


# JM-Die Shop Page · End-to-End Verified (slot:romeo, 2026-05-24)

The fourteen-iter (iter6→iter19) build closed the full backend→REST→frontend loop for the JM-Die landing page plus seven first-class operator surfaces (dashboard / programs / posts / search / prices / customer-portal / quote / tool-life). Run `node scripts/jm-die-verify-e2e.mjs` to re-confirm on any operator machine — **28/28 PASS** is the iter19 contract (12/12 was the iter11 baseline).

## What ships per iter (commits all on slot/romeo branch)

| Iter | Commit | Adds |
|------|--------|------|
| iter6 | (early) | `JmDieDashboardEngine` + `jm_die_dashboard` dispatcher action + 10/10 engine tests + 8/8 dispatcher tests |
| iter7 | (early) | `JmDieCorpusInventoryEngine` + 35/35 tests + `scripts/jm-die-corpus-compile.mjs` (walks JM_DIE_SOURCE_ROOTS + JM_DIE_MACHINE_PATHS) |
| iter8 | (early) | `jm_die_corpus_manifest` dispatcher action + 10/10 tests + `scripts/jm-die-dashboard-snapshot.mjs` |
| iter9 | `d68fffc8b0` | Codex-styled `JMDieShopPage.tsx` (WorkspaceHero/PanelCard/TabButton/SummaryTile/StatusPill/ActionButton) + `mcp-server/web/src/api/jmDie.ts` client + `JmDieRouteNotReady` graceful 404 path |
| iter10 | `6f6cb3ee28` | `mcp-server/src/routes/jm-die.ts` (POST /dashboard + /corpus-manifest) + registry mount in `routes/index.ts` + 12/12 jm-die-routes.test.ts PASS |
| iter11 | (this) | `scripts/jm-die-verify-e2e.mjs` — single-shot E2E verification harness (4 layer × 12 checks) |
| iter12 | (path/walker fix) | `mcp-server/src/data/jm-die-profile.ts` 4 root paths fixed + 4 new roots added; `scripts/jm-die-corpus-compile.mjs` collector expansion |
| iter13 | `U-JMDIE-P7` | `JmDiePostRegistryEngine` + dispatcher action + REST `/post-registry` + Posts tab (12 PRISM-enhanced .cps posts categorized by controller family with version lineage + machine matching). 29/29 PASS |
| iter14 | `U-JMDIE-P8` | `JmDieCorpusQueryEngine` + dispatcher + REST `/corpus-query` + Search tab (6 query types + 2 linkage views over every stratum). 26/26 PASS |
| iter15 | `U-JMDIE-P9` | `JmDieQuoteFromHistoryEngine` (4-signal similarity scoring) + Quote tab. 15/15 PASS |
| iter16 | `U-JMDIE-P10` | `JmDieMaterialPriceTrackerEngine` + JSONL ledger + 5 ops (query/latest/trends/alerts/summary) + REST `/material-prices` + Prices tab + `scripts/jm-die-material-prices-cli.mjs`. 19/19 PASS |
| iter17 | `U-JMDIE-P11` | `JmDieCustomerPortalEngine` (per-customer aggregator + federation-hook stubs as `not_implemented` literal) + GET `/document` path-safe deeplink + Customer Portal tab. 16/16 PASS |
| iter18 | `U-JMDIE-GAPS-UPDATE + U-JMDIE-P12+P13+P14` | Gap audit doc + 3 P0 closures: walker depth-2 customer-attribution fix (1→90 distinct customers), Posts tab fuzzy-match restore, Quote tab wired. E2E bumped 12→25 |
| iter19 | `U-JMDIE-P15` `45a50f19c3` | `JmDieToolLifeLedgerEngine` (5 event types: checkout/checkin/index_insert/change_insert/replace_tool) + 5 methods (query/metrics/roi/openPositions/topRoi) + REST `/tool-life` + Tool Life tab (#17) + `scripts/jm-die-tool-life-cli.mjs`. 21/21 engine PASS, 28/28 E2E PASS |
| iter20 | `U-JMDIE-P16` `e439531fad` | `JmDieToolRecommendBridgeEngine` — composite 6-signal scorer (priceToPerformance · machineCompatibility · materialCompatibility · surfaceQualityScore · costEfficiencyVsQuality · toolLifeROI) bridging existing PRISM physics engines + iter19 tool-life ledger. 3 ops (rank / forMachine / paretoFrontier). ISO-513 material compatibility matrix. R12-honest cold-start handling (3 fallback gaps, confidence degrades to 0.336 for fully-cold tools, never fabricates ROI). + REST `/tool-recommend` + Tool Recommend tab (#18) + ToolRecommendPanel with op selector + 6-field profile + per-signal breakdown + Pareto view. 29/29 engine PASS, 30/30 E2E PASS |

## Actual functional state

**Dashboard tab** — calls `jmDieApi.dashboard(FRONTEND_SNAPSHOT_INPUTS)`:
- frontend snapshot literal embedded in `JMDieShopPage.tsx`
- POST /api/v1/jm-die/dashboard → callTool("prism_business", "jm_die_dashboard", body)
- dispatcher case (businessDispatcher.ts:2407) → `jmDieDashboardEngine.aggregate()`
- response: `{ success, summary, payload, tabs }` (4 keys exact — pinned by test)
- 21 machines from JM_DIE_CONTROLLER_MAP, status=unknown until MTConnect bridge wired

**Programs tab** — calls `jmDieApi.corpusManifest(false)` (stripped envelope):
- POST /api/v1/jm-die/corpus-manifest → reads `state/shared/jm-die-corpus-manifest.json`
- after `node scripts/jm-die-corpus-compile.mjs`: 21,537 files / 3.3 GB / 118 customers / 15 machines indexed
- training-readiness reports **`quoting: insufficient` + `erp: insufficient`** honestly (0 prints walked — `PRINTS` root empty)

**Tool Life tab** (iter19) — calls `jmDieApi.toolLife({op:"metrics"|"roi"|"open-positions"})`:
- POST /api/v1/jm-die/tool-life → `jm_die_tool_life` dispatcher action
- reads append-only JSONL ledger `state/shared/jm-die-tool-life-ledger.jsonl` (gitignored — operator-local)
- 5 event types: `checkout` / `checkin` / `index_insert` / `change_insert` / `replace_tool`
- engine exposes 5 methods: `query` (filter by toolId/operator/machineId/eventType/sinceIso/untilIso), `metrics` (per-tool idx/chg/rep counts + units/edge + cycle-min/edge), `roi` (sort by $/unit ascending), `openPositions` (checkout without matching checkin/replace), `topRoi` (split into keep/drop buckets)
- demo seed: 1 checkout + 1 index_insert → 1 open position, 1 tool, $2.214/unit ROI on T-CNMG432-K10
- capture flow is CLI-only today (`scripts/jm-die-tool-life-cli.mjs`); at-machine touch UX is P16 follow-up

**9 deferred tabs** lazy-load existing PRISM pages inside PanelCard wrappers (all confirmed present, 10-94 KB each):
machines→`MachineLivePage`, jobs→`JobsPage`, customers→`CustomersPage`, inventory→`InventoryPage`, employees→`EmployeeDirectoryPage`, quotes→`BlueprintQuotePage`, academy→`CourseViewerPage`, kaizen→`KaizenBoardPage`, reports→`DashboardPage`.

## R12 honesty — "partial" is correct, not a bug

After iter12 walker fix the corpus compile script walks **10,696 files / 4.66 GiB** and now attributes **90 distinct customers**. Training-readiness reports `quoting: partial` and `erp: insufficient` honestly — partial = some training dimensions met, insufficient = others (e.g. prints, tooling-cost-per-edge history) still need seeding. The page surfaces this verbatim — no fake green light. The iter17 `JmDieCustomerPortalEngine` federation hooks are exposed as Zod literal `"not_implemented"` so the operator sees explicitly what is groundwork vs functional. iter19 `JmDieToolLifeLedgerEngine` returns empty arrays when ledger has no events — never fabricates a metrics row. This is the [[feedback_r5_thru_r12_doctrine]] R12 fail-loud principle paying off in production: refused-to-lie-about-readiness > "shipped a polished demo".

## Why state files stay untracked

`state/shared/jm-die-corpus-manifest.{json,md}` (5.1 MB) + `jm-die-dashboard-snapshot.json` (2.3 KB) are **operator-local artifacts** rebuilt per machine. They contain absolute H: paths and file inventories of the operator's archive — must not propagate to shared branches per [[feedback_no_public_h_drive]]. Two scripts produce them on demand:

```bash
node scripts/jm-die-corpus-compile.mjs       # ~30s, walks JM DIE/
node scripts/jm-die-dashboard-snapshot.mjs   # <1s, reads corpus + JM_DIE_CONTROLLER_MAP
```

## Verification — recall this when the page acts up

```bash
node scripts/jm-die-verify-e2e.mjs              # human-readable
node scripts/jm-die-verify-e2e.mjs --json       # machine-readable
```

12 checks across 4 layers: backend engines importable, state files parseable, REST routes mounted, frontend client + page + deferred-tab pages all present. Exit 0 = stack functional; exit 1 = any FAIL.

If a check FAILs, the note tells you exactly what to fix:
- `state.manifest-shape FAIL: ... missing` → run jm-die-corpus-compile.mjs
- `state.snapshot-shape FAIL: ... missing` → run jm-die-dashboard-snapshot.mjs
- `backend.*-built SKIP` → `npx esbuild --bundle=false --format=esm --platform=node --target=node22 --outdir=mcp-server/dist/engines mcp-server/src/engines/JmDieDashboardEngine.ts` (or corpus equivalent)
- `routes.*` FAIL → iter10 was reverted; re-check slot/romeo log
- `frontend.*` FAIL → iter9 was reverted; re-check slot/romeo log

## Related

- [[reference_h8_misattribution_romeo_psn_synergy_2026_05_23]] — why this work lives on slot/romeo
- [[feedback_frontend_codex]] — Codex Calculator Studio design-system rule the page follows
- [[feedback_ppg_frontend]] — sibling PPG-style frontend doctrine
- [[feedback_no_public_h_drive]] — why state files stay untracked
- [[feedback_r5_thru_r12_doctrine]] — R12 fail-loud (insufficient readiness)
