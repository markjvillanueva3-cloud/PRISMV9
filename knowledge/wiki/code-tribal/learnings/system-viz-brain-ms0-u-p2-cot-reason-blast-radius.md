# SYSTEM-VIZ-BRAIN-MS0/U-P2-COT-REASON-BLAST-RADIUS — [MAIN] [SYSTEM-VIZ-BRAIN-MS0]/U-P2-COT-REASON-BLAST-RADIUS: backend slice — cot_reason payload builder

**Commit:** `3ea99db4eca0` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T11:04:50-05:00
**Tags:** system-viz-brain-ms0, u-p2-cot-reason-blast-radius, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ-BRAIN-MS0]/U-P2-COT-REASON-BLAST-RADIUS: backend slice — cot_reason payload builder

## Body
```
[MAIN] [SYSTEM-VIZ-BRAIN-MS0]/U-P2-COT-REASON-BLAST-RADIUS: backend slice — cot_reason payload builder

Pure resolver + CLI that takes a system-viz node-id + system-graph and
emits a fully-formed prism_ai:cot_reason invocation payload PLUS the
BFS-extracted upstream/downstream blast-radius (bounded by hops +
maxNeighbors caps). The frontend right-clicks a node, calls this
resolver, and dispatches the returned payload.

Ships:
- scripts/system-viz-cot-reason-blast-radius.mjs (340 LOC, 17 exports + CLI)
- scripts/system-viz-cot-reason-blast-radius.test.mjs (620 LOC, 47/47 PASS)
- Envelope flip with shipped_evidence + contracts_verified block.

Live verification: CLI exercised against real 153MB system-graph.json —
payload emits correct snake_case fields per ReasoningProblem interface.

Contracts pinned against live source (read BEFORE writing code, per
U-P2-NODE-CLICK-DISPATCH lesson where arm B caught 4 contract bugs):
- aiReasoningDispatcher.ts:1444 — case 'cot_reason'; dispatcher = prism_ai
- ChainOfThoughtEngine.ts:129-138 — ReasoningProblem snake_case interface
- Strategy default 'linear' matches engine line 230 default
- No field remapping in dispatcher (line 1447 cast-through) — snake_case
  is correct emission shape

Per-file scrutiny: BOTH arms PASS. Arm B independently verified the
contract against the live .ts source by reading it directly (not from
my comments) — caught zero contract bugs this iter, validating the
read-source-first discipline.

P1 + P2 fixes applied in-commit:
- P1 (arm A): NaN-clamp fix — Number.isFinite() coercion to DEFAULT_HOPS
  / DEFAULT_MAX_NEIGHBORS BEFORE Math.min/max (which propagate NaN).
  4 new regression tests cover NaN, undefined, string-via-Number paths.
- P2 (arm B): null/undefined systemGraph regression guards.
- P2 (arm B): Real-data E2E section (2 new tests verify resolver works
  against live 153MB system-graph; skip-if-not-present for hermetic CI).

Backend-clean architectural template applied from line 1:
- pathToFileURL for Windows CLI invocation guard
- Object.create(null) on all 5 BFS accumulators
- Atomic tmp-pid + rename write
- Honest advisory caveat
- Stable sort + dedup discipline

SVB-MS0: 20 → 21 shipped + 3 superseded = 24 of 26 effectively closed.
2 remain: U-P2-GRAPH-SEARCH-MASTERINDEX (dispatcher contract),
U-P5-COORD-SQLITE-LIVE-SWAP (high-risk live-infra).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../data/milestones/SYSTEM-VIZ-BRAIN-MS0.json      |  35 +-
- scripts/system-viz-cot-reason-blast-radius.mjs     | 424 ++++++++++++++
- .../system-viz-cot-reason-blast-radius.test.mjs    | 627 +++++++++++++++++++++
- 3 files changed, 1085 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- lesson where arm B caught 4 contract bugs):

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3ea99db4eca0`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-BRAIN-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._