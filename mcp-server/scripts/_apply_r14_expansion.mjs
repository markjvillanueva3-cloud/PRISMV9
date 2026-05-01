#!/usr/bin/env node
/**
 * Apply Round 14 scrutiny expansion to CAD-COMPLETE-MS0:
 * - Add 6 new phases (PHASE-47 through PHASE-52) with 100 new units
 * - Update top-level totals (phase_count, total_units, sessions_estimate, scrutiny_rounds)
 * - Preserve all existing phases and units
 *
 * Run: node scripts/_apply_r14_expansion.mjs
 */

import fs from "node:fs";
import path from "node:path";

const root = "H:/prism/mcp-server";
const envelopePath = path.join(root, "data/milestones/CAD-COMPLETE-MS0.json");
const indexPath = path.join(root, "data/roadmap-index.json");

const envelope = JSON.parse(fs.readFileSync(envelopePath, "utf8"));

// ── Helper: build a minimal viable unit ──────────────────────────────────────
function u(id, title, description, opts = {}) {
  return {
    id,
    title,
    role: opts.role ?? "R2",
    model: opts.model ?? "sonnet",
    effort: opts.effort ?? 75,
    description,
    entry_conditions: opts.entry ?? [`Phase ${opts.phase} active`],
    steps: opts.steps ?? [
      { step: `Implement ${title}`, tool_calls: ["Read", "Write", "Edit"], validation: "file compiles" },
      { step: "Write ≥10 vitest tests", tool_calls: ["Write"], validation: "vitest passes" },
      { step: "Run build + tests", tool_calls: ["Bash"], validation: "0 tsc errors + all tests pass" }
    ],
    exit_conditions: opts.exit ?? [
      "Engine file compiles",
      "≥10 vitest tests pass",
      "No regressions vs baseline"
    ],
    tools: opts.tools ?? ["Read", "Write", "Edit", "Bash"],
    skills: opts.skills ?? ["/dedup", "/scrutinize"],
    dependencies: opts.deps ?? [],
    deliverables: opts.deliverables ?? [],
    status: "not_started"
  };
}

