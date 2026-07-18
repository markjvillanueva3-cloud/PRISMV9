# KILO-P2P-RECONCILE-MS0 / U-KP2P-04 — PIPE-MS0 Close-Out Reconcile

> **ADVISORY — `mustHumanVerify: true`.** This report reconciles roadmap-envelope
> `status` fields against on-disk reality. File presence + a dispatcher reference
> + a test file is *evidence of build*, NOT proof of spec-correctness. Every
> status flip below is listed for operator review.
>
> **Unit:** KILO-P2P-RECONCILE-MS0 / U-KP2P-04 · **Slot:** kilo · **Date:** 2026-05-22
> **Method:** per PIPE-MS0 unit, resolve the named engine on disk → grep
> `src/tools/dispatchers/` for a reference → grep `src/__tests__/` for a test
> file. Flip `not_started → complete` ONLY where all three hold (spec step 3).

## PIPE-MS0 — per-unit verdict (12 units)

| Unit | Named artifact | On disk | Dispatcher refs | Test files | Verdict |
|------|----------------|---------|-----------------|-----------|---------|
| P0-U01 | `PrintToGeometryEngine.ts` | ✅ | 1 | 2 | **FLIP → complete** |
| P0-U02 | `InventoryAwareToolSelectorEngine.ts` | ✅ | 3 | 3 | **FLIP → complete** |
| P0-U03 | `ROIAdvisorEngine.ts` | ✅ | 1 | 2 | **FLIP → complete** |
| P1-U01 | `PrintToProgramPipelineEngine.ts` | ✅ (143.7K) | 1 (camDispatcher) | 20 | **FLIP → complete** |
| P1-U02 | `PhotoToBlueprintEngine.ts` | ❌ | 0 | 0 | leave `not_started` — engine not built |
| P1-U03 | `CADFileImportEngine.ts` | ❌ | 0 | 0 | leave `not_started` — named engine not built (see Note 1) |
| P2-U01 | `PipelinePage.tsx` (web) | ⚠️ exists in `web/src/` | n/a | n/a | leave `not_started` — see Note 2 |
| P2-U02 | `src/routes/pipeline.ts` | ⚠️ exists | n/a | n/a | leave `not_started` — see Note 2 |
| P2-U03 | `UserMachineRegistryEngine.ts` | ❌ | 0 | 0 | leave `not_started` — engine not built |
| P3-U01 | `PartTemplateCatalogEngine.ts` | ❌ | 0 | 0 | leave `not_started` — named engine not built (see Note 3) |
| P3-U02 | pipeline-history (`state/pipeline-history/`) | ❌ dir absent | 0 | 0 | leave `not_started` |
| P3-U03 | `pipeline-integration.test.ts` | ⚠️ a match exists | n/a | n/a | leave `not_started` — see Note 2 |

## Status flips applied (4) — 4-surface close-out

Per spec step 3, only units whose engine **exists on disk AND is dispatcher-wired
AND has ≥1 test file** are flipped. Each flip cites its evidence:

| Unit | Evidence cited |
|------|----------------|
| P0-U01 | `mcp-server/src/engines/PrintToGeometryEngine.ts` on disk · 1 dispatcher reference (spec-intended `cadDispatcher:print_to_geometry`) · 2 test files |
| P0-U02 | `mcp-server/src/engines/InventoryAwareToolSelectorEngine.ts` on disk · 3 dispatcher references (spec-intended `camDispatcher:inventory_tool_select`) · 3 test files |
| P0-U03 | `mcp-server/src/engines/ROIAdvisorEngine.ts` on disk · 1 dispatcher reference (spec-intended `businessDispatcher:roi_advisor`) · 2 test files |
| P1-U01 | `mcp-server/src/engines/PrintToProgramPipelineEngine.ts` on disk (143.7K) · wired in `camDispatcher` (`print_to_program_full/_enhanced/_plan/_validate` — independently confirmed by U-KP2P-02's P2P-WIRING-MATRIX) · 20 test files. This is the "silent close-out debt" the KILO-P2P-RECONCILE-MS0 brief explicitly names. |

PIPE-MS0 milestone: `completed_units 0 → 4`, `status not_started → in_progress` (4/12 — an honest **partial** reconcile; 8 units remain genuine pending work).

## Notes

**Note 1 — P1-U03 `CADFileImportEngine`.** The *named* engine does not exist on
disk, so per abort_criteria #1 the unit stays `not_started`. A *related*
capability is partially present — `IGESImportEngine` is wired in `camDispatcher`
(`iges_parse`, `iges_extract_geometry`, `iges_summary`) — but it is not the
multi-format (DXF/STEP/IGES) `CADFileImportEngine` the spec describes. Genuine
remaining work; do not flip.

**Note 2 — P2-U01 / P2-U02 / P3-U03 (non-engine units).** Spec step 3's flip
rule is engine-keyed (engine + wired + tested). For a web page, an Express
route, and an integration-test file, "the file exists" is not equivalent to
"complete per the spec's detailed acceptance criteria" (P2-U01 alone lists a
7-step wizard with 12 sub-criteria). Verifying spec-completeness needs deep
inspection / running the suite. Conservatively left `not_started` — flagged for
operator human-verify, NOT flipped on mere file presence.

**Note 3 — P3-U01 `PartTemplateCatalogEngine`.** Named engine absent on disk;
`camDispatcher` may carry `template_*` actions via a differently-named engine.
Per abort_criteria #1 (named engine must exist) → stays `not_started`.

**Note 4 — DOMAIN-PIPELINE-MS0 print2prog placeholders.** Spec step 4 asked to
redirect DOMAIN-PIPELINE-MS0 spec-less placeholders *that KILO-P2P-RECONCILE-MS0
supersedes*. DOMAIN-PIPELINE-MS0 has exactly **1** print2prog unit —
`U-DPM0-PRINT2PROG-ORCHESTRATE_FULL` (the adaptive orchestrator, `slot:kilo`,
`spec:"pending-generator"`). KILO-P2P-RECONCILE-MS0 builds **no** orchestrator
engine (its 4 units are a dispatcher rewire, a wiring audit, a picker fix, and
this reconcile). It therefore does **not** supersede that unit — it remains
genuine highest-leverage pending work. Adding a "superseded by
KILO-P2P-RECONCILE-MS0" pointer would be false (R12). **No DOMAIN-PIPELINE-MS0
mutation applied.**

## 4-surface close-out checklist

- [x] **Envelope** — `PIPE-MS0.json`: 4 unit flips + `completed_units` + `status`.
- [x] **roadmap-index** — synced if a `PIPE-MS0` entry exists (see commit).
- [x] **MILESTONE_PROGRESS** — regenerated via `scripts/build-milestone-progress.mjs`.
- [x] **BUILD_STATE** — regenerated via `scripts/build-state-snapshot.mjs`.
- [x] **chat-bus** — reconcile posted to the fleet bus.

## Operator action

Human-verify the 4 flips above (esp. that each engine's tests genuinely pass and
the wiring is functional, not just file-present). For the 8 `not_started` units,
P1-U01's siblings P0-U01/02/03 being built suggests PIPE-MS0 was partially built
in an untracked pre-2026-05-12 session — the remaining 8 are real backlog.
