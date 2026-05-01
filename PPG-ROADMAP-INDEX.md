# PPG Roadmap — Post Processor Generator Track

**Track:** PPG (Post Processor Generator)
**Generated:** 2026-04-30T20:43:07.807Z
**Total milestones:** 39 (PPG-MS0 through PPG-MS38)
**Total units:** 258

## Where to find things

| Resource | Path |
|---|---|
| **Build phasing plan (sales-first)** | `H:/prism/BUILD_ORDER.md` |
| **This index** | `H:/prism/PPG-ROADMAP-INDEX.md` (mirrored: `state/shared/PPG-ROADMAP-INDEX.md`) |
| **Per-milestone envelopes** | `mcp-server/data/milestones/PPG-MS<N>.json` |
| **Master roadmap registry** | `mcp-server/data/roadmap-index.json` (track:"PPG") |
| **Parent roadmap** | `H:/prism/PRISM-UNIFIED-ROADMAP-v2.md` |

## Cross-chat search keywords

If you can't find this with a path lookup, grep any of:
- `PPG-MS` (39 envelope IDs)
- `track":"PPG"` in `mcp-server/data/roadmap-index.json`
- `BUILD_ORDER.md` (phasing plan at repo root)
- `PostPhysicsSidecarSchema` (MS0/U-PPGM01 — first unit built, schema lives at `mcp-server/src/schemas/postPhysicsSidecarSchema.ts`)

## Milestone catalog

