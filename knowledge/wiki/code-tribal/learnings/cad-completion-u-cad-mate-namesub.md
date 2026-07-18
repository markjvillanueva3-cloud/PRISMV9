# CAD-COMPLETION/U-CAD-MATE-NAMESUB — [MAIN-FORCE] [CAD-COMPLETION]/U-CAD-MATE-NAMESUB (slot:delta): scrutiny MEDIUM -- substitute solid_a/solid_b component names into the mate constrain op

**Commit:** `bb7e14b0a994` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T04:37:55-05:00
**Tags:** cad-completion, u-cad-mate-namesub, auto-distilled

## Subject
[MAIN-FORCE] [CAD-COMPLETION]/U-CAD-MATE-NAMESUB (slot:delta): scrutiny MEDIUM -- substitute solid_a/solid_b component names into the mate constrain op

## Body
```
[MAIN-FORCE] [CAD-COMPLETION]/U-CAD-MATE-NAMESUB (slot:delta): scrutiny MEDIUM -- substitute solid_a/solid_b component names into the mate constrain op

2-arm scrutiny arm A MEDIUM: cad_mate's cadquery_op emitted literal solidA/solidB placeholders ->
invalid Python if a codegen used it verbatim. Fix (R7 -- satisfies both reviewers): mate methods now
accept optional component names (a,b) substituted into .constrain(a,b,...); apply() passes
params.solid_a/solid_b (default to the clearly-marked solidA/solidB template placeholders when absent,
which the codegen fills with the real registered names). + solid_a/solid_b added to cadMateSchema. +1
regression test pinning the substitution. 22/22 pass; tsc-clean. (arm A LOW re missing .describe() was
moot -- distance_mm/angle_deg already had descriptions.)
```

## Files touched (4)
- mcp-server/src/__tests__/CADMateEngine.test.ts |  7 +++++++
- mcp-server/src/engines/CADMateEngine.ts        | 37 ++++++++++++++++++++++---------------
- mcp-server/src/schemas/cadActionSchemas.ts     |  2 ++
- 3 files changed, 31 insertions(+), 15 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bb7e14b0a994`
- Milestone envelope: `mcp-server/data/milestones/CAD-COMPLETION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._