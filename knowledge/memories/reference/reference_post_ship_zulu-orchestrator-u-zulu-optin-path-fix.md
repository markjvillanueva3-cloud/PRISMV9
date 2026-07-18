---
name: reference_post_ship_zulu-orchestrator-u-zulu-optin-path-fix
description: Auto-distilled learnings from shipping ZULU-ORCHESTRATOR/U-ZULU-OPTIN-PATH-FIX (commit 472764b2d). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.120Z
aliases: reference_post_ship_zulu-orchestrator-u-zulu-optin-path-fix
---


# ZULU-ORCHESTRATOR/U-ZULU-OPTIN-PATH-FIX

[MAIN-FORCE] [ZULU-ORCHESTRATOR]/U-ZULU-OPTIN-PATH-FIX (slot:zulu, operator-approved): repoint DEFAULT_OPTIN_FILE from the orphaned zebra-opt-in.json (MISSING on disk -> readOptIn self-healed to empty -> orchestrator inert 8 days) to the canonical zulu-opt-in.json (24/24 work slots opted in via U-ZULU-OPT-IN-CLI 2026-05-22). Pure resolveOptInFile(env): PRISM_ZULU_OPTIN_FILE > legacy PRISM_ZEBRA_OPTIN_FILE > zulu default. 30/30 tests (4 new path-precedence). LIVE: sweep re-activated in DRY-RUN observe mode -- evaluates 7 live slots, gate:dry-run = NO SendKeys (operator chose 'keep --dry-run' via AskUserQuestion). Zero split-brain (no other refs to zebra path; zebra file does not exist). +3 stale zebra banner/comment labels -> zulu.

**Shipped:** 2026-06-20T19:25:04-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[zulu-orchestrator-u-zulu-optin-path-fix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._