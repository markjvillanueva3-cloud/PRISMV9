---
name: compliance-safety-engines
description: Strategic engine digest for the compliance-safety galaxy -- the S(x) safety gate + Omega tier ladder + alarm escalation + regulatory/OSHA/ITAR/NIST/PII compliance layer. 38 owned engines, grounded against galaxy doctrine + flat-enum + header reads.
type: reference
galaxy: compliance-safety
node_type: memory
---

# compliance-safety galaxy -- engine digest

## Overview

The compliance-safety galaxy owns PRISM's **S(x) safety gate** -- the scalar
in [0,1] that turns multi-dimensional manufacturing risk into a single go/no-go
number, hard-blocking any G-code output below the floor (`OmegaSafetyScoreEngine.ts`:
S(x) < 0.70 -> BLOCKED; any single dimension `veto` -> S(x) = 0). It is the
universal gate every cutting domain (mill/lathe/wedm) and the post-processor
pipeline pass through before a program ships.

Primary dispatcher: `prism_safety` (`safetyDispatcher.ts`) -- collision, spindle,
workholding, operator-gate, killswitch, ITAR/CFR-820 classify. Sister
dispatchers: `prism_compliance` (F8 compliance-as-code, OSHA 300 log, NDA,
export control, audit trail), `prism_guard` (AGI containment, Bayes safety,
NIST control registry, veto explanation), `prism_omega` (quality equation +
auto-scoring), `prism_industry` (industry-standard frameworks).

The galaxy is **fleet-managed** (no dedicated work-slot); any slot may work here.
Canonical constants (S(x) dimension map, Omega tier ladder, `GATE_THRESHOLD=0.70`,
`safety_min_global=0.70`) live ONLY in `state/shared/omega-thresholds.json` and
`OmegaSafetyScoreEngine.ts` -- NEVER inline them; NEVER route safety numeric
derivation to any LLM. Physics constants come from `mcp-server/src/physics/constants.ts`.

**Structural note:** engines live FLAT in `mcp-server/src/engines/*.ts`. The galaxy
subdir (`mcp-server/src/engines/compliance-safety/`) holds doctrine only (CLAUDE.md /
MEMORY.md / PATHS.md), no `.ts`. Count is grounded against the galaxy CLAUDE.md sec 2
hand-verified ownership table, a flat `ls | grep` enum, and header reads of all 38.

## Strategic categories

1. **sx-safety-gate** -- the S(x) scalar core: 6-dim orchestration, geometric-mean
   scoring, hard-block threshold, Bayesian credible intervals, tier-ladder verify.
2. **veto-and-escalation** -- 8 hard vetoes that can never be overridden, plus
   auto-escalation (reduce ap/fz, shift RPM) and live alarm propagation to shop-floor.
3. **domain-safety-predicate** -- per-cutting-domain composite-input gates
   (mill/lathe/wedm) that feed the S(x) composite; totality + NaN-safety + monotonicity axioms.
4. **post-emit-gcode-safety** -- contextual G-code hazard analysis + collision-pattern
   detection + pre-emit/post-emit gates the post-processor chains before NC send.
5. **regulatory-compliance** -- OSHA (300/300A, PPE, training records), ITAR/EAR/CMMC
   export control, NIST AI RMF + ISO/IEC 42001, PII/GDPR/CCPA, industry standards,
   NDA/legal lifecycle.
6. **agi-containment** -- bounds autonomous-goal / neural outputs against physics
   envelopes, cost margins, and shop capacity before any recommendation reaches machinery.
7. **safety-xai-audit** -- explainable-AI veto rationale, real-time overlay, incident
   pattern mining, audit-trail integrity.

## Key engines (detailed)

### OmegaSafetyScoreEngine.ts
The scalar S(x) gate. Converts the 6-dimension `SafetyAssessment` from the
orchestrator into S(x) in [0,1] as the geometric mean of per-dimension scores
(`safe=1.0 caution=0.85 warning=0.60 critical=0.25 veto=0`); any single `veto`
collapses S(x) to 0. G-code output is BLOCKED below 0.70. The one place the
`GATE_THRESHOLD` constant lives -- never inline it elsewhere.
Path: `mcp-server/src/engines/OmegaSafetyScoreEngine.ts`.

### PipelineSafetyOrchestratorEngine.ts
The upstream aggregator (CAMX-MS14/U01). Computes 6 risk dimensions per operation
(collision, overload/Kienzle-Fc-vs-power, chatter, thermal/Johnson-Cook, tool-breakage,
workholding/Coulomb-friction) and emits the assessment the Omega gate scores. Carries
the hard-veto set (power > machine_max x 0.85, deflection > tol/3, P(chatter) > 0.15,
P(collision) > 0, workholding SF < 1.5).
Path: `mcp-server/src/engines/PipelineSafetyOrchestratorEngine.ts`.

