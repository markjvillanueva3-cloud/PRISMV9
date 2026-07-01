---
kind: command
slug: synergy-recall
status: stub
generated_at: 2026-05-23T00:34:38.924Z
generator: scripts/backfill-wiki-os-commands-entities.mjs
source: .claude/commands/synergy-recall.md
description: "Cross-surface recall — fan out a query across all 5 PRISM knowledge surfaces (master-index, tribal, memory, wiki, skills) in parallel and return ≤3 compact distilled lines per surface. Wraps the existing checkin-recall.mjs script that /checkin uses internally — exposed as a user-invokable slash command for ad-hoc \"what does PRISM know about X\" lookups WITHOUT burning Claude tokens on five separate Grep/Read passes."
---

# /synergy-recall

Cross-surface recall — fan out a query across all 5 PRISM knowledge surfaces (master-index, tribal, memory, wiki, skills) in parallel and return ≤3 compact distilled lines per surface. Wraps the existing checkin-recall.mjs script that /checkin uses internally — exposed as a user-invokable slash command for ad-hoc "what does PRISM know about X" lookups WITHOUT burning Claude tokens on five separate Grep/Read passes.

## Source command

See `.claude/commands/synergy-recall.md` for the live executable surface.

## Status

This entity is a U-CK11 Phase 2 backfill stub. Richer content (purpose,
composes_with chain, invocation examples, related skills) lands in a
later phase per the U-CK11 verdicts doc remediation queue.
