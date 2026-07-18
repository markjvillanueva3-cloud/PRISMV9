# SELF-COMPACTION/U-ZULU-PRECOMPACT-WAIT-PATCH — [MAIN] [SELF-COMPACTION]/U-ZULU-PRECOMPACT-WAIT-PATCH (slot:alpha): patch-sibling -- fix the /precompact->/compact race in the self-compaction actuator (3 files peer-locked by an in-flight zebra->zulu rename)

**Commit:** `6f9897118615` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T19:21:04-05:00
**Tags:** self-compaction, u-zulu-precompact-wait-patch, auto-distilled

## Subject
[MAIN] [SELF-COMPACTION]/U-ZULU-PRECOMPACT-WAIT-PATCH (slot:alpha): patch-sibling -- fix the /precompact->/compact race in the self-compaction actuator (3 files peer-locked by an in-flight zebra->zulu rename)

## Body
```
[MAIN] [SELF-COMPACTION]/U-ZULU-PRECOMPACT-WAIT-PATCH (slot:alpha): patch-sibling -- fix the /precompact->/compact race in the self-compaction actuator (3 files peer-locked by an in-flight zebra->zulu rename)

The self-compaction autonomous system is ALREADY BUILT + WIRED (zulu-orchestrator-sweep: recurring "PRISM Zulu Orchestrator" scheduled task + /precompact->/compact->/checkin-<slot> SendKeys sequencing + UIA/title window targeting + dry-run/opt-in/cooldown/lock gating + tests). The ONE real code gap: staggerAfterLine gives /compact a 90s wait but /precompact only the 5s stagger -- yet /precompact makes the MODEL author its handoff (~30-60s), so /compact lands mid-authoring and races the model-authored-handoff guarantee. Fix (precompactWaitMs, default 75s) written as a patch-sibling because all 3 zulu files are peer-dirty with an uncommitted zebra->zulu rename refactor; applying directly would clobber that WIP. Sibling: state/shared/dashboards/patches/ZULU-PRECOMPACT-WAIT-PATCH-2026-06-11.md (exact edits + 2 new tests). Other gaps are operator decisions, not code: opt-in slots (zuluOptIn=true) + graduate from 24h dry-run grace.
```

## Files touched (2)
- state/shared/dashboards/patches/ZULU-PRECOMPACT-WAIT-PATCH-2026-06-11.md | 82 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 82 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6f9897118615`
- Milestone envelope: `mcp-server/data/milestones/SELF-COMPACTION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._