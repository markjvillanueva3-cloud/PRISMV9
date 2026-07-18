---
name: reference_post_ship_fleet-hygiene-u-fth-dollar-skip
description: Auto-distilled learnings from shipping FLEET-HYGIENE/U-FTH-DOLLAR-SKIP (commit ecd6defde). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.853Z
aliases: reference_post_ship_fleet-hygiene-u-fth-dollar-skip
---


# FLEET-HYGIENE/U-FTH-DOLLAR-SKIP

[MAIN-FORCE] [FLEET-HYGIENE]/U-FTH-DOLLAR-SKIP (slot:golf): discoverInstallerTasks skips unexpanded $-template-literal task names. The galaxy-mine installer registers -TaskName "PRISM Galaxy Mine ($Galaxy)" (a runtime PS variable); discovery captured the literal $Galaxy as a phantom task name that false-flagged as installer-drift (the recurring test #69 RED, partial). Now any captured name containing $ is skipped -- live discovery 0 $-phantoms (was 1; count 60). +1 test (phantom skipped, real sibling kept). NOTE: this is 1 of the #69 drift items; the full KNOWN_PRISM_TASKS<->installer reconciliation (15 missing + the Zulu-Orchestrator no-discoverable-installer stale + owner-map/EXPECTED invariants) is a separate dedicated-pass unit, fully enumerated in HANDOFF-Claude-golf.

**Shipped:** 2026-06-21T16:24:04-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[fleet-hygiene-u-fth-dollar-skip]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._