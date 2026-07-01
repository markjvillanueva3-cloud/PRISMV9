---
kind: command
slug: fleet-reaper-home
status: stub
generated_at: 2026-05-23T00:34:38.924Z
generator: scripts/backfill-wiki-os-commands-entities.mjs
source: .claude/commands/fleet-reaper-home.md
description: "Configure THIS PC as a \"home\" fleet-reaper host (RTX 4080 SUPER class GPU 16GB + Ryzen 7 7800X3D + 64GB RAM tier — qwen2.5-coder:7b resident, 90% mem floor, 2GB GPU floor). Writes the home preset to state/shared/dashboards/fleet-reaper-host-presets.json keyed by THIS hostname so the durable scheduled task picks it up automatically. After the preset is written, runs the standard /fleet-reaper sweep + monitor. Idempotent — re-running just refreshes the timestamp. Use this on the home/personal PC ONCE per machine."
---

# /fleet-reaper-home

Configure THIS PC as a "home" fleet-reaper host (RTX 4080 SUPER class GPU 16GB + Ryzen 7 7800X3D + 64GB RAM tier — qwen2.5-coder:7b resident, 90% mem floor, 2GB GPU floor). Writes the home preset to state/shared/dashboards/fleet-reaper-host-presets.json keyed by THIS hostname so the durable scheduled task picks it up automatically. After the preset is written, runs the standard /fleet-reaper sweep + monitor. Idempotent — re-running just refreshes the timestamp. Use this on the home/personal PC ONCE per machine.

## Source command

See `.claude/commands/fleet-reaper-home.md` for the live executable surface.

## Status

This entity is a U-CK11 Phase 2 backfill stub. Richer content (purpose,
composes_with chain, invocation examples, related skills) lands in a
later phase per the U-CK11 verdicts doc remediation queue.
