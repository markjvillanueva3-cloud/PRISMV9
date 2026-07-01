# KIENZLE-LATHE-WIZARD/U-W-STEP-SEGMENT — [MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W-STEP-SEGMENT (slot:whiskey): multi-body STEP segmentation -> pick the part body

**Commit:** `120814758506` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T09:24:41-05:00
**Tags:** kienzle-lathe-wizard, u-w-step-segment, auto-distilled

## Subject
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W-STEP-SEGMENT (slot:whiskey): multi-body STEP segmentation -> pick the part body

## Body
```
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W-STEP-SEGMENT (slot:whiskey): multi-body STEP segmentation -> pick the part body

Closes the iter4 finding: JM "OP1/OP2" Fusion STEPs are multi-body (part + stock/fixture),
so the combined mesh is not a clean body of revolution (suspect). New
selectBestBodyProfile(meshArrays) evaluates each occt body + the combined-all and returns
the LARGEST CLEAN body of revolution (the part); if none is clean it returns the
least-suspect candidate with suspect=true (never passes a fixture off as the part). Probe
rewired: stepFileToProfile -> selectBestBodyProfile(occtMeshArrays(result)).

LIVE-VALIDATED (R15) across 3 real OKUMA parts:
  - AGRATI 9070219 OP2 -> body 0 CLEAN: score 0.015, suspect=false, OD 15.4mm (a real
    small turned part) -> a USABLE profile.
  - FASTENAL A15267-001 / ATF AIT-30366A-1C -> no clean turned body (setup-exports) ->
    correctly suspect=true -> the loop will skip them. Honest, not a false success.

16/16 core + 7/7 probe tests. 2-arm per-file scrutiny PASS/PASS; both P2s closed inline:
single-body double-count removed (candidates_evaluated reflects real bodies) + pick_ambiguous
flag (warns when >=2 comparably-large clean bodies could confuse part vs round fixture).
body_candidates summary returned for consumer audit/override.

iter6: profile -> TurningInput (skip suspect/ambiguous) -> Rung C driver -> score vs the
part .MIN -> flip full_geometry_loop_closed.
```

## Files touched (5)
- scripts/lathe-step-profile-probe.mjs              | 18 ++++++++++++++----
- scripts/lathe-step-profile-probe.test.mjs         | 17 ++++++++++++++++-
- scripts/lib/step-mesh-rotational-profile.mjs      | 39 +++++++++++++++++++++++++++++++++++++++
- scripts/lib/step-mesh-rotational-profile.test.mjs | 45 ++++++++++++++++++++++++++++++++++++++++++++-
- 4 files changed, 113 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 120814758506`
- Milestone envelope: `mcp-server/data/milestones/KIENZLE-LATHE-WIZARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._