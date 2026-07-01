# AI-SYSTEMS/U-LORACOMP-FLAKE-WIKI — [MAIN-FORCE] [AI-SYSTEMS]/U-LORACOMP-FLAKE-WIKI (slot:india): wiki lesson -- fire-and-forget handler + fixed-setTimeout test-flake (fleet-wide anti-pattern)

**Commit:** `717312264231` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T11:30:46-05:00
**Tags:** ai-systems, u-loracomp-flake-wiki, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS]/U-LORACOMP-FLAKE-WIKI (slot:india): wiki lesson -- fire-and-forget handler + fixed-setTimeout test-flake (fleet-wide anti-pattern)

## Body
```
[MAIN-FORCE] [AI-SYSTEMS]/U-LORACOMP-FLAKE-WIKI (slot:india): wiki lesson -- fire-and-forget handler + fixed-setTimeout test-flake (fleet-wide anti-pattern)

Promotes the U-LORACOMP-FLAKE-FIX root-cause to the compounding wiki (R15). Reusable: a single full-engines/-slice load run surfaced ~65 failures across 7 OTHER test files with the same shape (un-awaited handler.then + fixed setTimeout race under maxConcurrency). Documents the misdiagnosis trap (isolate:true rules out cross-file state pollution -- don't bisect for a polluter that cannot exist), the await-the-real-promise fix, and a detection grep for a golf/owner hygiene sweep. Links the corrected diagnosis memory.
```

## Files touched (2)
- knowledge/wiki/lessons/test-fire-and-forget-settimeout-load-flake.md | 59 ++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 59 insertions(+)

## Lessons surfaced in commit body
- lesson -- fire-and-forget handler + fixed-setTimeout test-flake (fleet-wide anti-pattern)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 717312264231`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._