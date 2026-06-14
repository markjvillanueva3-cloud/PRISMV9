---
kind: command
slug: go
status: stub
generated_at: 2026-05-23T00:34:38.924Z
generator: scripts/backfill-wiki-os-commands-entities.mjs
source: .claude/commands/go.md
description: "Composite gate — fast-build + tsc + affected tests + hook coverage + lint. Run before committing a non-trivial change. Reports PASS/FAIL per stage and the first failing line in each failing stage. Fast path: 30-90 s on a warm cache. Backstop for /loop iter-gate (Boris pattern). No new engines; pure composition over existing dispatcher actions + npm scripts."
---

# /go

Composite gate — fast-build + tsc + affected tests + hook coverage + lint. Run before committing a non-trivial change. Reports PASS/FAIL per stage and the first failing line in each failing stage. Fast path: 30-90 s on a warm cache. Backstop for /loop iter-gate (Boris pattern). No new engines; pure composition over existing dispatcher actions + npm scripts.

## Source command

See `.claude/commands/go.md` for the live executable surface.

## Status

This entity is a U-CK11 Phase 2 backfill stub. Richer content (purpose,
composes_with chain, invocation examples, related skills) lands in a
later phase per the U-CK11 verdicts doc remediation queue.
