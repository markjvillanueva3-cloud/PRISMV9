# PRISM PPG Build Order — Sales-First Phasing

**Generated:** 2026-04-29
**Goal:** Ship sellable advanced post processors. Defer equipment-dependent capabilities.
**Total milestones:** 39 (MS0-MS38). **Total units:** ~260.
**Strategic principle:** Software-only path to first paying customer. Sensor/AR/robot hardware deferred.

---

## Equipment-Deferred (Phase 9 / last)

**Reason:** Adoption-blocked by hardware cost or operator-training friction. Not required for first sale.

| Milestone | Unit(s) | Hardware dep | Defer reason |
|---|---|---|---|
| PPG-MS36 | U-PPGM216 acoustic chatter | Cabinet mic + accelerometer | Tier-2 only |
| PPG-MS36 | U-PPGM218 chip-color CV | $800-1500 camera retrofit | Tier-2 only |
| PPG-MS36 | U-PPGM219 multi-sensor wear fusion | MTConnect/OPC-UA bus retrofit ($1800) | Tier-2 only |
| PPG-MS36 | U-PPGM220 LIBS material verify | $15-40k probe arm | Tier-2 only |
| PPG-MS37 | U-PPGM223 robot cell | Robot ($25-100k) | Tier-2 only |
| PPG-MS38 | U-PPGM226 AR setup overlay | Quest/HoloLens $500-3500 (iPad fallback OK) | Mostly defer |
| PPG-MS38 | U-PPGM227 voice authoring | Headset $150 + Whisper accuracy | Mostly defer |
| PPG-MS38 | U-PPGM231 AI imagery | None | KEEP (no hardware) |

**Keep MS37 federated recipe sharing + supply-chain graph (no hardware).**
**Keep MS38 U-PPGM228 GD&T probe + U-PPGM230 adaptive FAI sampling (the real moat — no hardware).**

---

## Sprint 1 — Foundational Substrate (1-2 weeks)

**Goal:** Sidecar bridge unblocks 13 downstream milestones. Legal review starts. Patent sanitization complete.

| Order | Milestone | Unit | Title |
|---|---|---|---|
| 1.1 | MS0 | U-PPGM01 | PostPhysicsSidecarSchema (Zod) |
| 1.2 | MS0 | U-PPGM02 | PostProcessorPipelineEngine stage 0: sidecar emit |
| 1.3 | MS0 | U-PPGM03 | Sidecar loader for CPS posts |
| 1.4 | MS0 | U-PPGM04 | Constant-inlining HARD BLOCK hook |
| 1.5 | MS0 | U-PPGM05 | Round-trip integration tests |
| 1.6 | MS18 | U-PPGM109 | FTO opinion (cluster 1) — initiate, runs in parallel |
| 1.7 | MS18 | U-PPGM110 | Clean-room memo |
| 1.8 | MS18 | U-PPGM111 | Sanitize SolidCAM identifiers (rename to PrismPath) |
| 1.9 | MS5 | Hurco UltiMotion dialect (most-used at JM Die) |
| 1.10 | MS5 | Okuma OSP dialect (second-most-used) |

---

## Sprint 2 — Block-by-Block S/F + First Mill Emit (2-3 weeks)

**Goal:** The headline value claim ("8-22% cycle-time win without iMachining license") is real on 1 reference part.

| Order | Milestone | Unit | Title |
|---|---|---|---|
| 2.1 | MS1 | U-PPGM07 | BlockByBlockFeedEngine |
| 2.2 | MS1 | U-PPGM07b | SF-to-post chain end-to-end |
| 2.3 | MS1 | U-PPGM08 | Per-block Kienzle force corrected for engagement + chip thinning |
| 2.4 | MS1 | U-PPGM09 | Per-RPM-range chatter SLD lookup |
| 2.5 | MS7 | U-PPGM48 | mill_print_to_program dispatcher action |
| 2.6 | MS7 | U-PPGM49 | Wizard print upload route |
| 2.7 | MS1 | U-PPGM13 | Cycle-time regression harness (10 reference programs minimum) |

**Demo capability after Sprint 2:** "Drop a STEP file → instant program with block-by-block S/F → emit on a Hurco V11"

---

## Sprint 3 — Pre-Emit Safety + Wizard MVP (2-3 weeks)

**Goal:** Programs are safe to send to a real machine. Pilot-ready safety stack.

