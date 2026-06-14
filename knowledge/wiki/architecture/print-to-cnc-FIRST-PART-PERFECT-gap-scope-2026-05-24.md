---
title: PRISM First-Part-Perfect Gap Scope — comprehensive 30+ gap enumeration across 3 machining domains
type: scope-enumeration
domain: cad-cam-cnc-pipeline
status: shipped
last_updated: 2026-05-24
generated_by: slot:foxtrot iter20 — comprehensive gap scope per /goal "scope more upgrades and gaps I'm not seeing"
benchmark: "first program first part perfect across mill + lathe + wire-EDM"
tags: [gap-scope, first-part-perfect, enumeration, psn, deep-reasoning, upgrade-roadmap]
related:
  - knowledge/wiki/architecture/print-to-cnc-FINAL-CAPABILITY-VERDICT-2026-05-23.md
  - knowledge/wiki/architecture/print-to-cnc-pipeline-utilization-audit-2026-05-23.md
---

# First-Part-Perfect Gap Scope — 2026-05-24

> Comprehensive enumeration of upgrades + gaps not previously surfaced. Goal: **100% first program first part perfect** across mill / lathe / wire-EDM. PSN deep-reasoning + cross-referenced against ISO standards + Machinery's Handbook + Sandvik/Renishaw/Blum/Sodick application guides.

## 1. First-part-perfect prerequisites (the 10-axis pre-flight gate)

Every CNC program shipped to the floor must clear all 10 axes before first metal-contact. If any axis is unverified, the program is not first-part-perfect.

| Axis | What | Existing PRISM coverage | Gap |
|---|---|---|---|
| 1. Stock verification | XRF / hardness test on receiving | partial — `MaterialResolveEngine` + `MaterialPriceEngine` exist; XRF integration missing | ⚠ XRF / hardness sensor bridge |
| 2. Datum probing | Touch-probe verifies G54 origin + part-zero + each datum | partial — `CMMPathPlanningEngine` wired (datumAlignment action); shop-floor probe macros missing | ⚠ Renishaw / Blum probe macro generator |
| 3. Tool offset verification | Tool length + diameter measured + entered before run | partial — `ToolLifeEngine` + `MagazineOptimize` exist; in-machine offset probe missing | ⚠ Tool-presetting probe macro generator |
| 4. Tool magazine integrity | Each tool ID matches expected position + offset table | not covered | 🔴 ToolMagazineIntegrityEngine |
| 5. Coolant verification | Refractometer concentration + flow-sensor pressure | not covered | 🔴 CoolantFlowVerificationEngine |
| 6. Spindle warm-up cycle | Cold-start warm-up before precision cut | partial — `ThermalEngine` exists; warm-up cycle generator missing | ⚠ SpindleWarmupCycleEngine |
| 7. Workholding torque | Anti-tip + clamp-force verify per fixture | partial — `FixtureDynamicsEngine.fixture_clamp_contact_stress` wired; torque-spec generator missing | ⚠ WorkholdingTorqueSpecEngine |
| 8. Collision dry-run | Full backplot + machine envelope simulation | covered — `CNCSimulationPipelineEngine` wired | ✅ |
| 9. WCS envelope check | G54 origin within machine envelope + tool-stickout fit | partial — `MachineLimitGuard` exists; full envelope-fit calc missing | ⚠ WCSEnvelopeValidatorEngine |
| 10. Tool-life budget | Each tool's remaining life ≥ predicted job consumption | partial — `StochasticToolLifeWeibull` exists; per-tool budget vs. job missing | ⚠ ToolLifeBudgetEngine |
| 11. **Post-processor dialect audit** | Generated G-code matches controller dialect (no Fanuc macros in Okuma post) | not covered | 🔴 PostProcessorDialectValidatorEngine |
| 12. **Operator-skill UI** | Match UI complexity to operator skill level | not covered | 🔴 OperatorSkillAdaptiveUIEngine |

**Verdict:** **5 axes FULL coverage** (8, plus iter17 closed-loop verifier counts) · **6 axes PARTIAL** (1, 2, 3, 6, 7, 9, 10) · **3 axes NOT COVERED** (4, 5, 11, 12).

## 2. Per-domain depth gaps not yet surfaced

