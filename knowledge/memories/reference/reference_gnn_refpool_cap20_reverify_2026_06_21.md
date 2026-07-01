---
name: reference_gnn_refpool_cap20_reverify_2026_06_21
description: "FRESH re-verification (slot:india 2026-06-21, operator-authorized 'GNN ref-pool label growth') of the 2026-06-18 cap=20 codebase-wired refpool lever, re-embedded on the CURRENT live graph (346,838 nodes). REPRODUCES gate-safe: baseline 355-ref AUROC 0.7891 / cov 27.4% / 2-13 classes -> enriched +618 (cap=20) AUROC 0.8189 (live-eval) / 0.9117 (controlled), gate HOLDS deploy-ready-selective, Brier@gate 0.04, robust. BUT coverage DROPS 27.4% -> 5.5% (live-eval). Confirms: cap=20 is a measured RANKING win, NOT a coverage win. Harness says 'APPLY is justified' but the apply mutates the shared 542MB graph + is an operator ranking-vs-coverage decision (coverage 5x down). NOT auto-applied. Full-coverage needs sharper features / H2GCN / GPU retrain, not these refs."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.592Z
aliases: reference_gnn_refpool_cap20_reverify_2026_06_21
---


**CONTEXT:** slot:india autonomous /loop 2026-06-21. After india's safe unilateral backlog verified-exhausted, the operator (via AskUserQuestion) authorized **"GNN ref-pool label growth"** (PSN leg #10, india-owned). R8 recall surfaced the 2026-06-18 exhaustive exploration ([[reference_codebase_wired_refpool_rejected_2026_06_18]] / [[reference_gnn_codebase_wired_refpool_2026_06_18]]): naive growth (all 3206 codebase-wired refs) REGRESSES the gate; cap=20 (618 refs) is the measured optimum, left as "OPTIONAL #15 -- operator ranking-vs-coverage decision, NOT auto-applied." The authorization is that decision -> but per verify-live + multiseed doctrine, I re-measured FRESH (3-day-old number not trusted).

**FRESH RUN (2026-06-21, `node --max-old-space-size=8192 scripts/measure-codebase-wired-refpool-auroc.mjs --controlled --cap-per-class=20`, RE-EMBEDDED, no --skip-embed):**
- 3207 codebase-wired ghosts built (416 multi-dispatcher excluded), embedded fresh via nomic (22.5s), cap=20 -> 618 refs, merged 355 deployed + 618 = 973, live graph 346,838 nodes.

| condition | AUROC | selective verdict | coverage | Brier@gate | macroF1@gate | classes |
|---|---|---|---|---|---|---|
| baseline (355) | 0.7891 | deploy-ready-selective robust | 27.4% | 0.0417 | 1.0 | 2/13 |
| enriched (+618, variable holdout = LIVE-EVAL consequence) | 0.8189 (+0.030) | deploy-ready-selective robust | **5.5%** | 0.04 | 1.0 | 1/57 |
| controlled (+618, FIXED 84 holdout = faithful inference effect) | 0.9117 (+0.123) | deploy-ready-selective robust | 23.8% | 0.04 | 1.0 | 1/13 |

Harness CONCLUSION: "the refs help AND the live eval holds -> APPLY is justified (verify on a fresh live eval)."

**VERDICT (R12, india metrics-gated):** cap=20 REPRODUCES gate-safe on the current graph -- AUROC up (+0.030 live / +0.123 controlled), gate HOLDS deploy-ready-selective in all 3 conditions, Brier@gate 0.04 (well under 0.15), robust. **BUT it DROPS selective coverage 27.4% -> 5.5%** (live-eval) -- the deployed tier-5 would fire ~5x LESS often (abstain 94.5% of the time), sharper when it does. It is a RANKING-quality lever, NOT a coverage lever -- exactly the 2026-06-18 conclusion, now confirmed on fresh data. It does NOT serve the "full-coverage pending ref-pool growth" goal the PSN-leg-state inject frames; full-coverage needs sharper features / H2GCN / GPU retrain (a separate larger unit).

**DECISION SURFACED to operator (ranking-vs-coverage, the documented gate):** apply cap=20 = mutate the shared 542MB system-graph (25 peer consumers; documented UNVERIFIED blast-radius on /system-viz ghost-roosts + orphan-inventory which could misread 618 already-wired engines as wiring TARGETS) via the 6-step supervised apply protocol. india does NOT auto-apply a coverage-regressing mutation to a shared production graph. Recommendation: do NOT apply for the coverage goal (it costs 5x coverage); apply only if the goal is max ranking-precision on a narrow band; for true full-coverage, scope a features/architecture build (H2GCN / GPU retrain).

**METHODOLOGY WIN (reusable):** the non-destructive measure-before-mutate harness (`measure-codebase-wired-refpool-auroc.mjs`) re-ran cleanly 3 days later and reproduced the result -- the verify-live discipline confirmed (not refuted) the prior number this time, which is itself the point: you cannot KNOW without re-measuring. Global AUROC alone (+0.03) reads "apply, fine"; the selective coverage 27.4->5.5 is the decision-relevant signal AUROC hides.

**SIBLINGS:** [[reference_codebase_wired_refpool_rejected_2026_06_18]] · [[reference_gnn_codebase_wired_refpool_2026_06_18]] · [[reference_gnn_selective_deploy_2026_06_06]] · [[feedback_multiseed_before_auroc_claim]].
