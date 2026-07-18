---
name: reference_post_ship_fleet-git-contention-ms0-u-fgc-2-scrutiny-fix
description: Auto-distilled learnings from shipping FLEET-GIT-CONTENTION-MS0/U-FGC-2-SCRUTINY-FIX (commit 3e39feeaa). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.851Z
aliases: reference_post_ship_fleet-git-contention-ms0-u-fgc-2-scrutiny-fix
---


# FLEET-GIT-CONTENTION-MS0/U-FGC-2-SCRUTINY-FIX

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-GIT-CONTENTION-MS0]/U-FGC-2-SCRUTINY-FIX (slot:golf): close 3-of-3 reviewer findings. Reviewer-C P1: ollama-resilient-pull.ps1 MaxTries=0 made an unbounded while-loop (wrong tag / dead server = spin forever) -- added an always-on MaxWallClockMin deadline (default 12h) bounding the whole run regardless of MaxTries. Reviewer-C P2: Test-Installed used Select-String -SimpleMatch (unanchored substring, prefix-tag false-positive risk) -- now exact NAME-column membership. Reviewer-A P3: chat-slots.mjs orphan-count comment made consistent (28,761 swept). Parse-checked OK; detached pull (PID 65904) unaffected (uses default MaxTries=400, already bounded).

**Shipped:** 2026-06-04T12:29:10-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[fleet-git-contention-ms0-u-fgc-2-scrutiny-fix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._