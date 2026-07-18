# FRONTEND-APP/U-Q-SFC-TAYLOR-DEINLINE — [MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-TAYLOR-DEINLINE (slot:quebec): de-inline Taylor physics from the SFC charts -- canonical tool-life curve

**Commit:** `2ec4e1e904f2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T15:22:50-05:00
**Tags:** frontend-app, u-q-sfc-taylor-deinline, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-TAYLOR-DEINLINE (slot:quebec): de-inline Taylor physics from the SFC charts -- canonical tool-life curve

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-TAYLOR-DEINLINE (slot:quebec): de-inline Taylor physics from the SFC charts -- canonical tool-life curve

QX3 (was thought oscar-blocked; re-validated -- the EXISTING /sfc/tool-life endpoint + sfcApi.toolLife client make it canonically doable WITHOUT a new endpoint). AdvancedCharts.tsx inlined a TAYLOR {n,C} Record per ISO group + client Math.pow(C/v,1/n) on the ungated free Charts tab -- a quebec soul violation (never inline physics in the UI) that risked a curve diverging from the engine. Now: buildToolLifeCurve (lib/toolLifeCurve.ts, pure+tested) samples N speeds and asks the canonical prism_calc:tool_life per point; the UI renders engine output, never recomputes physics. Added loading/error/empty states (soul mandate) + AbortController cancellation of the in-flight batch on input-change/unmount. material threaded from the page (material.id). toolLifeCurve.test 10/10 (sampling range, current-speed inclusion, request fields forwarded, allSettled degrade, non-plottable filter, empty-on-bad-speed, signal forwarding); SFC-area 30/30 no regression; whole-project web tsc exit 0; per-file 2-arm scrutiny PASS (reviewer + code-analyzer, 0 P0/P1). SurfaceFinish Ra=f^2/(32r) kept (geometric identity, not a material constant). Remaining (oscar, optional): a single /sfc/tool-life-curve batch endpoint would replace the ~9 per-render calls.
```

## Files touched (5)
- mcp-server/web/src/__tests__/toolLifeCurve.test.ts   | 135 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/components/sfc/AdvancedCharts.tsx | 134 ++++++++++++++++++++++++++++++++++++++--------------------
- mcp-server/web/src/lib/toolLifeCurve.ts              |  92 ++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/pages/SfcCalculatorPage.tsx       |   1 +
- 4 files changed, 316 insertions(+), 46 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2ec4e1e904f2`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._