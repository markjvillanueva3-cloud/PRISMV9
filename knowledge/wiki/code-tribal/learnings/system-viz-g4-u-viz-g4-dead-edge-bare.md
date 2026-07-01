# SYSTEM-VIZ-G4/U-VIZ-G4-DEAD-EDGE-BARE — [MAIN] [SYSTEM-VIZ-G4]/U-VIZ-G4-DEAD-EDGE-BARE: canon bare-name targets on extracted-modules edge types (+786 dead->live verified)

**Commit:** `d46594ba75b5` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T02:14:06-05:00
**Tags:** system-viz-g4, u-viz-g4-dead-edge-bare, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ-G4]/U-VIZ-G4-DEAD-EDGE-BARE: canon bare-name targets on extracted-modules edge types (+786 dead->live verified)

## Body
```
[MAIN] [SYSTEM-VIZ-G4]/U-VIZ-G4-DEAD-EDGE-BARE: canon bare-name targets on extracted-modules edge types (+786 dead->live verified)

generate-extracted-modules-detail-features.mjs emits BARE names (no engine./dispatcher. prefix): bridge_to_existing->matched_engine (PascalCase class e.g. SchedulingEngine), wire_target->recommended_dispatcher (prism_*). canonicalizeGraphEdgeTargets now handles these EDGE-TYPE-GATED (only those 2 types) + dead->live + node-existence. Live dry-run: 245 bridge_to_existing + 541 wire_target ALL resolvable, 0 missing -> 786 more dead edges fixable (6128 -> ~5342). 24 canon tests (+5 bare). Materialize via merge-only (full regen dies under mem pressure).
```

## Files touched (4)
- scripts/lib/viz-engine-node-id-canon.mjs      | 23 +++++++++++++++++++++++
- scripts/lib/viz-engine-node-id-canon.test.mjs | 53 +++++++++++++++++++++++++++++++++++++++++++++++++++--
- scripts/merge-augmentations.mjs               |  4 ++--
- 3 files changed, 76 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d46594ba75b5`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-G4.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._