| Order | Milestone | Unit | Title |
|---|---|---|---|
| 3.1 | MS14 | U-PPGM85 | PreEmitSafetyPredicateEngine (6 mill predicates) |
| 3.2 | MS14 | U-PPGM86 | Tier-aware HARD BLOCK / WARN routing |
| 3.3 | MS14 | U-PPGM87 | Auto-fix suggestion engine |
| 3.4 | MS14 | U-PPGM88 | Wizard pre-emit verdict banner + accept-fix |
| 3.5 | MS14 | U-PPGM89b | NaN/Infinity numeric guards |
| 3.6 | MS13 | U-PPGM79 | Setup sheet auto-gen |
| 3.7 | MS13 | U-PPGM84 | Operator surface end-to-end (zip download) |

---

## Sprint 4 — Sales Infrastructure (parallel with Sprint 3, 2-3 weeks)

**Goal:** Demo + ROI calculator + 2 LOIs in hand before pilot.

| Order | Milestone | Unit | Title |
|---|---|---|---|
| 4.1 | MS27 | U-PPGM166 | 3-screen demo flow |
| 4.2 | MS27 | U-PPGM168 | Public ROI calculator |
| 4.3 | MS27 | U-PPGM170 | Pricing model + ASC 606 |
| 4.4 | MS27 | U-PPGM171 | License-displacement strategy + ≥2 design-partner LOIs |
| 4.5 | MS27 | U-PPGM167 | 5-part operator-signed witness report (lighthouse) |

---

## Sprint 5 — Trust Layer (3-4 weeks)

**Goal:** AGI gates + 3-tier verifier give programmers confidence to use the post on aerospace work.

| Order | Milestone | Unit | Title |
|---|---|---|---|
| 5.1 | MS9 | U-PPGM56 | RAG warm-start in post pipeline |
| 5.2 | MS9 | U-PPGM57 | Drift canary thresholds + emit gate |
| 5.3 | MS9 | U-PPGM58 | ProtoMAML new-material adapter |
| 5.4 | MS9 | U-PPGM61d | Mount AGI gates on existing E0322 + E0385 orchestrators |
| 5.5 | MS17 | U-PPGM101 | Fusion Verify Adapter |
| 5.6 | MS17 | U-PPGM105 | EnsembleVerdictAggregator |
| 5.7 | MS17 | U-PPGM106 | Wizard 3-tier verdict UI |

---

## Sprint 6 — High-Margin WEDM (parallel with Sprint 5, 2-3 weeks)

**Goal:** JM Die's highest-margin machine (Mitsubishi MV1200R) gets the production-grade post no vendor ships.

| Order | Milestone | Unit | Title |
|---|---|---|---|
| 6.1 | MS3 | U-PPGM19 | Multi-pass skim schedule generator |
| 6.2 | MS3 | U-PPGM21 | Wire tension + flush per-pass |
| 6.3 | MS3 | U-PPGM22 | Thermal recast prediction |
| 6.4 | MS3 | U-PPGM23 | Corner overcut compensation |
| 6.5 | MS3 | U-PPGM24 | 5-dialect emitter coverage |
| 6.6 | MS3 | U-PPGM25 | Wizard WEDM mode |

---

## Sprint 7 — Closed Loop + First Pilot (3-4 weeks)

**Goal:** First paying customer running PRISM in production with measured ROI. Feedback loop active.

| Order | Milestone | Unit | Title |
|---|---|---|---|
| 7.1 | MS11 (existing milestone) | Closed-loop telemetry + outcome capture |
| 7.2 | MS12 | U-PPGM71 | 50-program golden corpus |
| 7.3 | MS12 | U-PPGM72 | Byte-diff regression harness |
| 7.4 | MS12 | U-PPGM75 | JM Die cutover playbook |
| 7.5 | MS28 | Customer Success onboarding + first 30-day support plan |
| 7.6 | MS31 | Pilot deployment runbook |

---

## Sprint 8 — Novel "Wow" Features (4-6 weeks)

**Goal:** Category-defining capabilities that justify premium pricing + win new customers.

| Order | Milestone | Unit | Title |
|---|---|---|---|
| 8.1 | MS33 | U-PPGM200 | CounterfactualPostEngine (what-if trade-off graph) |
| 8.2 | MS33 | U-PPGM201 | Monte Carlo P99 catastrophic-failure gate |
| 8.3 | MS33 | U-PPGM205 | Wizard CounterfactualPanel UI |
| 8.4 | MS34 | U-PPGM206 | SelfHealingManifestEngine |
| 8.5 | MS34 | U-PPGM207 | RecursiveDriftCalibrationEngine |
| 8.6 | MS34 | U-PPGM208 | PrintDiffIncrementalUpdateEngine |
| 8.7 | MS34 | U-PPGM209 | ConversationalLearningCaptureEngine |
| 8.8 | MS35 | U-PPGM211 | ParetoCandidateAuthoringEngine |
| 8.9 | MS35 | U-PPGM212 | ProgrammerGenomeEngine |
| 8.10 | MS35 | U-PPGM214 | QuoteWinPredictionEngine |

