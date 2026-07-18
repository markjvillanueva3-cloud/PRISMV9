# HERMES-APP-INCORPORATION-MS0/U-HERMES-VIZ-ROOST — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-APP-INCORPORATION-MS0]/U-HERMES-VIZ-ROOST (slot:bravo): P4 — surface the Nous Hermes desktop app in /system-viz (the Hermes<->PRISM<->Obsidian<->system-viz synergy made observable). New generate-hermes-features.mjs emits a ghost.hermes_app roost under ghost.planned_features + a hermes-capability.native-mcp node with a 'bridges' edge to PRISM's MCP transport node tr.mcp, plus one child per skill(24)/cron(0)/output-lane(5). SAFETY (spec S4): dir/file NAMES ONLY via readdirSync, fail-soft; NEVER opens state.db/.env/auth.json/config.yaml (no readFileSync in the module at all) — proven by a record-every-open fake-fs test. Idempotent-on-empty (roost still surfaces), dual dedup (existingNodeIds+seenChild), safeId neutralizes path-traversal. Dual-registered: regen-viz FAST[] + merge-augmentations (loadOptional+versions+splice, byte-matched filename). Completes P1 output lanes (research/notes/diagrams/scratch/sessions). 21/21 tests; live run 31 nodes/32 edges; merge-splice validated (roost+bridge fold, idempotent). 2-reviewer per-file scrutiny PASS (0 P0/P1).

**Commit:** `ab2ccf42a4cb` · **By:** markjvillanueva3-cloud · **At:** 2026-06-05T22:53:34-05:00
**Tags:** hermes-app-incorporation-ms0, u-hermes-viz-roost, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-APP-INCORPORATION-MS0]/U-HERMES-VIZ-ROOST (slot:bravo): P4 — surface the Nous Hermes desktop app in /system-viz (the Hermes<->PRISM<->Obsidian<->system-viz synergy made observable). New generate-hermes-features.mjs emits a ghost.hermes_app roost under ghost.planned_features + a hermes-capability.native-mcp node with a 'bridges' edge to PRISM's MCP transport node tr.mcp, plus one child per skill(24)/cron(0)/output-lane(5). SAFETY (spec S4): dir/file NAMES ONLY via readdirSync, fail-soft; NEVER opens state.db/.env/auth.json/config.yaml (no readFileSync in the module at all) — proven by a record-every-open fake-fs test. Idempotent-on-empty (roost still surfaces), dual dedup (existingNodeIds+seenChild), safeId neutralizes path-traversal. Dual-registered: regen-viz FAST[] + merge-augmentations (loadOptional+versions+splice, byte-matched filename). Completes P1 output lanes (research/notes/diagrams/scratch/sessions). 21/21 tests; live run 31 nodes/32 edges; merge-splice validated (roost+bridge fold, idempotent). 2-reviewer per-file scrutiny PASS (0 P0/P1).

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HERMES-APP-INCORPORATION-MS0]/U-HERMES-VIZ-ROOST (slot:bravo): P4 — surface the Nous Hermes desktop app in /system-viz (the Hermes<->PRISM<->Obsidian<->system-viz synergy made observable). New generate-hermes-features.mjs emits a ghost.hermes_app roost under ghost.planned_features + a hermes-capability.native-mcp node with a 'bridges' edge to PRISM's MCP transport node tr.mcp, plus one child per skill(24)/cron(0)/output-lane(5). SAFETY (spec S4): dir/file NAMES ONLY via readdirSync, fail-soft; NEVER opens state.db/.env/auth.json/config.yaml (no readFileSync in the module at all) — proven by a record-every-open fake-fs test. Idempotent-on-empty (roost still surfaces), dual dedup (existingNodeIds+seenChild), safeId neutralizes path-traversal. Dual-registered: regen-viz FAST[] + merge-augmentations (loadOptional+versions+splice, byte-matched filename). Completes P1 output lanes (research/notes/diagrams/scratch/sessions). 21/21 tests; live run 31 nodes/32 edges; merge-splice validated (roost+bridge fold, idempotent). 2-reviewer per-file scrutiny PASS (0 P0/P1).
```

## Files touched (10)
- knowledge/hermes-outputs/diagrams/.gitkeep |   1 +
- knowledge/hermes-outputs/notes/.gitkeep    |   1 +
- knowledge/hermes-outputs/research/.gitkeep |   1 +
- knowledge/hermes-outputs/scratch/.gitkeep  |   1 +
- knowledge/hermes-outputs/sessions/.gitkeep |   1 +
- scripts/generate-hermes-features.mjs       | 248 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/generate-hermes-features.test.mjs  | 274 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/merge-augmentations.mjs            |  31 ++++++++++++++++
- scripts/regen-viz.mjs                      |   1 +
- 9 files changed, 559 insertions(+)

## Lessons surfaced in commit body
- till surfaces), dual dedup (existingNodeIds+seenChild), safeId neutralizes path-traversal. Dual-registered: regen-viz FAST[] + merge-augmentations (loadOptional+versions+splice, byte-matched filename). Completes P1 output lanes (research/notes/diagrams/scratch/sessions). 21/21 tests; live run 31 nodes/32 edges; merge-splice validated (roost+bridge fold, idempotent). 2-reviewer per-file scrutiny PASS

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ab2ccf42a4cb`
- Milestone envelope: `mcp-server/data/milestones/HERMES-APP-INCORPORATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._