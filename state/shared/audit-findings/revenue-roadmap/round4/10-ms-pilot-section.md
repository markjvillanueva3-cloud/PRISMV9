# REVENUE-MS-PILOT — Live-Machine Pilot (SFC + Master Post)

> **Scope:** Progressive-trust live-machine validation of SFC and Master Post on JM Die's 21-machine fleet. Two parallel tracks, 7 phases each, sequenced from $8K Bridgeport (P2-P3) to $450K Mazak-Integrex (P6-P7). Calendar realism: 25% buffer → **SFC ≈29w**, **Master Post ≈24w** wall-clock to phase-7 ignition.
>
> **Verdict (round 3.5/06):** Feasible with disciplined gating. SFC is the critical path (force-calibration depends on real cutting data not available before P3). Master Post fronts most of its risk in P1 byte-equivalence vs the JM Die golden NC archive.

---

## Top Risk (Critical)

**Flagship multi-axis kinematic miscompile at P6 on Mazak-Integrex-i200-2021 ($450K, ITW/Alcoa critical-path).** A miscompiled B-axis rotary transform or tool-tip kinematic offset can drive a turret into a chucked $5K billet at rapid rate — collision-class severity, single event terminates pilot credibility.

**Mitigation stack (all hard-gated, all required):**
1. **Mandatory Mazak SmoothAi sim pre-cut** — every flagship program must produce a SmoothAi-clean run before NC release; `cam-toolpath-check` hook hard-blocks unsimmed posts.
2. **Operator red-button fallback** — physical single-press revert to status-quo post installed on flagship machines before P6 entry.
3. **Collision-check hook hard-gate** — `forge-safety` chain validates clearance envelope + tool-holder collision + rotary-axis travel against machine kinematic model; zero-exception block on violation.
4. **Phase-6 entry gate:** Holo-Krome and SFS aerospace job families enter P6 only after a dedicated A-B exclusively on those parts in P5.

---

## Critical Instrumentation (must ship before P1)

| Component | Phase Introduced | Purpose |
|---|---|---|
| `SFCRecommendationLogger` (JSONL) | P1 | Every emit logged: machine, tool, material, RPM/feed/DOC, predicted Fc/torque |
| `VericutDiffEngine` | P1 | PRISM-emit vs sim delta (force, motion, cycle) |
| `ForceBudgetGate` | P1 | Hard block when Fc > 0.7 × spindle_torque |
| `MasterPostByteEquivalenceCI` | P1 | Byte-diff vs golden JM Die NC archive across all 6 controllers |
| `MTConnect spindle-load streamer` | P2+ | Real-time spindle-load + axis-load capture (Haas-VF-2, Doosan, Mazak QT-200, flagship) |
| `OperatorFeedbackButton` (R/Y/G) | P2 | 3-state nominal/warn/abort confirmation per program |
| `DualLogEngine` | P4 | PRISM-emit + operator-actual side-by-side capture |
| `OperatorOverrideReasoningCapture` | P4 | Free-text + tagged-code drop-down for override reasons |
| `BatchOutcomeTracker` | P5 | Tool life, cycle time, Cpk per A-B cohort |
| `ToolLifeRegressionDetector` | P5 | Auto-quarantine tool/material combos within 10 parts |
| `DriftDetector` | P7 | >10% prediction-error flagging → versioned model rollback |
| `ModelVersionRollbackEngine` | P7 | One-button revert to model_v_{N-1} |
| `CalibrationAuditLogger` | P7 | Every recalibration event auditable (who/when/what/why) |

---

## Phase Sequencing — Both Tracks

