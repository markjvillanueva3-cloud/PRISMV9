---
name: reference_post_ship_psn-enhance-ms0-u-psn-graphiti-seed-expanded
description: Auto-distilled learnings from shipping PSN-ENHANCE-MS0/U-PSN-GRAPHITI-SEED-EXPANDED (commit 0f4702ba5). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.682Z
aliases: reference_post_ship_psn-enhance-ms0-u-psn-graphiti-seed-expanded
---


# PSN-ENHANCE-MS0/U-PSN-GRAPHITI-SEED-EXPANDED

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-ENHANCE-MS0]/U-PSN-GRAPHITI-SEED-EXPANDED (slot:sierra iter23 2026-05-25): seed episode store 7 → 2004 (286x). Adds --all + --no-files flags + RECSEP-delimited parser. --no-files unblocks ingest past corrupt tree object e36809bbd2 (fsck issue on cad-fusion-live-ms0 history that fatals --name-only at 1238-commit window). RECSEP (ASCII \x1e) replaces the \n\n parser since --pretty=format: emits no separator without --name-only. Live verification: hybrid query 'qdrant populate vector embedding' now returns episode=19 hits (was episode=0); ep-* episodes interleave at episode@1, episode@2 alongside memory + master substrates. Closes iter-18 R12 follow-up — sparse episode coverage that made the episode substrate return 0 on most queries.

**Shipped:** 2026-05-25T00:15:16-05:00 by markjvillanueva3-cloud
**Files:** 10 touched

Full distillation: [[psn-enhance-ms0-u-psn-graphiti-seed-expanded]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._