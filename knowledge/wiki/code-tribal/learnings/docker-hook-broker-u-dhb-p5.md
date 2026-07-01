# DOCKER-HOOK-BROKER/U-DHB-P5 — [MAIN] [DOCKER-HOOK-BROKER]/U-DHB-P5 (slot:hotel): migrate-hooks-to-rpc.mjs — closes the broker milestone (P1-P5 complete). 250 LOC orchestrator + 17 hermetic tests. Dry-run by default; --apply mutates the filesystem; --undo reverts. Rewrites the 78 module-safe hooks to call _rpc-shim.mjs, preserving original at <name>.original.mjs. Closes U-DHB-P5 + the U-DOCKER-HOOK-BROKER milestone. Operator cutover sequence: refresh compat report -> dry-run -> compose up prism-hooks -> --apply -> verify -> (optional) --undo --apply rolls back. Refs: state/shared/specs/2026-05-09-U-DOCKER-HOOK-BROKER.md

**Commit:** `972e7f79e7f2` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T19:53:45-05:00
**Tags:** docker-hook-broker, u-dhb-p5, auto-distilled

## Subject
[MAIN] [DOCKER-HOOK-BROKER]/U-DHB-P5 (slot:hotel): migrate-hooks-to-rpc.mjs — closes the broker milestone (P1-P5 complete). 250 LOC orchestrator + 17 hermetic tests. Dry-run by default; --apply mutates the filesystem; --undo reverts. Rewrites the 78 module-safe hooks to call _rpc-shim.mjs, preserving original at <name>.original.mjs. Closes U-DHB-P5 + the U-DOCKER-HOOK-BROKER milestone. Operator cutover sequence: refresh compat report -> dry-run -> compose up prism-hooks -> --apply -> verify -> (optional) --undo --apply rolls back. Refs: state/shared/specs/2026-05-09-U-DOCKER-HOOK-BROKER.md

## Body
```
[MAIN] [DOCKER-HOOK-BROKER]/U-DHB-P5 (slot:hotel): migrate-hooks-to-rpc.mjs — closes the broker milestone (P1-P5 complete). 250 LOC orchestrator + 17 hermetic tests. Dry-run by default; --apply mutates the filesystem; --undo reverts. Rewrites the 78 module-safe hooks to call _rpc-shim.mjs, preserving original at <name>.original.mjs. Closes U-DHB-P5 + the U-DOCKER-HOOK-BROKER milestone. Operator cutover sequence: refresh compat report -> dry-run -> compose up prism-hooks -> --apply -> verify -> (optional) --undo --apply rolls back. Refs: state/shared/specs/2026-05-09-U-DOCKER-HOOK-BROKER.md
```

## Files touched (4)
- scripts/migrate-hooks-to-rpc.mjs      | 288 ++++++++++++++++++++++++++++++++++
- scripts/migrate-hooks-to-rpc.test.mjs | 256 ++++++++++++++++++++++++++++++
- state/shared/HOOK-MIGRATION-LOG.json  |  20 +++
- 3 files changed, 564 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 972e7f79e7f2`
- Milestone envelope: `mcp-server/data/milestones/DOCKER-HOOK-BROKER.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._