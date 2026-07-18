---
name: reference_post_ship_quoting-synergy-ms0-u-qp-cost-basis-normalize
description: Auto-distilled learnings from shipping QUOTING-SYNERGY-MS0/U-QP-COST-BASIS-NORMALIZE (commit 1a42acbc3). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.006Z
aliases: reference_post_ship_quoting-synergy-ms0-u-qp-cost-basis-normalize
---


# QUOTING-SYNERGY-MS0/U-QP-COST-BASIS-NORMALIZE

[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-COST-BASIS-NORMALIZE (slot:charlie): units-correct $/in3 material cost basis from the $10M JM AP ledger (units-gated gotcha #25 lever). Density-FREE: block (qty=1, exact A*B*C vol)=consumable primary; round/bar=advisory (qty grain ambiguous). Live 20736 rows -> 9 consumable grades (H13 $1.55/S7 $1.23/A2 $1.40/4140 $1.62/O1 $4.41/1045 $0.85 per in3, plausible finished tool-steel). Cross-form invariant caught 2 bugs pre-ship (.500->500 1000x; qty>1 bar-vs-block). 2-reviewer per-file gate caught+fixed P0 grade-digit-bleed + P1 null-throw + P1 qty<=0; 26/26 incl CLI subprocess oracle + fail-on-revert. Artifact jm-material-cost-basis.json

**Shipped:** 2026-06-12T10:47:15-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[quoting-synergy-ms0-u-qp-cost-basis-normalize]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._