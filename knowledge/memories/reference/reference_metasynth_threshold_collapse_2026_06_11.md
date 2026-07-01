---
name: reference_metasynth_threshold_collapse_2026_06_11
description: The master-galaxy L2/L3 meta-synthesis silently collapsed (static threshold -> mega-cluster -> 0 doctrine candidates); fixed with auto-tune to the live distribution
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.655Z
aliases: reference_metasynth_threshold_collapse_2026_06_11
---


**Finding (slot:india, 2026-06-11, /goal "run closed-loop self-training for the master galaxy so all galaxies gain knowledge together"):** running `scripts/galaxy-meta-synthesis.mjs` (alpha's L2/L3 "compounding of the compounding" -- the master-galaxy aggregator that finds patterns recurring ACROSS galaxies) revealed it was **silently broken**: with a STATIC threshold (`DEFAULT_THRESHOLD = 0.93`) it collapsed into a **27/34-galaxy mega-cluster** -> EXCLUDED from doctrine candidates -> **0 cross-galaxy doctrine candidates**. The cross-galaxy knowledge-sharing was producing nothing.

**Root cause:** the synthesis-embedding sidecar (`state/shared/memory-embeddings-sidecar.json`, 17K records) is **VOLATILE** -- it is re-embedded continuously by the memory pipeline, so the `patterns/*_synthesis` vector SET changes between runs (observed **34 vectors one run, 15 the next**). Any FIXED threshold is right for one distribution and collapses on another. The code itself flagged this exact risk (reviewer-B P1: "a shift in galaxies/regenerated syntheses could silently produce a mega-cluster").

**Fix:** `U-METASYNTH-AUTOTUNE` (commit `2ad0347238`). `autoTuneThreshold(vectors)` -- ascending ladder sweep [0.90..0.98], pick the DENSEST threshold whose largest cluster <= `degenerateClusterLimit` (most cross-domain structure retainable without collapse); fallback to the highest ladder value if all collapse. Wired into `main()` (auto-tunes when no explicit `--threshold`; `detectExplicitThreshold` lets an operator override). 40/40 tests. VALIDATED live: collapse ELIMINATED -- auto-tunes to 0.93 -> **3 clean cross-galaxy clusters [6,3,2]**, no collapse.

**2nd lever -- RESOLVED (`U-METASYNTH-NAME-FALLBACK`, commit `3993ce3a45`):** cluster NAMING resolved to `gpt-oss:120b` (blackwell-best) whose 65GB cold-load EXCEEDS the preflight window while Ollama is UP -> 0 named -> 0 doctrine candidates. Fix: `resolveNamingModel(preferred, candidates, hasOverride, preflightFn)` -- if the best model's preflight fails AND no `--model` override, fall back to a faster model (`qwen2.5-coder:32b` -> `gpt-oss:20b`) for the SMALL naming task so the loop COMPLETES (an explicit `--model` is never substituted). 46/46 tests.

**THE MASTER-GALAXY CLOSED LOOP NOW RUNS END-TO-END (validated live):** auto-tuned threshold (non-collapse) -> named via the fallback model -> **2 clusters named -> 1 DOCTRINE CANDIDATE** (was 0 before BOTH fixes). It produces the cross-galaxy shared knowledge (`_meta_synthesis.md` recall-indexable for all galaxies + `DOCTRINE-CANDIDATES.md` L3 human-verify). REMAINING (orthogonal, golf/operator): the CONTINUOUS automation -- whether a scheduled task runs galaxy-meta-synthesis on a cadence (cf. [[reference_brain_refresh_task_unregistered_2026_06_09]]); registering it needs an ELEVATED shell. Related: [[reference_alpha_l2_meta_synthesis_2026_05_29]] (the L2/L3 origin), [[reference_gnn_class_collapse_finding_2026_06_11]] (sibling collapse-diagnostic this session).
