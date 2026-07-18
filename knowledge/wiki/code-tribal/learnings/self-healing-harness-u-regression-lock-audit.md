# SELF-HEALING-HARNESS/U-REGRESSION-LOCK-AUDIT — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SELF-HEALING-HARNESS]/U-REGRESSION-LOCK-AUDIT (slot:alpha): Opik-L3 finding applied fleet-wide -- audit every documented regression for a recurrence test

**Commit:** `8971770e3412` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T20:24:28-05:00
**Tags:** self-healing-harness, u-regression-lock-audit, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SELF-HEALING-HARNESS]/U-REGRESSION-LOCK-AUDIT (slot:alpha): Opik-L3 finding applied fleet-wide -- audit every documented regression for a recurrence test

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SELF-HEALING-HARNESS]/U-REGRESSION-LOCK-AUDIT (slot:alpha): Opik-L3 finding applied fleet-wide -- audit every documented regression for a recurrence test

Implements the operator-directed Opik 'self-repairing harness' L3 finding (read
via Playwright from akshay_pachaar's article): 'every documented failure should
become a runnable regression test, so the harness gets harder to break each
cycle.' PRISM documents regressions richly (CLAUDE.md ## Recent regressions +
bug-finding memories + the bug-finding->wiki gate) but never ENFORCED that each
fix shipped a recurrence-catching test. This audits that gap.

scripts/lib/regression-lock-audit.mjs (pure core, 10 tests):
- parseRegressionEntries: extracts {date,description,sha} from the ## Recent
  regressions ledger (observed-in: sha > verify-show sha > bare hex; stops at the
  next ## heading).
- classifyLock(entry, commitFilesFn): LOCKED (fix commit touched a test file) /
  UNLOCKED (source fix, NO test = recurrence risk) / UNVERIFIABLE (no sha / stale
  sha / doc-only fix). UNVERIFIABLE NEVER inflates UNLOCKED (honest, not alarmist).
- auditRegressions: lockRate over the JUDGEABLE set (locked+unlocked) so
  unverifiable entries don't drag the denominator; UNLOCKED-first ordering.

scripts/regression-lock-audit.mjs (CLI): reads root + (--galaxies) every galaxy
CLAUDE.md, real git-show --name-only reader (fail-soft to UNVERIFIABLE on bad
sha), emits advisory state/shared/REGRESSION-LOCK-AUDIT.{md,json}. The json
.roost[] is system-viz-roost-shaped for sierra to wire a ghost.regression_unlocked
roost (PSN surfacing; this only emits the data, does not touch regen-viz).

LIVE-VALIDATED on real CLAUDE.md: 25 regressions | LOCKED 16 | UNLOCKED 4 |
UNVERIFIABLE 5 | lockRate 80.0%. The 4 UNLOCKED (1297b0a8f5, de70cddf8,
e05d90be9, 16f354e8e) are the real recurrence-risk punch list.

Advisory-only: it AUDITS, never auto-writes tests or edits CLAUDE.md. Dedup: distinct
from regression-staleness-auditor (is-the-claim-stale) + /r12-audit (fake-MCP-action
hooks). DRY note in the lib for a future shared parseRegressionSection.
R5/local-routing lesson: built inline (mechanical, no Claude judgment) after a
Workflow fan-out hit a server-side rate-limit storm.
```

## Files touched (4)
- scripts/lib/regression-lock-audit.mjs      | 128 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/regression-lock-audit.test.mjs | 100 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/regression-lock-audit.mjs          | 152 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 380 insertions(+)

## Lessons surfaced in commit body
- lesson: built inline (mechanical, no Claude judgment) after a

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8971770e3412`
- Milestone envelope: `mcp-server/data/milestones/SELF-HEALING-HARNESS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._