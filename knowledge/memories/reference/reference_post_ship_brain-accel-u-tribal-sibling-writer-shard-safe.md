---
name: reference_post_ship_brain-accel-u-tribal-sibling-writer-shard-safe
description: Auto-distilled learnings from shipping BRAIN-ACCEL/U-TRIBAL-SIBLING-WRITER-SHARD-SAFE (commit 46c07e9cd). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.778Z
aliases: reference_post_ship_brain-accel-u-tribal-sibling-writer-shard-safe
---


# BRAIN-ACCEL/U-TRIBAL-SIBLING-WRITER-SHARD-SAFE

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BRAIN-ACCEL]/U-TRIBAL-SIBLING-WRITER-SHARD-SAFE (slot:sierra): route the 3 sibling tribal-index embedders (engines/knowledge-store/cited-tips) through a shared shard-safe guarded-IO helper -- closes the monolith-only clobber vector that destroyed the brain 4x (latest 2026-06-10 8bf1873577). New scripts/lib/tribal-index-guarded-io.mjs: readTribalIndexGuarded (manifest-aware, fail-loud on corrupt-exists -- no fail-open empty) + writeTribalIndexGuarded (shrink clobber-guard + writeTribalIndex shard layout), parameterized by indexPath so all writers share ONE impl (R7/R8). embed-knowledge-store gained the cross-process withTribalIndexLock it never had (was lock-less + monolith-only); embed-cited-tips loadIndex no longer fail-OPENs to empty on a sharded layout (the 2026-06-08 clobber 1:1). 70/70 tests: helper 15 (forced-shard read non-empty + shrink-guard over sharded prior + monolith<->shard transition) + cited-tips +2 forced-shard regressions; all 3 sibling suites green (engines 6, knowledge-store 25 incl CLI oracle, cited-tips 16). DO-BEFORE the index grows past 480MiB.

**Shipped:** 2026-06-10T08:43:21-05:00 by markjvillanueva3-cloud
**Files:** 7 touched

Full distillation: [[brain-accel-u-tribal-sibling-writer-shard-safe]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._