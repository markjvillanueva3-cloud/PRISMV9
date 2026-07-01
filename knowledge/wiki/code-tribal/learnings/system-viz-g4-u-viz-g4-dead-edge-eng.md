# SYSTEM-VIZ-G4/U-VIZ-G4-DEAD-EDGE-ENG — [MAIN] [SYSTEM-VIZ-G4]/U-VIZ-G4-DEAD-EDGE-ENG: merge-side engine.<Pascal> -> eng.<domain> edge canonicalization (kills ~10.3K dead edges)

**Commit:** `85e8b3b463da` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T00:46:10-05:00
**Tags:** system-viz-g4, u-viz-g4-dead-edge-eng, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ-G4]/U-VIZ-G4-DEAD-EDGE-ENG: merge-side engine.<Pascal> -> eng.<domain> edge canonicalization (kills ~10.3K dead edges)

## Body
```
[MAIN] [SYSTEM-VIZ-G4]/U-VIZ-G4-DEAD-EDGE-ENG: merge-side engine.<Pascal> -> eng.<domain> edge canonicalization (kills ~10.3K dead edges)

Adds canonicalizeEngineEdgeTargets pass to merge-augmentations (the single graph writer, only place with the full post-merge node set). Producers emit engine.<ClassName> targets (engine-node-extractor scheme, unwired from live regen) that never exist as merged-graph nodes; live ids are eng.<domain>.<name>. Alias-gated remap = strictly dead->live; deterministic multi-domain pick; drops remap-created dups; unmatched classes stay honest dead pixels (R12). PRISM_VIZ_ENGINE_CANON_DISABLE=1 = no-op. 13 hermetic tests; per-file 2-reviewer PASS/PASS.
```

## Files touched (4)
- scripts/lib/viz-engine-node-id-canon.mjs      | 151 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/viz-engine-node-id-canon.test.mjs | 157 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/merge-augmentations.mjs               |  18 ++++++++++++++++
- 3 files changed, 326 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 85e8b3b463da`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-G4.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._