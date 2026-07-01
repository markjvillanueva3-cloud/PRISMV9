---
name: reference_post_ship_psn-synergy-collect-ms3-u-nn-feature-separability-close
description: Auto-distilled learnings from shipping PSN-SYNERGY-COLLECT-MS3/U-NN-FEATURE-SEPARABILITY-CLOSE (commit 44702e0ca). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.997Z
aliases: reference_post_ship_psn-synergy-collect-ms3-u-nn-feature-separability-close
---


# PSN-SYNERGY-COLLECT-MS3/U-NN-FEATURE-SEPARABILITY-CLOSE

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-COLLECT-MS3]/U-NN-FEATURE-SEPARABILITY-CLOSE (slot:india): definitive negative result — tier-5 GNN cannot learn dispatcher wiring from text features. Ollama name-embeddings on full 62/62 holdout: LOO 0.339 < 0.5 baseline, intra/inter cosine gap 0.0017 -> NON-SEPARABLE. Structural label not recoverable from semantic text; ghosts lack the dispatcher edges by definition (cold-start). Cascade correctly defers to tiers 1-4; degeneracy guard keeps tier-5 honestly dormant. Thread closed (no retrain warranted). Wiki + memory reflected.

**Shipped:** 2026-06-03T09:12:33-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[psn-synergy-collect-ms3-u-nn-feature-separability-close]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._