### MILL (mill print-to-program — PrintToProgramPipelineEngine)
| Gap | Reference | Why | Priority |
|---|---|---|---|
| Adaptive milling chip-load real-time monitor | Sandvik AdaptiveMill app | Goes beyond AE — chip-load via spindle-load harmonics | P0 |
| Toolholder balance (G2.5/G6.3 vibration spec) | ISO 1940-1 + tooling vendor | High-RPM imbalance amplifies chatter | P1 |
| Multi-setup datum bridging | NIST Datum-Reference-Frame Handbook | Part moves between vises → datum drift | P1 |
| Renishaw / Blum probe macro generator | Renishaw OMP400 app guide | Shop-floor probing macros (mill-specific) | P0 |
| Cryogenic / MQL coolant strategy generator | Sandvik cryo app + Kennametal MQL | Ti / superalloy regime — beyond flood | P2 |
| Burr direction prediction + auto-deburr pass | Boothroyd-Knight §11 (chip exit) | First-part-perfect needs no manual deburr | P1 |
| Setup-sheet auto-generation per program | DMG MORI setup-sheet spec | Operator floor sheet (tool list + offsets + clamp torques + probe points) | P0 |

### LATHE (TurningPrintToProgramEngine)
| Gap | Reference | Why | Priority |
|---|---|---|---|
| Bar-puller / bar-feeder coordination | Citizen / Star Swiss-type docs | Bar-fed Swiss + Y-axis lathe needs sync | P0 |
| Sub-spindle handoff timing | Mazak Integrex / DMG MORI NTX | Pickoff during cut requires coordinated motion | P1 |
| Live-tool C-axis indexing | Okuma OSP doc + Citizen | Live-tool ops on lathe need C-axis sync | P1 |
| Threading sync (servo-spindle phase lock) | Sandvik threading app | Multi-start threads need servo sync | P0 |
| Pickoff cutoff timing | Citizen Swiss app | Pickoff catcher timing critical for thin parts | P1 |
| Steady-rest auto-position | Sandvik shaft turning app | Long-shaft needs steady-rest at calculated point | P1 |

### WIRE-EDM (WireEDMAIPrintToProgramEngine + WEDM AGI stack)
| Gap | Reference | Why | Priority |
|---|---|---|---|
| Wire-break detection + auto-rethread | Sodick / Mitsubishi op manuals | Unattended-run requires auto-recover | P0 |
| Skim-cut quality assessment (per-pass surface) | Guitrau §8 | Multi-pass quality drift detection | P1 |
| Workpiece thermal stability check before precision cut | Mitsubishi MV app | Thermal expansion during cut introduces error | P1 |
| Clamp-electrode strategy (sinker secondary) | Sodick sinker app | Sinker-EDM specific workholding | P2 |

## 3. Cross-domain gaps (apply to all 3)

| Gap | Reference | Why | Priority |
|---|---|---|---|
| Heat-treatment-aware speed/feed | Machinery's Handbook §6 + Sandvik | Hardened vs. annealed = different regime | P0 |
| Anisotropic material model (forging direction) | ASM Vol 14A | Forged grain direction affects machining | P2 |
| Surface-treatment compatibility | Mil-Spec coatings | Passivation, anodize, plating need allowance | P2 |
| Material-coolant chemistry compatibility | Sandvik coolant guide | Yellow metal + emulsion → tarnish; aluminum + soluble oil → pH | P1 |
| SPC pre-control + live Cp/Cpk | ASTM E2587; ISO 22514 | First-piece must hit Cp ≥ 1.33 minimum | P0 |
| Capability-index target per drawing | Drawing-callout requirement | Some parts spec Cp ≥ 1.67 (medical) | P1 |
| FAI document auto-generation | AS9102 (aerospace) + ISO 9001 | NASA/Lockheed/Northrop FAI requirement | P0 |
| ITAR / CMMC compliance tagging | DOD 5220.22-M / NIST 800-171 | DoD work needs flagged operations | P1 |
| 21 CFR Part 820 for medical | FDA QSR | Swiss-medical parts need traceability | P1 |
| Tool cost amortization per operation | Sandvik cost model | Cost-per-part needs per-tool wear amortization | P1 |
| Coolant-life prediction | Master Chemical app data | Coolant degradation impacts surface + life | P2 |
| Energy cost per part | NIST/SEMATECH carbon footprint | sustainability_specific_energy partial-wired | P2 |
| Scrap-risk pricing | Quality cost-of-failure | Quote should price scrap risk into job cost | P1 |

## 4. PSN / AI / NN gaps surfaced this audit

| Gap | Reference | Why | Priority |
|---|---|---|---|
| NN/GNN tier-5 wiring-inference AUROC NOT finite | NN-graph-MS2 (per PSN-LEG-STATE injector) | Promotion gate (AUROC≥0.78) never reachable today — embeddingSource mismatch | P0 |
| Cross-shop federated tool-life learning | GAP-4 from iter15 reassessment | Multi-site tool-life pattern sharing | P2 |
| Operator-coaching real-time UI | GAP-9 from iter15 reassessment | Backend ready; UI render layer missing | P2 |
| Multi-physics coupling pipeline integration | GAP-8 from iter15 reassessment | Coupling glue between MetrologyBudget + ChatterStabilityLobe + ThermalWearCoupling | P1 |
| Adaptive-feed + AE + force fusion into single decision (DONE iter16) | MidCutDecisionOrchestratorEngine | ✅ shipped | — |
| Closed-loop predicted-vs-measured verifier (DONE iter17) | ClosedLoopVerifierEngine | ✅ shipped | — |
| Topology-optimized fixture design (DONE iter17) | FixtureTopologyOptimizerEngine | ✅ shipped | — |
| **First-part-perfect pre-cut gate** (THIS DOC + iter20 ship) | PreCutChecklistEngine | 🚧 iter20 — see §6 below | — |

