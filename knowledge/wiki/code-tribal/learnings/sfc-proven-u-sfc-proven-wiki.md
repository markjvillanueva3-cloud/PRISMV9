# SFC-PROVEN/U-SFC-PROVEN-WIKI — [MAIN-FORCE] [SFC-PROVEN]/U-SFC-PROVEN-WIKI (slot:oscar): document SFC proven-pipeline architecture + 4 stale-finding corrections (R15 knowledge-capture + bug-finding-wiki-gate)

**Commit:** `3298f26b3177` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T08:51:55-05:00
**Tags:** sfc-proven, u-sfc-proven-wiki, auto-distilled

## Subject
[MAIN-FORCE] [SFC-PROVEN]/U-SFC-PROVEN-WIKI (slot:oscar): document SFC proven-pipeline architecture + 4 stale-finding corrections (R15 knowledge-capture + bug-finding-wiki-gate)

## Body
```
[MAIN-FORCE] [SFC-PROVEN]/U-SFC-PROVEN-WIKI (slot:oscar): document SFC proven-pipeline architecture + 4 stale-finding corrections (R15 knowledge-capture + bug-finding-wiki-gate)

knowledge/wiki/architecture/sfc-proven-pipeline.md -- components (aggregator persistence,
versioned store, corpus harness, mill catalog seed), load-at-init wiring, live validation
numbers (16,558 lathe programs / 94,019 samples / 63 param sets), the caveat-#2 resolution +
convergence direction, and the 4 stale-finding corrections (mill bugs already fixed; corpus
16,558 not 24,545/34,993; convergence 4-broken-cases already fixed; frontend deprecate-orphan
is backwards). Closes the R15 cycle (wire->test->validate->document) for the proven workstream.
```

## Files touched (2)
- knowledge/wiki/architecture/sfc-proven-pipeline.md | 83 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 83 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3298f26b3177`
- Milestone envelope: `mcp-server/data/milestones/SFC-PROVEN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._