---
name: reference_post_ship_ollama-offload-u-night-window-recheck
description: Auto-distilled learnings from shipping OLLAMA-OFFLOAD/U-NIGHT-WINDOW-RECHECK (commit 44066f867). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.958Z
aliases: reference_post_ship_ollama-offload-u-night-window-recheck
---


# OLLAMA-OFFLOAD/U-NIGHT-WINDOW-RECHECK

[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-NIGHT-WINDOW-RECHECK (slot:zulu): between-jobs window re-check -- a long night job ending past 06:00 can no longer bleed the NEXT job into the 01:00 OCR batch GPU window or the workday (scrutiny P2 from U-NIGHT-BATCH). windowCheck injected (null for --force manual runs); every window-skipped job individually logged + surfaced in the summary. 13/13 tests (mid-run-close + back-compat pinned).

**Shipped:** 2026-06-12T11:04:56-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[ollama-offload-u-night-window-recheck]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._