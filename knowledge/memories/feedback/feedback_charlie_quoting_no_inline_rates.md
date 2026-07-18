---
name: feedback_charlie_quoting_no_inline_rates
description: Quoting standing rule — never inline shop-rate / margin / material-price constants; import from canonical sources
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.418Z
aliases: feedback_charlie_quoting_no_inline_rates
---


Never inline a $/hr machine rate, labor rate, overhead burden, profit margin %, or material price into a quoting engine.

**Why:** quoting touches per-shop rates that change per shop and over time; an inlined constant silently rots and produces wrong quotes that the closed loop can't correct. Same class as the root "never inline physics constants" rule.

**How to apply:** shop rates → `mcp-server/src/data/jm-die-profile.ts`; material price → `HistoricalMaterialPriceEngine` runtime; customer terms → `customer-profile.ts` (verify); Kienzle/Taylor for cycle-time→cost → cite `physics/constants.ts`, never copy. If the constant isn't in a canonical source, ASK before adding one. See [[reference_charlie_quoting_engine_map]] · [[feedback_charlie_quoting_drift_freshness]].
