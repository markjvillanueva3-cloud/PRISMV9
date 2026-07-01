---
name: reference_post_ship_cad-closed-loop-ms0-u-closed-loop-coverage
description: Auto-distilled learnings from shipping CAD-CLOSED-LOOP-MS0/U-CLOSED-LOOP-COVERAGE (commit 65c85a9fb). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.791Z
aliases: reference_post_ship_cad-closed-loop-ms0-u-closed-loop-coverage
---


# CAD-CLOSED-LOOP-MS0/U-CLOSED-LOOP-COVERAGE

[MAIN] [CAD-CLOSED-LOOP-MS0]/U-CLOSED-LOOP-COVERAGE (slot:india): fleet-wide closed-loop TRAINING coverage auditor -- does every domain's loop feed the training corpus? Enumerates each domain's outcome/correction ledger -> rows -> trainable-pairs (via the domain converter) -> wired-as-training-source? -> status {wired-with-signal|UNWIRED-WITH-SIGNAL|sparse|no-converter|absent}. Wiring truth read from the SAME inventory the assembler consumes. 7/7 tests. LIVE: cad 80->27 wired, speed_feed 12087->11 wired, post-proc/post-machine sparse, GHOST-WIRING 7160 rows NO-CONVERTER (actionable lead -- GNN's own outcomes not training). R15 apply-to-all-galaxies coverage surface.

**Shipped:** 2026-06-11T21:51:25-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[cad-closed-loop-ms0-u-closed-loop-coverage]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._