---
name: reference_post_ship_jm-die-lathe-upgrade-ms0-u-gcanalyzer-modal-f-track
description: Auto-distilled learnings from shipping JM-DIE-LATHE-UPGRADE-MS0/U-GCANALYZER-MODAL-F-TRACK (commit ddf7a5610). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.520Z
aliases: reference_post_ship_jm-die-lathe-upgrade-ms0-u-gcanalyzer-modal-f-track
---


# JM-DIE-LATHE-UPGRADE-MS0/U-GCANALYZER-MODAL-F-TRACK

[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-GCANALYZER-MODAL-F-TRACK (slot:whiskey iter16): address-parse regex accepts leading-dot decimals. [BOOTSTRAP-SLOT-ENFORCE]. Prior /-?\d+\.?\d*/ required digits before optional decimal — Okuma OSP convention F.006 / X-.040 silently failed to parse → modal feedRate stayed 0 → CRIT-05 false-positive cascade on every cut. New regex /-?(?:\d+\.?\d*|\.\d+)/ accepts both 0.006 AND .006. Result: Stage-A critical drops 2313 → 1172 (49% reduction) on same 100-variant sample. Confirms the false-positive class identified in U-AUDIT-FINDINGS-BRIEF.

**Shipped:** 2026-05-24T17:54:25-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[jm-die-lathe-upgrade-ms0-u-gcanalyzer-modal-f-track]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._