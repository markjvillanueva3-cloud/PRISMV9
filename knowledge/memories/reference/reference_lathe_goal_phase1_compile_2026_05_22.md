---
name: reference-lathe-goal-phase1-compile-2026-05-22
description: "2026-05-22 hotel /loop — operator set a multi-phase lathe /goal; Phase 1 compiled 513 pending lathe-domain units, ranked top milestones for bravo to pick up"
aliases: reference_lathe_goal_phase1_compile_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.188Z
---


# Lathe multi-phase /goal — Phase 1 compile (2026-05-22, hotel)

User set this /goal from slot hotel: *"compile all leftover lathe and turning
units and tasks | utilize system-viz to search all engines, algorithms,
formulas, prism app features to finalize full build out of print to cnc
programs for lathe/lathe wizard | use the finalized product to improve all
existing lathe programs in the JM Die system then, utilize it as training
then produce brand new programs from new prints."*

Slot hotel = erp+hr domain (per [[juliett-12chat-allocation-ms0]]). Lathe is
bravo's domain. This goal genuinely needs bravo (or whichever chat owns the
lathe slot) to drive the multi-session build-out; hotel did Phase 1 research.

## Phase 1 — pending-unit census (DONE this session)

`scripts/lib` + `ROADMAP-CONSOLIDATED.json` audit: **513 lathe-domain pending
entries** across `pending_units` + `unconsolidated_prose`. Top milestones:

| Milestone | Pending |
|---|---|
| LATHE-MASTER | 136 |
| LATHE-PROD-READY-MS0 | 135 |
| LATHE-LORA-MS0 | 50 |
| MS-PRINT-PROGRAM-LOOP | 16 |
| DOMAIN-PIPELINE-MS0 | 13 |
| REVENUE-MS0 | 10 |
| REVENUE-MS2 | 8 |
| [[reference_lathe_p2p_consensus_ms4_2026_05_23|LATHE-P2P-CONSENSUS-MS4]] | 7 |
| CAMX-V17-P4..P10 | 5 each |

LATHE-MASTER + LATHE-PROD-READY-MS0 + LATHE-LORA-MS0 alone = 321 units. The
operator should expect this to span many bravo sessions.

## Phase 2 — print-to-CNC finalize (bravo's next step)

The lathe print-to-program surface already exists. `/system-viz` and
master-index pre-search both surface:

- `prism_turning_program` dispatcher actions: `turning_print_to_program`,
  `turning_process_plan`, `lathe_orchestrate`, `lathe_ui_submit`,
  `turning_blueprint_intake`, `turning_parse_material`, `turning_cad_import`,
  `turning_stock_select`, `turning_resolve_ambiguity`, `turning_rev_profile`,
  `turning_feature_taxonomy`, `turning_parse_fit`, `turning_apply_iso2768`.
- `MS-PRINT-PROGRAM-LOOP` (16 units pending) is the canonical "finalize the
  print-to-program loop" milestone — bravo's first target.

Bravo's Phase 2 entry point: `/pick-unit --slot bravo` against
`MS-PRINT-PROGRAM-LOOP` units, OR `/system-viz` search for
`lathe_orchestrate` to map the existing pipeline before extending.

## Phase 3 — apply to JM Die archive

`H:/PRISM/JM DIE/CNC LATHE/` — 118 customer folders, ~15,599 `.MIN` programs
(per `CustomerPortfolioMinerEngine.getSources()` — also wired this session as
`prism_business:customer_portfolio_*`). Phase 3 takes the finalized
print-to-program pipeline and back-runs it against existing programs to
diff / improve / annotate.

## Phase 4 — training corpus

Use the Phase 3 outputs as a training corpus for the lathe LoRA (LATHE-LORA-MS0,
50 pending units). The lathe-lora cadence + ledger already exist
(`prism_turning:lathe_lora_*` actions, `lathe_lora_cadence_state`, etc.).

## Phase 5 — new prints → new programs

Use the trained pipeline on a fresh blueprint (PDF / DXF / 3D model) and
emit a complete CNC program. Acceptance: a brand-new print resolves through
the pipeline end-to-end (intake → process_plan → toolpath → post → G-code)
without operator intervention.

## What hotel shipped THIS session (separate from the lathe goal)

- `[ARC-MS4]/muS-B14` revenue concentration (HHI/Pareto) on
  CustomerManagementEngine — 11 tests
- `[ARC-MS4]/muS-B15` customer growth/decline trends — 12 tests
- `[ARC-MS1]/muS-A18` CustomerNormalizer (two-phase atomic apply) — 13 tests
- `[BRIDGE-WIRING]/U-WIRE-CUSTOMER-PORTFOLIO-MINER` — 6 actions, 13 tests
- `[BRIDGE-WIRING]/U-WIRE-ERP-QUALITY` — 8 actions, 17 tests
- Verified `U-FR-MS3-A` already complete (4 files, 17/17 tests, wired)
- Verified `ShopFloorCostEngine` + `ShopFloorQuoteEngine` are
  **superseded duplicates** (existing `clock_in`/`costing_*`/`quote_*` use
  different engines) — do NOT wire, would duplicate.

## Important finding for the lathe campaign

The 618-engine "unwired" audit is heavily false-positive — many "orphans" are
SUPERSEDED engines whose capability is already exposed via different
dispatcher cases. Before wiring any lathe orphan, run:

```bash
grep -rl ENGINENAME mcp-server/src/tools/dispatchers/ mcp-server/src/routes/
```

If empty → genuine gap (wire it). If non-empty in routes/ but empty in
dispatchers → see [[reference_u_orphan_rescue_stripe_2026_05_20]]
(route-layer wired, MCP-layer orphan — sometimes worth wiring, sometimes
already covered). If a sibling action already exposes the capability via a
different engine → R7 (pick one, flag the other; do NOT wire a duplicate).
