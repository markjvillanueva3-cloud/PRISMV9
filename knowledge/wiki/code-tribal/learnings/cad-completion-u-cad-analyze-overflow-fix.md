# CAD-COMPLETION/U-CAD-ANALYZE-OVERFLOW-FIX — [MAIN-FORCE] [CAD-COMPLETION]/U-CAD-ANALYZE-OVERFLOW-FIX (slot:delta): fix cad-analyze-step inspect stack-overflow on large NURBS

**Commit:** `88c20606bdd8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T11:30:37-05:00
**Tags:** cad-completion, u-cad-analyze-overflow-fix, auto-distilled

## Subject
[MAIN-FORCE] [CAD-COMPLETION]/U-CAD-ANALYZE-OVERFLOW-FIX (slot:delta): fix cad-analyze-step inspect stack-overflow on large NURBS

## Body
```
[MAIN-FORCE] [CAD-COMPLETION]/U-CAD-ANALYZE-OVERFLOW-FIX (slot:delta): fix cad-analyze-step inspect stack-overflow on large NURBS

parseStepText computed coordRange via `Math.min(...coords)`/`Math.max(...coords)` -- a SPREAD of the
full coord set. On large NURBS reference parts (blisk.stp 223 faces, impeller 485 faces) the coord
array exceeds V8's spread-arg limit -> "Maximum call stack size exceeded", so `inspect` failed and
dim-by-dim fidelity could not be measured on the real JM/NURBS corpus (the validity gate still passed,
masking it). Small synthesized parts stayed under the limit, so it was latent.

Fix (R8 surgical): track min/max in a single pass during the CARTESIAN_POINT scan -- no spread, and
no longer materializes the multi-100k-element coords array (memory win). Behavior-identical for the
in-range case. +1 regression test (60000 points / 180000 coords -- overflows the old spread, passes now).
LIVE: blisk + impeller now inspect clean (coordRange {-603.45,603.45} mm / {-391.46,371.46}); 14/14 tests.
[[reference_cad_analyze_step_nurbs_overflow_2026_06_26]]
```

## Files touched (3)
- scripts/cad-analyze-step.mjs      | 13 ++++++++++---
- scripts/cad-analyze-step.test.mjs | 11 +++++++++++
- 2 files changed, 21 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- till passed,

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 88c20606bdd8`
- Milestone envelope: `mcp-server/data/milestones/CAD-COMPLETION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._