### SafetyVetoEngine.ts
The 8 mandatory hard vetoes (CAMX-MS14/U02) that can NEVER be overridden: power,
deflection, chatter, collision, workholding, coolant, rpm, torque. Produces the
`VetoReport` consumed by escalation + the simulation gate. Includes documented
auto-escalation recipes per veto (e.g. power_veto -> reduce ap 20% then fz 15%).
Path: `mcp-server/src/engines/SafetyVetoEngine.ts`. Notable exports: `VetoReport`.

### GCodeSafetyAnalyzerEngine.ts
Largest engine in the galaxy (2066 LOC). Contextual G-code safety analysis via modal
state tracking -- 24 safety rules across 6 controllers (fanuc/haas/siemens/heidenhain/
mazak/okuma), severity critical/high/medium, strictness standard/strict/aerospace.
Catches crash/breakage/injury patterns the pattern-based `CollisionHazardDetectorEngine`
cannot.
Path: `mcp-server/src/engines/GCodeSafetyAnalyzerEngine.ts`. Notable exports:
`ControllerType`, `Severity`, `Strictness`.

### ComplianceEngine.ts
F8 Compliance-as-Code. Manages regulatory templates, auto-provisions hooks (F6),
configures certificates (F4), runs audits, resolves multi-template conflicts, keeps
append-only audit logs. Explicitly ADDITIVE, never gating -- S(x)/Omega enforcement
runs independently of compliance.
Path: `mcp-server/src/engines/ComplianceEngine.ts`. Notable types (from
`../types/compliance-types.js`): `RegulatoryFramework`, `ComplianceTemplate`,
`GapAnalysisResult`, `ConflictResolution`.

### PostVerificationSafetyEngine.ts
Pipeline Phase 4-5 statistical verification (consolidates MS11 U01-U06): Monte-Carlo
uncertainty propagation + Cpk prediction, playbook-rule enforcement, tribal-knowledge
injection, G-code danger detection, machine-envelope validation, surface-finish
prediction. Every program gets statistically verified before cutting.
Path: `mcp-server/src/engines/PostVerificationSafetyEngine.ts`. Notable exports:
`VerificationInput`.