| Phase | SFC Weeks | MP Weeks | Machines | Risk Posture |
|---|---|---|---|---|
| **P1 bench-sim** | 2 | 3 | none (Vericut / golden-NC diff) | zero shop time |
| **P2 cut-air** | 1 | 1 | Haas-TM-1P-2008, Mori-SL-3-1998, Bridgeport-1985 (DNC) | air, no stock |
| **P3 soft-stock** | 2 | 2 | Haas-TM-1P-2008, Bridgeport-1985 | wax / Delrin / 6061 |
| **P4 production-shadow** | 4 | 3 | Haas-VF-2-2015, Mazak-QT-200-2012, Doosan-DNM-4500-2018 | read-only log |
| **P5 A-B** | 6 | 4 | Haas-VF-2, Mazak-QT-200, Doosan-DNM-4500 | 50/50 split, operator can override |
| **P6 primary** | 8 | 6 | Mazak-Integrex-i200, DMG-Mori-NTX-2000, Makino-PS95 | PRISM default, red-button fallback |
| **P7 telemetry-loop** | 0 (continuous) | 0 (continuous) | all 21 JM Die machines | weekly recalibration, model versioning |
| **Subtotal (nominal)** | **23w** | **19w** | | |
| **+25% calendar buffer** | **29w** | **24w** | | |

---

## Per-Phase Detail

### Phase 1 — Bench-Sim (SFC 2w / MP 3w)
- **Machines:** none. PRISM emits → Vericut/NCSimul (SFC) or byte-diff vs golden archive (MP).
- **Sample parts:** JM-DIE bracket-001 (1018), ITW-flange-022 (6061-T6), Alcoa-housing-007 (7075-T6); MP 10-program regression suite (G54-G59, tool-change macros, sub-programs).
- **Acceptance (SFC):** 100% pass `ForceBudgetGate` (Fc < 0.7 × spindle_torque) + chip-load envelope; ≥95% match catalog within ±15%.
- **Acceptance (MP):** 100% byte-equivalence vs JM Die golden NC across Haas NGC, Fanuc 31i, Mazatrol Smooth G, OSP-P300, with documented allowed deltas (comments only).
- **Failure → rollback:** Block ship; `/forge-perf` kc1.1 recalibration (SFC) or per-controller patch + regression test add (MP). Failed materials/controllers → `PENDING_GAP_ENGINES.json`.
- **Artifacts:** `JM-Die-SFC-Operator-Runbook.pdf` (draft), per-controller code-style reference cards.

### Phase 2 — Cut-Air (SFC 1w / MP 1w)
- **Machines:** Haas-TM-1P-2008 (toolroom mill, $35K, MTConnect-equipped, low utilization — ideal first-touch), Mori-Seiki-SL-3-1998 (legacy lathe, $25K), Bridgeport-1985 (DNC pass-through, no MTConnect).
- **Sample parts:** air-cut bracket-001 (Z+2 offset), air-cut OD-turn.
- **Acceptance:** Motion matches sim within 0.001in; zero alarms; spindle load idle (<5%); operator R/Y/G = green.
- **Failure → rollback:** Halt; diff actual NC vs PRISM emit; if post issue → MP bug, if motion issue → SFC kinematic correction. Per-controller block.
- **Instrumentation:** MTConnect spindle-load stream, G-code line-by-line diff, OperatorFeedbackButton.
- **Artifacts:** 1-page laminated operator runbook (machine-by-machine).

### Phase 3 — Soft-Stock (SFC 2w / MP 2w)
- **Machines:** Haas-TM-1P-2008, Bridgeport-1985 (Anilam retrofit, DNC log capture).
- **Sample parts:** machinable wax bracket, Delrin housing mock, 6061 throwaway billet.
- **Acceptance (SFC):** Measured cutting force (spindle-load proxy) within **±20%** of SFC prediction; surface finish Ra within 1.5× target; zero tool breakage across 10 parts/material.
- **Acceptance (MP):** Cut motion identical to operator-written equivalent; no unexpected dwells/pauses; spindle ramps correctly.
- **Failure → rollback:** Lock material in 'shadow-only' mode; `/lathe-learn` or `/mill-learn` calibration on captured force data; block P4 graduation for that material.
- **Artifacts:** Phase-3 wax-cut training video (10 min, machine-by-machine).