---

## Sprint 9 — Federated Intelligence (no robot/sensor) (2-3 weeks)

**Goal:** Network effect across customer base. Each new customer makes existing customers' posts smarter.

| Order | Milestone | Unit | Title |
|---|---|---|---|
| 9.1 | MS37 | U-PPGM221 | FederatedRecipeSharingEngine (post Sherman §1 review) |
| 9.2 | MS37 | U-PPGM222 | PredictiveToolProcurementEngine |
| 9.3 | MS37 | U-PPGM226 | SupplyChainGraphOptimizer (Ollama-derived) |
| 9.4 | MS37 | U-PPGM224 | EnergyAwareSchedulingEngine |
| 9.5 | MS33 | U-PPGM205b | Bayesian UQ → predictive QA per-characteristic (Ollama-derived) |
| 9.6 | MS38 | U-PPGM228 | GD&T-driven probe plan auto-gen |
| 9.7 | MS38 | U-PPGM230 | Adaptive FAI sampling |
| 9.8 | MS38 | U-PPGM231 | AI-rendered setup imagery (no hardware) |

---

## DEFERRED — Phase 10 (post-first-revenue)

**Reason:** Hardware cost / operator-training friction not justified until first paying customer is in production.

- MS36 multi-sensor real-time (full sensor stack: LIBS, chip CV, acoustic, multi-sensor wear)
- MS38 U-PPGM226 AR setup overlay (Quest/HoloLens path)
- MS38 U-PPGM227 voice authoring (headset path)
- MS37 U-PPGM223 robot cell integration

---

## Compliance / Operability — Cross-Cutting (parallel with Sprint 5+)

These run alongside engineering sprints, not in dedicated sprint:

- MS18 (Patent FTO) — Sprint 1 initiate; cluster-1 must complete before MS2 ships
- MS19 (Security IEC 62443 SL-2) — Sprint 5
- MS20 (Compliance: AS9100 + NADCAP + ITAR + ISO 13485 + IATF 16949 + DFARS/CMMC) — Sprint 5-7
- MS22 (Operability/SLO/Grafana) — Sprint 7
- MS29 (Override workflow) — Sprint 5
- MS30 (UX hardening + WCAG 2.1) — Sprint 6-7
- MS32 (FAI workflow) — Sprint 7

---

## Sales Readiness Gate

**MUST be complete before paid customer #1:**

1. Sprint 1 ✓ Foundational substrate
2. Sprint 2 ✓ Block-by-block S/F demonstrable on D2 reference
3. Sprint 3 ✓ Pre-emit safety + wizard MVP
4. Sprint 4 ✓ Sales infrastructure (demo, ROI, pricing, ≥2 LOIs)
5. MS18 cluster-1 ✓ FTO opinion on file (legal gate)

**Nice-to-have (justifies premium pricing) before customer #1:**

- Sprint 5 trust layer (AGI gates + 3-tier verifier)
- Sprint 6 WEDM (lights-out high-margin capability)
- 1+ novel feature from Sprint 8 (counterfactual or self-healing — either works as differentiator)

**Pilot deployment (customer #1 in production):** Sprint 7

**Network effects (customer #2+):** Sprint 9

---

## Total Effort Estimate

| Sprint | Weeks | Cumulative |
|---|---|---|
| 1 (foundation) | 1-2 | 2 |
| 2 (block-by-block) | 2-3 | 5 |
| 3 (safety + wizard) | 2-3 | 8 |
| 4 (sales) parallel with 3 | 2-3 | 8 |
| 5 (trust) | 3-4 | 12 |
| 6 (WEDM) parallel with 5 | 2-3 | 12 |
| 7 (cutover/pilot) | 3-4 | 16 |
| 8 (novel wow) | 4-6 | 22 |
| 9 (federated) | 2-3 | 25 |
| Phase 10 (equipment) | deferred | — |

**Sales-ready:** week 8 (Sprint 4 complete)
**First paid pilot:** week 16 (Sprint 7 complete)
**Differentiated GA:** week 22 (Sprint 8 complete)
**Network effects on:** week 25 (Sprint 9 complete)