// ── PHASE-47: CAD Vault Production Hardening ────────────────────────────────
const PHASE_47 = {
  id: "PHASE-47",
  title: "CAD Vault Production Hardening — Filing Layer Completeness (R14-FS)",
  dependencies: ["PHASE-0", "PHASE-32", "PHASE-43"],
  goal: "Close R14 filing-layer gaps: full-file content hash, assembly graph, replication, reconciliation, bundle signing. Close U-CADC02 first-4KB hash defect.",
  units: [
    u("U-FS-01", "CADContentAddressableStoreEngine — full-file SHA-256 + BLAKE3 chunks", "Upgrade U-CADC02 to full-file SHA-256 + BLAKE3 rolling-hash in 4MB blocks. Resumable multipart upload. Periodic integrity re-scan. Block-level dedup across revisions.", { phase: "47", effort: 85 }),
    u("U-FS-02", "CADAssemblyGraphEngine — bidirectional reference graph", "Parse assembly references (SLDASM, IAM, IPJ, STEP links), build bidirectional graph, where-used report, transitive BOM closure, broken-ref healing via content-hash lookup, impact analysis.", { phase: "47", effort: 90 }),
    u("U-FS-03", "CADRevisionDetectorEngine — auto-extract revisions from filenames", "Regex + heuristics for Rev.A/B/C, v1/v2, -02, _R3 suffixes. Normalize to canonical revision spec. Graft onto revision graph.", { phase: "47", effort: 60 }),
    u("U-FS-04", "CADRevisionPromotionWorkflowEngine — draft→review→released state machine", "Immutability enforcement on released revisions, moving 'current' pointer, rollback workflow, 2-signer approval.", { phase: "47", effort: 75 }),
    u("U-FS-05", "CADVisualDiffEngine — 3D + parametric + screenshot diff", "Added/removed/moved features, parametric diff (sketch/feature tree), perceptual-hash screenshot diff, side-by-side PNG + JSON report.", { phase: "47", effort: 80 }),
    u("U-FS-06", "CADDrawingNumberNormalizerEngine — part-family hierarchy", "Parse customer + internal drawing numbers, normalize separators/padding, build part-family → config → revision hierarchy, fuzzy lookup (Levenshtein ≤ 2).", { phase: "47", effort: 60 }),
    u("U-FS-07", "CADTenantNamespaceEngine — IP-leak detection + retention policies", "Public/shared library namespace, cross-tenant content-hash collision alert, NDA-gated download, per-tenant retention, GDPR right-to-delete with tombstones, customer archive export.", { phase: "47", effort: 80 }),
    u("U-FS-08", "CADSearchUniversalEngine — unified FT+semantic+visual+spec+NL", "Full-text + semantic embedding + visual + spec-based + tolerance-range + natural language. Reuses PHASE-31 foundation model + U-CADC-FS04 tags. ≤200ms ranked results.", { phase: "47", effort: 85 }),
    u("U-FS-09", "CADFormatConversionMatrixEngine — lossless/lossy + validity probe", "Explicit lossless/lossy conversion table (25+ formats), quality report per lossy path, magic-byte sniffer, native-open validity probe via sandboxed opener.", { phase: "47", effort: 75 }),
    u("U-FS-10", "CADPreviewThumbnailCacheEngine — 2D + hero 3D view cache", "Auto-render 2D preview + hero 3D view per file+revision, cache at /data/cad-thumbnails/{hash}/{view}.png, invalidate on content change.", { phase: "47", effort: 65 }),
    u("U-FS-11", "CADReplicationDurabilityEngine — multi-location + erasure coding", "Local + S3 + Glacier replication, Reed-Solomon 10+4 erasure coding, scheduled backup, tested RTO/RPO, offline-friendly sync with CRDT metadata + LWW binary resolution.", { phase: "47", effort: 90 }),
    u("U-FS-12", "CADAccessControlRBACABACEngine — RBAC+ABAC+session-record", "RBAC (viewer/editor/owner/auditor) + ABAC (ITAR/EAR/export-controlled), per-file open audit, session recording for flagged files, checkout/checkin soft-lock.", { phase: "47", effort: 85 }),
    u("U-FS-13", "CADFilesystemReconciliationEngine — orphan/zombie/GC + tier aging", "Orphan-on-disk + zombie-in-registry detectors, CAS garbage collector, storage-tier aging (hot→warm→cold→glacier), per-tenant cost ledger.", { phase: "47", effort: 75 }),
    u("U-FS-14", "CADBundleSigningVersioningEngine — Ed25519 + Sigstore cosign", "Sign every PHASE-32 bundle on finalize, cosign attestation, semver discipline per bundle, tamper-evident chain, verify-on-load.", { phase: "47", effort: 75 }),
    u("U-FS-15", "CADBundleReplayCompareEngine — regression harness + cross-bundle search", "Re-execute recorded CAD op on new inputs, op-by-op cross-bundle diff, cross-bundle search UI, replay failure classifier feeding PHASE-27 retrain.", { phase: "47", effort: 80 })
  ]
};

