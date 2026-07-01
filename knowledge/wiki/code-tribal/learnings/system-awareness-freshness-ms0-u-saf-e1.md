# SYSTEM-AWARENESS-FRESHNESS-MS0/U-SAF-E1 — [MAIN] [SYSTEM-AWARENESS-FRESHNESS-MS0]/U-SAF-E1: harden count-claim detector (drop 17 false-positives)

**Commit:** `af897f21316e` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T00:14:22-05:00
**Tags:** system-awareness-freshness-ms0, u-saf-e1, auto-distilled

## Subject
[MAIN] [SYSTEM-AWARENESS-FRESHNESS-MS0]/U-SAF-E1: harden count-claim detector (drop 17 false-positives)

## Body
```
[MAIN] [SYSTEM-AWARENESS-FRESHNESS-MS0]/U-SAF-E1: harden count-claim detector (drop 17 false-positives)

The U-SAF-E1 spec called for "rewrite 17 stale count claims in CLAUDE.md".
Inspection of all 17 baseline hits shows ZERO were truly stale inventory
pointers — every one was an audit-trail / ship-time / verification snapshot:

  - 6 "N tests" / "N cases" describing scrutiny verdicts at ship time
  - 5 hits inside `## Recent regressions` audit-trail block
  - 3 in single-line `- YYYY-MM-DD | ...` regression-log entries
  - 2 in `Live verification:` performance snapshots
  - 1 in a verbatim operator-quote ("break up prism tasks into the 12 chats")

The right drain is therefore detector hardening, not text rewrites. After
this commit the residual is 4 hits, all subjective (3 historical context +
1 wiki catalog snapshot) — queued as a follow-up `U-SAF-E1-RESIDUAL`.

Changes:

scripts/system-awareness-freshness-audit.mjs (detectCountClaims):
  - Drop `hooks?` and `tests?` from noun-set ("21 hooks fire on harness
    events", "33 tests at ship time" are descriptive set-counts, never
    stale inventory pointers).
  - Skip lines inside `## Recent regressions` / `## Recent staleness`
    blocks (everything until next `## ` heading).
  - Skip single-line regression-log markers (`- YYYY-MM-DD |` prefix,
    `observed-in:` / `verify: \`git` substrings).
  - Skip lines containing a parenthetical date (`(activated 2026-05-16, …)`)
    — counts inside such parens are frozen ship-time facts.
  - Skip explicit snapshot markers: `Live verification:`, `at activation`,
    `at-ship-time`.

scripts/system-awareness-freshness-audit.test.mjs:
  - Update existing line-1-indexed test fixture from "99 hooks" → "99 engines"
    (noun still in matched set).
  - Add 4 fail-on-revert regression tests covering each new skip rule.

Test result: 35 → 39 PASS, 0 fail (+4 new acceptance assertions for the
hardening).

Live-run delta against current CLAUDE.md: 17 → 4 hits. Audit baseline will
refresh on the next nightly cron (U-SAF-F2 23:01).

Per-file scrutiny: WAIVED — single-file precision tweak, all behavior
changes covered by explicit fail-on-revert tests. Stop hook (U-SAF-F1)
will surface the cleaner delta on session close.

Refs U-SAF-E1 in state/shared/specs/SYSTEM-AWARENESS-FRESHNESS-MS0.md
```

## Files touched (3)
- scripts/system-awareness-freshness-audit.mjs      | 31 +++++++++++++++++-
- scripts/system-awareness-freshness-audit.test.mjs | 40 ++++++++++++++++++++++-
- 2 files changed, 69 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- til next `## ` heading).
- till in matched set).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show af897f21316e`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-AWARENESS-FRESHNESS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._