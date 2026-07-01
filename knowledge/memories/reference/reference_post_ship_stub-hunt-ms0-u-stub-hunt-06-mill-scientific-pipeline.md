---
name: reference_post_ship_stub-hunt-ms0-u-stub-hunt-06-mill-scientific-pipeline
description: Auto-distilled learnings from shipping STUB-HUNT-MS0/U-STUB-HUNT-06-MILL-SCIENTIFIC-PIPELINE (commit 3ae434438). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.056Z
aliases: reference_post_ship_stub-hunt-ms0-u-stub-hunt-06-mill-scientific-pipeline
---


# STUB-HUNT-MS0/U-STUB-HUNT-06-MILL-SCIENTIFIC-PIPELINE

[MAIN] [STUB-HUNT-MS0]/U-STUB-HUNT-06-MILL-SCIENTIFIC-PIPELINE (slot:bravo iter28, mill-galaxy): restore MillScientificPipelineEngine.ts from 15-line U-EFF25 stub. millDispatcher routes 3 actions (analyze/optimize/quantifyUncertainty). Real implementation: analyze() composes MillingForceEngine.calculate + verifyPower + predictChatter + MRR (mm³/min from rpm×flutes×fz × ap×ae) into one report; optimize() grid-searches rpmRange × fzRange (default 5×5) max-MRR subject to power.pass envelope, returns {best, evaluated, feasible, reason?}; quantifyUncertainty() Monte-Carlo over kc1.1 ± kcUncert (default 15%) + fz ± fzUncert (default 10%) per trial, returns {mean, sigma, min, max, p05, p95} distributions for force + power. ALL physics defers to MillingForceEngine (canonical Kienzle imported from src/physics/constants.ts — NEVER inlined per bravo-soul). Named constants: DEFAULT_RPM_SAMPLES, DEFAULT_FZ_SAMPLES, DEFAULT_MC_TRIALS, DEFAULT_KC/FZ_UNCERTAINTY_PCT. Fail-loud per R12 on missing tool/parameters + invalid range. 8/8 PASS vitest hermetic. STUB-HUNT progress: 6 of 9 rescued. Remaining: ToolSelectionRecommender + ToolpathStrategy + MillPrintToProgram + 2 unwired (CADFeatureRecognition + CAMPhase5Stubs).

**Shipped:** 2026-05-27T02:09:10-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[stub-hunt-ms0-u-stub-hunt-06-mill-scientific-pipeline]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._