// ── PHASE-48: Extended CAD App Coverage ─────────────────────────────────────
const PHASE_48 = {
  id: "PHASE-48",
  title: "Extended CAD App Coverage — Creo, CATIA, Rhino, Onshape, AutoCAD + Hardening (R14-APP)",
  dependencies: ["PHASE-18", "PHASE-25", "PHASE-26"],
  goal: "Close the 'all CAD softwares' scope gap. Add Creo (J-Link), CATIA (CAA V5), Rhino/Grasshopper, Onshape (REST), AutoCAD (.NET+AutoLISP). Add cross-cutting crash recovery, mTLS security, headless integration tests.",
  units: [
    u("U-CAD-APP-01", "CreoToolkitBridgeEngine — J-Link + Creo Toolkit live r/w", "Parameter + feature-tree manipulation for CATParts/CATProducts equivalent; parameterize and drive Creo via J-Link.", { phase: "48", effort: 90 }),
    u("U-CAD-APP-02", "CreoAddinPlugin — ribbon + speed/feed + DFM + tribal", "Creo ribbon add-in with PRISM menu + tribal tips integration.", { phase: "48", effort: 75 }),
    u("U-CAD-APP-03", "CreoIntegrationTestSuite — headless fixtures", "Headless Creo binary fixture tests across 10 part types.", { phase: "48", effort: 70 }),
    u("U-CAD-APP-04", "CATIACAAV5BridgeEngine — CAA V5 + EKL r/w", "CAA V5 Automation + EKL scripting bridge for CATParts/CATProducts/CATDrawings.", { phase: "48", effort: 95 }),
    u("U-CAD-APP-05", "CATIAAddinPlugin — Workbench + toolbar + events", "CATIA Workbench with PRISM toolbar + event subscriptions.", { phase: "48", effort: 80 }),
    u("U-CAD-APP-06", "CATIAIntegrationTestSuite — headless CAA fixtures", "Headless CATIA run with CAA fixtures for 10 part types.", { phase: "48", effort: 70 }),
    u("U-CAD-APP-07", "RhinoCommonBridgeEngine — .NET + Grasshopper", "RhinoCommon .NET bridge + Grasshopper component host.", { phase: "48", effort: 80 }),
    u("U-CAD-APP-08", "RhinoGrasshopperPRISMComponents — GH components calling PRISM", "Native Grasshopper components wrapping PRISM speed/feed/DFM/quote flows.", { phase: "48", effort: 70 }),
    u("U-CAD-APP-09", "OnshapeAPIBridgeEngine — REST + webhook + FeatureScript", "Onshape REST API + webhook subscription + FeatureScript runner for server-side ops.", { phase: "48", effort: 85 }),
    u("U-CAD-APP-10", "OnshapeLiveCollabAdapter — real Onshape doc events → PRISM bus", "Real Onshape document-change events piped to PRISM AI session (not R13-UX-08 parity stub).", { phase: "48", effort: 75 }),
    u("U-CAD-APP-11", "AutoCADDotNetBridgeEngine — AcMgd/AcDbMgd + AutoLISP", "AutoCAD .NET bridge + AutoLISP reactor for 2D shop prints and DWG round-trip.", { phase: "48", effort: 80 }),
    u("U-CAD-APP-12", "AutoCADAddinPlugin — CUI ribbon + AutoLISP reactors", "CUI ribbon + AutoLISP reactor wired to PRISM bus.", { phase: "48", effort: 70 }),
    u("U-CAD-APP-13", "CADCrashRecoveryEngine — per-app watchdog + re-attach + replay", "Per-CAD-process watchdog, re-attach to new instance on crash, replay last op, cleanup orphan COM objects (SW/Inventor).", { phase: "48", effort: 85 }),
    u("U-CAD-APP-14", "CADLicenseHealthEngine — seat + expiry + contention", "License-expiry + seat-contention detection across all apps; auto-yield to user session on contention; graceful downgrade.", { phase: "48", effort: 75 }),
    u("U-CAD-APP-15", "CADPluginMTLSSecurityEngine — mutual-TLS + signed binaries", "Mutual TLS + signed-binary verification for every plugin ↔ Hub link. Closes eavesdropping/impersonation gap.", { phase: "48", effort: 85 }),
    u("U-CAD-APP-16", "CADPluginTamperAuditLogEngine — hash-chained command log", "Append-only hash-chained command log per CAD session. Tamper-evident for AS9100/IATF audit.", { phase: "48", effort: 70 }),
    u("U-CAD-APP-17", "NXOpenSketchEntityEngine — NX Sketcher parity", "Close NX gap vs FreeCAD/Inventor/SolidWorks sketch engines.", { phase: "48", effort: 80 }),
    u("U-CAD-APP-18", "NXOpenAssemblyDrawingEngine — NX Assembly + Drafting parity", "Close NX gap vs FreeCAD/Inventor/SW assembly + drawing generation engines.", { phase: "48", effort: 80 }),
    u("U-CAD-APP-19", "MastercamHeadlessIntegrationTestSuite — filling cap-11 gap for #1 app", "Headless-mode Mastercam fixtures across 20 JM Die representative parts.", { phase: "48", effort: 75 }),
    u("U-CAD-APP-20", "PerAppInCADInferenceAdapter — embed foundation model inside each plugin", "Embed PHASE-31 foundation-model inference inside each plugin process (not just HTTP hop). Required for ≤100ms p99 interactive SLO.", { phase: "48", effort: 90 })
  ]
};

