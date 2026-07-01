---
name: reference_post_ship_ollama-offload-u-verified-offload-largeread-hook
description: Auto-distilled learnings from shipping OLLAMA-OFFLOAD/U-VERIFIED-OFFLOAD-LARGEREAD-HOOK (commit 0acb1dcbc). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.959Z
aliases: reference_post_ship_ollama-offload-u-verified-offload-largeread-hook
---


# OLLAMA-OFFLOAD/U-VERIFIED-OFFLOAD-LARGEREAD-HOOK

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-OFFLOAD]/U-VERIFIED-OFFLOAD-LARGEREAD-HOOK (slot:alpha): wire the file-digest read-lever to auto-fire -- PreToolUse:Read advisory surfaces 'node scripts/ollama-file-digest.mjs <path>' for large (>600-line) non-wiki source reads; sibling of wiki-read-offload-advisory.mjs, advisory/fail-soft/never-blocks, bumps offload-stats for advisory-decay to self-govern; 11/11 tests + live proof (3440-line file fires, small+non-Read passthrough). Wired in settings.json Read block (mirrored C->H)

**Shipped:** 2026-06-09T23:12:50-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[ollama-offload-u-verified-offload-largeread-hook]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._