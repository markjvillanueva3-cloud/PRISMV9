# SFC-ACCURACY-MS2/U-SFC-ACCURACY-AUDITOR — [MAIN-FORCE] [SFC-ACCURACY-MS2]/U-SFC-ACCURACY-AUDITOR (slot:oscar): corpus accuracy auditor -- verify 11.2M computed SFC configs against closed-form identities

**Commit:** `db05d65c8f42` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T08:21:26-05:00
**Tags:** sfc-accuracy-ms2, u-sfc-accuracy-auditor, auto-distilled

## Subject
[MAIN-FORCE] [SFC-ACCURACY-MS2]/U-SFC-ACCURACY-AUDITOR (slot:oscar): corpus accuracy auditor -- verify 11.2M computed SFC configs against closed-form identities

## Body
```
[MAIN-FORCE] [SFC-ACCURACY-MS2]/U-SFC-ACCURACY-AUDITOR (slot:oscar): corpus accuracy auditor -- verify 11.2M computed SFC configs against closed-form identities

The SFC-ACCURACY-MS1 harness COMPUTES millions of speed/feed configs but had
NO correctness auditor over them -- the missing half of the operator goal 'run
millions of variations so we KNOW all calculations are accurate'. This is that
verification half.

scripts/lib/sfc-accuracy-audit-lib.mjs (pure core + all-rows streaming reader):
  invariant checks per row -- null_numeric (12 required-finite fields nulled by a
  non-finite calc), neg_physical, zero_speed (safe/unsafe split), feed_inconsistent
  (vf = rpm*fz*flutes, the core SFC identity), vc_rpm_inconsistent (mill, pi*D*n/1000),
  safe_with_critical_limit (safety self-contradiction), conf/pch range, life sentinel.
  Plus measureRow() -> worst-case accuracy MARGIN (feed/vc relative deviation),
  floored at 15 mm/min so tiny-feed rounding doesn't inflate the headline.
scripts/sfc-accuracy-audit.mjs (CLI): streams corpus, writes JSON+MD report.
scripts/lib/sfc-accuracy-audit-lib.test.mjs: 26 tests (real corpus reference rows
  + >=3 failure + >=2 adversarial; mutation-verified by 2-arm scrutiny).

LIVE RESULT on the full 11,213,600-row corpus (mill 6.47M + lathe 4.74M), 102s:
  GRADE PASS -- 0 critical, 0 warn, 0 errors, 9 torn-line skips.
  Worst-case feed-identity deviation 2.69% (sub-mm low-feed drilling_on_lathe);
  cutting-speed identity holds to 0.51% (mill). 81.3% of configs saturate tool-life
  at the 9999-min cap (INFO -- non-differentiating tool-life region, for india/oscar).
  -> Evidence the SFC engine's calculations are physically valid + self-consistent
  across the entire variation space. Report: state/shared/SFC-ACCURACY-AUDIT.{json,md}

NOTE: the SFC-ACCURACY-MS1 batch scheduled tasks (Guard/Mill/Lathe) are DISABLED
since 2026-06-17 (deliberate; LastResult 0). Accuracy is PROVEN on the existing
11.2M corpus; re-enabling to extend coverage is an operator decision (surfaced, not
silently actuated). Per-file 2-arm scrutiny PASS (round 2, mutation-tested).
```

## Files touched (6)
- scripts/lib/sfc-accuracy-audit-lib.mjs      | 428 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/sfc-accuracy-audit-lib.test.mjs | 249 +++++++++++++++++++++++++++++++++++++++
- scripts/sfc-accuracy-audit.mjs              | 139 ++++++++++++++++++++++
- state/shared/SFC-ACCURACY-AUDIT.json        | 262 ++++++++++++++++++++++++++++++++++++++++++
- state/shared/SFC-ACCURACY-AUDIT.md          |  27 +++++
- 5 files changed, 1105 insertions(+)

## Lessons surfaced in commit body
- NOTE: the SFC-ACCURACY-MS1 batch scheduled tasks (Guard/Mill/Lathe) are DISABLED

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show db05d65c8f42`
- Milestone envelope: `mcp-server/data/milestones/SFC-ACCURACY-MS2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._