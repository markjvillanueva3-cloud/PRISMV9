---
name: reference_fleet_unwired_audit_2026_06_11
description: Trustworthy fleet-wide UNWIRED-engine list (60 of 3788, via canonical audit-unwired-engines.mjs) + classification. The clean cross-galaxy R12-safe DATA orphan-wire axis is exhausted; remaining 60 are inference/live-infra/domain-owned.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.578Z
aliases: reference_fleet_unwired_audit_2026_06_11
---


**FLEET UNWIRED-ENGINE AUDIT (slot:bravo, 2026-06-11).** Ran the CANONICAL `scripts/audit-unwired-engines.mjs` (NOT an ad-hoc grep -- per [[reference_foxtrot_mill_wire_status_2026_06_11]] the canonical tool correctly handles dynamic `await import("...Engine.js")` via basename-anchoring; same for `.claude/hooks/stop_on_unwired_assets.mjs:193-197`). Output: `state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json` (fixed filename; regenerated fresh each run -- `generated` field is the real timestamp).

**Trustworthy result: 3788 engines -> 60 UNWIRED (zero-consumer dormant), 112 WIRE-EXEMPT, 3531 WIRED-DIRECT, ~85 wired-via-orch/route/engine/hook/singleton.** Each `unwiredEngines[]` entry carries `{engine, mtime, size_kb, suggestedDispatcher}`.

**Classification of the 60 (name-heuristic + spot R8 checks):**
- **NOT clean R12-safe DATA orphans.** The single name-"DATA" hit `SemanticAssetIndexEngine` is actually **live-infra** (Qdrant-backed; constructor needs injected vector-store + embedder; `indexAsset` writes, `search` runs embedding inference; NO singleton export -- consumed by hooks/skills with injected deps, arguably WIRE-EXEMPT). R8 before wiring saved a bad wire.
- **~7 INFER** (R12-skip -- trained-model/inference): CounterfactualMill, WEDMLoRADatasetBuilder, XProcNeuralAutoFire, TransferLearningAdapter, AcquisitionRecommendation, EmbeddingGuard, MetacognitionBudget.
- **~12 EXEC** (R12-skip -- live bridges/runners, side-effectful): CATIA/Creo/Onshape/Rhino bridges, PlaywrightAutomation, QuotingClosedLoopRunner, DesignToFloorPipeline, HyperMillACBridge, SyncCodeVerification, cycleSchedulingBridge.
- **~40 OTHER -- mostly DOMAIN-OWNED (other slots' lanes, collision risk):** MillProgramCorpus/MillPrintToProgram (foxtrot), TurretLayout/BarRemnantManagement/SwissTypeDecision/SubprogramExtraction/UnifiedProgramParser (whiskey-lathe), SpeedFeedPSNDecisionPrior (oscar), HyperCADSElectrode/CreoAddinRibbon/NXOpenAssemblyDrawing (delta-cad), MITCourseExpansion/Integration (lima-academy), Mastercam/CATIA test-suites (kilo-cam), WetRun* + Tenant/SBOM/Pact/SlotSessionHistory (infra/devops). Wiring these needs per-engine R8 + OWNER-SLOT coordination -- not a clean cross-galaxy bravo grab.

**CONCLUSION (honest, R12):** the clean, lane-safe, cross-galaxy R12-safe DATA orphan-wire axis bravo ran this session ([[reference_sfc_orphan_wire_sweep_2026_06_11]] -> [[reference_india_ai_orphan_wire_2026_06_11]] -> echo -> [[reference_foxtrot_mill_wire_status_2026_06_11]]) is **EXHAUSTED**. The 60 remaining UNWIRED are inference (gated until trained), live-infra (injected-dep, not DATA), or domain-galaxy engines that belong to their owner slot. Next orphan-wiring should be **per-owner-slot** (each slot R8s + wires its own domain UNWIRED with a non-contested dispatcher), not a cross-galaxy sweep. This list is the actionable starting point -- regenerate via `node scripts/audit-unwired-engines.mjs`; filter `unwiredEngines[]` by `suggestedDispatcher` to a slot's domain.

**Process win:** validated the orphan-detection tooling is SOUND (no fleet bug) and produced the trustworthy dark-list with the correct tool, instead of force-wiring a marginal/non-R12 engine (which the bravo soul refuses). Stopped the axis at genuine exhaustion rather than manufacturing marginal wires -- [[feedback_autonomous_loop_drift_discipline]].
