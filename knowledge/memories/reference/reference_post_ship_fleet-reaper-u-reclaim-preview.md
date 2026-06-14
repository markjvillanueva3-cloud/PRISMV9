---
name: reference_post_ship_fleet-reaper-u-reclaim-preview
description: Auto-distilled learnings from shipping FLEET-REAPER/U-RECLAIM-PREVIEW (commit c7d44e0dd). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.375Z
aliases: reference_post_ship_fleet-reaper-u-reclaim-preview
---


# FLEET-REAPER/U-RECLAIM-PREVIEW

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-REAPER]/U-RECLAIM-PREVIEW (slot:golf): kill the stale-slot cry-wolf advisory. The reaper 'N slot(s) with dead PID -- run reclaim' keys on the recorded pid (dies across /compact while the chat+window live on) so it OVER-reports -- verified live: 11 dead-recorded-pid -> 0 actually reclaimable (foxtrot correctly kept via window_pid_alive). Add read-only previewReclaimable() to chat-slots.mjs (reuses the canonical classifySlot+shouldKeepSlotAlive, no mutation/no lock -- R8 no reinvention) + reclaim-preview CLI; wire the reaper advisory (fail-soft) to report the ACTUALLY-reclaimable subset instead of the weaker pid count. +5 hermetic tests (read-only invariant + crashed-window-dead->reclaimable + fresh->neither + env-disable + empty). 60/61 chat-slots tests green (1 pre-existing transcriptAgeMs env-flake, untouched by this additive change).

**Shipped:** 2026-06-04T13:20:26-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[fleet-reaper-u-reclaim-preview]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._