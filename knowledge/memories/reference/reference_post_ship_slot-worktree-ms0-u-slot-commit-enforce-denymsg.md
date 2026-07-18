---
name: reference_post_ship_slot-worktree-ms0-u-slot-commit-enforce-denymsg
description: Auto-distilled learnings from shipping SLOT-WORKTREE-MS0/U-SLOT-COMMIT-ENFORCE-DENYMSG (commit 800a17785). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.055Z
aliases: reference_post_ship_slot-worktree-ms0-u-slot-commit-enforce-denymsg
---


# SLOT-WORKTREE-MS0/U-SLOT-COMMIT-ENFORCE-DENYMSG

[MAIN-FORCE] [SLOT-WORKTREE-MS0]/U-SLOT-COMMIT-ENFORCE-DENYMSG (slot:india): fix now-lying escape instruction in the deny message (scrutiny P2, R12). The block message told users to add [BOOTSTRAP-SLOT-ENFORCE] -- which no longer bypasses after U-SLOT-COMMIT-ENFORCE-LIVE. Replaced with the real escapes: [MAIN-FORCE] for genuine cross-cutting fleet infra, PRISM_SLOT_COMMIT_ENFORCE_ALLOW_BOOTSTRAP=1 for the operator transition window, kill switch unchanged. Message-only; bypass logic untouched (3-of-3 already PASS on the functional change).

**Shipped:** 2026-06-11T23:18:16-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[slot-worktree-ms0-u-slot-commit-enforce-denymsg]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._