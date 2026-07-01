# DISCOVERY-EFFICIENCY/U-DEDUP-CLUSTER-VERDICT — [MAIN-FORCE] [DISCOVERY-EFFICIENCY]/U-DEDUP-CLUSTER-VERDICT: correct Category-A 'true dups' overclaim -- all both-consumed, owner-merge not free quarantine

**Commit:** `ba4fb529cd05` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T13:13:05-05:00
**Tags:** discovery-efficiency, u-dedup-cluster-verdict, auto-distilled

## Subject
[MAIN-FORCE] [DISCOVERY-EFFICIENCY]/U-DEDUP-CLUSTER-VERDICT: correct Category-A 'true dups' overclaim -- all both-consumed, owner-merge not free quarantine

## Body
```
[MAIN-FORCE] [DISCOVERY-EFFICIENCY]/U-DEDUP-CLUSTER-VERDICT: correct Category-A 'true dups' overclaim -- all both-consumed, owner-merge not free quarantine

Verify-on-disk on the 3 Category-A same-stem pairs: every member has live consumers
(BatchCAMStrategyEngines2=1, JMDieLatheProgramUpgraderV2Engine=2, HyperMillMetricCfgExtractorEngine=2),
so none is a free tango quarantine -- they need owner-led merge (repoint consumers + merge
logic), routed to CAM(kilo)/lathe(whiskey)/hyperMILL. ClusteringEngine = two different impls
sharing a name, not a dup. R12 correction of my own report's overclaim. No new build: engine
fan-in already computed by generate-engine-import-edges.mjs (do not rebuild); the new-audit-tool
space is saturated -- this iteration's value is verify+correct+route, not a new scanner.
```

## Files touched (2)
- state/shared/specs/TANGO-ENGINE-ALGO-ASSESSMENT-2026-06-15.md | 66 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-----
- 1 file changed, 61 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ba4fb529cd05`
- Milestone envelope: `mcp-server/data/milestones/DISCOVERY-EFFICIENCY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._