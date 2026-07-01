# SFC-ROBUSTNESS/U-SFC-TSX-REEXEC-P2 — [MAIN-FORCE] [SFC-ROBUSTNESS]/U-SFC-TSX-REEXEC-P2 (slot:oscar): apply tsx-reexec guard to the 4th SFC sweep script (sfc-convergence-diff.mjs)

**Commit:** `d6f3593f1795` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T20:17:09-05:00
**Tags:** sfc-robustness, u-sfc-tsx-reexec-p2, auto-distilled

## Subject
[MAIN-FORCE] [SFC-ROBUSTNESS]/U-SFC-TSX-REEXEC-P2 (slot:oscar): apply tsx-reexec guard to the 4th SFC sweep script (sfc-convergence-diff.mjs)

## Body
```
[MAIN-FORCE] [SFC-ROBUSTNESS]/U-SFC-TSX-REEXEC-P2 (slot:oscar): apply tsx-reexec guard to the 4th SFC sweep script (sfc-convergence-diff.mjs)

3-of-3 scrutiny (arms A+B) FAILED the parent commit b594766c60 on a real R15/R16
completeness gap: sfc-convergence-diff.mjs has the IDENTICAL bare-node crash class --
it dynamically imports 3 .ts engines (SpeedFeedOrchestratorEngine / UltimateSpeedFeedEngine /
orchestrator-input-adapter) inside main() with no guard, so `node sfc-convergence-diff.mjs`
threw ERR_MODULE_NOT_FOUND. The parent's "Fleet scan: 0 other affected" was FALSE -- my scan
matched only STATIC imports; this one uses dynamic await import().

Fix: reexecUnderTsxIfNeeded(import.meta.url) as the first line of main() (inside main(), not
module scope, so importing this file for its pure helpers in the vitest test never relaunches).

Validated: bare `node sfc-convergence-diff.mjs` now produces the full convergence report (was
crash); sfc-convergence-diff.test.mjs 18/18 green under vitest (guard does not affect it).
COMPREHENSIVE re-scan (static AND dynamic .ts imports): all 5 sfc-*.mjs now covered
(4 guarded + sfc-parallel-combo-sweep tsx-aware). 0 remaining stragglers.
```

## Files touched (2)
- mcp-server/scripts/sfc-convergence-diff.mjs | 6 ++++++
- 1 file changed, 6 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d6f3593f1795`
- Milestone envelope: `mcp-server/data/milestones/SFC-ROBUSTNESS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._