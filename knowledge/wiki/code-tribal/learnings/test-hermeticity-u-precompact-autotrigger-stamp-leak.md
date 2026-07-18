# TEST-HERMETICITY/U-PRECOMPACT-AUTOTRIGGER-STAMP-LEAK — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TEST-HERMETICITY]/U-PRECOMPACT-AUTOTRIGGER-STAMP-LEAK (slot:alpha): fix flaky precompact-auto-trigger test (fail-after-first-run)

**Commit:** `05e3c45196b4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T00:16:47-05:00
**Tags:** test-hermeticity, u-precompact-autotrigger-stamp-leak, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TEST-HERMETICITY]/U-PRECOMPACT-AUTOTRIGGER-STAMP-LEAK (slot:alpha): fix flaky precompact-auto-trigger test (fail-after-first-run)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TEST-HERMETICITY]/U-PRECOMPACT-AUTOTRIGGER-STAMP-LEAK (slot:alpha): fix flaky precompact-auto-trigger test (fail-after-first-run)

Found while validating U-PRECOMPACT-MEMORY-SEED: precompact-auto-trigger.mjs
writes per-session dedup markers (precompact-auto-soft-fired-<sid> +
precompact-pending-<sid>) to a HARDCODED shared CACHE_DIR. The test uses FIXED
session ids and only cleaned tmpDir (the transcript), never the markers — so the
SOFT-band subtest (test-softlegit-cafebabe) saw a leaked dedup-suppress on every
run after the first → 13/14, fleet-wide stop_on_failing_tests hazard. Add
cleanTestMarkers() (removes ONLY test-/tta sids, never a live claude-<hex>
marker) in beforeEach + afterEach. Proven hermetic: 3 consecutive runs 14/14,
zero markers leaked. Test-only; no production hook change.
```

## Files touched (2)
- .claude/hooks/__tests__/precompact-auto-trigger.test.mjs | 22 ++++++++++++++++++++++
- 1 file changed, 22 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 05e3c45196b4`
- Milestone envelope: `mcp-server/data/milestones/TEST-HERMETICITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._