---
name: reference_post_ship_self-startup-ms0-u-confirm-doc-fix
description: Auto-distilled learnings from shipping SELF-STARTUP-MS0/U-CONFIRM-DOC-FIX (commit 3b3ad7fa0). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.027Z
aliases: reference_post_ship_self-startup-ms0-u-confirm-doc-fix
---


# SELF-STARTUP-MS0/U-CONFIRM-DOC-FIX

[MAIN-FORCE] [SELF-STARTUP-MS0]/U-CONFIRM-DOC-FIX (slot:bravo): retire the stale -Confirm:$true examples in send-keys-to-window.ps1 header (3-of-3 P2 re-introduction guard). The DOCTRINE block, .PARAMETER Confirm, and the actuation .EXAMPLE all showed `-Confirm:$true` as the way to actuate -- the EXACT broken pattern (it cannot bind via -File; U-CONFIRM-ENV-FIX). A future caller copying the .EXAMPLE would reintroduce the silent no-op. Now all three point at the PRISM_SENDKEYS_CONFIRM=1 env-var opt-in (the working path the U-ZM2-01 comment already documents); the example shows `$env:PRISM_SENDKEYS_CONFIRM=1; powershell -File ...`. Doc-only (comment-help block); script still parses + runs (dummy-hwnd dry-run returns valid JSON). The wiki zulu-orchestrator.md latent-bug section was already accurate (no change).

**Shipped:** 2026-06-17T21:10:35-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[self-startup-ms0-u-confirm-doc-fix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._