---
name: reference_post_ship_hermes-app-incorporation-ms0-u-hermes-viz-roost
description: Auto-distilled learnings from shipping HERMES-APP-INCORPORATION-MS0/U-HERMES-VIZ-ROOST (commit ab2ccf42a). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.883Z
aliases: reference_post_ship_hermes-app-incorporation-ms0-u-hermes-viz-roost
---


# HERMES-APP-INCORPORATION-MS0/U-HERMES-VIZ-ROOST

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-APP-INCORPORATION-MS0]/U-HERMES-VIZ-ROOST (slot:bravo): P4 — surface the Nous Hermes desktop app in /system-viz (the Hermes<->PRISM<->Obsidian<->system-viz synergy made observable). New generate-hermes-features.mjs emits a ghost.hermes_app roost under ghost.planned_features + a hermes-capability.native-mcp node with a 'bridges' edge to PRISM's MCP transport node tr.mcp, plus one child per skill(24)/cron(0)/output-lane(5). SAFETY (spec S4): dir/file NAMES ONLY via readdirSync, fail-soft; NEVER opens state.db/.env/auth.json/config.yaml (no readFileSync in the module at all) — proven by a record-every-open fake-fs test. Idempotent-on-empty (roost still surfaces), dual dedup (existingNodeIds+seenChild), safeId neutralizes path-traversal. Dual-registered: regen-viz FAST[] + merge-augmentations (loadOptional+versions+splice, byte-matched filename). Completes P1 output lanes (research/notes/diagrams/scratch/sessions). 21/21 tests; live run 31 nodes/32 edges; merge-splice validated (roost+bridge fold, idempotent). 2-reviewer per-file scrutiny PASS (0 P0/P1).

**Shipped:** 2026-06-05T22:53:34-05:00 by markjvillanueva3-cloud
**Files:** 10 touched

Full distillation: [[hermes-app-incorporation-ms0-u-hermes-viz-roost]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._