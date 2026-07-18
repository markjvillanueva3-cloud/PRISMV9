# OLLAMA-STRESS/U-ALPHA-OLLAMA-STRESS — [MAIN-FORCE] [OLLAMA-STRESS]/U-ALPHA-OLLAMA-STRESS (slot:alpha): empirical Ollama scaling/diminishing-returns stress harness + measured Blackwell capability frontier

**Commit:** `d79f06d849e8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T20:13:15-05:00
**Tags:** ollama-stress, u-alpha-ollama-stress, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-STRESS]/U-ALPHA-OLLAMA-STRESS (slot:alpha): empirical Ollama scaling/diminishing-returns stress harness + measured Blackwell capability frontier

## Body
```
[MAIN-FORCE] [OLLAMA-STRESS]/U-ALPHA-OLLAMA-STRESS (slot:alpha): empirical Ollama scaling/diminishing-returns stress harness + measured Blackwell capability frontier

Operator asked to stress-test Ollama to find how far we can push it before
diminishing returns and what tasks it is truly capable of. india's
ollama-capability-probe.mjs already measures task x model pass-rate at
concurrency 1; this is the SCALING companion it does not cover.

scripts/ollama-stress-test.mjs (new): COMPOSES india's ollama-capability-battery
(tasks + verifiers, no reinvent) and adds three scaling sweeps -- model-tier
frontier (smallest model that passes), concurrency knee, output-length scaling.
Pure analysis core (tokPerSec / percentile / findConcurrencyKnee /
smallestPassingModel / classifyTaskFrontier) separated from the live runner with
an injectable callFn. Model-OUTER loop order (load each model once) -- task-outer
swap-thrash empirically WEDGED Ollama mid-sweep. Crash-safe (a rejecting call is
a recorded gap). R12 sample-size honesty: discloses passed/total, flags low-n
(<3 cases) verdicts as advisory, never presents an n=1 pass as a hard route.

MEASURED FRONTIER (RTX PRO 6000 Blackwell 96GB):
- qwen2.5-coder:7b is the SWEET SPOT -- 100% on classify/unit-convert/arithmetic
  at ~80-200 tok/s; 1.5b flaky there (33-67%); 14b 2-4x slower for marginal gain.
- 1.5b suffices for simple extraction/formatting; 14b only for light reasoning.
- Concurrency knee = c=2 (throughput saturates ~255 tok/s; c=4 = latency not
  throughput; c=8 WEDGES the server -> recovered via ollama-wedge-guard --recover).
- Output length flat ~47-48 tok/s 32->1024 (no diminishing returns on length).
- The 120b (65GB) co-loaded with smaller models thrashes VRAM and wedges -- solo only.

TEST: ollama-stress-test.test.mjs 19/19 (knee detection 4 scenarios, percentile
nearest-rank, tokPerSec ns->s, frontier trivial/mid/large/beyond-local, low-n
confidence flag, +adversarial). Per-file 2-arm scrutiny PASS (arm B FAIL on the
n=1 over-claim -> fixed -> re-verified PASS).
VALIDATE (live): clean model-outer sweep on the 1.5b/7b/14b ladder + concurrency
1,2,4 + output 32-1024 on 7b; numbers above are measured, not estimated.
Findings: wiki knowledge/wiki/architecture/ollama-stress-capability-frontier.md.
```

## Files touched (4)
- knowledge/wiki/architecture/ollama-stress-capability-frontier.md | 100 +++++++++++++++++++++++++
- scripts/ollama-stress-test.mjs                                   | 470 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/ollama-stress-test.test.mjs                              | 209 +++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 779 insertions(+)

## Lessons surfaced in commit body
- tile / findConcurrencyKnee /
- tile

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d79f06d849e8`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-STRESS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._