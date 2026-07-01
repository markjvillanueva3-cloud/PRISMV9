# HM-TRAINING / U-HMT-GRAPHSAGE-SEED-HM — Verification Report

**Unit:** U-HMT-GRAPHSAGE-SEED-HM
**Milestone:** HM-TRAINING-WIRING-PLAN-2026-05-20
**Slot:** foxtrot (claude-3db3fb3d)
**Date:** 2026-05-20
**Status:** SHIPPED (seed phase) · NN-EVAL refresh DEFERRED (pre-existing blocker, out of scope)
**Doctrine:** R12 fail-loud — every claim has a measurable verification channel

---

## What shipped

`node scripts/seed-ghost-from-unwired.mjs --apply` was executed against the
live system-graph. Result:

```
Found 632 unwired engines
Wired-engine map built — 2615 engines have known dispatcher refs
Confidence breakdown: { high: 125, medium: 379, low: 28, none: 100 }
Top 5 inferred dispatchers:
  prism_cam       160
  UNKNOWN         100
  prism_dev        68
  prism_turning    61
  prism_calc       43
Writing system-graph.json (nodes added=6 updated=626, edges added=532)
DONE — graph nodes=250503 edges=786932
```

System-graph now carries **636 `ghost.unwired-engine` nodes** with
`proposed_wiring` + `confidence` annotations.

## Verification channel

```bash
node --input-type=module -e "
import fs from 'node:fs';
const graph = JSON.parse(fs.readFileSync('state/shared/system-viz/system-graph.json','utf8'));
const ghosts = (graph.nodes||[]).filter(n => n && n.kind === 'ghost.unwired-engine');
const valid = ghosts.filter(n => n.proposed_wiring && n.proposed_wiring !== 'UNKNOWN — review manually');
console.log('total:', ghosts.length, 'valid:', valid.length,
  'pool@0.78:', valid.filter(n => n.confidence >= 0.78).length,
  'pool@0.65:', valid.filter(n => n.confidence >= 0.65).length);
"
```

| Threshold | Pool size |
|-----------|-----------|
| `confidence ≥ 0.78` (default `refMinConf`) | **132** |
| `confidence ≥ 0.65` | **493** |
| `confidence ≥ 0.50` | **536** |

## Honest scope (R12)

The plan target was `poolSize >= 500` for `NN-EVAL.json`. The seed populated
the graph as required. **132 nodes** clear the default `refMinConf = 0.78`
threshold — below the 500 target. **493 nodes** clear the looser 0.65
threshold, which is the realistic operator-tunable knob.

Two reasons the high-confidence count is below 500:

1. **Confidence inference is heuristic** (regex keyword match in
   `DISPATCHER_INFERENCE_RULES`). Most engine names hit the 0.65-0.78 band
   ("medium" bucket), not the 0.85+ band. This is a property of the corpus,
   not the seed run.
2. **100 UNKNOWN engines** (16% of unwired) name don't match any rule and
   were emitted as ghosts WITHOUT a `proposed_wiring` edge. They count
   toward `total ghosts` but not `valid pool`.

## What's NOT shipped (deferred)

**NN-EVAL.json refresh.** Running `scripts/lib/nn-graph-eval.mjs` to compute
the updated `poolSize` + AUROC/Brier failed with a **pre-existing
unrelated import bug**:

```
file:///H:/prism/scripts/lib/graphsage-train-pipeline.mjs:42
SyntaxError: The requested module './graphsage-trainer.mjs' does not provide
an export named 'positiveTypeMarginal'
```

`graphsage-train-pipeline.mjs` imports `positiveTypeMarginal` and
`sampleStratifiedNegativeEdges` from `graphsage-trainer.mjs`, but the trainer
only exports: `TRAIN_DEFAULTS, bceLoss, rocAuc, sampleNegativeEdges,
computeLossAndGradients, train`. These two exports were never added.

This is NOT part of U-HMT-GRAPHSAGE-SEED-HM scope. Fixing it requires
either porting the missing functions into `graphsage-trainer.mjs` or
removing them from the consumer's import list — a separate unit. Until then,
the durable `nn-graph-retrain-lifecycle.mjs` scheduled task will surface the
same error on every poll, and `NN-EVAL.json` will stay at its pre-seed
state (`poolSize: 0, deferred: true`).

## Suggested follow-up — SHIPPED 2026-05-21 (slot:foxtrot, iter 7)

```
U-NN-TRAINER-EXPORT-FIX (CLOSED):
  Added `positiveTypeMarginal` + `sampleStratifiedNegativeEdges` to
  graphsage-trainer.mjs and wired train() to use them when opt.nodeType is
  supplied. The functions were NOT planned-but-cut — the pipeline genuinely
  needs them (U-NNG-PIPELINE-STRATIFIED-WIRE wired the consumer side), so
  the producer side was implemented, not removed.

  Verification:
    - scripts/lib/graphsage-trainer.test.mjs        57/57 PASS (30 + 27 new)
    - scripts/lib/graphsage-train-pipeline.test.mjs 103/103 PASS (was 0/1 —
      import SyntaxError before this fix)
    - graphsage-train-pipeline.mjs now imports cleanly (13 exports)

  Legacy parity: omitting opt.nodeType keeps the uniform sampler with a
  byte-identical rng sequence — proven by the trainer suite's
  legacy-parity tests (lossHistory deepEqual vs the bare-options run).
```

**NN-EVAL.json refresh is now UNBLOCKED.** The import SyntaxError that
deferred it is fixed; `scripts/nn-graph-retrain-lifecycle.mjs` can now load
the pipeline. The actual eval refresh (a 30-epoch full-batch train over
~6000 nodes) is a heavy compute run left to the durable
`nn-graph-retrain-lifecycle` scheduled task or an explicit operator run —
the code blocker is removed.

---

*Doc-reflection rule (CLAUDE.md): this report is the verification surface
for the seed unit. The deferred NN-EVAL refresh is logged here so a future
chat picking up the work doesn't redo the seeding.*
