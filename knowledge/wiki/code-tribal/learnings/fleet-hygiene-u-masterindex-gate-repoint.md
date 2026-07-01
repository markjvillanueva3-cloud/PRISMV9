# FLEET-HYGIENE/U-MASTERINDEX-GATE-REPOINT — [MAIN-FORCE] [FLEET-HYGIENE]/U-MASTERINDEX-GATE-REPOINT: dedup gate read a dead 2-month-stale orphan index

**Commit:** `d3175419cf9d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T15:09:02-05:00
**Tags:** fleet-hygiene, u-masterindex-gate-repoint, auto-distilled

## Subject
[MAIN-FORCE] [FLEET-HYGIENE]/U-MASTERINDEX-GATE-REPOINT: dedup gate read a dead 2-month-stale orphan index

## Body
```
[MAIN-FORCE] [FLEET-HYGIENE]/U-MASTERINDEX-GATE-REPOINT: dedup gate read a dead 2-month-stale orphan index

Bug-hunt (stale-reader class). master-index-search-gate.mjs (PreToolUse dedup
backstop -- warns of similar assets before engine/algorithm creation) hard-coded
MASTER_INDEX = mcp-server/MASTER_INDEX_COMPACT.md -- a DEAD ORPHAN (mtime 2026-04-26,
nothing regenerates it; counts frozen at Engines:2739 vs live 3833). The canonical
auto-refreshed index is mcp-server/data/docs/MASTER_INDEX_COMPACT.md (2026-06-18, now
kept fresh every /compact by the PreCompact regen hook wired earlier this session
bd7d03e98e). So the gate fuzzy-matched new asset names against a 2-month-stale index.

Repoint to the canonical fresh path. (Honest scope: both files are SUMMARY docs not
per-asset listings, so this gate is a weak backstop either way -- the real dedup is
duplicationGuardEngine; this fix is correctness/freshness, reading a maintained file
vs a dead orphan, and now compounds via the auto-refresh hook.) Only hard-coded stale
reader (others use DOCS_DIR-relative canonical paths). Validated: node --check OK;
reads fresh 2026-06-18 index; smoke create-op -> valid {decision:approve}.
```

## Files touched (2)
- .claude/hooks/master-index-search-gate.mjs | 4 +++-
- 1 file changed, 3 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d3175419cf9d`
- Milestone envelope: `mcp-server/data/milestones/FLEET-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._