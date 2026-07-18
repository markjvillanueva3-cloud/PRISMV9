---
kind: command
slug: reap-zombies
status: stub
generated_at: 2026-05-23T00:34:38.924Z
generator: scripts/backfill-wiki-os-commands-entities.mjs
source: .claude/commands/reap-zombies.md
description: "**HOOK COVERAGE (added 2026-04-30):** This action runs automatically on every SessionStart via `.claude/hooks/stale-claim-sweeper.mjs` (TTLs: claims 5min, git locks 5min, workboard heartbeat 1hr; PID-dead sessions swept regardless of age)."
---

# /reap-zombies

**HOOK COVERAGE (added 2026-04-30):** This action runs automatically on every SessionStart via `.claude/hooks/stale-claim-sweeper.mjs` (TTLs: claims 5min, git locks 5min, workboard heartbeat 1hr; PID-dead sessions swept regardless of age).

## Source command

See `.claude/commands/reap-zombies.md` for the live executable surface.

## Status

This entity is a U-CK11 Phase 2 backfill stub. Richer content (purpose,
composes_with chain, invocation examples, related skills) lands in a
later phase per the U-CK11 verdicts doc remediation queue.
