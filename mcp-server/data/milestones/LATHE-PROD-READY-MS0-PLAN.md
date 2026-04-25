# LATHE-PROD-READY-MS0 — Consolidated Plan (v3)

**Status:** AMENDED v3 (post-R2 10-agent scrutiny — 43 blocks resolved)
**Date:** 2026-04-18
**Target Omega:** 1.0
**Units:** 127 (was 98; +29 blocking units from R2)
**Phases:** 11
**Estimated Sessions:** P50 16 / P90 25 (corrected from Delivery B1)
**Scrutiny target:** ≥0.90 (R2 mean was 0.800; 43 blocks applied)

## R2 → R3 Amendment summary

| Agent | R2 Score | R2 Blocks | R3 Fixes Applied |
|---|---|---|---|
| Systems Architect | 0.91 | 0 | 3 soft (HMAC, phase-9/10 gate tokens, Phase 2a→2b sync barrier) |
| Safety-Physics | 0.87 | 2 | B1 Sandvik-cited hardness coefficients; B2 blade stiffness k_y=Ebt³/4L³; +BUE + regen chatter + feed slew |
| Lathe Expert | 0.84 | 4 | B1 Okuma polar G137/G136 + G07.1 + real-vs-virtual Y; B2 8 hard-turn fixtures; B3 tool-type-branching part-off; B4 Swiss GB physics |
| Frontend | 0.82 | 3 | B1 Monaco ≤600KB route budget; B2 7-day A/B + rollback SLI; B3 +U-LPR-MOBILE tablet/offline |
| ML/LoRA | 0.78 | 5 | B1 geometry_hash grouping; B2 customer 80/10/10; B3 POT/GPD EVT; B4 DPO + 15% synth-failure; B5 +U-LPR-HPSEARCH Qwen2.5-Coder-7B |
| QA | 0.82 | 5 | B1 +U-LPR-PARSER-FUZZ; B2 +U-LPR-REGRESSION-BASELINE; B3 ≥3 operators × 10 parts Fleiss κ≥0.6; B4 +8 fixtures→40; B5 +U-LPR-CONTRACT Pact |
| Security | 0.71 | 7 | B1 +SEC08 AppSec/prompt-injection; B2 +SEC09 supply-chain/SBOM/Sigstore; B3 HSM+Vault; B4 +SEC10 model exfil; B5 PII/DPA/residency; B6 mTLS/SPIFFE; B7 +SEC-IR |
| Performance | 0.71 | 5 | B1 LoRA math (Q4_K_M + specdec + streaming OR server GPU); B2 E2E SLO decomposition; B3 MTConnect concurrency; B4 worker-pool bounded; B5 per-route bundle |
| Production | 0.72 | 8 | B1 wet-run state machine; B2 log sink + cardinality; B3 tri-level kill-switch; B4 canary cohort redef; B5 SLO/error-budget; B6 runbooks w/ RACI; B7 scrap $8k+$12k; B8 +Phase 11 |
| Delivery | 0.82 | 4 | B1 SEC/OBS dev+operate split P90→25; B2 +STALL-SIM +STALL-MOU; B3 risk register; B4 +3 checkpoints→8 |

---

## 1. Context — current system snapshot

- **Inventory:** 2,418 engines · 89 dispatchers · 5,123 actions · 2,262 tests · Omega 1.0 · build PASS · tsc 0 errors
- **Just completed:** LATHE-LORA-MS0 (50/50 units, 415 tests) — Phase 12 commit `527d0a762`
- **Audit Q1–Q4 findings:**
  - Q1 REVISED PASS (orphan superseded by CalculatorPage lathe tab → DELETE)
  - Q2 PASS (wizard wired e2e)
  - Q3 MILLING ONLY (lathe e2e unvalidated)
  - Q4 23/23 PRESENT; 5 integration gaps

## 2. Codex frontend reality (SCRUTINY-R5)

134 pages · 170 components · 87 API clients · 40 orphans (46%) · 4 MachineMode defs · REST-only (zero MCP callTool) · lathe tab = best-wired of 6 modes on 13,400 LOC CalculatorPage. Phase 0 HARD GATE.

## 3. Objectives

1. Fill Q1–Q4 audit gaps
2. Wire into Codex shop-mgmt frontend (8 gaps)
3. Rewrite 10,835 JM Die lathe programs
4. Leverage incoming prints for supervised pairs
5. Train via /pdf-learn, /video-learn, resource folder
6. Tribal integration gate
7. 3D sim contract integration
8. Pilot wet-run with instrumentation
9. Security + compliance hardening (incl. AppSec, supply chain, model exfil)
10. Production-grade observability + SRE maturity

## 4. Approach

**Option B — 11 phased slices.** HMAC-signed phase-gate tokens. Phases 9–11 run in parallel with 2–8. STALL bypasses for prints / sim / MOU. Quantified risk register.

## 5. Toolkit

