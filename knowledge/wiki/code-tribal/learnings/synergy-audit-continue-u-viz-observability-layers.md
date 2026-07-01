# SYNERGY-AUDIT-CONTINUE/U-VIZ-OBSERVABILITY-LAYERS — [MAIN] [SYNERGY-AUDIT-CONTINUE]/U-VIZ-OBSERVABILITY-LAYERS (slot:echo): three system-viz observability roosts (H2+H3+H5)

**Commit:** `7ceab4ce8cb8` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T17:28:47-05:00
**Tags:** synergy-audit-continue, u-viz-observability-layers, auto-distilled

## Subject
[MAIN] [SYNERGY-AUDIT-CONTINUE]/U-VIZ-OBSERVABILITY-LAYERS (slot:echo): three system-viz observability roosts (H2+H3+H5)

## Body
```
[MAIN] [SYNERGY-AUDIT-CONTINUE]/U-VIZ-OBSERVABILITY-LAYERS (slot:echo): three system-viz observability roosts (H2+H3+H5)

Closes ECHO-UNDONE survey items H2 U-VIZ-TRIBAL-LAYER, H3 U-VIZ-AGENT-LAYER,
H5 U-HANDOFF-VIZ-LAYER in one consolidated generator — the three layers share
the augmentation-generator pattern exactly (read source -> roost + children ->
merge splice), so one file with three pure layer functions beats three
near-identical copies.

scripts/generate-echo-viz-layers-features.mjs emits one ghost-roost per layer
under ghost.planned_features:
  - H2 Tribal Knowledge Corpus  — one child per domain from tribal-embed-index
  - H3 Live Agents              — one child per claimed chat-slot (live/stale/crashed)
  - H5 Active Handoffs          — one child per handoff touched in last 7d (cap 80)

Fail-soft: each layer's source is optional; a missing source skips only that
layer. Deterministic (sorted keys) so re-merge is byte-stable.

Wired: regen-viz.mjs FAST[] + merge-augmentations.mjs 4-site splice
(loadOptional / versions / splice block / stats line), mirroring the
priorityQueue augmentation exactly.

26/26 node:test PASS. Per-file 2-reviewer gate: arm A FAIL -> fixed 1 P0
(parseHandoffName mis-split Agent@DESKTOP-* / Claude-<uuid> instances whose
tokens contain internal dashes -> 4 anchored per-form patterns + regression
tests vs real filenames) + 1 P1 (lossy node-id slug -> injective handoffNodeId)
-> arm A re-review PASS, arm B PASS.
```

## Files touched (5)
- scripts/generate-echo-viz-layers-features.mjs      | 376 +++++++++++++++++++++
- scripts/generate-echo-viz-layers-features.test.mjs | 290 ++++++++++++++++
- scripts/merge-augmentations.mjs                    |  34 +-
- scripts/regen-viz.mjs                              |   1 +
- 4 files changed, 700 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7ceab4ce8cb8`
- Milestone envelope: `mcp-server/data/milestones/SYNERGY-AUDIT-CONTINUE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._