// ── PHASE-49: Production ML Lifecycle ───────────────────────────────────────
const PHASE_49 = {
  id: "PHASE-49",
  title: "Production ML Lifecycle — Physics-consistency, Conformal, MLflow, Adversarial (R14-ML)",
  dependencies: ["PHASE-5", "PHASE-24", "PHASE-27", "PHASE-45"],
  goal: "Promote ML layer from 'ML-aware' to 'production-grade ML lifecycle'. Add physics-consistency gates, CAD-specific augmentation, tenant-leak-proof splits, distributed training, MLflow-style experiment tracking, Bayesian HPO, conformal prediction, adversarial robustness, bias audit, active learning, continual learning (EWC++), model/data cards, reproducibility contracts, foundation-model adaptation, interactive-SLO enforcement.",
  units: [
    u("U-ML-01", "CADPhysicsConsistencyGateEngine — Kienzle/Taylor-bounded validator", "Physics-bounded validator on every generated parameter set. Veto unmanufacturable outputs before they reach CAM.", { phase: "49", effort: 85 }),
    u("U-ML-02", "CADGeometricAugmentationEngine — mirror/scale/rotate/tolerance-noise/CSG permutation", "Geometric augmentation producing 10× effective corpus from 9,794 files.", { phase: "49", effort: 75 }),
    u("U-ML-03", "TenantIsolatedSplitEngine — provable no-customer-leak split", "Stratified splitter with property-test assertion: no training content-hash appears in eval set.", { phase: "49", effort: 70 }),
    u("U-ML-04", "DistributedTrainingOrchestratorEngine — Ray/FSDP + GPU-hours ledger", "Ray/FSDP wrapper with GPU-hours ledger, checkpoint/resume, signed-artifact manifest.", { phase: "49", effort: 90 }),
    u("U-ML-05", "ExperimentTrackingEngine — MLflow-compatible run registry", "Params + metrics + artifacts + git-SHA + data-checksum per training run. MLflow API-compatible.", { phase: "49", effort: 75 }),
    u("U-ML-06", "HyperparameterSearchEngine — Optuna TPE + Hyperband", "Bayesian (TPE) + Hyperband HPO for foundation model + per-CAD classifiers.", { phase: "49", effort: 80 }),
    u("U-ML-07", "ConformalPredictionCalibrationEngine — distribution-free intervals", "Conformal intervals wrapping every regression head with coverage guarantees. Enables uncertainty-aware downstream consumption.", { phase: "49", effort: 80 }),
    u("U-ML-08", "AdversarialRobustnessSuite — corrupted-STEP + degenerate-BREP harness", "Attack library + minimum-accuracy gate: corrupted STEP, degenerate BREP, truncated prints, malicious dimensioning.", { phase: "49", effort: 75 }),
    u("U-ML-09", "BiasAuditEngine — per-CAD-app + per-customer + per-machine parity", "Performance parity report across apps/customers/machines. Alert on Δ > 5%.", { phase: "49", effort: 70 }),
    u("U-ML-10", "ActiveLearningQueryEngine — BALD + expected-info-gain selection", "Uncertainty-priority selection feeding human-in-loop queue. Saves label budget.", { phase: "49", effort: 75 }),
    u("U-ML-11", "ContinualLearningBufferEngine — EWC++ + replay buffer", "Prevents catastrophic forgetting on rare features (deep hole, thin wall) across nightly retrains.", { phase: "49", effort: 80 }),
    u("U-ML-12", "ModelCardDataCardGeneratorEngine — HuggingFace schema + datasheet-for-datasets", "Auto-generates model card + data card on every model promotion.", { phase: "49", effort: 60 }),
    u("U-ML-13", "ReproducibilityContractEngine — deterministic replay attestation", "(seed + config-hash + data-checksum + code-SHA) → deterministic-output attestation with replay API.", { phase: "49", effort: 70 }),
    u("U-ML-14", "FoundationModelAdaptationEngine — bridge DeepCAD/SketchGraphs/Point-E/Shap-E", "Cheap fine-tune of pretrained 3D foundation models beats training from scratch on 9,794 files.", { phase: "49", effort: 85 }),
    u("U-ML-15", "InteractiveInferenceSLOEngine — ≤100ms p99 + on-device/cloud routing + distillation", "Enforces interactive SLO + routes on-device vs cloud + quantized distillation for workstation deployment.", { phase: "49", effort: 85 })
  ]
};