### Phase 4 — Production-Shadow (SFC 4w / MP 3w)
- **Machines:** Haas-VF-2-2015 (3-axis VMC, $65K), Mazak-QT-200-2012 ($85K bar lathe), Doosan-DNM-4500-2018 ($95K VMC).
- **Sample parts:** ITW-flange production run (50 pcs), Optimas-pin lathe job (200 pcs), 10 production-job MP parallel-post diffs.
- **Acceptance (SFC):** ≥100 ops logged; PRISM-vs-operator delta <25% RPM, <30% feed; operator does NOT use PRISM value (shadow read-only); deltas feed calibration.
- **Acceptance (MP):** PRISM-post vs operator-post semantically equivalent (motion identical; stylistic-only delta in comments/blocks).
- **Failure → rollback:** Tighten model with shop-floor delta; `/shop-knowledge` ingestion of override reasons → tribal tips. No machine impact (read-only).
- **Artifacts:** Dual-log dashboard tutorial (operator-facing UI, `/shop-floor-query` integration); PRISM-Override-Reasons cheatsheet.

### Phase 5 — A-B (SFC 6w / MP 4w)
- **Machines:** Haas-VF-2-2015, Doosan-DNM-4500-2018, Mazak-QT-200-2012.
- **Sample parts:** Randomized 50/50 split across 4 high-volume ITW/Optimas SKUs.
- **Acceptance (SFC):** Tool life ≥**95%** of status-quo; cycle time ≤**105%** of status-quo; Cpk on critical dim ≥ status-quo; zero PRISM-induced scrap.
- **Acceptance (MP):** Cycle-time delta <**2%**; zero alarms attributable to PRISM-post; operator readability ≥4/5.
- **Failure → rollback:** Revert that tool/material to status-quo; quarantine in 'A-B-failed' bucket; re-train on regression cohort. Operator can override mid-run.
- **Artifacts:** Job-card insert (visual: PRISM vs status-quo); Cpk real-time monitor.

### Phase 6 — Primary (SFC 8w / MP 6w)
- **Machines:** Mazak-Integrex-i200-2021 ($450K mill-turn, Mazatrol Matrix-2), DMG-Mori-NTX-2000-2020 ($550K, Siemens 840D sl), Makino-PS95-2019 ($280K, high-speed VMC).
- **Sample parts:** Holo-Krome high-tolerance series, SFS aerospace bracket family, Alcoa precision housing.
- **Acceptance (SFC):** PRISM default for ≥**80%** of new jobs; operator override rate <**15%**; tool life +≥5% vs P5 baseline; zero spindle/collision events attributable to SFC.
- **Acceptance (MP):** PRISM-post default; zero collision events; multi-axis kinematic transforms verified against Mazak SmoothAi simulator (every program, no exceptions).
- **Failure → rollback:** Novel material → drop to P4 shadow for that material until calibrated. Red-button single-press fallback to operator status-quo.
- **Artifacts:** 5-tier escalation tree (operator → shop-lead → programmer → PRISM-engineer → red-button, <5min each); red-button physical install per flagship machine.

### Phase 7 — Telemetry-Loop (continuous)
- **Machines:** all 21 JM Die machines.
- **Acceptance:** MTConnect/Mazatrol feed → `/forge-learn` → kc1.1 + Taylor exponent weekly recalibration; DriftDetector flags >10% prediction error; auto-PR for constants update; post-edit operator-touched-lines trends to zero.
- **Failure → rollback:** Versioned model rollback (model_v_{N-1}); manual freeze button; weekly human-in-loop review of recalibration PRs.

---

## Units (15)

