---
name: reference_mill_galaxy_complete_stale_audit_flags_2026_06_02
description: "Mill galaxy is substantially complete (89% wired, 0 high-ROI unwired per live mill-wiring-audit). The awareness-inject 'Top HIGH-ROI unwired' + the audit's 15 MED 'undocumented' flags are STALE/buggy — 3 candidates investigated 2026-06-02 were all already wired+tested+documented. Stop re-chasing; the one real residual is the optional tribal-ground-synthetic-trainer enhancement."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.216Z
aliases: reference_mill_galaxy_complete_stale_audit_flags_2026_06_02
---


# Mill galaxy is complete; the gap dashboards are stale (foxtrot, 2026-06-02)

**Live authoritative audit** (`node scripts/mill-wiring-audit.mjs`, 2026-06-02T15:09Z): 134 mill engines · **119 wired (89%)** · 15 unwired · **HIGH-ROI unwired: 0**. The 15 unwired are all MED ("exported *Engine, undocumented").

**Three "gap" candidates investigated this session — ALL already complete** (don't re-chase):
1. **MillingLoRADatasetBuilderEngine** — the foxtrot-awareness-inject's perennial "Top HIGH-ROI unwired" is STALE. It IS wired: `mill_lora_dataset_build` → `buildDataset`, `mill_lora_dataset_schema` → `requiredSchema`, plus `mill_turn_lora_dataset_build` (millDispatcher L323-326, L1103-1123).
2. **TribalKnowledgeTrainingEngine** — NOT a true orphan: consumed by `PRISMNeuralKnowledgeSynthesisEngine`. It's fleet-wide neural-training infra (india lane), not mill-specific; WIRE-EXEMPT territory, not a foxtrot force-wire.
3. **MillingProductionKnowledgeHarvesterEngine** (audit-flagged MED-undocumented) — FALSE POSITIVE. It's a real 1372-line engine (harvests 25yr JM Die milling tribal wisdom), consumed by 4 engines (MillingAGIOrchestration, MillProgramLearning, MillResourceAwareness, MillTribalKnowledge), HAS a test, AND HAS a wiki entry at `knowledge/wiki/architecture/engines/milling/millingproductionknowledgeharvesterengine.md`.

**Root cause of the noise:** `mill-wiring-audit.mjs`'s "undocumented" detector does not match wiki entries under `architecture/engines/milling/<name>.md` → false MED flags. (Audit-tooling fix = tango/sierra lane.) The awareness-inject's HIGH-ROI line is likewise lagging.

**The one REAL, non-stale residual (foxtrot lane, fresh-budget unit):** tribal-ground the synthetic closed-loop trainer's STARTING conditions. `MillTemplateTrainingHarnessEngine` trains on hardcoded `ISO_BASELINE` + `source:"template_training"` synthetic cells; feeding `MillTribalIntegrationEngine`'s speeds/feeds tribal rules into the trainer's starting baseline (alongside the per-machine SFC grounding shipped in U-MILL-MACHINE-GROUND) is a genuine enhancement. Candidate: **U-MILL-TRIBAL-GROUND-TRAINER**. Substantial build — do with fresh context, not at YELLOW budget.

## How to apply
- Mill-galaxy ticks: do NOT treat the awareness-inject "Top HIGH-ROI unwired" or audit MED-undocumented list as ground truth — they over-report. Verify with grep before building; the base rate of already-done is high.
- Relates: [[reference_jm_vmc_spindle_envelopes_2026_06_02]] · [[reference_mill_tribal_training_bridge_unwired_2026_06_02]] · [[feedback_autonomous_loop_drift_discipline]] · [[reference_mill_domain_atlas_for_foxtrot_2026_05_27]].
