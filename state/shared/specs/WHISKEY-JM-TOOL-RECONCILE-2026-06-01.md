# JM Die lathe — tools USED vs PURCHASED reconciliation (U-CL8, 2026-06-01)

**Operator question (goal component 3):** *"utilize the jm order documents that charlie and hotel have sorted through to determine what tools were used based off what we've purchased."*

**Method:** `scripts/lib/lathe-fleet-tool-reconcile.mjs` (U-CL8) composes — no new core logic (R8) — `inferOpsFromGcodes` (U-CL4, G-code→turning-op) over the JM lathe program corpus + `crossRefToolTypes` (U-CL3, op→tool-type demand) against the charlie/hotel purchase corpus `state/shared/quoting/jm-tool-purchases.json` ($4,914,833.88 · 4,708 distinct tools · 49 vendors). Bounded walk. Sample: 1,500 programs across 12 representative customers (ITW, CSM, ACME, AJ, SEMBLEX, HOLO-KROME, ANDERSON, BELVIDERE, MEAD, FONTANA, OPTIMAS, SFS). 5/5 node:test.

## Result

**Program op demand (what the lathe programs DO):** `bore_rough 912 · drill_axial 411 · od_thread 238 · od_rough 50` — JM lathe work is **bore- and drill-heavy with single-point threading** (threaded, bored bushings/dies/casings — consistent with a die/fastener-tooling shop).

**Tool-type coverage: 100%** — every tool type the lathe programs demand was purchased. **No procurement gap on the lathe side.**

| Class | Tool types | Spend |
|---|---|---|
| **USED (demanded) + PURCHASED** | boring-bar, carbide-blank, drill, insert | boring-bar $4,619 · **carbide-blank $4,338,880** · drill $21,320 · insert $53,090 |
| **NEEDED but NOT purchased** (procurement gap) | *(none)* | — |
| **PURCHASED but UNUSED by lathe turning ops** (non-lathe tooling) | countersink, end-mill, grinding-wheel, misc-tooling, reamer, saw-slitting, tap, tool-bit | misc-tooling $343,812 · reamer $94,419 · end-mill $24,990 · grinding-wheel $21,333 · tool-bit $10,996 · tap $943 · countersink $226 · saw-slitting $206 |

## Findings

1. **Lathe tooling spend is dominated by `carbide-blank` ($4.34M of $4.91M).** JM grinds its own form/profile tools from carbide blanks rather than buying inserts wholesale — the single biggest procurement lever for the lathe domain.
2. **No lathe-side procurement gap:** every tool type the programs demand (insert, carbide-blank, drill, boring-bar) is in the purchase corpus. The shop buys what it cuts with.
3. **~$497K is non-lathe-turning tooling** (reamer, end-mill, grinding-wheel, misc, tap, saw, countersink) — mill/grind/secondary-op spend that does not serve the lathe turning programs.

## R12 caveat (honest scope)
`inferOpsFromGcodes` (U-CL4) detects G71/G70/G72/G73/G75/G76/G74 + bore — it does **NOT** detect tapping (G84) or reaming, so `tap`/`reamer` lathe demand is **understated** and those types fall into "purchased-unused." For single-point lathe threading this is correct (JM threads with G76 inserts, not taps), but the $94K reamer / $943 tap figures should not be read as pure surplus without checking secondary/live-tool ops. Extending op-inference to G84/ream is the natural follow-up. Sample = 1,500 programs (bounded); rates are stable but not the full-archive count.

Engine: `scripts/lib/lathe-fleet-tool-reconcile.mjs` + `.test.mjs` (5/5). Companion to the program-side fleet assessment `WHISKEY-JM-ENHANCED-FLEET-ASSESSMENT-2026-06-01.md`.
