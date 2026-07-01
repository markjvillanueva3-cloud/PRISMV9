---
name: feedback-delta-no-inline-iso286
description: "Delta CAD refuse: never hardcode ISO 286 fit deviation values (H7/g6 = +0.021/-0.025 etc). Import from canonical tolerance tables / physics constants."
type: feedback
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.421Z
aliases: feedback_delta_no_inline_iso286
---


# Never inline ISO 286 fit deviations (delta refuse)

**Rule:** A hardcoded `H7/g6 = +0.021/-0.025` literal in CAD/tolerance code is a reject. Import from canonical tables (`mcp-server/src/physics/constants.ts` + `src/data/*tolerance*`).

**Why:** Inlined tolerance constants rot and diverge from the canonical source — the same failure class the root SAFETY rail forbids for Kienzle/Taylor/material constants. Tolerance fits are physics-adjacent data; a drifted literal silently produces wrong fit-class validation.

**How to apply:** For tolerance-stack / fit selection, resolve the deviation from the canonical table at runtime. Cite the fit code (H7/g6) by exact deviation pulled from source, not approximation. This is delta soul refuse #1.

Sister rails: root §SAFETY (no inline Kienzle/Taylor). See [[feedback_delta_topology_before_tolerance]].
