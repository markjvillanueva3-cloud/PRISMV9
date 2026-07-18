# CAM Offline Closed-Loop Report

**Run:** 2026-06-02T15:44:39.067Z · **corpus:** 16558 programs · **sampled:** 200 · **scored:** 200

> Offline loop: normalize JM .MIN op sequence -> PRISM planner over the same families -> oracle score. NO live Fusion.
> **Scope (R12):** op-coverage is ~1.0 by construction (planner fed JM's families; feature->op selection unbuilt). The real signal is **sequence fidelity** = does PRISM `LATHE_OP_ORDER` reproduce JM's real ordering.

## Signal
- **mean sequence fidelity: 0.9376** (1.0 = PRISM ordering matches JM exactly)
- sequence inversions: 80/200 programs
- mean score (0.7*coverage + 0.3*seq): 0.9813
- read 200 · skipped(no-ops) 0 · skipped(unreadable) 0

## Learn targets
- top extra families (planner added, JM omitted): none
- top missing families (JM used, planner omitted): none (expected — families fed)

_Ledger: cam-offline-loop-outcomes.jsonl (200 outcomes appended). Oracle: scripts/lib/cam-offline-loop.mjs. Normalizer: scripts/lib/cam-min-op-normalizer.mjs._
