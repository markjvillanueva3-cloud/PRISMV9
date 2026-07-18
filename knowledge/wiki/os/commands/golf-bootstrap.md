---
kind: command
slug: golf-bootstrap
status: stub
generated_at: 2026-05-23T00:34:38.924Z
generator: scripts/backfill-wiki-os-commands-entities.mjs
source: .claude/commands/golf-bootstrap.md
description: "One-shot setup for the golf-slot hygiene chat. Reads state/shared/golf-cron-registry.json and schedules each enabled entry via the harness CronCreate tool, idempotently. Run once at the start of every golf session — re-running is safe (existing schedules with the same id+cronExpr are detected and skipped). Lockfile coordination prevents the same prompt from re-firing while a prior fire is still working."
---

# /golf-bootstrap

One-shot setup for the golf-slot hygiene chat. Reads state/shared/golf-cron-registry.json and schedules each enabled entry via the harness CronCreate tool, idempotently. Run once at the start of every golf session — re-running is safe (existing schedules with the same id+cronExpr are detected and skipped). Lockfile coordination prevents the same prompt from re-firing while a prior fire is still working.

## Source command

See `.claude/commands/golf-bootstrap.md` for the live executable surface.

## Status

This entity is a U-CK11 Phase 2 backfill stub. Richer content (purpose,
composes_with chain, invocation examples, related skills) lands in a
later phase per the U-CK11 verdicts doc remediation queue.
