# UI-UX-IMPROVEMENT-MS0/U-Q-PRISM-METRIC-STAT — [MAIN] [UI-UX-IMPROVEMENT-MS0]/U-Q-PRISM-METRIC-STAT (slot:quebec): PrismMetricStat KPI primitive. The canonical big-number / KPI tile from Calculator Studio (label + value + unit + delta-chip + optional spectrum-fill progress + optional caption). Composes PrismGlowCard + PrismChip + PrismSpectrumFill. Auto-derives delta-chip tone from sign (+emerald / -red / 0 slate) -- caller overrides via deltaTone for 'lower is better' contexts (latency / cycle-time / error-rate). Tabular-nums for grid-aligned big numbers. Every domain dashboard reaches for this pattern; quebec ships it once. Drop into DashboardPage / CalculatorPage hero stats / SF top-summary / shop-floor live tiles. Pairs with U-Q-PRISM-PRIMITIVES (030d09019b) + U-Q-PRISM-RESOURCE-CARD (e8b2816377) + U-Q-REFERENCE-LIBRARY (aa2269ef40 + f7c373071c). Quebec frontend continuation -- 6 primitives in the kit now.

**Commit:** `318f70016205` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T09:42:32-05:00
**Tags:** ui-ux-improvement-ms0, u-q-prism-metric-stat, auto-distilled

## Subject
[MAIN] [UI-UX-IMPROVEMENT-MS0]/U-Q-PRISM-METRIC-STAT (slot:quebec): PrismMetricStat KPI primitive. The canonical big-number / KPI tile from Calculator Studio (label + value + unit + delta-chip + optional spectrum-fill progress + optional caption). Composes PrismGlowCard + PrismChip + PrismSpectrumFill. Auto-derives delta-chip tone from sign (+emerald / -red / 0 slate) -- caller overrides via deltaTone for 'lower is better' contexts (latency / cycle-time / error-rate). Tabular-nums for grid-aligned big numbers. Every domain dashboard reaches for this pattern; quebec ships it once. Drop into DashboardPage / CalculatorPage hero stats / SF top-summary / shop-floor live tiles. Pairs with U-Q-PRISM-PRIMITIVES (030d09019b) + U-Q-PRISM-RESOURCE-CARD (e8b2816377) + U-Q-REFERENCE-LIBRARY (aa2269ef40 + f7c373071c). Quebec frontend continuation -- 6 primitives in the kit now.

## Body
```
[MAIN] [UI-UX-IMPROVEMENT-MS0]/U-Q-PRISM-METRIC-STAT (slot:quebec): PrismMetricStat KPI primitive. The canonical big-number / KPI tile from Calculator Studio (label + value + unit + delta-chip + optional spectrum-fill progress + optional caption). Composes PrismGlowCard + PrismChip + PrismSpectrumFill. Auto-derives delta-chip tone from sign (+emerald / -red / 0 slate) -- caller overrides via deltaTone for 'lower is better' contexts (latency / cycle-time / error-rate). Tabular-nums for grid-aligned big numbers. Every domain dashboard reaches for this pattern; quebec ships it once. Drop into DashboardPage / CalculatorPage hero stats / SF top-summary / shop-floor live tiles. Pairs with U-Q-PRISM-PRIMITIVES (030d09019b) + U-Q-PRISM-RESOURCE-CARD (e8b2816377) + U-Q-REFERENCE-LIBRARY (aa2269ef40 + f7c373071c). Quebec frontend continuation -- 6 primitives in the kit now.
```

## Files touched (3)
- web/src/components/prism/PrismMetricStat.tsx | 119 +++++++++++++++++++++++++++
- web/src/components/prism/index.ts            |   1 +
- 2 files changed, 120 insertions(+)

## Lessons surfaced in commit body
- tile from Calculator Studio (label + value + unit + delta-chip + optional spectrum-fill progress + optional caption). Composes PrismGlowCard + PrismChip + PrismSpectrumFill. Auto-derives delta-chip tone from sign (+emerald / -red / 0 slate) -- caller overrides via deltaTone for 'lower is better' contexts (latency / cycle-time / error-rate). Tabular-nums for grid-aligned big numbers. Every domain dash
- tiles. Pairs with U-Q-PRISM-PRIMITIVES (030d09019b) + U-Q-PRISM-RESOURCE-CARD (e8b2816377) + U-Q-REFERENCE-LIBRARY (aa2269ef40 + f7c373071c). Quebec frontend continuation -- 6 primitives in the kit now.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 318f70016205`
- Milestone envelope: `mcp-server/data/milestones/UI-UX-IMPROVEMENT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._