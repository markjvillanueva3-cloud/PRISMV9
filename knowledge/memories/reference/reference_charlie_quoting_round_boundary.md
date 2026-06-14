---
name: reference_charlie_quoting_round_boundary
description: Quoting gotcha
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.056Z
aliases: reference_charlie_quoting_round_boundary
---


QUOTING-SYNERGY-MS0 iter28 (commit `d74521aa4c`). Staleness detection used `Math.round(staleHours) > THRESHOLD` — 48h+1m (48.0167) rounds to 48, which is NOT > 48, so a stale-by-a-minute distribution slipped the gate.

**Fix:** use the raw fractional value for the comparison (`staleHours > THRESHOLD`); use the rounded value ONLY for display. **Pattern:** applies anywhere a threshold-compare follows a rounding step — round for humans, compare on the raw number.
