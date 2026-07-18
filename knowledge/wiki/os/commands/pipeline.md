---
kind: command
slug: pipeline
status: stub
generated_at: 2026-05-23T00:34:38.924Z
generator: scripts/backfill-wiki-os-commands-entities.mjs
source: .claude/commands/pipeline.md
description: "Operator meta-command over the COMMAND-KERNEL-MS0 pipeline registry. `list` shows registered pipelines, `dry-run <slug>` plans without side-effects (the safety default), `execute <slug>` runs handlers with --force-execute, `resume <slug>` re-enters a chain from its last telemetered stage. Thin wrapper over `.claude/kernel/pipeline-exec.mjs` (U-CK13)."
---

# /pipeline

Operator meta-command over the COMMAND-KERNEL-MS0 pipeline registry. `list` shows registered pipelines, `dry-run <slug>` plans without side-effects (the safety default), `execute <slug>` runs handlers with --force-execute, `resume <slug>` re-enters a chain from its last telemetered stage. Thin wrapper over `.claude/kernel/pipeline-exec.mjs` (U-CK13).

## Source command

See `.claude/commands/pipeline.md` for the live executable surface.

## Status

This entity is a U-CK11 Phase 2 backfill stub. Richer content (purpose,
composes_with chain, invocation examples, related skills) lands in a
later phase per the U-CK11 verdicts doc remediation queue.
