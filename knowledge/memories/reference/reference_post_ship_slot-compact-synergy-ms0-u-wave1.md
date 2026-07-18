---
name: reference_post_ship_slot-compact-synergy-ms0-u-wave1
description: Auto-distilled learnings from shipping SLOT-COMPACT-SYNERGY-MS0/U-WAVE1 (commit 64d1793dc). Full content in wiki.
aliases: reference_post_ship_slot-compact-synergy-ms0-u-wave1
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.049Z
---


# SLOT-COMPACT-SYNERGY-MS0/U-WAVE1

[GOLF] [SLOT-COMPACT-SYNERGY-MS0]/U-WAVE1: shipped (a) slot-worktree-cwd-advisory hook + 33/33 tests, (b) global settings fix (CLAUDE_AUTOCOMPACT_PCT_OVERRIDE 95→80, CLAUDE_CODE_MAX_OUTPUT_TOKENS 85000→48000, heartbeat-keepalive timeout 8ms→8000ms closing 2026-05-18 fleet-wide regression), (c) SESSIONSTART-HOOK-AUDIT-2026-05-19 spec classifying all 40 SessionStart + 28 UserPromptSubmit hooks with live byte measurements. Wave 2-5 (file-reader→cron conversion, audit-viz-first rate-gate, retire-or-verify) queued in spec. Global settings.json edits in H:/.claude/ outside this repo — verify with `grep CLAUDE_AUTOCOMPACT_PCT_OVERRIDE H:/.claude/settings.json`.

**Shipped:** 2026-05-19T08:52:00-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[slot-compact-synergy-ms0-u-wave1]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._