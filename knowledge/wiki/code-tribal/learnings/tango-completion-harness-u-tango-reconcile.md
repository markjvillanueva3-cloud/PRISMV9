# TANGO-COMPLETION-HARNESS/U-TANGO-RECONCILE — [MAIN-FORCE] [TANGO-COMPLETION-HARNESS]/U-TANGO-RECONCILE: verify-on-disk queue reconciler + 5th picker source + daily cron

**Commit:** `0aee908e67d6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T20:25:11-05:00
**Tags:** tango-completion-harness, u-tango-reconcile, auto-distilled

## Subject
[MAIN-FORCE] [TANGO-COMPLETION-HARNESS]/U-TANGO-RECONCILE: verify-on-disk queue reconciler + 5th picker source + daily cron

## Body
```
[MAIN-FORCE] [TANGO-COMPLETION-HARNESS]/U-TANGO-RECONCILE: verify-on-disk queue reconciler + 5th picker source + daily cron

THE FINDING (FLEET-SEARCH-DAEMON-MS0 recon, 5 sonnet agents): the priority-queue
surfaces ~3100 'tango-eligible' units but a verify-on-disk audit found the top 20
are 20/20 ALREADY SHIPPED -- the queue is ~100% polluted with shipped-but-
unflushed work. The 4 existing shipped-detection sources miss them because a unit
often ships under a commit subject that does NOT contain its U-ID (e.g. U-CK11
shipped as '...PHASE2BC-V2-1') and its envelope was never flipped complete.

So 'finishing all remaining tango tasks' is mostly RECONCILIATION (tango's own
domain: discovery + anti-duplication), not building 3100 duplicates.

- shipped-units-source-of-truth.mjs: NEW source (e) readVerifiedShippedOverrides
  -- unioned into buildShippedIdsUnion (+ cache key + describeShippedSources).
  Reads state/shared/verified-shipped-overrides.json (U-* only; benign failure
  direction, same as the bridge source). Also fixed a PRE-EXISTING drift failure:
  test #35 pinned U-BRIDGE-SFC-ESPRIT/commit 76dc1b53cb, now 3690 commits back
  (past the 800 scan window) -> red on clean HEAD. Rewrote it drift-resistant:
  assert every in-window bridge id lands in the union (not an aging fixture).
  55/55 green.

- tango-reconcile-queue.mjs: verify-on-disk reconciler. For each tango-eligible
  unit it extracts the U-* ids the picker checks (id-if-U-shaped + title-embedded
  U-*, mirroring extractUnitIdsFromUnit) and confirms shipped iff that EXACT
  maximal U-* token appears in a real commit subject. EXACT maximal-token equality
  (not boundary regex) is collision-safe: '-' is valid WITHIN a unit-id, so a
  boundary match wrongly let 'U-A1' match 'U-A1-ARCHETYPE...' (a different unit).
  Plus a 20-unit recon-seed (LLM-agent verify-on-disk, commit-SHA evidence) for
  units whose subject != id. Writes the overrides file + a report. --apply/--dry/
  --top/--json. LIVE: 166 exact-commit-token + 20 seed = 185 verified-shipped,
  ALL U-*, 0 false-positives (definitively checked), 167 eligible de-polluted.

- tango-reconcile-queue.test.mjs: 8 tests -- exact match, prefix NON-collision
  (U-A1 != U-A1-ARCHETYPE; U-BRIDGE-LEARN-CAM != ...-CAM-SFC), token-past-100-chars,
  no-U-token, case-insensitivity.

- install-tango-reconcile-task.ps1: durable daily cron (04:37 off-minute + AtLogOn,
  SYSTEM principal, bounded 10min, single-instance). Operator registers once
  elevated; re-runs keep the queue de-polluted as the fleet ships. PS parse clean.

SAFE BY DESIGN: writes an explicit override list (advisory); NEVER flips operator-
authoritative milestone envelopes (respects the 'close-out audit never auto-flips'
doctrine). A false-positive only hides a unit from pickup (operator-recoverable).
```

## Files touched (8)
- .claude/helpers/install-tango-reconcile-task.ps1   | 133 ++++++++++++++++++
- scripts/lib/shipped-units-source-of-truth.mjs      |  42 +++++-
- scripts/lib/shipped-units-source-of-truth.test.mjs |  24 ++--
- scripts/tango-reconcile-queue.mjs                  | 231 +++++++++++++++++++++++++++++++
- scripts/tango-reconcile-queue.test.mjs             |  51 +++++++
- state/shared/specs/TANGO-QUEUE-RECONCILE.md        | 195 ++++++++++++++++++++++++++
- state/shared/verified-shipped-overrides.json       | 955 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 7 files changed, 1618 insertions(+), 13 deletions(-)

## Lessons surfaced in commit body
- wrongly let 'U-A1' match 'U-A1-ARCHETYPE...' (a different unit).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0aee908e67d6`
- Milestone envelope: `mcp-server/data/milestones/TANGO-COMPLETION-HARNESS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._