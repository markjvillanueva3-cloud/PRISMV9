---
name: reference_post_ship_slot-drift-fix-ms1-u-slot-heartbeat-fix
description: Auto-distilled learnings from shipping SLOT-DRIFT-FIX-MS1/U-SLOT-HEARTBEAT-FIX (commit 1d2678026). Full content in wiki.
aliases: reference_post_ship_slot-drift-fix-ms1-u-slot-heartbeat-fix
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.756Z
---


# SLOT-DRIFT-FIX-MS1/U-SLOT-HEARTBEAT-FIX

[MAIN] [SLOT-DRIFT-FIX-MS1]/U-SLOT-HEARTBEAT-FIX: root-cause + fix doc — heartbeat-keepalive 8ms timeout typo broke chat-slot heartbeat fleet-wide slot:alpha. Root cause: H:/.claude/settings.json wired heartbeat-keepalive.mjs with timeout: 8 (ms). Hook needs ~500ms. So every fire timed out before heartbeat refresh. For weeks. Symptom: idle chats reclaimed by peer /checkin-<slot> --force after 10min CRASH_TTL_MS. Fix live on PC-A (4 settings.json edits): (1) timeout 8 -> 8000 on existing UserPromptSubmit; (2)+(3)+(4) wire heartbeat-keepalive to SessionStart, PostToolUse, Stop chains. settings.json is per-machine (not git-tracked) — PC-B needs same fix. Verified: my slot heartbeat went from 2h+ stale to fresh-within-tool-call on next PostToolUse. Doc: knowledge/wiki/lessons/heartbeat-keepalive-timeout-typo.md + reference memory.

**Shipped:** 2026-05-18T15:32:27-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[slot-drift-fix-ms1-u-slot-heartbeat-fix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._