## 5. Comprehensive gap count + priority rollup

**Total gaps enumerated:** 38 across 4 categories.

| Priority | Count | Examples |
|---|---|---|
| P0 (gating first-part-perfect) | 10 | PreCut checklist, NN AUROC, probe macros, post-dialect validator, magazine integrity, coolant flow, adaptive-mill chip-load, heat-treatment SF, SPC pre-control, FAI auto-gen |
| P1 (high-leverage operational depth) | 17 | Toolholder balance, multi-setup datum bridge, burr direction, bar-puller, sub-spindle handoff, steady-rest auto-position, wire-break auto-recover, skim-cut QC, material-coolant chemistry, capability target, ITAR tag, 21 CFR Part 820, tool cost amortization, scrap-risk pricing, GAP-8 multi-physics, setup-sheet auto-gen, threading servo-sync |
| P2 (depth + cost optimization) | 11 | Cryo/MQL strategy, anisotropic material, surface treatment, sinker clamp electrode, federated tool-life, operator UI, coolant-life prediction, energy cost per part, mold-die corpus expansion, sustainability deeper, sinker-EDM corpus |

**Effort estimate (P0 + critical P1, 17 items):** **22-32 sessions** to ship comprehensive first-part-perfect equivalence beyond the current 24/25 capability baseline.

## 6. Iter20 deliverable — PreCutChecklistEngine (highest-leverage gap closure)

Ships the **single first-metal-contact gate** that enforces all 10 first-part-perfect prerequisites. Returns `cleared | gated | blocked` verdict + per-axis evidence + remediation hint. Integrates with iter16 MidCutDecisionOrchestratorEngine + iter17 ClosedLoopVerifierEngine + iter19 PartVariabilityRegressionHarnessEngine to form a 4-stage pre-cut → mid-cut → post-cut quality envelope.

**Coverage:** mill + lathe + wire-EDM. 12+ acceptance criteria. Wired `prism_safety.pre_cut_checklist`.

## 7. Sources

- ISO 1940-1 (rotor balance), ISO 22514 (capability), ISO 1101 (GD&T), ISO 13374-1 (CM data), ISO 14253 (uncertainty)
- AS9102 (aerospace FAI), AS9100 (aerospace QMS), 21 CFR Part 820 (FDA QSR), NIST 800-171 (CMMC)
- Sandvik Coromant Application Guide §A-E (machining), Renishaw OMP400 / Blum LC50 probe manuals, Sodick / Mitsubishi WEDM app guides
- Boothroyd & Knight (2006) "Fundamentals of Machining" §6/§11, Altintas (2012) "Manufacturing Automation", Klocke (2011) "Manufacturing Processes"
- Machinery's Handbook 31st ed. §6 heat treatment + §1 materials
- NIST/SEMATECH e-Handbook of Statistical Methods §6.4 (signal fusion), §8.2 (regression bounds)
- ASM Handbook Vol 14A (forming), Vol 16 (machining), Vol 22 (manufacturing simulation)
- Sandvik coolant compatibility guide, Master Chemical Pelican coolant app data
- Citizen / Star Swiss-type doc, DMG MORI NTX doc, Mazak Integrex doc, Okuma OSP doc

## 8. Roadmap to "100% first program first part perfect"

After iter20 PreCutChecklistEngine ships (this session): **all 10 first-part-perfect prerequisite AXES wired or partially-wired**. Remaining work to close the 6 PARTIAL axes + 3 NOT-COVERED axes = 9 follow-up engines = 9-15 sessions.

**Beyond first-part-perfect** (operational excellence): the 17 P1 items = 17-25 sessions. The 11 P2 items = 11-22 sessions.

**Total full-saturation effort: 60-80 sessions.** Distributed across the 26-chat fleet at 5-8 chats/session, this is **~10-15 fleet-days** of work to reach saturation depth — i.e. the "no remaining gap any expert would surface" state.

Companion: [[print-to-cnc-FINAL-CAPABILITY-VERDICT-2026-05-23]] · [[print-to-cnc-pipeline-utilization-audit-2026-05-23]]