```
Skills:     /dedup, /lathe-studio, /auto-speed-feed, /pdf-learn, /video-learn,
            /shop-knowledge, /forge-triple, /scrutinize, /test, /verify-loop,
            /machine-harden, /lathe-print-to-program, /train-lora, /cnc-simulate,
            /program-simulate, /print-to-program, /prints, /cad-import-guide,
            /security-audit, /security-scan

Engines (14 new domain + 3 adapters + 1 auth):
  Physics:      MaterialHardnessStateClassifierEngine (5-band regime),
                PartOffRailSafetyEngine (tool-type branching),
                CSSChipLoadInvariantCoordinatorEngine,
                SwissGuideBushingPhysicsEngine,
                BUEOnsetThresholdEngine,
                RegenerativeChatterStabilityLobeEngine
  Lathe:        LiveTurretCAxisEngine (G137/G136 polar + G07.1 cyl + Y-mode),
                LathePostProcessorDialectValidatorEngine,
                MachineTypeClassifierEngine
  ML:           DetachedLoRARunnerEngine, PhysicsValidDataAugmentEngine,
                GeometryHashGroupingEngine, SyntheticFailureGeneratorEngine
  Safety:       MultiSignalAutoRollbackEngine, WetRunStateMachineEngine,
                TriLevelKillSwitchEngine
  Auth:         AuthorizationEngine (consolidates Tenant+ACL+RESTMCPParity)
  Adapters:     OTelTraceEmitterAdapter, PrometheusMetricExporterAdapter,
                PagerDutyAlertRouterAdapter (moved to src/adapters/)

Base model:   Qwen2.5-Coder-7B (32k ctx, permissive, best HumanEval+ transfer)
              Q4_K_M quantized + paged KV + speculative decoding (draft ≤1B)

Corpus:       H:/PRISM/JM DIE/CNC LATHE/ — 10,835 programs

Audit refs:   SCRUTINY-R5-CODEX-FRONTEND, R4-CALC-PP-WIRING,
              PRINT-TO-CNC-ONESHOT, UNIVERSAL-SKILLS-SCRIPTS-HOOKS,
              MILL-AGI-UNIFIED-ROADMAP, LATHE-PROD-READY-MS0-SCRUTINY-10AGENT-R1+R2
```

## 6. Milestone structure — 127 units across 11 phases

### Phase 0 — UNIVERSAL GATE + CONTRACT + RISK REGISTER (6 units · session 1)

- **U-LPR00a** — Verify Universal W1–W2 (0.1 Enforcement, 0.2 Awareness, 0.4 Registry Locks, 0.6 Auto-Wiring, 0.9 Orphan Detection). HARD BLOCK if incomplete.
- **U-LPR00b** — Verify R4 Fix #3 + #5 (ppDispatcher dupes + vacuous-true).
- **U-LPR00c** — Verify CALC-LATHE-MS0 merged (Swiss/Tsugami toggle).
- **U-LPR00d** — **(HMAC-signed)** Publish `src/contracts/GateTokenContract.ts` with `{ phase_id, timestamp, exit_conditions[], attestation_hash, signature: HMAC-SHA256(kms_key, canonical_json), key_id }`. Each phase emits to `data/state/phase_gates/`. Phase-N entry verifies via constant-time compare. KMS root = Phase-9 U-LPR-SEC02 derived.
- **U-LPR00e** — **(NEW)** Quantified risk register at `data/state/RISK_REGISTER.json`. ≥10 entries with `{risk, P, impact_sessions, owner, mitigation, trigger}`. Mandatory entries: prints slip, 3D sim owner, JM Die MOU slip, KMS procurement, pen-test vendor, context-switch overhead, compaction loss, LoRA inference SLO breach, operator availability, scrap budget overrun.
- **U-LPR-MOU** — JM Die MOU v2: liability, insurance rider ($50k-500k spindle), scrap budget **$8k hard floor + $12k authorized contingency** (D2 blanks $200-800 × 5 parts × 2-3 retries + carbide inserts), kill-switch protocol ref, data-ownership + residency clause, 72h breach-notification, DPA addendum, sub-processor list. Owner: in-house counsel with 5-BD SLA. Signed PDF in `data/legal/jm-die-pilot-mou-v2.pdf`.

### Phase 1 — GAP FILL (7 units · session 1–2)

