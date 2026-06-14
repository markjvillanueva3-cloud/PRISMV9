---
name: reference_post_ship_docker-hook-broker-u-dhb-p5
description: Auto-distilled learnings from shipping DOCKER-HOOK-BROKER/U-DHB-P5 (commit 972e7f79e). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.221Z
aliases: reference_post_ship_docker-hook-broker-u-dhb-p5
---


# DOCKER-HOOK-BROKER/U-DHB-P5

[MAIN] [DOCKER-HOOK-BROKER]/U-DHB-P5 (slot:hotel): migrate-hooks-to-rpc.mjs — closes the broker milestone (P1-P5 complete). 250 LOC orchestrator + 17 hermetic tests. Dry-run by default; --apply mutates the filesystem; --undo reverts. Rewrites the 78 module-safe hooks to call _rpc-shim.mjs, preserving original at <name>.original.mjs. Closes U-DHB-P5 + the U-DOCKER-HOOK-BROKER milestone. Operator cutover sequence: refresh compat report -> dry-run -> compose up prism-hooks -> --apply -> verify -> (optional) --undo --apply rolls back. Refs: state/shared/specs/2026-05-09-U-DOCKER-HOOK-BROKER.md

**Shipped:** 2026-05-22T19:53:45-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[docker-hook-broker-u-dhb-p5]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._