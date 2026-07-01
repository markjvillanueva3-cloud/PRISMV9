# SFC-PAGE-CLOSED-LOOP/U-SFC-PAGE-MATERIAL-AWARE — [MAIN-FORCE] [SFC-PAGE-CLOSED-LOOP]/U-SFC-PAGE-MATERIAL-AWARE (slot:oscar): make the codex SFC page engine material-aware -- ISO-group Vc + chip load + machine rpm clamp

**Commit:** `05e08b470276` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T11:56:52-05:00
**Tags:** sfc-page-closed-loop, u-sfc-page-material-aware, auto-distilled

## Subject
[MAIN-FORCE] [SFC-PAGE-CLOSED-LOOP]/U-SFC-PAGE-MATERIAL-AWARE (slot:oscar): make the codex SFC page engine material-aware -- ISO-group Vc + chip load + machine rpm clamp

## Body
```
[MAIN-FORCE] [SFC-PAGE-CLOSED-LOOP]/U-SFC-PAGE-MATERIAL-AWARE (slot:oscar): make the codex SFC page engine material-aware -- ISO-group Vc + chip load + machine rpm clamp

The customer-facing codex SFC page (/speed-feed-calc -> sfcApi -> ProductEngine.sfcCalculate -> ManufacturingCalculations.calculateSpeedFeed) computed Vc from a flat tool-material speed scaled by Brinell hardness ONLY (ignoring ISO group), so 316 stainless out-ran 1045 steel -- physically backwards (austenitic stainless work-hardens, must run slower). Chip load was a CONSTANT fz=D*0.02 for every material (~2-3x the textbook steel/stainless roughing chip load -> excess force/power + built-up-edge risk). And rpm was never clamped to the spindle ceiling -- the page would recommend an unreachable rpm (e.g. ~13000 rpm aluminium on an 8100-rpm VF-2), only warning.

Settled by a page-vs-core-vs-published parity probe (scripts/sfc-engine-parity-probe.mjs) + physics-reviewer adjudication: published coated-carbide milling Vc bands are P~110-230, M~90-160, N~300-900; the page's pre-fix numbers were right in magnitude but unsound in model (the stainless>steel inversion); the rival orchestrator core OVER-derates Vc to 18-33 m/min (sub-carbide). So the page is NOT rewired to the core; its model is corrected instead.

Fix (reuses existing canonical tables -- no new constant): calculateSpeedFeed gains an optional iso_group anchoring Vc+fz on CANONICAL_MILLING_SPEEDS + CANONICAL_MILLING_FEEDS (imported, never inlined); legacy fallback byte-identical. ProductEngine groupToISO() + iso_group threaded into ALL 7 call sites + MATERIAL_CATEGORY_ALIASES (category no longer silently falls back to steel) + rpm CLAMP (rescales Vc/vf so result is machine-attainable, downstream Kienzle/Taylor/power read clamped Vc) + safeHardness guard (no NaN from non-positive HB).

Validation (live probe 12mm 4FL carbide rough VF-2): 1045 Vc 204/fz 0.15, 316 Vc 134/fz 0.12 (now slower than steel), 6061 Vc 305 (rpm clamped 8100)/fz 0.20. 23/23 page tests (6 new reference-value) + 17/17 core fleet pass; tsc clean; 2-arm scrutiny PASS (0 P0/P1).

NOT touched (operator/physics-review gated): the orchestrator core 18-33 m/min Vc over-derate on the OTHER page (/speed-feed) -- escalated separately.
```

## Files touched (5)
- mcp-server/src/__tests__/sfc-jm-fleet-page-closed-loop.test.ts | 102 +++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/ManufacturingCalculations.ts            |  73 ++++++++++++++++++++-----
- mcp-server/src/engines/ProductEngine.ts                        |  77 +++++++++++++++++++++++----
- scripts/sfc-engine-parity-probe.mjs                            | 141 +++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 370 insertions(+), 23 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 05e08b470276`
- Milestone envelope: `mcp-server/data/milestones/SFC-PAGE-CLOSED-LOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._