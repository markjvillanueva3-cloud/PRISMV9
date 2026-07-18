---
name: reference_sierra_domain_gsd_2026_05_29
description: Sierra shipped a system-viz domain GSD protocol (galaxy 5th brain file) — the safe-operating runbook for the graph.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.191Z
aliases: reference_sierra_domain_gsd_2026_05_29
---


**System-viz domain GSD (2026-05-29, slot:sierra).** Distilled sierra's session history + domain docs into `mcp-server/src/engines/system-viz/GSD.md` — the galaxy's **5th brain file** (alongside CLAUDE/MEMORY/PATHS/TOOLBELT), matching the fleet pattern ([[reference_whiskey_lathe_gsd_protocol_2026_05_29]], [[reference_kilo_cam_gsd_2026_05_29]], [[reference_oscar_sfc_gsd_2026_05_29]]). Complements the fleet-wide `mcp-server/data/docs/gsd/GSD_QUICK.md` with the system-viz-specific lifecycle.

Covers 8 sections: (0) prereqs, (1) safe regen sequence, (2) add-ghost-roost dual-registration checklist, (3) verify-graph-health ritual (read `.last-successful-regen.json`), (4) recover-from-OOM-regen (exit 134), (5) viz-first search via the verified `system-viz-query` subcommands, (6) the three-graphs consumer map, (7) dispatcher-id SSOT (`disp.` not `dispatcher.`).

**Why:** future sierra sessions get an executable operating protocol, not just doctrine — closes the "I know the rules but not the safe sequence" gap.

**How to apply:** read GSD.md at session start before touching the graph; it's the runbook. Auto-loads with the galaxy. See [[reference_sierra_galaxy_buildout_2026_05_29]].
