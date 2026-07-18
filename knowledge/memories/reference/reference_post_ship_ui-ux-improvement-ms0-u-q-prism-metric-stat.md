---
name: reference_post_ship_ui-ux-improvement-ms0-u-q-prism-metric-stat
description: Auto-distilled learnings from shipping UI-UX-IMPROVEMENT-MS0/U-Q-PRISM-METRIC-STAT (commit 318f70016). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.092Z
aliases: reference_post_ship_ui-ux-improvement-ms0-u-q-prism-metric-stat
---


# UI-UX-IMPROVEMENT-MS0/U-Q-PRISM-METRIC-STAT

[MAIN] [UI-UX-IMPROVEMENT-MS0]/U-Q-PRISM-METRIC-STAT (slot:quebec): PrismMetricStat KPI primitive. The canonical big-number / KPI tile from Calculator Studio (label + value + unit + delta-chip + optional spectrum-fill progress + optional caption). Composes PrismGlowCard + PrismChip + PrismSpectrumFill. Auto-derives delta-chip tone from sign (+emerald / -red / 0 slate) -- caller overrides via deltaTone for 'lower is better' contexts (latency / cycle-time / error-rate). Tabular-nums for grid-aligned big numbers. Every domain dashboard reaches for this pattern; quebec ships it once. Drop into DashboardPage / CalculatorPage hero stats / SF top-summary / shop-floor live tiles. Pairs with U-Q-PRISM-PRIMITIVES (030d09019b) + U-Q-PRISM-RESOURCE-CARD (e8b2816377) + U-Q-REFERENCE-LIBRARY (aa2269ef40 + f7c373071c). Quebec frontend continuation -- 6 primitives in the kit now.

**Shipped:** 2026-05-27T09:42:32-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[ui-ux-improvement-ms0-u-q-prism-metric-stat]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._