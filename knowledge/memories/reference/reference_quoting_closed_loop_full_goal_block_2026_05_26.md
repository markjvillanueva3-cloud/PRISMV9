---
name: reference-quoting-closed-loop-full-goal-block-2026-05-26
description: "Full /goal-block close-out — iter46-55 closed-loop quoting system on JM DocuStrata, $120/hr operator-confirmed, bias collapsed -36% → -1.4%."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.905Z
aliases: reference_quoting_closed_loop_full_goal_block_2026_05_26
---


**QUOTING-SYNERGY-MS0 — full /goal-block close-out (slot:charlie, /loop /yolo, 2026-05-26 → 2026-05-27).**

## What the /goal asked for

> "120 it is. build a closed loop learning and self improving quoting system. utilize all docustrata files and prism domains wired into the quoting system (look for nodes that should be bridged or wired if there are any). run loops until you exhaust all possibilities."

## What shipped (10 iters, 10 commits on slot/charlie)

| Iter | Asset | Outcome |
|------|-------|---------|
| 46 | QuotingClosedLoopEngine | 7-stage controller, 30 tests |
| 47 | QuotingClosedLoopRunnerEngine | live deps for substrate, 21 tests |
| 48 | GCodeMaterialParserEngine | 5-dialect header parser, 23 tests |
| 49 | run-quoting-closed-loop-jm-corpus.mjs | first live cycle |
| 50/51 | derive-jm-shop-rate{,-v2}.mjs | $120/hr triangulation (4 angles converged) |
| 52 | $120/hr override threaded | bias **-36.33% → -1.43%** (25× reduction) |
| 53 | DocuStrataMaterialPriorEngine | 164 line items, $155K, 9 grades |
| 54 | perRecordOverrides per-outcome wire + $20 plausibility floor | wire structurally correct; data-limited |
| 55 | bridge-survey punchlist | 17 unwired cost-bearing engines named |

77/77 unit tests pass. 5 live closed-loop runs verified.

## Best-known-good calibration

```
QuotingTrainingLoopEngine.RunOptions.defaultMachineRate = 120
QuotingTrainingLoopEngine.RunOptions.defaultMaterialSpend = 130  // flat fallback
DocuStrataMaterialPriorEngine.perRecordOverrides active (with $20 floor)
```

Cycle on the 10-row curated DocuStrata corpus:
- PRE MAPE 47.14% · bias -1.43% (flat-only) OR -11.01% (per-grade priors active)
- verdict ROLLED_BACK (CoV gate UNSAFE on 10-row sample — needs larger corpus)
- active-factor JSON preserved (cycle never wrote a bad value)

## Key findings the live runs surfaced

1. **DocuStrata is INBOUND-only.** All 47 typed docs are JM Die receiving supplier POs (Michigan Carbide, Griggs Steel, Cincinnati Tool Steel, Specialty Metals). 0 outbound quotes/invoices in the corpus. **The shop rate JM Die CHARGES is not in DocuStrata** — it lives in their billing/ERP system.

2. **The triangulated $120/hr is the right plug** — confirmed by BIAS-IMPLIED $129.51 + 2020-PER-YEAR-V2 $115.45 + INDUSTRY-BENCH-2026 $105.50 all converging in the $105-$130 band. Operator confirmed.

3. **DocuStrata material priors split into two cost-contexts**:
   - Carbide grades (M20/M25/M30) are sold as finished die blanks at $40-$880/unit — perfect for per-job material spend.
   - Tool steel grades (D2/H13/S7) are sold as raw bar stock at $2-$5/unit — these are NOT per-job costs and poison the closed loop if used naively. iter54's $20 plausibility floor catches this.

4. **The closed-loop SAFETY model works.** Across 5 live runs the cycle correctly rolled back every candidate calibration that didn't survive CoV gating, even when bias was small. The active-factor JSON was never overwritten with sketchy factors.

5. **Bigger-corpus is the bottleneck.** The 10-row curated corpus is below the substrate's 30-record confidence ceiling — CoV gates can't approve calibration from a sample that small. iter52+ unlocks once the operator wires their outbound billing stream OR the 111,658 untyped DocuStrata scans get OCR'd.

## Bridge survey — 17 unwired cost-bearing engines (full punchlist)

`state/shared/specs/QUOTING-BRIDGE-PUNCHLIST-2026-05-27.md`

Top P0 unwires:
- MachineInvestmentROIEngine (per-machine $/hr from inventory + utilization)
- ShopProfileTemplateEngine (calibrate shop-tier)
- FairMarketValueEngine (independent market-pricing cross-check)
- Mill/LatheJobProfitabilityAnalyticsEngine (empirical per-job distribution)
- WEDMJobCostEngine + 4 WEDM-cost siblings (wire-EDM cost path — charlie's soul domain)

## Files / commits

Engine code:
- `mcp-server/src/engines/QuotingClosedLoopEngine.ts` (iter46)
- `mcp-server/src/engines/QuotingClosedLoopRunnerEngine.ts` (iter47 + iter52 + iter54)
- `mcp-server/src/engines/GCodeMaterialParserEngine.ts` (iter48)
- `mcp-server/src/engines/DocuStrataMaterialPriorEngine.ts` (iter53)

Scripts:
- `scripts/run-quoting-closed-loop-jm-corpus.mjs` (iter49/52/54)
- `scripts/derive-jm-shop-rate{,-v2}.mjs` (iter50/51)
- `scripts/test-docustrata-material-prior.mjs` (iter53 smoke)

Specs:
- `state/shared/specs/JM-SHOP-RATE-DERIVATION-V2-*.json`
- `state/shared/specs/QUOTING-BRIDGE-PUNCHLIST-2026-05-27.md`

All commits land on `slot/charlie` worktree. Cherry-picks to MAIN (cad-fusion-live-ms0) needed for substrate-engine integration testing.

See also: [[reference_quoting_closed_loop_engine_2026_05_26]] · [[reference_quoting_closed_loop_jm_corpus_first_live_2026_05_26]]