- **U-LPR01** — DELETE orphan `web/src/pages/LatheSpeedFeedCalculatorPage.tsx` + stale imports. Zero regressions on lathe tab.
- **U-LPR02** — e2e lathe test suite. **40 fixtures** (R2 QA B4: +8 from 32): OD×4 · ID×4 · face×2 · thread×6 · groove×4 · partoff×2 · chamfer×2 · live-tool×2 · profiling×4 · hard-turn×8 (R2 Lathe B2: CBN cont ×2, CBN interrupted ×2, ceramic rough ×2, white-layer gate ×2 across dry/MQL/flood) · multi-start thread×2 · deep-peck×2 · taper G76-vs-G71×2 · rigid-tap×1 · coolant-modal×1 · polar G12.1/G13.1×2 · Y-offset multi-turret×2 · bar-feeder×1. Target: ≥200 test cases.
- **U-LPR-REGRESSION-BASELINE** — **(NEW — QA B2)** Freeze `TEST_BASELINE_LATHE_PROD.json` at plan kickoff. Pinned test_id + expected result + timing p95. CI diff-gate any delta. Flaky tests (>1% fail in 100 runs) explicitly quarantined with reason — no silent skips.
- **U-LPR03** — `LathePostProcessorDialectValidatorEngine`. Diff ≥50 JM Die `.MIN` samples. Structural parity ≥95%, zero safety-critical divergences.
- **U-LPR04** — `MTConnectRoundTripLatencyBenchEngine`. **(Perf B3)** p95 ≤200ms @ 10 machines × 1Hz sustained 5min; p99 ≤350ms @ 50-machine burst. CI regression guard.
- **U-LPR05** — `CSSChipLoadInvariantCoordinatorEngine`. f_c = f·sin(κ_r) invariant; Fc = kc1.1·b·h^(1-mc) with material-specific mc. **(Physics R2)** Feed slew-rate df/dt ≤50 mm/rev/s; spindle accel τ ≤300ms; ω_max clamp (4000 rpm default). Transient chip-thickness spike at face-center prevented.
- **U-LPR-HARDNESS** — **(Physics B1 + Lathe soft)** `MaterialHardnessStateClassifierEngine`. 5-band regime `{soft, medium, pre-hard, hard, ultra-hard}`. Sandvik-cited coefficients: 4140 annealed kc1.1=1990 MPa; 4140 Q&T 32HRC=2260; 4140 case-hard 58HRC=2800; D2 annealed=2100; D2 60HRC=3400. Table covers JM Die materials (M2, D2, S7, A2, H13, WC-Co, 4140, 4340, 8620). Source: Sandvik Coromant Technical Guide 2023 + VDI 3321 + Kronenberg. Hooks into KienzleForceModel as pre-multiplier. ≥100 hardness-state tests cross-referenced to published tables.

### Phase 2 — CODEX FRONTEND (15 units · session 2–6)

**Phase 2a — Store foundation (1 unit · session 2)**

- **U-LPR07** — **(Frontend B2 fix)** Zustand + `zustand/middleware/shallow` structural selectors (Immer dropped from hot paths, replaced with pure structural sharing on CalculatorPage 665KB state). Persist only non-ephemeral slices. Feature flag `UNIFIED_STORE` default OFF. **7-day staging A/B** (was 48h) with explicit rollback SLI: p95 calc-latency Δ ≤10%, heap growth ≤15%, FPS on scroll ≥55. Rollback = flag OFF. Migrate lathe Upload/Wizard/Results + CalculatorPage handoff *only after* 7-day flag stable in prod.

**Phase 2a-gate — Sync barrier**

- Phase 2a→2b entry condition: `UNIFIED_STORE=ON` in prod + 7 days no rollback + metrics gate pass. Store-dependent units (06, 08, 10) block. Store-independent units (09, 13, 15, BUNDLE-GATE, MOBILE) proceed.

**Phase 2b — Pages + wiring (14 units · session 3–6)**

