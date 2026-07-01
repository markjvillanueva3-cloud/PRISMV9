# FE-SPECIALTY-CONTRACT/U-FE-WELDING-JOINTDESIGN — [MAIN-FORCE] [FE-SPECIALTY-CONTRACT]/U-FE-WELDING-JOINTDESIGN (slot:bravo): wire /welding/joint-design as a sizing search (501->200)

**Commit:** `db8c5d8b8aca` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T08:37:13-05:00
**Tags:** fe-specialty-contract, u-fe-welding-jointdesign, auto-distilled

## Subject
[MAIN-FORCE] [FE-SPECIALTY-CONTRACT]/U-FE-WELDING-JOINTDESIGN (slot:bravo): wire /welding/joint-design as a sizing search (501->200)

## Body
```
[MAIN-FORCE] [FE-SPECIALTY-CONTRACT]/U-FE-WELDING-JOINTDESIGN (slot:bravo): wire /welding/joint-design as a sizing search (501->200)

Backend-for-frontend: SPA /api/v1/welding/joint-design returned a deferred 501. Now runs
weld_strength_calculate as a SIZING SEARCH -- the smallest standard fillet leg (>= the AWS
D1.1 code minimum for the plate, <= plateT-1.5 max) whose computed safety factor meets the
target (JointDesignParams.safety_factor, default 1.5 / AISC). The engine analyzes stresses at
each candidate; the adapter owns only the deterministic smallest-feasible short-circuit search.

JointDesignResult mapping: weld_size_mm = chosen leg (a REAL design output), throat_thickness_mm,
allowable_stress_MPa, actual_stress_MPa (combined), utilization_pct = actual/allowable*100.
load_type->force_direction + joint_type->weld_type mappers; load_N->force_n. No-feasible case
returns 200 with the largest tried leg + a fail-loud 'increase weld length / electrode / full-pen'
recommendation (analysis-with-guidance, not a hard error). effective_length_mm/groove_angle_deg/
root_gap_mm OMITTED (engine produces no joint-prep geometry) -> SPA type marks those 3 optional.

Tests: specialty-welding-jointdesign-route.test.ts (9/9) round-trips the REAL WeldStrengthEngine:
smallest-leg-passes (leg 5, util ~19.5%) + escalation (6/8/10 fail -> 12 at sf 1.54) + no-feasible
(largest=8 + recommendation, still 200) + safety_factor override (stricter SF -> larger feasible leg)
+ load_type 'bending'->combined + dispatcher error->400 + omitted-field + inspection-501. Updated
the welding/calculate test's stale sibling-501 assertion (joint-design now wired). tsc clean; 36
specialty+welding tests green. Reviewer PASS (4 P2: maxLeg cap auto-fixed, coverage added, 1 dismissed
as a float-rounding misread, 1 dead-code documented).

Remaining specialty 501s: /welding/inspection (needs NDT engine), /forming/{casting,molding}.
```

## Files touched (5)
- .../src/__tests__/specialty-welding-jointdesign-route.test.ts    | 193 +++++++++++++++++++++++++++++
- mcp-server/src/__tests__/specialty-welding-route.test.ts         |   9 +-
- mcp-server/src/routes/specialty.ts                               |  84 ++++++++++++-
- mcp-server/web/src/types/welding.ts                              |   9 +-
- 4 files changed, 287 insertions(+), 8 deletions(-)

## Lessons surfaced in commit body
- tilization_pct = actual/allowable*100.
- til ~19.5%) + escalation (6/8/10 fail -> 12 at sf 1.54) + no-feasible
- till 200) + safety_factor override (stricter SF -> larger feasible leg)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show db8c5d8b8aca`
- Milestone envelope: `mcp-server/data/milestones/FE-SPECIALTY-CONTRACT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._