// ── PHASE-50: Extended Neural Architectures ─────────────────────────────────
const PHASE_50 = {
  id: "PHASE-50",
  title: "Extended Neural Architectures — 3D Geometry + Inference Infra + Safety (R14-NN)",
  dependencies: ["PHASE-31", "PHASE-49"],
  goal: "Close neural gaps. Add 3D-geometry nets (PointNet, MeshCNN, DeepSDF, BRepNet, MVCNN), self-supervised pretext + contrastive, VLM for blueprint understanding, uncertainty (MC dropout + ensembles + conformal), explainability (SHAP + IG + counterfactuals), ONNX inference infra, neural safety gate, MoE + distillation.",
  units: [
    u("U-NN-01", "PointCloudEncoderEngine — PointNet++ + DGCNN dual backbone", "PointNet++ + DGCNN dual backbone for CAD point-cloud encoding.", { phase: "50", effort: 85 }),
    u("U-NN-02", "MeshCNNEncoderEngine — MeshCNN + SubdivNet edge-conv", "Edge-conv MeshCNN + SubdivNet on part meshes. Complements point-cloud, captures topology.", { phase: "50", effort: 85 }),
    u("U-NN-03", "ImplicitNeuralFieldEngine — DeepSDF + Occupancy-Net", "Continuous 3D representation. Enables watertight reconstruction + query-anywhere inference.", { phase: "50", effort: 85 }),
    u("U-NN-04", "BRepGNNEngine — BRepNet/UV-Net over faces/edges/loops", "B-Rep GNN over faces/edges/loops. JM Die workflow is B-Rep first — biggest accuracy lever.", { phase: "50", effort: 90 }),
    u("U-NN-05", "MultiViewCNNEngine — MVCNN + differentiable rendering", "MVCNN on auto-rendered orthographic views + differentiable rendering. Bridges 3D and blueprint pipelines.", { phase: "50", effort: 80 }),
    u("U-NN-06", "SketchConstraintGNNEngine — constraint-graph GNN", "GNN over sketch constraint graphs (SketchGraphs-style). Solver acceleration + auto-fixer.", { phase: "50", effort: 75 }),
    u("U-NN-07", "SelfSupervisedPretextEngine — masked-BRep/rotation/reassembly", "Masked-BRep + rotation + reassembly + completion pretext tasks. Foundation model (NN06) needs pretext to be genuinely foundational.", { phase: "50", effort: 80 }),
    u("U-NN-08", "ContrastivePretrainingEngine — SimCLR/MoCo on unlabeled 24K-corpus", "SimCLR/MoCo on unlabeled 24,545 JM Die corpus. Leverages dark-data. Prereq to strong foundation model.", { phase: "50", effort: 75 }),
    u("U-NN-09", "BlueprintVLMEngine — Qwen2-VL/LLaVA for drawing understanding", "Vision-language model for drawing understanding. NN04 is ViT-only — VLM is required for text-in-drawing semantics.", { phase: "50", effort: 85 }),
    u("U-NN-10", "CADEmbeddingRetrievalEngine — FAISS/HNSW unified embedding space", "ANN retrieval over unified embedding space (drawing + 3D + text). 'Find similar part' customer ask.", { phase: "50", effort: 75 }),
    u("U-NN-11", "NeuralUncertaintyEngine — deep ensembles + MC dropout + conformal", "Calibrated uncertainty on all NN outputs. No CAD NN ships without it — safety critical.", { phase: "50", effort: 85 }),
    u("U-NN-12", "CADExplainabilityEngine — SHAP + IG + counterfactual + concept bottleneck", "Regulated-industry customers (aerospace, medical) require this.", { phase: "50", effort: 80 }),
    u("U-NN-13", "ONNXInferenceRuntimeEngine — ONNX + TensorRT + INT8/INT4 + continuous batching", "ONNX export + TensorRT/OpenVINO + INT8/INT4 quantization + KV-cache + continuous batching. Without it, NN06 is theoretical.", { phase: "50", effort: 90 }),
    u("U-NN-14", "NeuralSafetyGateEngine — physics + self-intersection + wall-thickness", "Hard safety layer that vetoes NN outputs before they hit CAM. Fills the current gate-less flow.", { phase: "50", effort: 85 }),
    u("U-NN-15", "MoEDistillationEngine — per-CAD MoE routing + teacher→student", "Mixture-of-Experts per CAD + teacher→student distillation (foundation→edge). Per-CAD specialization at single-expert cost + workstation deployment.", { phase: "50", effort: 85 })
  ]
};

