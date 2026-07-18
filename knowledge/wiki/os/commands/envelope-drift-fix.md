---
kind: command
slug: envelope-drift-fix
status: stub
generated_at: 2026-05-23T00:34:38.924Z
generator: scripts/backfill-wiki-os-commands-entities.mjs
source: .claude/commands/envelope-drift-fix.md
description: "Orchestrator that combines `/envelope-sync` (drift detection + patch proposal), automatic patch application (gated by --fix), AND the 4-surface close-out per the roadmap-close-out doctrine (roadmap-index, MILESTONE_PROGRESS, BUILD_STATE, chat-bus). One command instead of five. Companion to (not replacement for) `/envelope-sync` and `/close-out`."
---

# /envelope-drift-fix

Orchestrator that combines `/envelope-sync` (drift detection + patch proposal), automatic patch application (gated by --fix), AND the 4-surface close-out per the roadmap-close-out doctrine (roadmap-index, MILESTONE_PROGRESS, BUILD_STATE, chat-bus). One command instead of five. Companion to (not replacement for) `/envelope-sync` and `/close-out`.

## Source command

See `.claude/commands/envelope-drift-fix.md` for the live executable surface.

## Status

This entity is a U-CK11 Phase 2 backfill stub. Richer content (purpose,
composes_with chain, invocation examples, related skills) lands in a
later phase per the U-CK11 verdicts doc remediation queue.