| ID | Title | Status | Units | Priority | Depends on |
|---|---|---|---|---|---|
| [PPG-MS0](mcp-server/data/milestones/PPG-MS0.json) | PPG-MS0 — Sidecar Bridge Architecture (slim CPS post + JSON physics constants) | not_started | 0/6 | HIGH | — |
| [PPG-MS1](mcp-server/data/milestones/PPG-MS1.json) | PPG-MS1 — Block-by-Block Speed/Feed Runtime (3-layer: post-bake / parametric F[#101] / in- | not_started | 0/10 | HIGH | PPG-MS0 |
| [PPG-MS2](mcp-server/data/milestones/PPG-MS2.json) | PPG-MS2 — PRISM Path Integration (constant-engagement adaptive spiral via PrismPathConstan | not_started | 0/5 | HIGH | PPG-MS1, PPG-MS18 |
| [PPG-MS3](mcp-server/data/milestones/PPG-MS3.json) | PPG-MS3 — Ultimate Wire EDM Master Post (Fusion has no WEDM CPS) | not_started | 0/10 | MEDIUM | PPG-MS0, PPG-WIRE-MS0, PPG-MS18 |
| [PPG-MS4](mcp-server/data/milestones/PPG-MS4.json) | PPG-MS4 — Fleet Coverage (21 JM Die machines: 7 Okuma lathes, 5 mills, 3 EDM, 6 support) | not_started | 0/10 | MEDIUM | PPG-MS0, PPG-WIRE-MS0, PPG-MS1, PPG-MS2, PPG-MS3 |
| [PPG-MS5](mcp-server/data/milestones/PPG-MS5.json) | PPG-MS5 — Controller Dialect Coverage (6 families) | not_started | 0/9 | HIGH | PPG-MS0, PPG-MS18 |
| [PPG-MS6](mcp-server/data/milestones/PPG-MS6.json) | PPG-MS6 — UI Generator Wizard (tool-pocket exclusions, per-feature toggles, machine-aware  | not_started | 0/6 | MEDIUM | PPG-MS4, PPG-MS5, PPG-MS2, PPG-MS3 |
| [PPG-MS7](mcp-server/data/milestones/PPG-MS7.json) | PPG-MS7 — Print → Program (Mill + Lathe + WEDM): MillingPrintToProgramEngine + LathePrintI | not_started | 0/7 | HIGH | CAD-INFRA-MS0 |
| [PPG-MS8](mcp-server/data/milestones/PPG-MS8.json) | PPG-MS8 — Omega Tier System (omega-thresholds.json + tier-aware S(x) gating) | not_started | 0/4 | MEDIUM | — |
| [PPG-MS9](mcp-server/data/milestones/PPG-MS9.json) | PPG-MS9 — AGI Maturity Gates (RAG warm-start, drift canary, ProtoMAML new-material adapter | not_started | 0/10 | MEDIUM | PPG-MS1, PPG-MS8, PSAU-PPG-SFC, PPG-MS24 |
| [PPG-MS10](mcp-server/data/milestones/PPG-MS10.json) | PPG-MS10 — PDF Knowledge Extraction (4 authoritative post-processor PDFs unextracted) | not_started | 0/4 | MEDIUM | — |
| [PPG-MS11](mcp-server/data/milestones/PPG-MS11.json) | PPG-MS11 — Online Tuning Loop (live telemetry → outcome capture → post recalibration) | not_started | 0/7 | MEDIUM | PPG-MS1, PPG-MS8, PPG-MS9, PSAU-PPG-SFC, INTEL-OLLAMA-OBSIDIAN-MS0, PPG-MS4, PPG-MS5, PPG-MS24, PPG-MS25 |
| [PPG-MS12](mcp-server/data/milestones/PPG-MS12.json) | PPG-MS12 — Regression Harness + Fleet Rollout (CI gate + JM Die cutover playbook) | not_started | 0/9 | MEDIUM | PPG-MS2, PPG-MS4, PPG-MS5, PPG-MS6, PPG-MS7, PPG-MS8, PPG-MS9, PPG-MS10, PPG-MS11, PPG-MS13, PPG-MS14, PPG-MS15, PPG-MS16, PPG-MS17, PPG-MS18, PPG-MS19, PPG-MS20, PPG-MS21, PPG-MS22, PPG-MS23, PPG-MS24, PPG-MS25, PPG-MS26, PPG-MS30, PPG-MS31, PPG-MS32, PPG-MS33, PPG-MS34, PPG-MS35, PPG-MS36, PPG-MS37, PPG-MS38 |
| [PPG-MS13](mcp-server/data/milestones/PPG-MS13.json) | PPG-MS13 — Reference Post Corpus & Operator Surface (resources/ ingest + setup sheet + sub | not_started | 0/8 | MEDIUM | PPG-MS0, PPG-MS5, PPG-MS6, PPG-MS10 |
| [PPG-MS14](mcp-server/data/milestones/PPG-MS14.json) | PPG-MS14 — Pre-Emit Safety Predicate Stack (force / spindle / workholding / thin-wall / ch | not_started | 0/9 | HIGH | PPG-MS0, PPG-MS1, PPG-MS6, PPG-MS8 |
| [PPG-MS15](mcp-server/data/milestones/PPG-MS15.json) | PPG-MS15 — Multi-Process Job Package (mill → grind → EDM in one quote, multi-machine seque | not_started | 0/6 | MEDIUM | PPG-MS4, PPG-MS5, PPG-MS6, PPG-MS13 |
| [PPG-MS16](mcp-server/data/milestones/PPG-MS16.json) | PPG-MS16 — Quote ↔ Post ↔ Cost Backflow (close the quote-to-ship loop with measurable vari | not_started | 0/6 | MEDIUM | PPG-MS1, PPG-MS11, PPG-MS13 |
| [PPG-MS17](mcp-server/data/milestones/PPG-MS17.json) | PPG-MS17 — Cross-Simulator Live Verification (Fusion Verify + Vericut/NCSIMUL + ensemble 3 | not_started | 0/10 | MEDIUM | PPG-MS5, PPG-MS8, PPG-MS14 |
| [PPG-MS18](mcp-server/data/milestones/PPG-MS18.json) | PPG-MS18 — Patent FTO + Clean-Room Memo + WEDM Multi-Pass IP + Adaptive-Control + Simulati | not_started | 0/3 | HIGH | — |
| [PPG-MS19](mcp-server/data/milestones/PPG-MS19.json) | PPG-MS19 — Security Hardening (IEC 62443 SL-2) | not_started | 0/8 | MEDIUM | PPG-MS0, PPG-MS1, PPG-MS8, PPG-MS11, PPG-MS17 |
| [PPG-MS20](mcp-server/data/milestones/PPG-MS20.json) | PPG-MS20 — Compliance Spine (AS9100 + NADCAP + ITAR + CFR Part 11 + ISO 13485 + IATF 16949 | not_started | 0/9 | MEDIUM | PPG-MS0, PPG-MS8, PPG-MS11, PPG-MS13, PPG-MS14 |
| [PPG-MS21](mcp-server/data/milestones/PPG-MS21.json) | PPG-MS21 — Test Coverage Backfill + Mutation Testing | not_started | 0/10 | MEDIUM | PPG-MS18 |
| [PPG-MS22](mcp-server/data/milestones/PPG-MS22.json) | PPG-MS22 — Operability + SLO + Circuit Breakers | not_started | 0/6 | MEDIUM | PPG-MS11, PPG-MS17 |
| [PPG-MS23](mcp-server/data/milestones/PPG-MS23.json) | PPG-MS23 — Sidecar Mutability Resolution + Architecture Hardening | not_started | 0/5 | MEDIUM | PPG-MS0, PPG-MS11 |
| [PPG-MS24](mcp-server/data/milestones/PPG-MS24.json) | PPG-MS24 — Constants v2 (Physics Depth: Kγ/Kver/Kvb + Johnson-Cook + Multi-mode SLD + BUE  | not_started | 0/6 | MEDIUM | PPG-MS0 |
| [PPG-MS25](mcp-server/data/milestones/PPG-MS25.json) | PPG-MS25 — Machine Fingerprint Enrichment | not_started | 0/5 | MEDIUM | PPG-MS0, PPG-MS4, PPG-MS14 |
| [PPG-MS26](mcp-server/data/milestones/PPG-MS26.json) | PPG-MS26 — PRD + GA Gate + Beta Program + Feature Flag Service | not_started | 0/6 | MEDIUM | PPG-MS6, PPG-MS8, PPG-MS11, PPG-MS17 |
| [PPG-MS27](mcp-server/data/milestones/PPG-MS27.json) | PPG-MS27 — Demo Pack + ROI Proof + Pricing + ICP | not_started | 0/6 | HIGH | PPG-MS12, PPG-MS16 |
| [PPG-MS28](mcp-server/data/milestones/PPG-MS28.json) | PPG-MS28 — Self-Serve Onboarding + Customer Success | not_started | 0/5 | MEDIUM | PPG-MS6, PPG-MS10, PPG-MS11, PPG-MS13 |
| [PPG-MS29](mcp-server/data/milestones/PPG-MS29.json) | PPG-MS29 — Override Path + Trust Telemetry + Plain-English Mode | not_started | 0/4 | MEDIUM | PPG-MS11, PPG-MS14, PPG-MS16, PPG-MS17, PPG-MS20 |
| [PPG-MS30](mcp-server/data/milestones/PPG-MS30.json) | PPG-MS30 — Operator UX Hardening (WCAG + touch + keyboard) | not_started | 0/5 | MEDIUM | PPG-MS6, PPG-MS13, PPG-MS14, PPG-MS17 |
| [PPG-MS31](mcp-server/data/milestones/PPG-MS31.json) | PPG-MS31 — Shop Pilot + Training Budget + Bottleneck-First Sequencing | not_started | 0/5 | MEDIUM | PPG-MS4, PPG-MS6, PPG-MS17 |
| [PPG-MS32](mcp-server/data/milestones/PPG-MS32.json) | PPG-MS32 — FAI / AS9100 ME Workflow + DFM Gate at Print Intake | not_started | 0/5 | MEDIUM | PPG-MS7, PPG-MS13, PPG-MS15, PPG-MS20 |
| [PPG-MS33](mcp-server/data/milestones/PPG-MS33.json) | PPG-MS33 — Causal-Counterfactual Post Authoring (CCP): What-If trade-off graphs + Monte Ca | not_started | 0/7 | MEDIUM | PPG-MS1, PPG-MS9, PPG-MS14, PPG-MS17, PPG-MS18 |
| [PPG-MS34](mcp-server/data/milestones/PPG-MS34.json) | PPG-MS34 — Self-Healing & Continuous-Learning Posts (SHCLP): self-healing manifests + recu | not_started | 0/5 | MEDIUM | PPG-MS1, PPG-MS9, PPG-MS11, PPG-MS13, PPG-MS18 |
| [PPG-MS35](mcp-server/data/milestones/PPG-MS35.json) | PPG-MS35 — Pareto Multi-Program Authoring + Programmer Genome (PMA-PG): 5-candidate Pareto | not_started | 0/5 | MEDIUM | PPG-MS1, PPG-MS16 |
| [PPG-MS36](mcp-server/data/milestones/PPG-MS36.json) | PPG-MS36 — Multi-Sensor Real-Time Adaptive Cutting (MS-RTAC): acoustic chatter RPM-hop + t | not_started | 0/5 | LOW | PPG-MS1, PPG-MS9, PPG-MS14, PPG-MS18 |
| [PPG-MS37](mcp-server/data/milestones/PPG-MS37.json) | PPG-MS37 — Federated Cross-Shop Intelligence (FCSI): anonymized recipe sharing + predictiv | not_started | 0/6 | MEDIUM | PPG-MS9, PPG-MS18, PPG-MS16 |
| [PPG-MS38](mcp-server/data/milestones/PPG-MS38.json) | PPG-MS38 — Operator-Facing AI Surfaces (OFAIS): holographic AR setup sheets + NLP voice au | not_started | 0/6 | LOW | PPG-MS7, PPG-MS13, PPG-MS18 |

## Sprint phasing (BUILD_ORDER.md)

- **Sprint 1 (foundation):** MS0 sidecar bridge + MS18 FTO + MS2 sanitization + MS5 dialects
- **Sprint 2 (block-by-block S/F):** MS1 + MS7 mill print→program
- **Sprint 3 (safety + wizard):** MS14 + MS13
- **Sprint 4 (sales infra) [parallel w/3]:** MS27 demo + ROI + LOIs
- **Sprint 5 (trust layer):** MS9 AGI gates + MS17 3-tier verifier
- **Sprint 6 (WEDM) [parallel w/5]:** MS3
- **Sprint 7 (cutover/pilot):** MS11 closed loop + MS12 regression + MS28 + MS31
- **Sprint 8 (novel wow):** MS33 causal-counterfactual + MS34 self-healing + MS35 Pareto+genome
- **Sprint 9 (federated, no robot/sensor):** MS37 federated + MS38 GD&T probe + adaptive FAI
- **DEFERRED — Phase 10 (equipment-dependent):** MS36 sensors/LIBS, MS38 AR/voice, MS37 robot cell

## What's been built so far

| Sprint | Unit | Status | Files |
|---|---|---|---|
| 1 | U-PPGM01 PostPhysicsSidecarSchema | ✅ DONE (30/30 tests) | `mcp-server/src/schemas/postPhysicsSidecarSchema.ts`, `mcp-server/src/__tests__/PostPhysicsSidecarSchema.test.ts` |

## Patch tag history

All envelopes carry a `_patches[]` array logging every modification:
- `ppg-leverage-16-2026-04-29` (round-1 leverage agent findings)
- `ppg-fixes-round2-2026-04-29` (round-2 scrutiny fixes — patent sanitization, S02 wiring, S09 graph)
- `ppg-round3-novel-2026-04-29` (round-3 micro-patch + 6 novel milestones MS33-38)
- `ppg-round4-gapfills-2026-04-29` (round-4 gap fills — antitrust, FTO budget, hardware tier split)
- `ppg-round5-fixes-2026-04-29` (round-5 cycle break + MS2 regression fix + reciprocity)