// ── PHASE-51: AI Cognition Layer ────────────────────────────────────────────
const PHASE_51 = {
  id: "PHASE-51",
  title: "AI Cognition Layer — Planning + World-Model + Intent Disambiguation + Consensus (R14-AI)",
  dependencies: ["PHASE-30", "PHASE-33", "PHASE-43", "PHASE-46"],
  goal: "Close cognitive gaps. Add HTN planning, world-model across apps, unit-of-measure disambiguation, multi-turn intent refinement, voice input, CAD-op transactions, circuit breakers, E2E tracing, second-opinion consensus, risk-tier classifier, DFM physics gate, per-customer Omega, federated learning.",
  units: [
    u("U-AI-01", "CADFallbackRoutingEngine — preferred-unavailable → next-best reroute", "Score-based reroute to next-best CAD app with capability match when preferred is unavailable.", { phase: "51", effort: 75 }),
    u("U-AI-02", "CADWorldModelEngine — authoritative 'what is open where'", "Coherent world-model across 6+ apps: modal-dialog + active-sketch + locked-view state.", { phase: "51", effort: 85 }),
    u("U-AI-03", "UnitOfMeasureDisambiguationEngine — mm/inch/units resolver", "'Extrude 1' → clarify via context + customer default + explicit ask. Blocks ambiguous ops that can scrap parts.", { phase: "51", effort: 70 }),
    u("U-AI-04", "MultiTurnIntentRefinementEngine — dialogue-state-tracker", "Dialogue-state over session, refines intent across N turns, asks targeted follow-ups.", { phase: "51", effort: 75 }),
    u("U-AI-05", "VoiceIntentInputEngine — Whisper-class STT → NL intent", "Operator drives CAD hands-free while holding parts. Shop-floor-ready.", { phase: "51", effort: 80 }),
    u("U-AI-06", "HierarchicalTaskPlannerEngine — HTN goal → sub-goals → CAD ops", "HTN with prerequisite-DAG, constraint-aware + cost-aware + safety-aware cost functions. BIGGEST cognitive gap before R14.", { phase: "51", effort: 95 }),
    u("U-AI-07", "MultiStepPreviewEngine — 'if X then Y then Z' rendered preview", "Predicted geometry/tolerance/cost rendered before commit.", { phase: "51", effort: 80 }),
    u("U-AI-08", "CADOpTransactionEngine — 2PC across CAD apps + rollback + idempotency", "Two-phase commit across one/many CAD apps, partial-failure rollback, cancel-safe, idempotency key.", { phase: "51", effort: 85 }),
    u("U-AI-09", "CADAppCircuitBreakerEngine — open/half-open/closed per CAD app", "Fail-fast on slow/errorful CAD apps. Protects master brain from cascading stalls.", { phase: "51", effort: 75 }),
    u("U-AI-10", "EndToEndSpanTraceEngine — W3C trace-context propagation", "user → MCP → live-bridge → ML → back. Per-span latency + error path queryable.", { phase: "51", effort: 75 }),
    u("U-AI-11", "SecondOpinionConsensusEngine — 2+ models + disagreement surfacing", "Risky ops dispatched to multiple independent models. Disagreement surfaced; confidence-weighted aggregate or human escalation.", { phase: "51", effort: 80 }),
    u("U-AI-12", "RiskTierClassifierEngine — low/med/high/critical op classification", "Routes high/critical to human-in-loop + second-opinion.", { phase: "51", effort: 70 }),
    u("U-AI-13", "DFMPhysicsGateEngine — physics + GD&T + material + manufacturability", "Between plan and commit. Blocks impossible geometry from reaching CAM.", { phase: "51", effort: 85 }),
    u("U-AI-14", "PerCustomerOmegaTargetEngine — customer-specific Ω targets", "Customer-specific Ω targets (speed-leaning vs safety-leaning). Drives planner cost weights + consensus thresholds.", { phase: "51", effort: 70 }),
    u("U-AI-15", "FederatedLearningEngine — DP + secure aggregation across tenants", "Cross-customer tribal/model sharing with differential privacy + secure aggregation. No raw-data or identity leak.", { phase: "51", effort: 90 })
  ]
};

