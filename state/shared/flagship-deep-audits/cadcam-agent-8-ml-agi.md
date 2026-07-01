# CAD/CAM Audit — Agent 8: ML/AGI

## Reasoning Ledgers (file sizes)

**Current State:**
- `MILLING_REASONING_TRACE_LEDGER.jsonl`: **4.1 MB** (8,228 entries) [WIRED]
- `WEDM_REASONING_TRACE_LEDGER.jsonl`: **75 KB** (311 entries) [WIRED]
- `CAD_REASONING_TRACE_LEDGER.jsonl`: **NOT FOUND** (0 entries) [UNWIRED]
- `CAM_REASONING_TRACE_LEDGER.jsonl`: **NOT FOUND** (0 entries) [UNWIRED]
- Generic `REASONING_TRACE_LEDGER.jsonl`: **0 bytes** (empty) [UNWIRED]

**Status:** Mill/WEDM tracing operational. **CAD/CAM tracing disabled.** No autonomous reasoning chain ledgers for CAD generation or CAM programming.

## Training Corpora

**Found:**
- `wire-cad-training-corpus-orchestrator.py` (script: exists but **NOT RUNNING**)
- `CADCorpusIngesterEngine` (E0038: CADCAM-DAGI-MS0/U-DAGI03) — defined, status unknown
- **No `.jsonl` training corpus files** discovered in `state/shared/` or `mcp-server/data/state/`

**Gap:** CAD training data pipeline configured but **corpus accumulation inactive**. Zero closed-loop training samples logged.

## LoRA/EWC/GNN engines

**LoRA Engines Found (CAM-ML-CLOSEDLOOP-MS0):**
- `MillingLoRACadence` (E0329: U-CMCCL01) [WIRED]
- `FiveAxisLoRACadence` (E0151: U-CMCCL02) [WIRED]
- `MillTurnLoRACadence` (E0332: U-CMCCL03) [WIRED]
- `WEDMLoRACadence` (E0518: U-CMCCL04) [WIRED]
- `GrindingLoRACadence` (E0172: U-CMCCL08) [WIRED]
- `LaserLoRACadence` (E0212: U-CMCCL06) [WIRED]
- `WaterjetLoRACadence` (E0488: U-CMCCL07) [WIRED]
- `LatheLoRACadence` (E0219: training cadence) [WIRED]
- `CAMLoRAAdapterTrainer` (E0083: U-CAM-ML-05) [WIRED]

**EWC Engines:** Not found. **Elastic Weight Consolidation absent.**

**GNN Engines:** 
- `LatheLoRAKnowledgeGraph` (E0237) — graph-based learning [WIRED]
- No CAD-specific GNN found.

## Tier-1/2/3 Hierarchy

**Tier-1 (Master Orchestrators):**
- `MillingAGIMasterEngine` (E0328: WIRED prism_mill) ✓
- `CAMAGIMasterOrchestratorEngine` (E0072: WIRED prism_cam, prism_mill) ✓
- `MasterCADControlBrainEngine` (E0303: U-CADC-AI01 / CAD-COMPLETE-MS0 PHASE-30) — **UNWIRED**

**Tier-2 (Coordinators):**
- `MillMasterOrchestratorFacadeEngine` (E0331: unified mill ops) [WIRED]
- `MasterPostProcessorUnifiedAGIEngine` (E0322: PP-UNIFIED-AGI) [WIRED]
- `MasterAITrainingLedger` (E0302: CAM-ML-CLOSEDLOOP-MS0 U-CMCCL09) [WIRED]
- **No CAD-specific Tier-2 found.** FullSystemAICoordinator **NOT WIRED**.

**Tier-3 (Domain Specialists):**
- **CAD specialists (6):**
  1. `CADFeatureEmbedding` (E0042: U-DAGI05)
  2. `CADKnowledgeGraph` (E0050: U-DAGI02)
  3. `CADRetrievalAugmentation` (E0063: U-DAGI06)
  4. `CADSequenceTrainer` (E0067: U-DAGI04)
  5. `NeuralCADGeneration` (E0348: U-DAGI07)
  6. `TextToCADGeneration` (E0455: U-DAGI09)
- **CAM/Milling specialists (20+)** — all LoRA cadence builders + dataset validators

## Closed-loop status

**CAM Closed-Loop (CAM-ML-CLOSEDLOOP-MS0):**
- `ConfidenceCommitEventBus` (E0109: U-CMCCL12) [WIRED]
- `CrossCAMComparisonLedger` (E0119: U-CMCCL14) [WIRED]
- `OrchestratorConfidenceFeedback` (E0366: U-CMCCL13) [WIRED]
- `LoRADriftCoordinator` (E0289: U-CMCCL10) [WIRED]
- `SPCFeedbackLoop` (E0439: SPC → Parameter Adjustment) [WIRED]

**Status:** CAM systems **fully instrumented for closed-loop learning** via acceptance/rejection feedback.

**CAD Closed-Loop:** **MISSING.** No operator override capture or design acceptance ledgers. Blueprint-to-CAD and Text-to-CAD generation operate in open-loop (no feedback to retrain).

## Score (0-100)

**ASSESSMENT:**

| Dimension | Status | Points |
|---|---|---|
| Reasoning ledger coverage | Mill/WEDM only, CAD absent | 25/40 |
| Training corpus active | Script exists, data not flowing | 15/30 |
| LoRA/EWC/GNN engines | LoRA strong (CAM), CAD weak | 20/25 |
| Tier-1/2/3 wiring | CAM wired, CAD unwired | 30/35 |
| Closed-loop learning | CAM complete, CAD open-loop | 20/40 |
| Operator override tracking | None found | 0/10 |
| **Total** | | **110/180 ≈ 61** |

**Recommendation:** CAD/CAM AGI is **60% complete but structurally fragmented.** CAM path fully wired; CAD path dormant. Urgent: activate CAD reasoning trace ledger, wire `MasterCADControlBrainEngine`, and instrument operator feedback loops for design rejection/acceptance.

---
*Audit: 2026-05-08 (READ-ONLY exploration)*
