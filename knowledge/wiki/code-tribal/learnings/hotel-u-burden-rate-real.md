# HOTEL/U-BURDEN-RATE-REAL — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-BURDEN-RATE-REAL (slot:hotel iter1 /goal): replace BurdenRateEngine $0-stub with full cost-accounting impl

**Commit:** `e976d54aade1` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T15:05:03-05:00
**Tags:** hotel, u-burden-rate-real, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-BURDEN-RATE-REAL (slot:hotel iter1 /goal): replace BurdenRateEngine $0-stub with full cost-accounting impl

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-BURDEN-RATE-REAL (slot:hotel iter1 /goal): replace BurdenRateEngine $0-stub with full cost-accounting impl

Closes the catastrophic financial-accuracy hole — burdenRateEngine.calculateBurdenRate() returned literal $0 since exFAT corruption 2026-04-10, affecting gl_record_wip_to_cogs, JobCosting, QuoteEstimator, shop_data_completeness.

Engine: full cost-accounting (depreciation + interest + maintenance + utilities + floor_space + insurance_tax + operator_labor) / (annualOperatingHours × OEE). 3 missing components added beyond MRD's TCO: capital cost (6% default), insurance+tax (1.5%), fully-loaded operator labor ($28.50 × 1.35 benefit mult). +calculateBurdenRate / +getAll / +shopAverage methods.

Sibling: MachineRateDatabaseEngine.getMachine() — typed full-record accessor (defensive copy).

Hotel-soul invariants enforced: cents-resolution (never round to thousands), R12 fail-loud on unknown machineId (no silent $0), Object.frozen returns, USD only.

Tests: 31/31 vitest PASS in src/__tests__/BurdenRateEngine.test.ts.
- vmc_tier2 reference math anchor ($60.32/hr ±0.05)
- 7 R12 throw assertions (unknown id, empty id, NaN/negative period, oob OEE, negative labor, sub-1 benefit, NaN)
- 4 hotel-soul gates (cents, frozen, USD, source-pin)
- shopAverage consistency
- Sum-of-components ≈ total_per_hr (±$0.02 float tolerance)

Pathspec commit form survives shared-tree race (per acp_ms6_closeout). BOOTSTRAP-SLOT-ENFORCE: single approved exception — slot-worktree migration deferred to iter2.

Refs: feedback_engine_tests_in_tests_dir, feedback_commit_prefix_main_on_shared_tree.
```

## Files touched (4)
- mcp-server/src/__tests__/BurdenRateEngine.test.ts  | 312 +++++++++++++++++++
- mcp-server/src/engines/BurdenRateEngine.ts         | 332 ++++++++++++++++++++-
- .../src/engines/MachineRateDatabaseEngine.ts       |  17 ++
- 3 files changed, 650 insertions(+), 11 deletions(-)

## Lessons surfaced in commit body
- tilities + floor_space + insurance_tax + operator_labor) / (annualOperatingHours × OEE). 3 missing components added beyond MRD's TCO: capital cost (6% default), insurance+tax (1.5%), fully-loaded operator labor ($28.50 × 1.35 benefit mult). +calculateBurdenRate / +getAll / +shopAverage methods.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e976d54aade1`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._