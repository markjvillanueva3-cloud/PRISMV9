# SYSTEM-VIZ-UPGRADES-MS0/U-FOLD-DEFAULT — [MAIN] [SYSTEM-VIZ-UPGRADES-MS0]/U-FOLD-DEFAULT: auditable newly-built fold-debt (NOT flip default)

**Commit:** `4ccd92177c00` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T17:10:16-05:00
**Tags:** system-viz-upgrades-ms0, u-fold-default, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ-UPGRADES-MS0]/U-FOLD-DEFAULT: auditable newly-built fold-debt (NOT flip default)

## Body
```
[MAIN] [SYSTEM-VIZ-UPGRADES-MS0]/U-FOLD-DEFAULT: auditable newly-built fold-debt (NOT flip default)

W1 from /forge-audit-v2. The audit suggested flipping FOLD_NEWLY_BUILT to ON
— REJECTED: that reintroduces the documented 2026-05-10 incident (91s x N-chat
git-contention storm + multi-minute hangs). Karpathy R7/R12. The skip is
correct; the real latent risk is narrower and was silent: if commits pause,
the LAST newly-built batch is folded never.

Fix = make the skip auditable, not flip the dangerous default:
- .newly-built-fold-debt.json marker written every run {status,pendingCount,ts}
- `--fold-debt-status` read-only CLI exits 1 when a skipped fold is stuck
  > PRISM_FOLD_DEBT_MAX_HRS (default 6h): the re-measurable channel.
- pure foldDebtVerdict() (10 deterministic tests incl. adversarial).
- REAL consumer wired: stop-system-viz-drift.mjs (wired Stop hook,
  settings.json:387 C:+H:) surfaces a STUCK fold fleet-wide at Stop.

Two P0s caught by per-file scrutiny + fixed (RGS-MS1 hermetic-fake lesson):
- P0#1: readNewlyBuiltCount read wrong key -> ALWAYS 0 on real
  {totals:{totalNew},entries} shape. Now reads totals.totalNew. Live: 51758.
- P0#2: --fold-debt-status had no consumer -> wired into stop-system-viz-drift.
- P1: exit-code untested -> 6 real-data subprocess tests (env-pointed tmp
  fixtures). 16/16 green.

Also fixed a self-introduced bug: export made the module importable which ran
the ~80s chain on import -> wrapped chain in main() behind entry-point guard
(import now 19ms). Env-overridable FOLD_DEBT_PATH/NEWLY_BUILT_PATH for tests.

2-reviewer per-file gate: FAIL (2 P0) -> fix -> re-dispatch -> PASS/PASS.
Path-scoped commit (peer files in shared index untouched).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .claude/hooks/stop-system-viz-drift.mjs |  21 ++++
- scripts/system-viz-on-commit.mjs        | 132 ++++++++++++++++++++-
- scripts/system-viz-on-commit.test.mjs   | 195 ++++++++++++++++++++++++++++++++
- 3 files changed, 342 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- lesson):
- wrong key -> ALWAYS 0 on real

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4ccd92177c00`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-UPGRADES-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._