- **U-LPR06** — PrintDropPage with MachineTypeClassifierEngine (OCR title-block + CAD feature inference).
- **U-LPR08** — LatheStudioPage (6-step wizard, cloned from WireEdmStudioPage).
- **U-LPR09** — Collapse 4 MachineMode defs → canonical `calculatorWorkspace.ts:2`.
- **U-LPR10** — `modeHygieneReducer` extracted. **(Frontend B2 + S2)** 120 transition matrix (6 modes × 5 fields × {dirty|clean} × {persisted|ephemeral}), 100% unit coverage, Playwright fuzzes asserting DOM post-reset not just store state.
- **U-LPR11** — Registry-driven machine IDs. Remove hardcoded `'th-jmd-vdi30-turning-baseline'` at line 1980-1988.
- **U-LPR12a** — Wire 5 orphan clients: cadGeometry, holePattern, toolpath, feasibility, fiveAxis (view-only).
- **U-LPR12b** — Wire multiOp + multiAxisProgram + **`LiveTurretCAxisEngine`** covering: **(Lathe B1)** Okuma polar G137/G136 + CYLNDR/POLAR modes for face-contour milling; G07.1 cylindrical for OD slot milling; real-Y (LB3000-Y) vs virtual-Y (B+C compound) kinematics branching; G41/G42 tool-tip comp in polar-vs-cartesian frames; M45/M46 live-tool CW/CCW; M19 Sx spindle-orient with angle; M215/M216 sub-spindle live; separate SB/S2 live-tool S-address per controller dialect.
- **U-LPR13** — Retire `/web/` legacy mirror via codegen + zero-drift CI.
- **U-LPR14** — Wire lathe to ProgramReleasePage (`/print-to-cnc` via R4 Fix #7). Lathe-specific fields: chuck jaw config, tailstock quill, bar pull, live-tool state.
- **U-LPR15** — REST↔MCP bridge sanity. `REST_MCP_BRIDGE_CHECK.md`.
- **U-LPR-BUNDLE-GATE** — **(Frontend B1 + Perf B5)** Per-route budget: main ≤250KB gzip; LatheStudioPage React.lazy + Suspense ≤40KB initial; Monaco in its own lazy chunk ≤600KB gzip excluded from main-bundle gate; shared chunks ≤5KB delta per PR. Tree-shake Immer (drop entirely — structural selectors replace).
- **U-LPR-MOBILE** — **(NEW — Frontend B3)** Tablet shop-floor support. Breakpoints: 768px+ landscape, 1024px+ portrait. Touch targets ≥44px. Offline-capable thumbs-up/down via service worker + IndexedDB queue syncing when online. Operator-feedback UI responsive.
- **U-LPR-OPERATOR-OVERRIDE** — Per-operator preferences with tenant scoping; fed to LoRA as RLHF.
- **U-LPR-WEBWORKER** — **(NEW — Frontend S3)** Physics preview in Web Worker + Comlink for frontend; backend authoritative for release-grade. Decision doc + architecture diagram.

### Phase 3 — KNOWLEDGE INGESTION (11 units · session 6–7)

- **U-LPR16** — Resource folder enum + SHA256 per file.
- **U-LPR17** — `/pdf-learn` batch + TurningKnowledgeRegistry.
- **U-LPR18** — `/video-learn` batch (dedup against Titans 42 already done).
- **U-LPR19** — `/shop-knowledge` on JM Die operator notes.
- **U-LPR20** — Tribal gate: `searchTribalKnowledge()` → `TurningPrintToProgramEngine.selectStrategy()`. Trace test.
- **U-LPR21** — Dedup sweep.
- **U-LPR22** — Citation ≥95%.
- **U-LPR23** — Formula cross-reference.
- **U-LPR24** — Ingestion QA report.
- **U-LPR-CKPT-1** — **(NEW — Delivery B4)** Checkpoint after Phase 1 (post-foundation lock).
- **U-LPR-CKPT-2** — Checkpoint after Phase 3 (pre-corpus-RE).

### Phase 4 — JM DIE CORPUS REVERSE-ENG (16 units · session 7–9)

- **U-LPR25** — `MINProgramParserEngine`.
- **U-LPR-PARSER-TESTS** — ≥30 unit tests, 100% branch coverage.
- **U-LPR-PARSER-FUZZ** — **(NEW — QA B1)** ≥10k iterations via fast-check with grammar-aware mutations: truncated mid-block, UTF-16 LE/BE BOM, Shift-JIS half-width kana, mixed CRLF/LF/CR, NUL bytes, 100MB binary masquerade, nested paren depth >255, circular GOTO in WHILE/DO. Zero crashes/hangs, <256MB mem/file, 5s parse timeout. Shift-JIS corpus mandatory for Okuma OSP.
- **U-LPR26** — `McxProgramParserEngine` + same fuzz density.
- **U-LPR27** — Batch parse `.MIN` pt1 (1-2000). **(Perf B4)** Bounded worker pool `min(os.cpus()-1, 8)`, p-limit backpressure, per-worker 512MB heap, checkpoint every 250. Resumable.
- **U-LPR28** — Batch parse `.MIN` pt2 (2001-5297) + `.MCX` + `.mcx-8`. Same concurrency bounds.
- **U-LPR29** — Feature inference ≥90% vs 100-sample ground truth.
- **U-LPR30** — K-means cluster → 20 archetypes.
- **U-LPR31** — Physics quality-score per program.
- **U-LPR32** — Material inference ≥80%.
- **U-LPR33** — Tool inference ≥75%.
- **U-LPR34** — Training tuples `(features, tool, material, hardness_state) → (S, F, D, strategy)` at ≥70% confidence.
- **U-LPR35** — Human-review queue for sub-threshold.
- **U-LPR36** — Corpus RE final report.
- **U-LPR-CKPT-3** — **(NEW)** Checkpoint after Phase 4 (pre-prints gate).

### Phase 5 — PRINT MATCHING (9 units · session 9–10, gated+stalled)

- **U-LPR37** — `PartNumberProgramMatcherEngine` precision ≥95% recall ≥85%.
- **U-LPR38** — Print-OCR adapter.
- **U-LPR39** — Pairing QA UI.
- **U-LPR40** — Pairs pt1.
- **U-LPR41** — Pairs pt2.
- **U-LPR42** — Pairs pt3 + rejection report.
- **U-LPR43** — Pairing report.
- **U-LPR-STALL-PRINTS** — T+5d bypass → `exp-corpus-only-stalled`.
- **U-LPR-STALL-SIM** — **(NEW — Delivery B2)** 3D sim owner unavailable at T+3d → fallback to synthetic sim via existing `CollisionSimulationEngine` + voxel octree. Records stall; Phase 7 proceeds with `--sim-source=synthetic` flag; real-sim re-integration deferred to post-MS0.

### Phase 6 — LoRA TRAINING (17 units · session 10–13)

- **U-LPR44** — `LatheLoRAMasterOrchestratorEngine` config.
- **U-LPR-HPSEARCH** — **(NEW — ML B5)** Optuna TPE over rank ∈ {8,16,32,64}, alpha ∈ {rank, 2·rank}, dropout, lr, warmup, target_modules (q,k,v,o vs all-linear), 8-trial budget. Base model **Qwen2.5-Coder-7B** (32k ctx, permissive, best HumanEval+ G-code transfer) with Starcoder2-15B ablation if VRAM allows.
- **U-LPR-SPLIT** — **(ML B1 + B2)** `GeometryHashGroupingEngine`: group by `geometry_hash = SHA(normalized_features[material, OD/ID envelope ±5%, length ±5%, feature_topology, tolerance_class])`. Then **nested split: 80/10/10 customer-level, within-customer SHA(geom)%10**. K-NN validation in embedding space confirms zero cross-split overlap. Per-customer OOD degradation ≤15% gate.
- **U-LPR-DATA-AUG** — **(ML B4)** `PhysicsValidDataAugmentEngine` 3× size + **`SyntheticFailureGeneratorEngine`** 15-20% negative-class tuples labeled `{bad, reason}` (chatter-inducing feeds beyond stability lobes, Taylor violations, DOC>tool_edge_radius*8). DPO contrastive loss or preference pairs. Prevents conservative mode collapse.
- **U-LPR-GPU-ASYNC** — `DetachedLoRARunnerEngine` nohup + PID + status endpoint + pause/resume/kill. Bounded queue 32 + 429 shed-load.
- **U-LPR-TRAINING-LEDGER** — **(NEW — ML R1)** `WEDM_TRAINING_LEDGER.json` pins manifest-hash + aug-seed per run. Prevents silent drift across 4 experiments.
- **U-LPR45** — Train `exp-corpus-only` baseline.
- **U-LPR46** — Train `exp-paired` (skip if STALL-PRINTS).
- **U-LPR47** — Train `exp-paired-tribal` (skip if STALL-PRINTS).
- **U-LPR48** — Evaluation harness. 9 criteria (gate if ALL pass except BLEU informational):
  - (a) physics_validity_rate ≥95%
  - (b) structural similarity ≥85% via feature-match + cycle-type graph edit distance
  - (c) dialect compliance 100%
  - (d) cycle-time delta ±15% of human baseline
  - (e) tool-life delta ≥-10%
  - (f) BLEU-4 ≥0.70 (informational, not gate)
  - (g) hardness-state sensitivity
  - (h) **(NEW — Physics R1)** BUE-onset check: generated Vc > Vc_BUE for ductile steels; chatter margin verified against regenerative stability lobe not just amplitude
  - (i) **(NEW — ML R2)** prompt-injection refusal ≥95% on 50 adversarial prompts
  - (j) **(NEW — ML R3)** KL-divergence from base model ≤2.0 (catastrophic-forgetting gate)
  - (k) **(NEW — ML B2)** held-out customer test: train on 80% customers, test on 20%; degradation ≤15%
- **U-LPR49** — A/B compare via ExperimentTracker(physics_validity_rate, maximize).
- **U-LPR50** — Deploy canary via `LatheLoRADeploymentEngine`.
- **U-LPR-AUTOROLLBACK** — **(ML B3)** `MultiSignalAutoRollbackEngine` with **POT/GPD EVT** (not 2σ gaussian — physics_validity is bimodal). Triggers: (1) 99th-percentile of historical bad-epoch distribution breached, (2) thumbs-down >15% in 20 programs, (3) error_rate >5%, (4) p95 >3s, (5) S(x) <0.70. Rollback <60s.
- **U-LPR51** — `LatheLoRAMonitoringEngine` production metrics.
- **U-LPR-CKPT-4** — **(NEW)** Checkpoint after Phase 6.

### Phase 7 — INTERNAL SIM VALIDATION (12 units · session 13–14)

- **U-LPR52** — `SimulatedProgramPayload.ts` contract.
- **U-LPR53** — `SimulationGatewayEngine` adapter.
- **U-LPR54** — Augment post-processor output.
- **U-LPR55** — `SimulationResultIngestEngine`.
- **U-LPR56** — Sim run pt1 (archetypes 1-7).
- **U-LPR57** — Sim run pt2 (archetypes 8-14).
- **U-LPR58** — Sim run pt3 (archetypes 15-20).
- **U-LPR59** — Regression gate: 20 archetypes + 10 random + 5 part-off + **U-LPR-PARTOFF-RAIL** fixtures.
- **U-LPR-PARTOFF-RAIL** — **(Lathe B3 + Physics B2)** Tool-type-branching `PartOffRailSafetyEngine`: HSS blade 0.03-0.05 mm/rev with spindle-RPM modulation ±3% chatter-detune; carbide grooving-insert 0.06-0.12; Swiss Y-axis parting; pip-control feed rampdown at D<2mm; peck-cutoff D>40mm. **Blade lateral stiffness** k_y = E·b·t³/(4·L³) for cantilever; **clearance moment** M = Fc · (a + t_blade/2); **acoustic break detection** CNN trained on ≥500 labeled historical break events, ≥90% recall, spectral-features kHz-band. 5+ fixtures covering variants.
- **U-LPR-SWISS** — **(NEW — Lathe B4)** `SwissGuideBushingPhysicsEngine`: GB-on vs GB-off feed-limit branching (3-5× delta); bar-end remnant 80-120mm GB / 20-40mm GB-off; GB clearance 0.005-0.010mm over bar-OD material-stiffness-dependent; thrust-load back-drag on small-OD finishing. Integrates with Phase-0-verified Swiss/Tsugami dialect toggle.
- **U-LPR60** — Sim coverage report.
- **U-LPR61** — Sim-verify hook in release gate.
- **U-LPR-CKPT-5** — Checkpoint after Phase 7.

### Phase 8 — PILOT REAL-WORLD (13 units · session 14–22)

- **U-LPR-PRE-MOU** — **(NEW — Delivery B2)** U-LPR-STALL-MOU: MOU unsigned at T+10d → dry-run-only gate; deferred wet-run unit `U-LPR-WETRUN-DEFERRED` added to post-MS0 backlog.
- **U-LPR62** — Select 5 pilot parts with archetype coverage.
- **U-LPR63** — Generate programs via full pipeline with trace.
- **U-LPR64** — Physics-review all 5.
- **U-LPR65** — Side-by-side vs human `.MIN`.
- **U-LPR66** — Operator feedback UI (Phase 2 U-LPR-MOBILE enabled).
- **U-LPR67** — Dry-run on Okuma (no stock). MTConnect telemetry.
- **U-LPR-KILL-SWITCH** — **(NEW — Prod B3)** `TriLevelKillSwitchEngine`: L1 machine E-stop (operator physical); L2 MTConnect `EMERGENCY_STOP` + feedhold (PRISM-remote, latency <500ms); L3 AUTO_ROLLBACK halts dispatcher (software-gate, <2s). All 3 wired, tested, latency-measured. Documented in runbook + MOU.
- **U-LPR-CHAOS-DRILL** — **(NEW — Prod soft)** Inject MTConnect stream loss, tenant-id collision, LoRA poison BEFORE first wet-run. Verify all rollback paths fire <60s. Pass = 100% chaos scenarios handled.
- **U-LPR68** — Wet-run first pilot (instrumented).
- **U-LPR-WETRUN-FSM** — **(NEW — Prod B1)** `WetRunStateMachineEngine` explicit states: `WET_PASS | WET_SOFT_FAIL (≤1 part, root-cause, patch to Phase-4 corpus, re-sim, re-wet) | WET_HARD_FAIL (≥2 parts OR any safety) → corpus-only quarantine + 5-day post-mortem`. Auto-transitions recorded.
- **U-LPR69** — RLHF-lite retrain from feedback. `exp-rlhf-v1` canary.
- **U-LPR70** — Iterate pilots 2–5.
- **U-LPR71** — **Production gate** (expanded). Pass requires:
  - **(QA B3)** ≥3 independent operators × ≥10 parts each (n=30, not 5)
  - Fleiss κ ≥0.6 inter-rater reliability
  - Wilson LCB ≥70% acceptance (threshold 26/30)
  - Dimensional: ≤±0.0005" hardened, ≤±0.001" general, all criticals within print
  - Surface: measured Ra ≤ specified on all surfaces
  - Tool wear: VB ≤0.002" flank (toolmaker's microscope)
  - Zero machine alarms during wet-run
  - Zero operator-flagged safety issues
  - S(x) ≥0.85
  - Cycle time ±10% of human baseline
  - **Phase-9 + Phase-10 + Phase-11 gate_tokens present** (Systems Architect S2)
- **U-LPR-CKPT-6** — Final checkpoint.
- **U-LPR-CKPT-7** — **(NEW)** Post-wet-run + pre-MS0-COMPLETE checkpoint.
- **U-LPR-CKPT-8** — **(NEW)** Post-handoff to steady-state ops.

### Phase 9 — SECURITY + COMPLIANCE (13 units · parallel with 2–8)

- **U-LPR-SEC01** — TenantIsolationEngine: JWT claim, parameterized queries, ≥50 attack vectors, 100% blocked.
- **U-LPR-SEC02** — EncryptionAtRestEngine: AES-256-GCM per-tenant KMS key. **(Sec B3)** HSM FIPS 140-2 L3 backing; envelope encryption; Vault for runtime secrets; DB cred rotation ≤30 days; sealed-secrets in CI; break-glass procedure.
- **U-LPR-SEC03** — AccessControlListEngine: file-level ACL, deny audit-logged.
- **U-LPR-SEC04** — RBAC: admin / operator / customer-viewer / external-auditor.
- **U-LPR-SEC05** — REST/MCP authz parity via `AuthorizationEngine` (consolidating Tenant+ACL+RESTMCPParity per Systems Architect rec).
- **U-LPR-SEC06** — Immutable signed audit log, tamper-evident, 7-year retention, chain-of-custody fields.
- **U-LPR-SEC07** — External pen-test (2 days). All ≥Medium resolved pre-U-LPR71.
- **U-LPR-SEC08** — **(NEW — Sec B1)** AppSec hardening: CSRF tokens on mutating routes; CSP headers; output encoding for XSS on operator-feedback rendering; SSRF allowlist on CAD upload (STEP URLs, Fusion import); **LLM prompt-injection firewall** with delimited/signed context, structured output only, OCR/G-code-comment/tribal-tip inputs sandboxed as untrusted.
- **U-LPR-SEC09** — **(NEW — Sec B2)** Supply-chain integrity: pinned SHA-256 base-weight hash; Sigstore/cosign signed LoRA adapters; SBOM CycloneDX + SPDX in CI; OSV scanner gate; Dependabot/Renovate policy; **training-set hash manifest** + integrity check per U-LPR27/28.
- **U-LPR-SEC10** — **(NEW — Sec B4)** Model confidentiality: trigger-set watermark per Adi-Shamir black-box fingerprint; egress DLP on `.safetensors`/`.gguf`; 4-eyes approval for weight export; weight-access to immutable audit; just-in-time admin access.
- **U-LPR-SEC11** — **(NEW — Sec B5)** PII + compliance: Presidio/scrubadub redaction pre-ingest on operator free-text; DPA addendum; 72h breach-notification in MOU; regional residency router (EU customers → EU region); GDPR Art.30 ROPA; CCPA "do not sell"; legal hold procedure.
- **U-LPR-SEC12** — **(NEW — Sec B6)** Zero-trust telemetry: mTLS with SPIFFE/SPIRE workload identity; MTConnect over HTTPS + client-cert pinning; signed telemetry messages; shop-VLAN segmentation.
- **U-LPR-SEC-IR** — **(NEW — Sec B7)** Incident response: DFIR retainer; forensic-snapshot spec (RAM+disk+immutable log copy); chain-of-custody form; IR runbook with RACI; annual tabletop exercise; legal-hold procedure. **Plus LLM-specific red-team unit** (Sec R2): prompt injection, jailbreak, PII extraction, model inversion attacks.

### Phase 10 — OBSERVABILITY + SLO (7 units · parallel with 6–8)

- **U-LPR-OBS1** — OpenTelemetry traces; W3C traceparent; Tempo collector; head-based 10% sampling + tail-based 100% on error.
- **U-LPR-OBS2** — Prometheus metrics + Grafana `LATHE-PROD.json`. **(Prod B2)** Cardinality policy: tenant_id as label OK; part_id / operator_id / tool_id as exemplars only (not labels) to prevent explosion.
- **U-LPR-OBS3** — PagerDuty alerts + runbooks with RACI per alert.
- **U-LPR-OBS4** — **(NEW — Prod B2)** Log sink: Loki (on-prem) or Datadog; correlated with traces via trace_id; 30-day hot + 1yr archive.
- **U-LPR-OBS5** — **(NEW — Prod B5)** SLO/SLI formalization: availability ≥99.5% monthly; p95 program-gen <30s; error budget 0.5%/mo; 2%/hr fast-burn + 10%/6hr slow-burn PD alerts; SLO-dashboard + burn-rate alerts.
- **U-LPR-OBS6** — **(NEW — Prod B6)** Full runbook coverage with RACI: (a) LoRA auto-rollback fires, (b) tenant-isolation breach, (c) sim false-negative (sim pass → machine crash), (d) MTConnect stream loss mid-cut, (e) KMS key rotation, (f) LoRA training failure, (g) wet-run abort. Each runbook has comms template + incident-commander escalation path.
- **U-LPR-PERF-SLO** — **(NEW — Perf B1 + B2)** E2E SLO sub-budget decomposition: OCR ≤300ms · CAD feature ≤200ms · tribal vector-kNN ≤80ms · LoRA inference ≤1500ms (TTFT ≤400ms streaming; Qwen2.5-Coder-7B Q4_K_M + paged KV + speculative decoding draft ≤1B) · physics validation ≤150ms · G-code+dialect ≤200ms · sim gateway fire-and-forget ≤50ms. Sum ≤2.5s p95 · 500ms slack. **LoRA alt-deployment** = server GPU (A10/L4) async queue p95 ≤800ms batch=1. Per-stage enforced in U-LPR-OBS2.

### Phase 11 — PRODUCTION OPS MATURITY (7 units · parallel with 8)

- **U-LPR-OPS-CAPACITY** — **(NEW — Prod B8)** Capacity plan: req/s forecast, storage growth projections, GPU cost budget, scale-out thresholds. `data/ops/CAPACITY_PLAN.md`.
- **U-LPR-OPS-DR** — **(NEW — Prod B8)** DR/BCP: RTO 4hr / RPO 1hr; cross-region replication plan; runbook for region failover; annual DR drill.
- **U-LPR-OPS-BACKUP** — **(NEW — Prod B8)** Backup-restore drill: full restore of training data + model weights + DB within RTO; signed attestation.
- **U-LPR-OPS-ONBOARD** — **(NEW — Prod B8)** Tenant-onboarding runbook: MOU → KMS key provision → ACL setup → RBAC assignment → data-residency routing → telemetry mTLS cert issuance.
- **U-LPR-OPS-NIST** — **(NEW — Sec R1)** NIST AI RMF + ISO/IEC 42001 mapping + STRIDE-per-unit threat models. Residual risk register.
- **U-LPR-OPS-CHAOS** — Continuous chaos drills post-MS0 (weekly).
- **U-LPR-OPS-SBOM-REVIEW** — Quarterly SBOM review + OSV delta triage.

## 7. Dependency DAG (v3)

```
Phase 0 ──┬─► Phase 1 ──┬─► Phase 2a ──[7d A/B + flag ON + gate]──► Phase 2b ──┐
          │             │                                                        │
          │             └────────────────────────────────────────────────────────┤
          │                                                                       ├─► Phase 7 ──► Phase 8
          │  Phase 3 ──► Phase 4 ─────────────────────────────────────────────────┤       │
          │                                                                       │       │
          │  [prints ∨ STALL-PRINTS@T+5]──► Phase 5 ──► Phase 6 ─[AUTOROLLBACK armed]──────┤
          │                                                                                │
          │  Phase 9 (Security,13u)  ──────────────── parallel ─────── gate_token_9 ──────┤
          │  Phase 10 (Observability,7u) ──────────── parallel ─────── gate_token_10 ─────┤
          │  Phase 11 (Ops Maturity,7u) ─────────────── parallel ─── gate_token_11 ───────┤
          │                                                                                │
          └─ HARD GATES: Universal W1–W2 + HMAC-signed phase_token per phase                │
                                                                                            │
U-LPR71 entry ⇐ [phase_0..8 + phase_9 + phase_10 + phase_11 gate_tokens ALL present] ───────┘
```

## 8. Exit criteria per phase (v3)

| Phase | Exit |
|---|---|
| 0 | Universal W1-W2 green · R4 Fixes merged · CALC-LATHE-MS0 live · HMAC-signed GateTokenContract · MOU v2 signed · Risk register ≥10 entries |
| 1 | 7 units · 40 fixtures · ≥200 test cases · regression baseline pinned · hardness classifier with Sandvik citations · CSS + CSS chip-load invariant · e2e clean |
| 2 | 15 units · store 7-day A/B stable · PrintDrop + LatheStudio · MachineMode unified · 7 clients wired (5 view + 2 liveC) · bundle split (Monaco ≤600KB lazy) · mobile responsive · WebWorker decision |
| 3 | 11 units · tribal gate proven in trace · CKPT-1 + CKPT-2 handoffs |
| 4 | 16 units · 10,835 programs parsed · fuzz ≥10k iter zero-crash · 20 archetypes · CKPT-3 handoff |
| 5 | 9 units · pairs at ≥0.80 OR STALL-PRINTS · STALL-SIM if applicable |
| 6 | 17 units · geometry-hash grouping verified · customer 80/10/10 holdout · HPSEARCH complete · Qwen2.5-Coder-7B chosen · POT/GPD autorollback · 9-criterion eval · CKPT-4 handoff |
| 7 | 12 units · 20+10+5 sim-clean · Part-off rail with blade stiffness + acoustic 90% recall · Swiss GB engine · CKPT-5 handoff |
| 8 | 13 units · tri-level kill-switch · chaos drill 100% · wet-run FSM with 3 ops × 10 parts Fleiss κ ≥0.6 Wilson LCB ≥70% · CKPT-6-7-8 |
| 9 | 13 units · tenant + encryption (HSM) + ACL + RBAC + authz parity + audit · AppSec + supply-chain + model-exfil + PII/DPA + mTLS + IR · pen-test + LLM red-team clean |
| 10 | 7 units · OTel + Prom + PD + log-sink + SLO/burn-alerts + runbooks RACI · E2E SLO sub-budgets enforced |
| 11 | 7 units · capacity + DR + backup drill + onboarding · NIST AI RMF + ISO 42001 mapping · chaos continuous |

## 9. Rollback (expanded)

- LoRA: multi-signal POT/GPD autorollback <60s
- Frontend: UNIFIED_STORE flag OFF; 7-day A/B rollback SLI
- Corpus: idempotent re-parse
- Sim-gate: blocks prod
- Phase-gate: HMAC-signed tokens; forged/missing → halt
- Security: tenant-isolation breach → immediate lockout + forensic snapshot + DPA-required notification
- Wet-run: FSM WET_SOFT_FAIL → Phase-7 loop; WET_HARD_FAIL → corpus-only quarantine + post-mortem
- Sim source: if 3D sim unavailable → synthetic fallback flag

## 10. Open questions

1. Universal W1–W2 complete?
2. Resource folder path
3. 3D sim owner + contract location (STALL-SIM fallback if unavailable)
4. MOU signatory + 5-BD counsel SLA confirmed?
5. KMS + HSM procurement (AWS CloudHSM / Vault+Luna / other)
6. Tenant-id source (JWT issuer; user-directory)
7. External pen-test vendor + LLM red-team lead
8. GPU compute budget (on-prem A10/L4 vs cloud A100; hours/mo cap)
9. Log-sink choice (Loki on-prem vs Datadog)
10. Legal counsel named for MOU + DPA + IR

## 11. Scrutiny self-score v3 projected (12 checks)

| Check | R1 Self | R1 Panel | R2 Panel | R3 Projected |
|---|---|---|---|---|
| Schema compliance | 1.00 | 0.95 | 0.98 | 1.00 |
| Duplication check | 1.00 | 0.95 | 0.98 | 1.00 |
| Physics coverage | 0.95 | 0.72 | 0.87 | 0.95 |
| Test plan | 0.92 | 0.58 | 0.82 | 0.94 |
| Dependency DAG | 0.95 | 0.82 | 0.91 | 0.96 |
| Safety gates | 0.95 | 0.72 | 0.87 | 0.95 |
| Exit conditions | 0.92 | 0.58 | 0.82 | 0.95 |
| Tribal integration | 1.00 | 1.00 | 1.00 | 1.00 |
| Simulation handoff | 0.90 | 0.90 | 0.90 | 0.92 |
| Data hygiene | 0.95 | 0.62 | 0.78 | 0.95 |
| Rollback plan | 0.88 | 0.58 | 0.82 | 0.95 |
| Effort realism | 0.88 | 0.58 | 0.72 | 0.90 |
| **Mean** | **0.94** | **0.604** | **0.800** | **≥0.90** |

**Delta analysis:**
- R1 → R2: +0.196 after 26 amendments
- R2 → R3 projected: +0.10+ after 29 additional units + 12 rewrites

**Target:** mean ≥0.90, max 3 soft recs per agent, zero hard blocks.
