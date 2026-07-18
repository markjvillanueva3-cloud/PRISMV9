---
name: reference_post_ship_wedm-training-wizard-ms0-u-wtw-audit
description: Auto-distilled learnings from shipping WEDM-TRAINING-WIZARD-MS0/U-WTW-AUDIT (commit dd20ca846). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.095Z
aliases: reference_post_ship_wedm-training-wizard-ms0-u-wtw-audit
---


# WEDM-TRAINING-WIZARD-MS0/U-WTW-AUDIT

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WEDM-TRAINING-WIZARD-MS0]/U-WTW-AUDIT (slot:mike /goal iter4): cross-domain training-loop parity audit + WEDM orphan-engine inventory. KEY FINDINGS: (1) 164 WEDM+WireEDM engines on disk, ~50 wired in edmDispatcher, ~100 orphan. (2) WEDMLoRADatasetBuilderEngine.ts is 0 BYTES — concrete proof WEDM cannot run wedm_lora r=4 training (U-TRAIN-13 blocked). (3) Lathe + Mill + Quoting have full LoRA + dataset-builder + training-script + reward/reason/safety eval stack; WEDM has only LoRA Adapter + ContinuousLearning + LearningLoop (latter 2 ORPHAN in dispatcher). (4) ~600KB of WireEDM AI-tier code orphan: MasterAI 51KB, AGIOrchestrator 58KB, DeepAIHardening 63KB, NeuralTraining 85KB, ProgramNeuralAnalysis 62KB, CompleteOrchestration 59KB, KnowledgeSynthesis 49KB, AIPrintToProgram 38KB, +5 more. (5) 5 controller post engines (Mitsubishi, Sodick, Makino, Agie, Fanuc) exist on disk but only the router is wired — hard-coded per-controller programs the user requested EXIST but are not callable. (6) Tribal injection IS wired (TribalRuntime + TribalTipLearner + tribal-by-domain-inject T2 hook) — gap is wizard frontend doesn't consume yet. REVISED MILESTONE: 14→20 units with KEEP/SKIP/REVISE per unit. New phases: P0 LoRA gap closure (U-WTW00/00a/00b) + P1 Wire-the-orphans (7 units, ~150 wires) + P2 Templates+catalogs + P3 Learning-loop orchestrator + P4 Wire wizard frontend. Recommendation: HAND OFF TO CHARLIE (canonical wire-EDM slot per JULIETT-12CHAT). Mike soul=misc-cleanup; charlie owns wire domain.

**Shipped:** 2026-05-25T19:17:11-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[wedm-training-wizard-ms0-u-wtw-audit]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._