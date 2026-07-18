---
name: echo-handoff-triage-2026-05-24
description: Cross-slot ship-grep + fossil-age triage shrank echo's consolidated open-threads 16→2 in 2 commits (iters 15+16, session 64f03cee). Reusable pattern for any slot's stale-consolidated-handoff problem.
metadata:
  type: reference
---

# Echo handoff-triage method — 16 → 2 open threads in 2 commits

Session 64f03cee (slot echo, 2026-05-24, iters 15+16). After 14 iters shipping HURCO-VM30I-FULL-PSN-MS0 the consolidated `state/shared/handoffs/consolidated/echo.md` still listed 16 "open" threads, most of which were already-shipped work. Triage shrank it to 2 in two pure-file-rename commits with zero source-code impact.

## Method (reusable for any slot)

**Step A — cross-slot ship-grep.** For each thread in `consolidated/<slot>.md`, extract every named unit ID (`U-*`) and grep `git log --grep="<unit-id>"` across the whole repo. A ship commit in *any* slot counts — cross-slot work credit is real (golf/bravo/mike/india/charlie all completed echo-claimed work this session). 13/16 echo threads had explicit ship commits.

**Step B — fossil-age filter.** Threads with age > 72h AND no per-thread specific work (only standing `INFRA-AGI-ROUTER-MS2` / `L8-P0-MS2` / `L8-P1-MS2` heartbeat pointers) are fossils, not open threads. The standing pointer is the generic /checkin-time "Next:" tag that every handoff inherits — its presence does NOT mean the thread is in flight. 3/16 echo threads matched this filter.

**Step C — archive (not delete).** Per `[[feedback_never_delete_only_disable]]`: rename to `<original>.archive.<YYYY-MM-DD>`. The consolidator script (`scripts/handoff-consolidate.mjs`) skips `.archive.*` automatically.

**Step D — regenerate + commit.** `node scripts/handoff-consolidate.mjs --slot <slot>` rewrites `consolidated/<slot>.md`. Stage the renames + the regenerated MD. One commit per pass (iter15 ship-grep, iter16 fossil-age).

## Echo numbers (this session)

| Pass | Method | Threads archived | Result |
|------|--------|------------------|--------|
| iter15 `ab5d335eff` | ship-grep | 13 | 16 → 4 |
| iter16 `afed5ba7bd` | fossil-age | 3 | 4 → 2 |

The 2 remaining open threads are the genuine in-flight work: this session's `HANDOFF-claude-774cae9a-hurco-vm30i-full-psn.md` + one other live thread.

## Verified ship commits archived (iter15)

```
T1  GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-B1+B2      5a11b75076
T2  GOAL-SYNERGY-LOOP-MS0 (20/20 ended)          42029c7917
T3  ZULU-HERMES-GAPS / U-ZULU-GAP5..GAP12      4fac984675
T4  SLOT-QUERY-MS0 / U-SLOT-QUERY-CLOSEOUT       64d6ad79a0
T5  PICKER-LEAK-FIX / U-PQ-EMBEDDED-UID          c24ed66d93
T6  HIGH-ROI-TOKEN-SAVINGS / U-WIKI-OFFLOAD-ADV  6853d35257
T7  ZULU-ORCHESTRATOR-MS0 / U-ZULU06           d94e08da19
T9  TESTFIX rename ConsensusCoordinator          33f1229ead
T10 WIRE-UNWIRED-MS0 / U-WIRE-TOOL-CALL-THROT    9aeb5031b4
T11 SLOT-COMPACT-SYNERGY-MS0 / U-WAVE2B          302aab881b
T13 HIGH-ROI-HOOKS-MS0 / U-HRH02-FIX             8672514f1e
T14 JULIETT-12CHAT / U-PRECOMMIT-PATHSPEC-ONLY   22418a618a
T15 DOC-REFLECT / FLEET-REAPER-TIER2             a6abf27043
```

## Promotion path (next session, if useful)

The two-pass method is mechanical — could be lifted into `scripts/handoff-consolidate.mjs` as an `--auto-archive` flag that runs the same logic per slot (ship-grep + fossil-age). Currently every chat does the triage by hand. If the fleet had 26 slots each averaging 10 stale-but-shipped handoffs, automating this would reclaim ~260 stale entries fleet-wide in one cron pass.

That promotion is NOT this session's work — it would be a new topic (`HANDOFF-CONSOLIDATOR-AUTOARCHIVE`) requiring its own scrutiny gate + tests. Flagged here so a future session can pick it up.

## Why this matters

Echo's consolidated handoff was the largest in the fleet (10.2K, 16 threads) and it was misleading: 13 of those "open" threads were actually shipped. Every `/startup-echo` chat read the bloated list and re-evaluated work that was already done — wasted attention budget across multiple peer chats over multiple days. The fix is a one-time-per-slot triage; ongoing consolidator improvements would prevent recurrence.

## Cross-refs

- [[feedback_always_close_out]] — finish every task; this triage is the close-out doctrine applied at the handoff layer
- [[feedback_never_delete_only_disable]] — `.archive.<date>` rename convention
- [[feedback_silent_close_out_drift_2026_05_17]] — sister pattern at the milestone-envelope layer (shipped units that MILESTONE_PROGRESS doesn't credit)
- [[reference_hurco_winmax_roundtrip_3of3_2026_05_24]] — main HURCO-VM30I work this triage closed alongside
- Commits: `ab5d335eff` (iter15 ship-grep), `afed5ba7bd` (iter16 fossil-age)
