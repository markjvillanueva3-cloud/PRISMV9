---
title: GNN ref-pool growth via ACTUAL-WIRING vault labels (fabrication-free, any domain)
type: code-tribal
domain: ai-training
slot: india
created: 2026-06-24
tags: [gnn, graphsage, refpool, vault-to-gnn-refpool, macro-f1, labeling, india]
related:
  - reference_gnn_confirmed_wiring_labels_2026_06_24
  - reference_gnn_active_worklist_refresh_2026_06_24
  - reference_gnn_refpool_crossfleet_labeling_blocker_2026_06_21
  - reference_gnn_refpool_vault_grow_2026_06_10
---

# GNN ref-pool growth via ACTUAL-WIRING vault labels

## The pattern

The GNN wiring-inference tier-5 deploy gate is held below macro-F1 0.55 by a STARVED
reference pool ("full-coverage pending ref-pool growth"). The lever is ground-truth labels,
NOT calibration. `scripts/vault-to-gnn-refpool.mjs` mines "X wired into prism_Y" assertions
from `knowledge/memories/{reference,feedback}` (conf 0.85 > the 0.8 refMinConf gate) and
`nn-graph-retrain-lifecycle.mjs` auto-runs that feeder `--apply` as a pre-retrain stage.

**Two label sources, very different trust:**
1. **Actual-wiring (ground truth, ANY domain):** the engine is genuinely imported AND invoked
   in a dispatcher case. That dispatcher IS its class -- read from code, no domain expertise,
   no guessing, no fabrication. India can label a prism_safety/dev/turning/cam ghost this way
   even though those are other slots' domains.
2. **Domain-inference (a guess):** an UNWIRED engine whose home you infer from its name/role.
   High poison risk; only for unambiguous cases; never assert "wired into" (it would be false).

This **corrects** [[reference_gnn_refpool_crossfleet_labeling_blocker_2026_06_21]], which said
india could only label its own AI-domain ghosts so the starved cross-domain classes were
"cross-fleet blocked." That bound is real for source (2) only. Source (1) is unbounded by
domain: 2026-06-24 india labeled 11 ghosts into prism_calc/safety/dev/turning/ai/cam (ref-pool
14->25 minable, 179->190 on next retrain), every one a confirmed import+case AND a correction of
the label-starved model's WRONG prediction.

**The highest-yield targets are audit FALSE-NEGATIVES:** engines the unwired-audit flags as
`ghost.unwired-engine` (so they sit in the active-label worklist as high-uncertainty targets) but
that ARE actually cased in a dispatcher. Find them: for each worklist ghost,
`grep -rIl "\bEngineName\b" mcp-server/src/tools/dispatchers` then READ the cited case line to
confirm a real import+invocation (not a comment / type-only import / arrow-notation suggestion).

## Pool growth is NOT a free win -- MEASURE before apply (the 3206 rejection)

[[reference_codebase_wired_refpool_rejected_2026_06_18]] BUILT a 3rd feeder
(`wired-engines-to-refpool.mjs`) that mass-mined 3206 codebase engine->dispatcher wirings ("the
20x pool-growth lever") and MEASURED its `--apply` non-destructively: it REGRESSED the deploy gate
(AUROC 0.789->0.772, selective verdict deploy-ready->no-deployable-operating-point, Brier@gate
0.04->0.26, macroF1 1.0->0.32). Mechanism: a dense/diverse pool manufactures spurious
high-confidence votes for WRONG dispatchers, destroying the abstention discipline that makes
tier-5 deployable. **Coverage is the wrong target; emitted-band calibration is the constraint.**
The cap-sweep showed sparse/balanced subsets (cap<=20/class) HOLD the gate (cap=20 PEAKED AUROC
+0.099); collapse sets in between cap=20 and cap=50/class.

So: a "wired into prism_X" label is only the FIRST half. Before claiming a macro-F1 win, MEASURE
the marginal effect on a NON-DESTRUCTIVE copy (`measure-codebase-wired-refpool-auroc.mjs
--controlled`, the `assessHoldout` holdoutGraph seam) and report Brier@gate + macroF1@gate + the
selective verdict -- NOT AUROC alone (AUROC +0.003 MISSED the 3206 emitted-set collapse). Two
things make a label batch SAFE-by-regime: (a) SPARSE + BALANCED (a few per class, <=cap20), and
(b) routed through the SANCTIONED `vault-to-gnn-refpool` feeder that is already part of the
deploy-ready baseline -- NOT the never-applied `wired-engines-to-refpool` mass source. The
operator-gated `nn-graph-retrain-lifecycle --force` is the deployed measurement: it auto-applies
the vault feeder, re-evals, and GATES promotion, so a regressing candidate is never promoted (the
deployed selective path cannot silently break). 2026-06-24 india added 11 sparse/balanced/
ground-truth vault labels (the measured-safe regime) -- effect operator-measured, not assumed.

## The gotcha: SPECULATIVE_RE silently drops your assertion line

`vault-to-gnn-refpool.mjs` excludes any assertion whose line matches
`SPECULATIVE_RE = /\b(verify|should be|needs? to be|is \w+ wired|todo|tbd|may be|might be|pending|not yet|unwired|missing)\b/i`
(it filters out "X should be wired" questions from "X wired into Y" facts). The trap: a perfectly
TRUE "wired into prism_X" line is DROPPED if the same line happens to contain one of those words.

Real 2026-06-24 hits (both silently dropped, count came up 2 short with conflicts=0):
- `SBOMReviewEngine wired into prism_safety (... WIRE-UNWIRED-PAPA ...)` -> "UNWIRED" matched.
- `SyncCodeVerificationEngine wired into prism_cam (... sync-code verify)` -> "verify" matched.

**Rule:** keep a "wired into prism_X" assertion line CLEAN of verify/unwired/pending/missing/etc.
Put the commit-id/feature tag (which often contains "UNWIRED") on a DIFFERENT line, and never use
"verify" as a verb in the cite. Prove the mine with `node scripts/vault-to-gnn-refpool.mjs --json`
and check `byDispatcher` (the per-engine "FOUND" check is unreliable -- the dry-run only returns a
truncated `sample`; trust the `count` + `byDispatcher` totals).

## Don't seed singleton classes

A label whose class has ZERO other ref-pool examples (e.g. `prism_pp` for a PPG engine) creates a
SINGLETON class -- unevaluable in the macro-F1 holdout (can't be in both train and test), so it
DRAGS the average down. Record it as true-but-not-fed (phrase it without the verb so the feeder
skips it) until >=1 sibling is confirmed-wired. The eval rewards classes with >=2 examples.

## Eval is operator-gated

The feeder + ref-pool growth is $0 code-side. The macro-F1 RE-GRADE needs the GPU retrain
(`nn-graph-retrain-lifecycle.mjs --force`, Blackwell) which auto-applies the feeder first. The
india soul refuses promoting past the deploy gate without real AUROC/Brier -- ship the labels,
let the operator-gated retrain measure the lift.