// ── PHASE-52: Platform + Compliance + Manufacturing Wiring ──────────────────
const PHASE_52 = {
  id: "PHASE-52",
  title: "Platform + Compliance + Manufacturing Wiring — Windows/Linux/macOS + ITAR/EAR + PLM + CAD→CAM Wiring (R14-INT)",
  dependencies: ["PHASE-18", "PHASE-43", "PHASE-44", "PHASE-47"],
  goal: "Close integration seams. Platform matrix, version matrix, license arbitration, compute-cost attribution, GPU budget, Unicode path safety, unit preference, a11y audit, product funnel analytics, STEP AP238, JT/USD export, PLM connectors (Teamcenter/Windchill/Enovia), ITAR/EAR gate, corrupt-file recovery, large-assembly optimizer, latency-budget, offline-first sync, crash recovery, legacy DWG/OCR import, CAD→manufacturing output wiring.",
  units: [
    u("U-INT-01", "CADPlatformMatrixEngine — Windows/Linux/macOS/headless support matrix", "Per-CAD-app platform support matrix, CI gates per combo.", { phase: "52", effort: 75 }),
    u("U-INT-02", "CADVersionCompatMatrixEngine — per-version API deprecation handling", "SW 2020/21/22/23/24, Inventor 23/24/25, Fusion channel pinning. Auto-detect + graceful downgrade.", { phase: "52", effort: 75 }),
    u("U-INT-03", "CADLicenseAwareBridgeEngine — floating/borrowed/seat arbitration", "Detect floating/borrowed license, yield to user session, backoff scheduler. PRISM cannot fight user for single SW seat.", { phase: "52", effort: 80 }),
    u("U-INT-04", "CADComputeCostAttributionEngine — per-op GPU+CPU+disk accounting", "Per-op GPU-hour + CPU-second + disk-byte accounting tied to tenant/customer.", { phase: "52", effort: 70 }),
    u("U-INT-05", "CADGPUBudgetGovernorEngine — cap PHASE-31 training GPU-hours", "Configurable GPU-hour/month cap. Soft-throttle at 80%. Prevents PHASE-31 cost runaway.", { phase: "52", effort: 65 }),
    u("U-INT-06", "CADUnicodePathSafetyEngine — Windows mbcs + CJK filename round-trip", "mbcs/short-path fallback, CJK filename round-trip test, BOM-aware path writer. Fixes latent Python subprocess mbcs corruption bug.", { phase: "52", effort: 60 }),
    u("U-INT-07", "CADUnitPreferenceEngine — per-user/customer metric/imperial/mixed", "Sticky across sessions. Audit-logged. Complements U-AI-03.", { phase: "52", effort: 55 }),
    u("U-INT-08", "CADAccessibilityUIAuditEngine — WCAG 2.2 AA + screen-reader + keyboard-only", "Audit 8 web pages + 6 CAD plugin panels. Gate on a11y.", { phase: "52", effort: 70 }),
    u("U-INT-09", "CADProductFunnelAnalyticsEngine — upload→extract→generate→validate→export", "Funnel + retention cohorts + anonymized session replay.", { phase: "52", effort: 70 }),
    u("U-INT-10", "CADSTEPAP238Engine — STEP-NC machining-info export", "STEP-NC carrying tolerance + surface finish + operation sequence to CAM. AP242 carries dims/tol; AP238 carries ops.", { phase: "52", effort: 85 }),
    u("U-INT-11", "CADJTUSDExportEngine — Siemens JT + Pixar USD round-trip", "JT lightweight + USD (additive) with PMI round-trip.", { phase: "52", effort: 75 }),
    u("U-INT-12", "CADPLMConnectorEngine — Teamcenter + Windchill + Enovia r/o", "Read-only bridges: item master + revision + checkout status. Blocks adoption for shops with existing PLM.", { phase: "52", effort: 85 }),
    u("U-INT-13", "CADExportControlGateEngine — ITAR/EAR classification + blocking", "Classify CAD artifacts by customer + jurisdiction. Block export on flag. Prevents federal-crime risk.", { phase: "52", effort: 85 }),
    u("U-INT-14", "CADCorruptFileRecoveryEngine — partial-load + ref substitution + >2GB parser", "Partial-load suppressed components, missing-ref substitution, >2GB streaming parser, legacy DXF R12 dialect.", { phase: "52", effort: 80 }),
    u("U-INT-15", "CADLargeAssemblyOptimizerEngine — >10k-component LOD + memory-pressure", ">10k-component LOD, progressive load, spatial index, memory-pressure gating with OOM graceful-fail.", { phase: "52", effort: 80 }),
    u("U-INT-16", "CADInteractiveLatencyBudgetEngine — ≤100ms cursor / ≤1s feature / ≤10s gen", "Priority queue interactive > batch > learning. Complements U-ML-15.", { phase: "52", effort: 75 }),
    u("U-INT-17", "CADOfflineFirstSyncEngine — full offline + outbox + CRDT + proxy/IPv6", "Outbox queue + CRDT merge + VPN/proxy/PAC auto-discover + IPv6-ready.", { phase: "52", effort: 85 }),
    u("U-INT-18", "CADCrashRecoveryPlatformEngine — orphan COM + disk-full checkpoint + clock-skew", "Orphan COM cleanup on SW/Inventor crash + disk-full checkpoint + PRISM-vs-CAD-host clock-skew detection.", { phase: "52", effort: 80 }),
    u("U-INT-19", "CADLegacyDWGImportEngine — ODA Teigha + OCR + Excel-BOM + whiteboard photo", "Open Design Alliance Teigha DWG + paper-print OCR → BlueprintVisionOCR + BOM-from-Excel + whiteboard-photo ingest.", { phase: "52", effort: 85 }),
    u("U-INT-20", "CADManufacturingOutputWiringEngine — CAD→DNC+probing+setup-sheet+kitting", "CAD→DNC, CAD+PMI→Renishaw probing, CAD thumbnail→setup sheet, CAD BOM→kitting/tool-crib withdrawal. Final integration seam.", { phase: "52", effort: 85 })
  ]
};

