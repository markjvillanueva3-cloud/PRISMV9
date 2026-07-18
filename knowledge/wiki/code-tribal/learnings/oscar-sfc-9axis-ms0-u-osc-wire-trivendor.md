# OSCAR-SFC-9AXIS-MS0/U-OSC-WIRE-TRIVENDOR — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-WIRE-TRIVENDOR (slot:oscar): wire 3 orphan SFC engines to calcDispatcher (incl. the tri-vendor comparison keystone)

**Commit:** `86f0e3fe0c9f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T13:39:01-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-wire-trivendor, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-WIRE-TRIVENDOR (slot:oscar): wire 3 orphan SFC engines to calcDispatcher (incl. the tri-vendor comparison keystone)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-WIRE-TRIVENDOR (slot:oscar): wire 3 orphan SFC engines to calcDispatcher (incl. the tri-vendor comparison keystone)

3 SFC engines were dispatcher-unreachable (0 consumers) — the closed-loop
comparison spine the operator wants to test was orphaned. Wired all 3:

  speedFeedTriComparatorEngine        -> speed_feed_tri_compare
    THE keystone: PRISM x baseline-DB x G-Wizard tri-vendor comparison. One
    9-axis physics pass, graded vs vendor baselines -> per-system Vc/fz
    opinions + agreement deltas (SFC <-> HSMAdvisor <-> G-Wizard).
  speedFeedExhaustiveCombinationEngine -> speed_feed_exhaustive_sweep
    physics-invariant bounded cartesian sweep (mill/lathe; wedm intentionally
    0-cell, out-of-scope), demo/prod modes, I1-I6 invariant ledger.
  speedFeedDownstreamSubscriberEngine  -> speed_feed_downstream_packs
    fan-out subscriber lifecycle (status/register/unregister/snapshot). The
    pack getters are snapshot-keyed, so the action exposes the lifecycle, not
    a zero-arg pack read.

16 round-trip tests THROUGH the dispatcher (not the singleton): happy paths +
material/domain variability (P/N group, mill/lathe/wedm) + failure modes (bad
material, unknown domain) + adversarial (NaN/negative diameter) + lifecycle
state-transition proof + wiring-reachability guard. The round-trips caught 2
real contract mismatches my first draft got wrong (vc_mpm is nested under
SystemOpinion.axes; the downstream getters are snapshot-keyed not zero-arg) —
exactly what R15 round-trip-through-the-dispatcher exists to catch.

Per-file 2-reviewer scrutiny: wiring-reviewer PASS (0 issues, build:fast clean),
test-reviewer PASS (2 P1s closed: Vc floor 50->100 m/min w/ literature cite;
register asserts the concrete 5 PropagationDomains, verified vs source).

tsc: my 2 files add ZERO type errors (diff touches only lines ~1094 +19 and
~9650 +73; the 17 pre-existing workspace errors are in untouched peer/legacy
files - CriticalPathScheduling/RANSAC/cad-validation-corpus/shopDispatcher).

Closes the SF dispatcher-orphan backlog. Unblocks the closed-loop test (task #4).
Bootstrap one-shot: shared-tree commit, slot-worktree cutover pending.
```

## Files touched (3)
- mcp-server/src/__tests__/calcDispatcher.uwire-sfc-trivendor.test.ts | 302 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/calcDispatcher.ts                  |  80 +++++++++++++++++
- 2 files changed, 382 insertions(+)

## Lessons surfaced in commit body
- wrong (vc_mpm is nested under

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 86f0e3fe0c9f`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._