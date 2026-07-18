# PSN-SYNERGY-INSPECT-MS1/U-DENSITYFLOOR-RECAL — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-INSPECT-MS1]/U-DENSITYFLOOR-RECAL (slot:alpha): scale-invariant ROI banding — fix density-floor that made P0 meaningless

**Commit:** `1be4e99e065a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-02T20:05:54-05:00
**Tags:** psn-synergy-inspect-ms1, u-densityfloor-recal, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-INSPECT-MS1]/U-DENSITYFLOOR-RECAL (slot:alpha): scale-invariant ROI banding — fix density-floor that made P0 meaningless

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-INSPECT-MS1]/U-DENSITYFLOOR-RECAL (slot:alpha): scale-invariant ROI banding — fix density-floor that made P0 meaningless

The inspector's under_wired_score compared absolute density=refs/(count_a*count_b) to a
fixed densityFloor=0.001. At production scale (legs of thousands of nodes) density is ALWAYS
<<0.001, so every non-empty pair scored ~1 -> P0, and adding real edges NEVER reduced the
P0 count (observed: p0 held at 37 across the obsidian/wiki/tribal collector commits this
session). Replaced with the scale-invariant ranking the SynergyReport schema already
documents for roi_band: rank both-non-empty CONNECTED pairs by density, score by quantile
into [0,0.84] (strictly below the 0.85 P0 floor); zero-ref both-non-empty pairs stay at 1.0
(the ONLY P0 band — genuinely unwired); empty-leg pairs stay 0. opts.densityFloor retained
for API back-compat (now @deprecated, no effect).

Effect (real snapshot): p0_critical 37->19, and ALL 19 P0s are now genuinely zero-ref
(verified) — P0 finally means an actionable missing bridge, with a real P1/P2 gradient
(11/12). Bands are now scale-invariant + monotonic (wiring a pair drops it out of P0; the
best-connected pair is never P0 regardless of absolute magnitude).

Non-breaking: all 25 prior tests pass unchanged (none asserted non-zero under_wired values);
+3 new tests prove the fix (P0-reduction, scale-invariance, monotonicity). 28/28. tsc clean.
```

## Files touched (3)
- mcp-server/src/__tests__/PSNSynergyInspectorEngine.test.ts | 51 +++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/PSNSynergyInspectorEngine.ts        | 56 ++++++++++++++++++++++++++++++++++++++++++++------------
- 2 files changed, 95 insertions(+), 12 deletions(-)

## Lessons surfaced in commit body
- tile

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1be4e99e065a`
- Milestone envelope: `mcp-server/data/milestones/PSN-SYNERGY-INSPECT-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._