### SafetyExplanationEngine.ts
XAI layer (U-MIO40A). Every veto/gate/simulation decision produces an auditable
explanation: what passed, what failed with thresholds, counterfactuals ("would have
passed if X"), margin analysis, SHAP-like root-cause attribution. Cites ISO 13849-1 /
IEC 61508 audit-trail requirements.
Path: `mcp-server/src/engines/SafetyExplanationEngine.ts`.

### BayesianSafetyEngine.ts
Bayesian S(x) with credible intervals (USSH P0.25). Replaces the frequentist point
estimate with a Beta(alpha0+passed, beta0+failed) posterior + credible interval +
P(S(x) > threshold | data). Priors seeded from historical operation pass/fail counts.
Path: `mcp-server/src/engines/BayesianSafetyEngine.ts`.

### CrossProcessNeuroSymbolicSafetyVerifierEngine.ts
XPROC-NEURAL Tier-8 hard gate. Composes symbolic constraint projection with tiered
Omega(x)/S(x) thresholds; every neural recommendation targeting real machinery must
pass. Decision matrix is lexicographic, first floor = `safety_min_global=0.70` from
`omega-thresholds.json` (verified read, not inlined). Enforces "NN confidence never
overrides a physics veto".
Path: `mcp-server/src/engines/CrossProcessNeuroSymbolicSafetyVerifierEngine.ts`.
Verdict: pass | review | fail.

### SafetyVetoSimulationGateEngine.ts
Production release gate (U-MIO38, Phase 12). A program cannot transfer to a machine
until SafetyVetoEngine reports vetoed=false, simulation is collision-free, machine
envelope passes, and any auto-escalated params are certified. Composition layer over
pre-computed artifacts (does NOT recompute) -> single tamper-evident release record.
Path: `mcp-server/src/engines/SafetyVetoSimulationGateEngine.ts`.

### OSHA300LogEngine.ts
Federal OSHA 1904 injury/illness recordkeeping (Form 300/300A). Encodes the 29 CFR
sec 1904.7 recordable criteria (death / days-away / restricted-work / medical-treatment-
beyond-first-aid), the sec 1904.7(b)(5)(ii) first-aid exclusion list, and the 8h-death /
24h-inpatient reporting deadlines. Distinct from `OSHAComplianceEngine.ts` (higher-level
incident + PPE-assignment tracking with JM-Die seeds).
Path: `mcp-server/src/engines/OSHA300LogEngine.ts`.

### ITARComplianceTaggerEngine.ts
Export-control + cybersecurity tagging. From part metadata determines ITAR (22 CFR
sec 120-130 USML), EAR (15 CFR sec 730-774 CCL), CMMC v2 level (NIST 800-171), DFARS
252.204-7012 requirement, deemed-export foreign-national restriction, and license
need. Decision-tree driven.
Path: `mcp-server/src/engines/ITARComplianceTaggerEngine.ts`.

### NISTAIRMFComplianceEngine.ts
NIST AI RMF 1.0 (GOVERN/MAP/MEASURE/MANAGE) + ISO/IEC 42001:2023 clause mapping +
STRIDE per-unit threat models + residual-risk register (inherent = likelihood x impact
1..25; residual = inherent x (1 - mitigation_effectiveness); low/medium/high/critical
bands).
Path: `mcp-server/src/engines/NISTAIRMFComplianceEngine.ts`.

### WEDMProgramSafetyGateEngine.ts
Composite S(x) gate for WEDM -- the final gate before G-code reaches the wire controller.
S(x) = weighted sum of 7 component gates (collision 0.20, head-clearance 0.15, flush 0.15,
thermal 0.15, plus current/power-density + envelope). Pairs with the physics guards below.
Path: `mcp-server/src/engines/WEDMProgramSafetyGateEngine.ts`.

## Full engine index

| Engine | Category | One-line |
|--------|----------|----------|
| OmegaSafetyScoreEngine.ts | sx-safety-gate | Scalar S(x) in [0,1]; geometric mean of 6 dims; BLOCK < 0.70; owns GATE_THRESHOLD. |
| PipelineSafetyOrchestratorEngine.ts | sx-safety-gate | Aggregates 6 risk dimensions per operation into the SafetyAssessment. |
| BayesianSafetyEngine.ts | sx-safety-gate | Bayesian S(x) with Beta posterior + credible intervals from historical priors. |
| CrossProcessNeuroSymbolicSafetyVerifierEngine.ts | sx-safety-gate | Tier-8 hard gate; tiered Omega/S(x); neural recs must pass; safety_min_global floor. |
| SafetyShieldEngine.ts | sx-safety-gate | CMDP + control-barrier-function wrapper over Kienzle envelope for RL policies (U-LEARN-08). |
| SafetyScoreOverlayEngine.ts | safety-xai-audit | Real-time S(x) traffic-light overlay for 4 CAM plugin adapters (U-CAM95). |
| SafetyVetoEngine.ts | veto-and-escalation | 8 never-overridable hard vetoes; produces VetoReport (CAMX-MS14/U02). |
| SafetyVetoSimulationGateEngine.ts | veto-and-escalation | Production release gate; veto-free + sim-clear + envelope-pass before machine transfer (U-MIO38). |
| SafetyEscalationEngine.ts | veto-and-escalation | Auto-conservative escalation (reduce ap/fz, shift RPM, spring passes) on near-veto (CAMX-MS14/U03). |
| SafetyGateForOptimizationEngine.ts | veto-and-escalation | "Never optimize away safety" -- G50 clamp only decreases, M1/spring-pass preserved (ISO 13849). |
| SafetyExplanationEngine.ts | safety-xai-audit | XAI veto/gate rationale: counterfactuals, margin analysis, SHAP-like attribution (U-MIO40A). |
| SafetyPatternMinerEngine.ts | safety-xai-audit | Mines mandatory safety patterns (G50 clamp, safe retract, M0/M1) from production programs. |
| StrategySafetyDecisionEngine.ts | veto-and-escalation | Safety-first CAM strategy ranking; safety overrides cost across 4 risk dims (CAMX-MS2/U06). |
| MillSafetyPredicateEngine.ts | domain-safety-predicate | Total NaN-guarded SAFE/UNVERIFIED/BLOCKED verdict over mill safety signals. |
| LatheSafetyPredicateEngine.ts | domain-safety-predicate | Total NaN-guarded predicate over U-LSR24 lathe signals + envelope check (U-LSR22). |
| LathePartoffSafetyRailEngine.ts | domain-safety-predicate | Go/no-go gate for the highest-risk lathe op (parting-off); hard_block violations. |
| LatheSafetySignalEngine.ts | domain-safety-predicate | Composite grip/force/power/chatter signal source feeding the lathe predicate. (name-derived) |
| WEDMProgramSafetyGateEngine.ts | domain-safety-predicate | Composite weighted S(x) gate over 7 WEDM component gates; final wire-controller gate. |
| WEDMPowerDensityGuardEngine.ts | domain-safety-predicate | Validates power density at cut front vs wire-lag/thermal/recast limits. |
| WEDMCurrentDensityGuardEngine.ts | domain-safety-predicate | J = I/(pi(d/2)^2) <= max; wire-break prevention with 85% margin. |
| WEDMSafetyEnvelopeEngine.ts | domain-safety-predicate | Operating-envelope checks (tension/gap/tank/resistivity) for WEDM ERP routes. |
| GCodeSafetyAnalyzerEngine.ts | post-emit-gcode-safety | 24 rules x 6 controllers via modal-state tracking; contextual danger detection (2066 LOC). |
| CollisionHazardDetectorEngine.ts | post-emit-gcode-safety | Pattern-based collision hazards (rapid below top, M06 without retract, orphan T/M06). |
| PostEmitSafetyGateEngine.ts | post-emit-gcode-safety | Pre-emit gate any post-processor chains before .post(); envelope + collision on flat ops. |
| PostVerificationSafetyEngine.ts | post-emit-gcode-safety | Phase 4-5 statistical verify: MonteCarlo Cpk + playbook + envelope + surface (MS11 U01-U06). |
| MachineEnvelopeGuardEngine.ts | post-emit-gcode-safety | Clamps RPM/feed/XYZ/power vs machine limits; never silently passes a violation. |
| ComplianceEngine.ts | regulatory-compliance | F8 Compliance-as-Code: templates, audit logs, cert/hook provisioning, conflict resolution. |
| OSHAComplianceEngine.ts | regulatory-compliance | OSHA incident recording + 300/300A log + PPE-assignment tracking (JM-Die seeds). |
| OSHA300LogEngine.ts | regulatory-compliance | Federal 29 CFR sec 1904 Form 300/300A recordkeeping; recordable-criteria encoded. |
| ITARComplianceTaggerEngine.ts | regulatory-compliance | ITAR/EAR/CMMC/DFARS export-control + deemed-export tagging from part metadata. |
| NISTAIRMFComplianceEngine.ts | regulatory-compliance | NIST AI RMF + ISO 42001 control registry + STRIDE + residual-risk register. |
| PIIComplianceEngine.ts | regulatory-compliance | PII detect/redact + GDPR Art.30 ROPA + CCPA + residency routing + 72h breach (U-LPR-SEC11). |
| HRComplianceEngine.ts | regulatory-compliance | Benefits/PTO/training records/labor-law compliance; feeds business-galaxy HR training. |
| SafetyTrainingRecordEngine.ts | regulatory-compliance | Training-records ledger w/ expiration; closes OSHA training + ISO 9001 sec 7.2 competency gap. |
| LegalComplianceOperatingEngine.ts | regulatory-compliance | NDA lifecycle + export control + retention + audit trail + OSHA + cert tracking (SQ4-2). |
| LegalGateEngine.ts | regulatory-compliance | Consolidated legal gates for CAM-UIX ingest: consent/export/cleanroom/DMCA/license. |
| IndustryStandardsComplianceEngine.ts | regulatory-compliance | Part/process check vs ISO 2768/1302, AS9100, ISO 13485, IATF 16949, DIN 65151, ISO 14644. |
| AGISafetyContainmentEngine.ts | agi-containment | Gates autonomous goals vs forbidden-tags/targets + scope caps + explicit-approval tiers. |
| MillAGISafetyContainmentEngine.ts | agi-containment | Bounds AGI outputs vs mill physics/cost/capacity/kinematic envelopes before P1..P5. |
| LatheAGISafetyContainmentEngine.ts | agi-containment | Bounds AGI outputs vs lathe physics/economics/capacity/kinematic checks (U-LTH61). |

_Excluded (name-matched but owned elsewhere, per galaxy CLAUDE.md sec 2 + refined enum):_
`DuplicationGuardEngine` / `EmbeddingGuardEngine` / `SemanticSimilarityGuardEngine` ->
discovery/database-expansion; `GitSafetyEngine` / `BuildGuardChainEngine` /
`HookCreationGuardEngine` -> dev-process/fleet-hygiene; `*SafetyHooks` (Fusion360 /
HyperMill / Mastercam / SolidCAM / BatchCAMSafetyEngines) + `PP*Safety*` -> CAM /
post-processor galaxies; `AlarmDiagnostics/Escalation/Intelligence` + `MobileAlarm` +
`CostAlarm` -> shop-floor/business alarm surfaces; `LatheLoRASafetyEvaluatorEngine` ->
ai-training. These are NOT counted in the 38.
