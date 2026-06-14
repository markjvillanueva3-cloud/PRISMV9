---
name: reference_post_ship_psn-synergy-collect-ms3-u-nn-degeneracy-hook-surface
description: Auto-distilled learnings from shipping PSN-SYNERGY-COLLECT-MS3/U-NN-DEGENERACY-HOOK-SURFACE (commit f844af7eb). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.707Z
aliases: reference_post_ship_psn-synergy-collect-ms3-u-nn-degeneracy-hook-surface
---


# PSN-SYNERGY-COLLECT-MS3/U-NN-DEGENERACY-HOOK-SURFACE

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-COLLECT-MS3]/U-NN-DEGENERACY-HOOK-SURFACE (slot:india): fleet-wide [DEGENERATE] per-prompt signal. classifyGnn additively reads NN-EVAL.json degeneracy field -> both consumer hooks (psn-leg-state per-prompt x26 + nn-graph-health SessionStart) now show [DEGENERATE] (constant-vote collapse, tie-break artifact, NOT a near-miss -> rearchitect not tune) instead of generic [BELOW-GATE]. Single-source via classifyGnn (no re-read divergence). Mode-agnostic wording (constant-vote AND constant-confidence). +7 tests (93 green), 2-reviewer PASS 0 P0/P1, live verified. Completes honest-signal chain: eval->JSON->classifyGnn->fleet.

**Shipped:** 2026-06-03T08:37:41-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[psn-synergy-collect-ms3-u-nn-degeneracy-hook-surface]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._