// ── Append new phases ───────────────────────────────────────────────────────
const newPhases = [PHASE_47, PHASE_48, PHASE_49, PHASE_50, PHASE_51, PHASE_52];
let addedUnits = 0;
for (const p of newPhases) {
  // Defensive: if phase already exists, skip
  if (envelope.phases.some(ex => ex.id === p.id)) {
    console.log(`Skipping ${p.id} — already present`);
    continue;
  }
  envelope.phases.push(p);
  addedUnits += p.units.length;
}

// ── Update top-level totals ─────────────────────────────────────────────────
envelope.phase_count = envelope.phases.length;
envelope.total_units = envelope.phases.reduce((s, p) => s + p.units.length, 0);
envelope.scrutiny_rounds = (envelope.scrutiny_rounds ?? 16) + 1;

// Recompute p50/p90 session estimates assuming ~1.25 units/session (p50) and ~0.85 units/session (p90)
envelope.sessions_estimate = {
  ...envelope.sessions_estimate,
  p50: Math.ceil(envelope.total_units * 0.8),
  p90: Math.ceil(envelope.total_units * 1.17)
};

fs.writeFileSync(envelopePath, JSON.stringify(envelope, null, 2) + "\n", "utf8");
console.log(`Added ${addedUnits} new units across ${newPhases.length} phases.`);
console.log(`Envelope now: ${envelope.phase_count} phases, ${envelope.total_units} units, p50 ${envelope.sessions_estimate.p50} / p90 ${envelope.sessions_estimate.p90} sessions, scrutiny_rounds=${envelope.scrutiny_rounds}`);

// ── Update roadmap-index.json ───────────────────────────────────────────────
const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const entry = index.milestones.find(m => m.id === "CAD-COMPLETE-MS0");
if (entry) {
  entry.total_units = envelope.total_units;
  entry.phase_count = envelope.phase_count;
  entry.sessions_p50 = envelope.sessions_estimate.p50;
  entry.sessions_p90 = envelope.sessions_estimate.p90;
  entry.scrutiny_rounds = envelope.scrutiny_rounds;
  // Keep title, append R14 annotation if missing
  if (!entry.title.includes("+ R14 Full-Stack")) {
    entry.title += " + R14 Full-Stack (Planning+3D-Neural+Vault+Ext-Apps+ITAR+PLM)";
  }
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n", "utf8");
  console.log(`Updated roadmap-index.json: ${entry.id} → ${entry.total_units}u / ${entry.phase_count}ph / p50 ${entry.sessions_p50}`);
} else {
  console.warn("CAD-COMPLETE-MS0 not found in roadmap-index.json");
}
