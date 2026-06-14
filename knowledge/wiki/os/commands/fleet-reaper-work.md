---
kind: command
slug: fleet-reaper-work
status: stub
generated_at: 2026-05-23T00:34:38.924Z
generator: scripts/backfill-wiki-os-commands-entities.mjs
source: .claude/commands/fleet-reaper-work.md
description: "Configure THIS PC as a \"work\" fleet-reaper host (smaller GPU ~8GB free at idle + tighter RAM tier — qwen2.5-coder:3b resident, 85% mem floor, 1GB GPU floor, more aggressive Ollama offload). Writes the work preset to state/shared/dashboards/fleet-reaper-host-presets.json keyed by THIS hostname so the durable scheduled task picks it up automatically. After the preset is written, runs the standard /fleet-reaper sweep + monitor. Idempotent — re-running just refreshes the timestamp. Use this on the work/laptop PC ONCE per machine."
---

# /fleet-reaper-work

Configure THIS PC as a "work" fleet-reaper host (smaller GPU ~8GB free at idle + tighter RAM tier — qwen2.5-coder:3b resident, 85% mem floor, 1GB GPU floor, more aggressive Ollama offload). Writes the work preset to state/shared/dashboards/fleet-reaper-host-presets.json keyed by THIS hostname so the durable scheduled task picks it up automatically. After the preset is written, runs the standard /fleet-reaper sweep + monitor. Idempotent — re-running just refreshes the timestamp. Use this on the work/laptop PC ONCE per machine.

## Source command

See `.claude/commands/fleet-reaper-work.md` for the live executable surface.

## Status

This entity is a U-CK11 Phase 2 backfill stub. Richer content (purpose,
composes_with chain, invocation examples, related skills) lands in a
later phase per the U-CK11 verdicts doc remediation queue.
