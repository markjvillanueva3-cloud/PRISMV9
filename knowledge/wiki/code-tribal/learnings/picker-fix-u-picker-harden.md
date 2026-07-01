# PICKER-FIX/U-PICKER-HARDEN — [MAIN] [PICKER-FIX]/U-PICKER-HARDEN: U-ID gate + mtime cache + fail-on-revert oracle

**Commit:** `9cdc2db2e198` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T19:16:00-05:00
**Tags:** picker-fix, u-picker-harden, auto-distilled

## Subject
[MAIN] [PICKER-FIX]/U-PICKER-HARDEN: U-ID gate + mtime cache + fail-on-revert oracle

## Body
```
[MAIN] [PICKER-FIX]/U-PICKER-HARDEN: U-ID gate + mtime cache + fail-on-revert oracle

Iter 2 of the picker-fix /loop addresses both per-file scrutiny P1 findings
from iter 1 (commit c84a0c7cbc) without leaving anything deferred.

Reviewer A P1 — milestone-ID collision risk:
  - Added UNIT_ID_RE (/^U-/i) gate applied to BOTH readShippedFromProgress
    AND collectCompletedFromEnvelope. Pickup candidates are always U-* in
    PRISM (empirically verified across 734 envelopes); milestone-ids and
    findings (F1, G9, ms-a) now correctly never enter the shipped set.
  - Two new fail-on-revert tests: (7) milestone-id excluded even when
    status=completed; (8) findings + lowercase milestone shapes filtered.

Reviewer A/B P1 — mtime memoization + test placebo:
  - Module-level _unionCache keyed on (progressMtime, maxMtime(envelopesDir)).
    Custom-path calls bypass cache so hermetic tests never see cross-test
    bleed. _resetShippedUnionCache exported for test hygiene.
  - 9.3x speedup measured live: cold 111ms -> warm 11ms (1274 ids).
  - Doc-comment corrected: in-process cache helps within-process repeated
    calls (CLI, Monitor loop) NOT cross-process Stop-hook spawns. Disk-
    cache is queued as a P2 follow-up if Stop-hook latency becomes load-
    bearing.
  - _peekShippedUnionCache exported (test-only @internal) to enable a real
    fail-on-revert oracle for cache invalidation.

Test 26 (mtime invalidation) rewritten — was a placebo asserting only
`size > 0`. Now writes a sentinel envelope with a unique U-CACHE-SENTINEL-*
id and asserts BOTH (a) envMtime advances post-touch AND (b) the sentinel
appears in the re-read union (proves disk was actually re-read, not just
that the mtime stamp updated). Mid-test discovered the IDs are stored
uppercase per norm() — sentinel queries match accordingly.

Tests: 33/33 PASS (26 helper + 7 pre-existing priority-queue).

Live picker behavior unchanged: priority-queue --pick --slot echo still
returns U-CLEANUP-B9 (genuinely unshipped) at the top. U-ID gate dropped
union from 1611 -> 1274 (-337 milestone-ids and findings correctly
excluded; none were ever real pickup candidates).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- scripts/lib/shipped-units-source-of-truth.mjs      | 104 +++++++++++++++--
- scripts/lib/shipped-units-source-of-truth.test.mjs | 129 ++++++++++++++++++++-
- 2 files changed, 223 insertions(+), 10 deletions(-)

## Lessons surfaced in commit body
- till

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9cdc2db2e198`
- Milestone envelope: `mcp-server/data/milestones/PICKER-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._