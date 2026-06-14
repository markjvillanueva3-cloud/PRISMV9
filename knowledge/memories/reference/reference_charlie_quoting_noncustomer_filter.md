---
name: reference_charlie_quoting_noncustomer_filter
description: Quoting gotcha
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.056Z
aliases: reference_charlie_quoting_noncustomer_filter
---


QUOTING-SYNERGY-MS0 iter35+iter41 (commits `848e0107ab`, `c83111d893`, R12). Bootstrap filters that strip noise like "PRISM MODIFIED POST PROCESSORS" must NOT strip real customers whose names contain a noise-substring: HOLOTEST CORP (TEST), OLDFIELD INDUSTRIES (OLD), TURNTECH PRECISION (TURN), CADWORKS LLC (CAD), ALCOA POST OFFICE (POST), DOC HOLLIDAY (DOC).

**Fix:** whole-segment anchors + an explicit false-positive-guard test case per filter extension. **Conservative match is non-negotiable** — when in doubt KEEP the row, never drop a possible customer. Sister: [[reference_charlie_quoting_iterative_filter]] (multi-iter convergence of this filter chain).
