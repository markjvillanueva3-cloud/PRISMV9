---
name: reference_post_ship_obsidian-vault-synergy-u-obs-brain-lock-reclaim-p2
description: Auto-distilled learnings from shipping OBSIDIAN-VAULT-SYNERGY/U-OBS-BRAIN-LOCK-RECLAIM-P2 (commit c68794664). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.951Z
aliases: reference_post_ship_obsidian-vault-synergy-u-obs-brain-lock-reclaim-p2
---


# OBSIDIAN-VAULT-SYNERGY/U-OBS-BRAIN-LOCK-RECLAIM-P2

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-BRAIN-LOCK-RECLAIM-P2 (slot:alpha): close the scrutiny B+C torn-write P2. The corrupt-reclaim could, in the microsecond window between a peer's openSync('wx') (empty entry) and its writeSync(JSON), read 0 bytes -> treat the peer's just-created lock as corrupt -> reclaim it -> break single-writer. Fix: distinguish EMPTY (0-byte = live peer mid-creation -> DEFER, the old-safe behavior) from non-empty-unparseable (genuine corruption like the 32-NUL incident -> reclaim). A single small writeSync makes a partial non-empty body unreachable, so empty-vs-non-empty is the exact safe boundary; the 32-NUL live-incident fix is preserved (non-empty). +1 test (empty->defer, untouched), 59/59. Single-writer invariant now holds even against the open->write race.

**Shipped:** 2026-06-09T10:15:57-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[obsidian-vault-synergy-u-obs-brain-lock-reclaim-p2]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._