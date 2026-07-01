# GRAPH-OCTOPUS-AUTOWIRE-MS0/U-GO-C2 — [MAIN] [GRAPH-OCTOPUS-AUTOWIRE-MS0]/U-GO-C2+C3+C4 (slot:echo): sync octopus auto-invoke for irreversible bash — milestone COMPLETE 17/17

**Commit:** `da337d492955` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T18:12:58-05:00
**Tags:** graph-octopus-autowire-ms0, u-go-c2, auto-distilled

## Subject
[MAIN] [GRAPH-OCTOPUS-AUTOWIRE-MS0]/U-GO-C2+C3+C4 (slot:echo): sync octopus auto-invoke for irreversible bash — milestone COMPLETE 17/17

## Body
```
[MAIN] [GRAPH-OCTOPUS-AUTOWIRE-MS0]/U-GO-C2+C3+C4 (slot:echo): sync octopus auto-invoke for irreversible bash — milestone COMPLETE 17/17

Single disciplined hook closes all three remaining C-track units:
  C2 sync auto-invoke at decision points
  C3 surface consensus result in-context (via permissionDecisionReason)
  C4 stakes-gated triggering (classifier IS the stakes gate)

CLASSIFIER (5 irreversibility classes, each tested):
  git-force-push  (-f / --force / --force-with-lease)
  git-hard-reset  (--hard)
  git-branch-force-delete  (-D / --delete-force)
  rm-recursive-force  (-rf / -fr / --recursive --force; NOT -f alone)
  git-clean-force  (-f without -n dry-run)

Walks past env-prefixes + rtk wrapper; multi-command chains classify on
FIRST sub-command (conservative under-trigger).

SAFETY INVARIANT (hard-asserted in tests): a classified destructive
command can ONLY reach allow via consensus rec='accept'. Every other
branch (default, disable, engine-missing, timeout, throw, escalate,
review, classifier-throw) → ASK.

DEFAULT BEHAVIOR: match → ASK with class name (zero LLM cost).
OPT-IN (PRISM_AUTO_CONSENSUS_SYNC_BASH=1): match → sync 5-LLM consensus
with 10s timeout → ask|allow per verdict. PRISM_AUTO_CONSENSUS_SYNC_
DISABLE=1 suppresses LLM but ASK still fires (safety preserved).
PRISM_AUTO_CONSENSUS_SYNC_ENGINE_PATH overrides loader (test injection).
clearTimeout in finally.

26/26 tests (9 classifier, 5 renderVerdict, 12 E2E incl. stub-engine
accept→allow / escalate→ask / throw→ask / hang→timeout→ask).

2-of-2 scrutiny PASS after one retry — both reviewers FAILED first pass
(Arm A on safety-invariant breach via disable knob short-circuit; Arm B
on tautological ask||allow assertion), both PASSED retry after
classify-first reorder + deterministic engine-path override + stub-
engine test pattern. 0 P0/P1.

Wired PreToolUse:Bash @ 15000ms timeout (c-to-h-mirror replicated).

MILESTONE COMPLETE 17/17:
  Track B (B1-B5): graph freshness + sidecar guarantee + autoupdate
    backstop + fail-loud + staleness inject
  Track A (A1-A6): shared key-derive lib + pre-grep + pre-write +
    pre-bash + pre-read refactored to shared lib + 3 hooks wired
  Track C (C1-C6): drain verified + sync octopus on irreversible bash +
    in-context verdict + stakes-gated + 5-voice setup CLI + stub
    engines replaced with real EMA-tracked vendor selection

All 3 original gaps closed: graph-aware tools (was: Read only); graph
autoupdate visible (was: silent stale); octopus auto-invoked at decision
points (was: built but never used).
```

## Files touched (4)
- .claude/hooks/auto-consensus-sync-bash.mjs         | 347 +++++++++++++++++++++
- .claude/hooks/auto-consensus-sync-bash.test.mjs    | 323 +++++++++++++++++++
- .../milestones/GRAPH-OCTOPUS-AUTOWIRE-MS0.json     |  17 +-
- 3 files changed, 681 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- till fires (safety preserved).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show da337d492955`
- Milestone envelope: `mcp-server/data/milestones/GRAPH-OCTOPUS-AUTOWIRE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._