- **U-PILOT-01** — Instrumentation foundation: `SFCRecommendationLogger`, `VericutDiffEngine`, `ForceBudgetGate` (P1 SFC ship gate).
- **U-PILOT-02** — `MasterPostByteEquivalenceCI` + JM Die golden NC archive snapshot across 6 controllers (P1 MP ship gate).
- **U-PILOT-03** — MTConnect spindle-load streamer + adapter for Haas-TM-1P, Mazak-QT-200, Haas-VF-2, Doosan-DNM-4500, Mazak-Integrex (P2+).
- **U-PILOT-04** — `OperatorFeedbackButton` (R/Y/G) UI + persistence (P2).
- **U-PILOT-05** — Phase-2 cut-air protocol + acceptance harness on Haas-TM-1P + Mori-SL-3 (1w each).
- **U-PILOT-06** — Phase-3 soft-stock harness: wax/Delrin/6061 acceptance + force-prediction calibration loop (Haas-TM-1P + Bridgeport).
- **U-PILOT-07** — `DualLogEngine` + `DeltaAnalyzer` + `OperatorOverrideReasoningCapture` (P4).
- **U-PILOT-08** — Phase-4 production-shadow rollout on Haas-VF-2 + Mazak-QT-200 + Doosan-DNM-4500 (4w SFC, 3w MP).
- **U-PILOT-09** — `BatchOutcomeTracker` + `ToolLifeRegressionDetector` + `CpkABStreamer` + `CycleTimeABDelta` (P5).
- **U-PILOT-10** — Phase-5 A-B execution + acceptance scoring (6w SFC, 4w MP).
- **U-PILOT-11** — Flagship pre-flight: Mazak SmoothAi sim gate + `cam-toolpath-check` hard-block + red-button physical install (P6 entry).
- **U-PILOT-12** — Phase-6 primary rollout on Mazak-Integrex + DMG-Mori-NTX + Makino-PS95 (8w SFC, 6w MP).
- **U-PILOT-13** — `DriftDetector` + `ModelVersionRollbackEngine` + `CalibrationAuditLogger` (P7).
- **U-PILOT-14** — `/forge-learn` weekly recalibration cron + auto-PR for kc1.1 / Taylor constants (P7).
- **U-PILOT-15** — Operator training package: 8 artifacts (runbook PDF, cheatsheet MD, wax-cut video, dashboard tutorial, job-card insert, escalation tree, controller cards, red-button install guide).

---

## Calendar Realism

- **SFC nominal:** 2+1+2+4+6+8 = **23w** → +25% buffer → **29w**
- **Master Post nominal:** 3+1+2+3+4+6 = **19w** → +25% buffer → **24w**
- **Both tracks run in parallel** — P2-P5 share machines, P1 is independent. SFC is the critical path.
- **Hard gate:** P1 acceptance 100% before P2 starts. Cut-air budget capped at 4 hrs/machine; soft-stock at 16 hrs/material.

---

## Risk Register (top 5, full list in JSON)

1. **Flagship kinematic miscompile (P6 Mazak-Integrex)** — *critical*. Mitigation: SmoothAi sim mandatory + red-button + collision-check hook.
2. **Spindle overload on P3 wax cut (wrong Kienzle for novel alloy)** — *high*. Mitigation: ForceBudgetGate hard-block at 70% torque; P1 must pass first.
3. **Operator rejection as 'CAM-textbook' kills adoption pre-A-B** — *high*. Mitigation: P4 shadow must capture override reasons; tribal-tip ingestion before P5; operator co-design of P5 acceptance.
4. **Tool-life regression silent until weeks into P5** — *medium*. Mitigation: per-tool sentinel + auto-quarantine within 10 parts.
5. **Post-processor regression breaks legacy archived programs** — *high*. Mitigation: P1 byte-equivalence gate on all 6 controllers + CI gate.

---

## Weeks to Pilot Complete

**SFC telemetry-loop ignition (P7 start): ≈29 weeks wall-clock.**
**Master Post telemetry-loop ignition: ≈24 weeks wall-clock.**

First target machine: **Haas-TM-1P-2008** (P2 + P3) — toolroom, $35K, low utilization, MTConnect-equipped, ideal first-touch.
