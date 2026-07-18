# SFC-CONVERGENCE/U-SFC-ORCH-TURNING-OPTIMIZEFN — [MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-ORCH-TURNING-OPTIMIZEFN (slot:oscar): close the last turning rpm site -- PSO optimizeFn now uses workpiece diameter too

**Commit:** `e346512bacfe` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T16:15:56-05:00
**Tags:** sfc-convergence, u-sfc-orch-turning-optimizefn, auto-distilled

## Subject
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-ORCH-TURNING-OPTIMIZEFN (slot:oscar): close the last turning rpm site -- PSO optimizeFn now uses workpiece diameter too

## Body
```
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-ORCH-TURNING-OPTIMIZEFN (slot:oscar): close the last turning rpm site -- PSO optimizeFn now uses workpiece diameter too

Follow-on to U-SFC-ORCH-TURNING-FIX (both physics+safety reviewers flagged this site as the
remaining gap). The PSO Pareto optimizer optimizeFn (a separate module function) computed its
internal objective-evaluation rpm from the TOOL diameter -- the same milling-centric bug as the
main compute() path, so turning optimization objectives (MRR/life/Ra) were evaluated at the wrong
rpm. Applied the identical rpmDiameter pattern (workpiece diameter for lathe ops, tool-dia fallback)
mirroring the reviewed compute() fix. After this there are 0 `Math.PI * D` rpm sites left -- every
turning rpm/Vc conversion in the file now uses the workpiece diameter.

build:fast clean; turning test 5/5 still green; milling unchanged. The optimizeFn bounds (ap/ae)
stay tool-relative -- a separate milling-shaped optimization-search-space gap, not the rpm.
```

## Files touched (2)
- mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts | 10 +++++++++-
- 1 file changed, 9 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till green; milling unchanged. The optimizeFn bounds (ap/ae)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e346512bacfe`
- Milestone envelope: `mcp-server/data/milestones/SFC-CONVERGENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._