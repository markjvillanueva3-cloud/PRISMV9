# ZULU-LEDGER-RECONCILE/U-ZLR-META-UTIL-HARDEN — [MAIN-FORCE] [ZULU-LEDGER-RECONCILE]/U-ZLR-META-UTIL-HARDEN (slot:zulu): harden meta-utilization fail-soft direction (3-of-3 arm A+C convergent P2)

**Commit:** `6a0608f26e5f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T18:11:06-05:00
**Tags:** zulu-ledger-reconcile, u-zlr-meta-util-harden, auto-distilled

## Subject
[MAIN-FORCE] [ZULU-LEDGER-RECONCILE]/U-ZLR-META-UTIL-HARDEN (slot:zulu): harden meta-utilization fail-soft direction (3-of-3 arm A+C convergent P2)

## Body
```
[MAIN-FORCE] [ZULU-LEDGER-RECONCILE]/U-ZLR-META-UTIL-HARDEN (slot:zulu): harden meta-utilization fail-soft direction (3-of-3 arm A+C convergent P2)

Both 3-of-3 PASS arms flagged the same robustness gap: newestJsonlTs returned null on a
torn/partial FINAL JSONL line (the exact crash-mid-append case), and a null drain age made
gradeOctopusUtilization skip the 'fell behind' branch -> false-green 'healthy trickle' for a
genuinely stalled drain. Wrong fail-soft direction for a truth-harness.

Fixes (all toward needs-attention, never false-green):
- newestJsonlTs walks BACKWARD to the newest PARSEABLE+timestamped record (survives a torn
  final line) instead of trusting only the last line.
- gradeOctopusUtilization: unknown drain recency (null) atop a non-empty queue -> UNDER-UTILIZED
  ('verify drain ran'), not UTILIZED.
- drain-recency keyed to drained_at/processed_at only (verified present in live records); an
  enqueue ts fallback would understate staleness -> false-green.
+2 tests (torn-final-line walk-back, null-age-on-backlog -> UNDER). 27/27. Live octopus
preserved (45.5h within window, drained_at 2026-06-21).
```

## Files touched (3)
- scripts/reconcile-zulu-ledger.mjs      | 33 +++++++++++++++++++++++++--------
- scripts/reconcile-zulu-ledger.test.mjs | 12 ++++++++++++
- 2 files changed, 37 insertions(+), 8 deletions(-)

## Lessons surfaced in commit body
- TIL-HARDEN (slot:zulu): harden meta-utilization fail-soft direction (3-of-3 arm A+C convergent P2)
- tilization skip the 'fell behind' branch -> false-green 'healthy trickle' for a
- Wrong fail-soft direction for a truth-harness.
- tilization: unknown drain recency (null) atop a non-empty queue -> UNDER-UTILIZED
- TILIZED.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6a0608f26e5f`
- Milestone envelope: `mcp-server/data/milestones/ZULU-LEDGER-RECONCILE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._