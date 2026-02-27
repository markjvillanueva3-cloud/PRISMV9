# ═══════════════════════════════════════════════════════════════════════════════
# PRISM MASTER EQUATION v2.0
# ═══════════════════════════════════════════════════════════════════════════════
# COGNITIVE OPTIMIZATION SKILL SUITE - CAPSTONE (ENHANCED)
# Ω(x) = Σ(wᵢ·Xᵢ) | 10-Component Unified Quality Function
# Part of Cognitive Enhancement v7.0
# ⚠️ LIVES AT STAKE - This is the decision function for manufacturing AI ⚠️
# ═══════════════════════════════════════════════════════════════════════════════

---
name: prism-master-equation
version: 2.0.0
layer: 3
priority: CRITICAL
description: |
  Capstone skill integrating ALL cognitive optimization components.
  v2.0 adds 5 new components: D(x), A(x), K(x), M(x), and self-reflection.
  Computes unified quality score Ω(x) from 10 components.
  Enforces safety constraints and optimizes overall system performance.
  ALL outputs must satisfy: S(x) ≥ 0.70 AND D(x) ≥ 0.30 before release.
dependencies:
  - prism-universal-formulas
  - prism-reasoning-engine
  - prism-code-perfection
  - prism-process-optimizer
  - prism-safety-framework
  - prism-anomaly-detector      # NEW v2.0
  - prism-attention-focus       # NEW v2.0
  - prism-causal-reasoning      # NEW v2.0
  - prism-memory-augmentation   # NEW v2.0
  - prism-self-reflection       # NEW v2.0
consumers:
  - ALL PRISM OUTPUTS (this is the final gate)
---

# ═══════════════════════════════════════════════════════════════════════════════
# THE MASTER EQUATION v2.0
# ═══════════════════════════════════════════════════════════════════════════════

## FUNDAMENTAL FORMULA (EXPANDED)

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║    Ω(x) = w_R·R(x) + w_C·C(x) + w_P·P(x) + w_S·S(x) + w_L·L(x)               ║
║         + w_A·A(x) + w_M·M(x) + w_K·K(x) + w_D·D(x)                          ║
║                                                                               ║
║    SUBJECT TO:                                                                ║
║      S(x) ≥ 0.70       (HARD SAFETY CONSTRAINT)                              ║
║      D(x) ≥ 0.30       (HARD ANOMALY CONSTRAINT)                             ║
║      Σw = 1, w ≥ 0     (Weights sum to 1, non-negative)                      ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

WHERE (10 COMPONENTS):
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │ ORIGINAL COMPONENTS (v1.0)                                                  │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │ R(x) = Reasoning quality      (prism-reasoning-engine)                      │
  │ C(x) = Code quality           (prism-code-perfection)                       │
  │ P(x) = Process quality        (prism-process-optimizer)                     │
  │ S(x) = Safety score           (prism-safety-framework)                      │
  │ L(x) = Learning value         (session history + RL hooks)                  │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │ NEW COMPONENTS (v2.0 - Cognitive Enhancement v7.0)                          │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │ D(x) = Anomaly detection      (prism-anomaly-detector)    [SAFETY-CRITICAL] │
  │ A(x) = Attention focus        (prism-attention-focus)                       │
  │ K(x) = Causal knowledge       (prism-causal-reasoning)                      │
  │ M(x) = Memory quality         (prism-memory-augmentation)                   │
  └─────────────────────────────────────────────────────────────────────────────┘
  
  w_i  = Weight for component i (Σw = 1)
```

## DEFAULT WEIGHTS v2.0

```
STANDARD WEIGHTS (Balanced for v2.0):
  ┌─────────────────────────────────────────┐
  │ ORIGINAL COMPONENTS (adjusted)          │
  │   w_R = 0.18  # Reasoning quality       │
  │   w_C = 0.14  # Code quality            │
  │   w_P = 0.10  # Process quality         │
  │   w_S = 0.22  # Safety score (HIGH)     │
  │   w_L = 0.06  # Learning value          │
  │                                         │
  │ NEW COMPONENTS                          │
  │   w_D = 0.10  # Anomaly detection       │
  │   w_A = 0.08  # Attention focus         │
  │   w_K = 0.07  # Causal knowledge        │
  │   w_M = 0.05  # Memory quality          │
  │                                         │
  │ TOTAL = 1.00                            │
  └─────────────────────────────────────────┘

SAFETY-CRITICAL WEIGHTS:
  w_R = 0.10, w_C = 0.10, w_P = 0.05
  w_S = 0.35  # DOMINANT
  w_L = 0.05
  w_D = 0.20  # Anomaly detection critical
  w_A = 0.05, w_K = 0.05, w_M = 0.05

RESEARCH/LEARNING WEIGHTS:
  w_R = 0.20, w_C = 0.10, w_P = 0.08
  w_S = 0.15, w_L = 0.12
  w_D = 0.08, w_A = 0.10, w_K = 0.10, w_M = 0.07

CODE-HEAVY WEIGHTS:
  w_R = 0.12, w_C = 0.25, w_P = 0.10
  w_S = 0.18, w_L = 0.05
  w_D = 0.10, w_A = 0.08, w_K = 0.05, w_M = 0.07
```

## DUAL CONSTRAINT ENFORCEMENT (v2.0)

```
═══════════════════════════════════════════════════════════════════════════════
CONSTRAINT 1: SAFETY (S(x) ≥ 0.70) - NON-NEGOTIABLE
═══════════════════════════════════════════════════════════════════════════════
  IF S(x) < 0.70:
    Ω(x) = 0  # ZERO quality
    BLOCK OUTPUT
    ESCALATE TO HUMAN
    
═══════════════════════════════════════════════════════════════════════════════
CONSTRAINT 2: ANOMALY (D(x) ≥ 0.30) - NEW IN v2.0
═══════════════════════════════════════════════════════════════════════════════
  IF D(x) < 0.30:
    Ω(x) = 0  # ZERO quality (anomalies detected)
    BLOCK OUTPUT
    REPORT ANOMALIES
    
═══════════════════════════════════════════════════════════════════════════════
COMBINED CONSTRAINT:
═══════════════════════════════════════════════════════════════════════════════
  OUTPUT_ALLOWED = (S(x) ≥ 0.70) AND (D(x) ≥ 0.30)
  
  Either constraint violation → Ω(x) = 0 → OUTPUT BLOCKED

RATIONALE:
  Safety (S) catches known failure modes
  Anomaly (D) catches unknown/unexpected issues
  Together: Defense in depth against both known and unknown risks
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# COMPONENT INTEGRATION (ALL 10)
# ═══════════════════════════════════════════════════════════════════════════════

## ORIGINAL COMPONENTS (v1.0)

### R(x): REASONING QUALITY
```
SOURCE: prism-reasoning-engine

COMPONENTS (12 metrics):
  validity, coherence, completeness, depth, relevance,
  accuracy, confidence, calibration, uncertainty, novelty, efficiency

FORMULA: R(x) = geometric_mean(components)
WEIGHT: 0.18 (standard)
```

### C(x): CODE QUALITY
```
SOURCE: prism-code-perfection

COMPONENTS (11 metrics):
  correctness, robustness, maintainability, performance, security,
  testability, readability, modularity, documentation, complexity, debt

FORMULA: C(x) = geometric_mean(components)
WEIGHT: 0.14 (standard)
```

### P(x): PROCESS QUALITY
```
SOURCE: prism-process-optimizer

COMPONENTS (11 metrics):
  skill_use, agent_use, workflow, checkpoint, recovery,
  efficiency, verification, safety_compliance, throughput, completeness, learning

FORMULA: P(x) = geometric_mean(components)
WEIGHT: 0.10 (standard)
```

### S(x): SAFETY SCORE
```
SOURCE: prism-safety-framework

COMPONENTS (7 metrics):
  failure_detection, defense_depth, constraint_coverage,
  data_freshness, stability, override_available, audit_complete

FORMULA: S(x) = min(components)  # Weakest link
HARD CONSTRAINT: S(x) ≥ 0.70
WEIGHT: 0.22 (standard) - highest among original components
```

### L(x): LEARNING VALUE
```
SOURCE: Session history + RL hooks (RL-001, RL-002, RL-003)

COMPONENTS (4 metrics):
  learning_rate, retention, transfer, stability

FORMULA: L(x) = geometric_mean(components)
TEMPORAL RULE: Computed from PREVIOUS sessions only
WEIGHT: 0.06 (standard)
```

---

## NEW COMPONENTS (v2.0)

### D(x): ANOMALY DETECTION
```
SOURCE: prism-anomaly-detector (NEW)

PURPOSE: Detect anomalous/invalid data before output generation

HOOKS:
  ANOM-001: data:received → validate incoming data
  ANOM-002: pattern:unusual → flag anomalies
  ANOM-003: safety:check → verify manufacturing parameters

ANOMALY TYPES (7):
  ANO-RNG: Range violations (out of bounds)
  ANO-PHY: Physics violations (impossible values)
  ANO-STA: Statistical anomalies (outliers)
  ANO-CMB: Combination anomalies (incompatible pairs)
  ANO-TMP: Temporal anomalies (sequence issues)
  ANO-REL: Relational anomalies (cross-field conflicts)
  ANO-MIS: Missing data (critical fields absent)

FORMULA:
  D(x) starts at 1.0
  Each anomaly applies weighted penalty based on severity
  D(x) = 1.0 - Σ(penalty × type_weight × severity_weight)

HARD CONSTRAINT: D(x) ≥ 0.30
WEIGHT: 0.10 (standard)

INTEGRATION WITH S(x):
  IF D(x) < 0.30: S(x) is forced to 0
  This creates double-lock: Both must pass
```

### A(x): ATTENTION FOCUS
```
SOURCE: prism-attention-focus (NEW)

PURPOSE: Measure quality of context focus and information prioritization

HOOKS:
  ATTN-001: context:loaded → compute relevance scores
  ATTN-002: query:received → focus on relevant sections
  ATTN-003: output:generating → prioritize information

COMPONENTS (4 metrics):
  focus_accuracy: Did we focus on the right things?
  context_efficiency: How well did we use limited context?
  completeness: Did we include all necessary information?
  noise_level: How much irrelevant content was excluded?

FORMULA:
  A(x) = 0.30×focus_accuracy + 0.25×context_efficiency 
       + 0.30×completeness + 0.15×(1 - noise_level)

WEIGHT: 0.08 (standard)

INTEGRATION WITH BUFFER ZONES:
  🟢 GREEN: A(x) threshold = 0.3
  🟡 YELLOW: A(x) threshold = 0.5
  🔴 RED: A(x) threshold = 0.7
  ⚫ CRITICAL: Emergency focus mode
```

### K(x): CAUSAL KNOWLEDGE
```
SOURCE: prism-causal-reasoning (NEW)

PURPOSE: Measure quality of cause-effect understanding

HOOKS:
  CAUSAL-001: relationship:detected → build causal graph
  CAUSAL-002: prediction:needed → trace causal chains
  CAUSAL-003: failure:analyzed → identify root causes

COMPONENTS (4 metrics):
  graph_completeness: Are all causal relationships mapped?
  path_confidence: How confident are we in causal paths?
  prediction_accuracy: Do predictions match outcomes?
  evidence_alignment: Does evidence support causal claims?

FORMULA:
  K(x) = 0.25×graph_completeness + 0.30×path_confidence
       + 0.25×prediction_accuracy + 0.20×evidence_alignment

WEIGHT: 0.07 (standard)

CAUSAL CHAIN EXAMPLES:
  Speed → Temperature → Tool Wear → Tool Life (Taylor equation)
  Feed → Chip Load → Surface Finish (Ra = f²/8r)
  Depth → Cutting Force → Power (Kienzle model)
```

### M(x): MEMORY QUALITY
```
SOURCE: prism-memory-augmentation (NEW)

PURPOSE: Measure session continuity and context persistence

HOOKS:
  MEM-001: session:start → load relevant memories
  MEM-002: pattern:learned → encode new memories
  MEM-003: context:overflow → compress and persist

COMPONENTS (4 metrics):
  continuity: How well did we resume from previous session?
  retrieval: Were retrieved memories relevant and useful?
  preservation: Was critical information preserved?
  compression: How efficiently did we handle overflow?

FORMULA:
  M(x) = 0.35×continuity + 0.25×retrieval
       + 0.25×preservation + 0.15×compression

WEIGHT: 0.05 (standard)

INTEGRATION WITH CURRENT_STATE.json:
  M(x) measures how well state file is being used
  Low M(x) = poor session continuity
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# COMPUTATION ALGORITHM v2.0
# ═══════════════════════════════════════════════════════════════════════════════

## COMPLETE COMPUTATION

```typescript
interface MasterEquationResultV2 {
  omega: number;
  components: {
    // Original (v1.0)
    R: MetricOutput;
    C: MetricOutput;
    P: MetricOutput;
    S: MetricOutput;
    L: MetricOutput;
    // New (v2.0)
    D: MetricOutput;
    A: MetricOutput;
    K: MetricOutput;
    M: MetricOutput;
  };
  weights: WeightsV2;
  constraints: {
    safety_passed: boolean;   // S(x) ≥ 0.70
    anomaly_passed: boolean;  // D(x) ≥ 0.30
    all_passed: boolean;
  };
  uncertainty: {
    omega_lower: number;
    omega_upper: number;
    confidence: number;
  };
  decision: 'RELEASE' | 'WARN' | 'BLOCK';
  reflection: SelfReflectionOutput;  // NEW: from REFL hooks
}

async function computeMasterEquationV2(
  context: SkillInput,
  weights: WeightsV2 = DEFAULT_WEIGHTS_V2
): Promise<MasterEquationResultV2> {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: COMPUTE ALL 9 COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Original components
  const R = await prismReasoningEngine.computeR(context);
  const C = await prismCodePerfection.computeC(context);
  const P = await prismProcessOptimizer.computeP(context);
  const S = await prismSafetyFramework.computeS(context);
  const L = await computeLearningValue(context.session_history);
  
  // New v2.0 components
  const D = await prismAnomalyDetector.computeD(context);
  const A = await prismAttentionFocus.computeA(context);
  const K = await prismCausalReasoning.computeK(context);
  const M = await prismMemoryAugmentation.computeM(context);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: CHECK HARD CONSTRAINTS (CRITICAL)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const S_MIN = 0.70;
  const D_MIN = 0.30;
  
  const safety_passed = S.value >= S_MIN;
  const anomaly_passed = D.value >= D_MIN;
  const all_passed = safety_passed && anomaly_passed;
  
  // If EITHER constraint fails, output is blocked
  if (!all_passed) {
    const blockReason = !safety_passed 
      ? `Safety constraint violated: S(x)=${S.value.toFixed(2)} < ${S_MIN}`
      : `Anomaly constraint violated: D(x)=${D.value.toFixed(2)} < ${D_MIN}`;
    
    return {
      omega: 0,  // Zero quality
      components: {R, C, P, S, L, D, A, K, M},
      weights,
      constraints: {safety_passed, anomaly_passed, all_passed: false},
      uncertainty: {omega_lower: 0, omega_upper: 0, confidence: 1.0},
      decision: 'BLOCK',
      reflection: {
        block_reason: blockReason,
        recommendations: generateConstraintFixRecommendations(S, D)
      }
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: COMPUTE Ω(x) WITH ALL 9 COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const omega = 
    weights.w_R * R.value +
    weights.w_C * C.value +
    weights.w_P * P.value +
    weights.w_S * S.value +
    weights.w_L * L.value +
    weights.w_D * D.value +
    weights.w_A * A.value +
    weights.w_K * K.value +
    weights.w_M * M.value;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: COMPUTE UNCERTAINTY
  // ═══════════════════════════════════════════════════════════════════════════
  
  const sigma_omega = Math.sqrt(
    Math.pow(weights.w_R * R.uncertainty.sigma, 2) +
    Math.pow(weights.w_C * C.uncertainty.sigma, 2) +
    Math.pow(weights.w_P * P.uncertainty.sigma, 2) +
    Math.pow(weights.w_S * S.uncertainty.sigma, 2) +
    Math.pow(weights.w_L * L.uncertainty.sigma, 2) +
    Math.pow(weights.w_D * D.uncertainty.sigma, 2) +
    Math.pow(weights.w_A * A.uncertainty.sigma, 2) +
    Math.pow(weights.w_K * K.uncertainty.sigma, 2) +
    Math.pow(weights.w_M * M.uncertainty.sigma, 2)
  );
  
  const omega_lower = Math.max(0, omega - 1.96 * sigma_omega);
  const omega_upper = Math.min(1, omega + 1.96 * sigma_omega);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5: RUN SELF-REFLECTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  const reflection = await prismSelfReflection.assess({
    omega,
    components: {R, C, P, S, L, D, A, K, M},
    context
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 6: MAKE DECISION
  // ═══════════════════════════════════════════════════════════════════════════
  
  let decision: 'RELEASE' | 'WARN' | 'BLOCK';
  
  if (omega >= 0.85 && omega_lower >= 0.70) {
    decision = 'RELEASE';  // High confidence release
  } else if (omega >= 0.65) {
    decision = 'WARN';     // Release with warnings
  } else {
    decision = 'BLOCK';    // Do not release
  }
  
  return {
    omega,
    components: {R, C, P, S, L, D, A, K, M},
    weights,
    constraints: {safety_passed, anomaly_passed, all_passed: true},
    uncertainty: {
      omega_lower,
      omega_upper,
      confidence: 0.95
    },
    decision,
    reflection
  };
}
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# HOOK INTEGRATION MAP
# ═══════════════════════════════════════════════════════════════════════════════

## ALL HOOKS BY COMPONENT

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                        COGNITIVE HOOK INTEGRATION MAP                          ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ORIGINAL HOOKS (from prism-cognitive-core v6.0)                              ║
║  ─────────────────────────────────────────────────────────────────────────    ║
║  BAYES-001  session:preStart       Initialize priors                          ║
║  BAYES-002  evidence:received      Update beliefs                             ║
║  BAYES-003  decision:required      Compute posteriors                         ║
║  OPT-001    task:start             Set objective function                     ║
║  OPT-002    constraint:detected    Add to feasible region                     ║
║  OPT-003    solution:found         Verify optimality                          ║
║  MULTI-001  conflict:detected      Activate Pareto analysis                   ║
║  MULTI-002  tradeoff:required      Compute trade-off surface                  ║
║  MULTI-003  selection:made         Document rationale                         ║
║  GRAD-001   iteration:start        Compute gradient                           ║
║  GRAD-002   step:taken             Update parameters                          ║
║  GRAD-003   convergence:check      Evaluate stopping                          ║
║  RL-001     action:taken           Record state-action                        ║
║  RL-002     outcome:observed       Compute reward                             ║
║  RL-003     policy:update          Adjust behavior                            ║
║                                                                               ║
║  NEW HOOKS (Cognitive Enhancement v7.0)                                       ║
║  ─────────────────────────────────────────────────────────────────────────    ║
║  D(x) Anomaly Detection                                                       ║
║  ANOM-001   data:received          Validate incoming data                     ║
║  ANOM-002   pattern:unusual        Flag anomalies                             ║
║  ANOM-003   safety:check           Verify parameters                          ║
║                                                                               ║
║  A(x) Attention Focus                                                         ║
║  ATTN-001   context:loaded         Compute relevance scores                   ║
║  ATTN-002   query:received         Focus on relevant sections                 ║
║  ATTN-003   output:generating      Prioritize information                     ║
║                                                                               ║
║  K(x) Causal Reasoning                                                        ║
║  CAUSAL-001 relationship:detected  Build causal graph                         ║
║  CAUSAL-002 prediction:needed      Trace causal chains                        ║
║  CAUSAL-003 failure:analyzed       Identify root causes                       ║
║                                                                               ║
║  M(x) Memory Augmentation                                                     ║
║  MEM-001    session:start          Load relevant memories                     ║
║  MEM-002    pattern:learned        Encode new memories                        ║
║  MEM-003    context:overflow       Compress and persist                       ║
║                                                                               ║
║  Self-Reflection                                                              ║
║  REFL-001   action:completed       Assess quality                             ║
║  REFL-002   error:detected         Analyze mistake                            ║
║  REFL-003   session:end            Compute improvement                        ║
║                                                                               ║
║  TOTAL: 15 original + 12 new = 27 cognitive hooks                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

## HOOK FIRING SEQUENCE

```
SESSION START:
  1. MEM-001 (load memories)
  2. BAYES-001 (initialize priors)
  3. ATTN-001 (compute context relevance)

TASK PROCESSING:
  4. OPT-001 (set objectives)
  5. ANOM-001 (validate data)
  6. CAUSAL-001 (build causal graph)
  7. [Task-specific processing]
  8. ANOM-002 (check for unusual patterns)
  9. ATTN-002 (focus attention)

OUTPUT GENERATION:
  10. CAUSAL-002 (trace predictions)
  11. ANOM-003 (safety verification)
  12. ATTN-003 (prioritize output)
  13. COMPUTE Ω(x)
  14. REFL-001 (assess quality)
  15. RL-001 (record action)

SESSION END:
  16. MEM-002 (encode learnings)
  17. MEM-003 (compress if needed)
  18. RL-002 (compute reward)
  19. REFL-003 (improvement analysis)
  20. RL-003 (update policy)
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# DECISION THRESHOLDS v2.0
# ═══════════════════════════════════════════════════════════════════════════════

## DECISION MATRIX

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           DECISION THRESHOLDS v2.0                            ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  HARD CONSTRAINTS (Must Pass):                                                ║
║  ├── S(x) ≥ 0.70  Safety score                                               ║
║  └── D(x) ≥ 0.30  Anomaly score (no critical anomalies)                      ║
║                                                                               ║
║  IF CONSTRAINTS FAIL → Ω(x) = 0 → BLOCK                                       ║
║                                                                               ║
║  DECISION BANDS (After Constraints Pass):                                     ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │ Ω(x) Range    │ Ω_lower    │ Decision │ Action                         │  ║
║  ├─────────────────────────────────────────────────────────────────────────┤  ║
║  │ ≥ 0.85        │ ≥ 0.70     │ RELEASE  │ Ship with confidence          │  ║
║  │ ≥ 0.85        │ < 0.70     │ WARN     │ High but uncertain            │  ║
║  │ 0.65 - 0.85   │ any        │ WARN     │ Release with warnings         │  ║
║  │ < 0.65        │ any        │ BLOCK    │ Do not release                │  ║
║  │ any           │ S < 0.70   │ BLOCK    │ Safety violation              │  ║
║  │ any           │ D < 0.30   │ BLOCK    │ Critical anomalies            │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

## COMPONENT-SPECIFIC WARNINGS

```javascript
function generateWarnings(components) {
  const warnings = [];
  
  // Safety warnings
  if (components.S.value < 0.80) {
    warnings.push({
      level: 'HIGH',
      component: 'S',
      message: `Safety margin thin: ${components.S.value.toFixed(2)}`
    });
  }
  
  // Anomaly warnings
  if (components.D.value < 0.50) {
    warnings.push({
      level: 'MEDIUM',
      component: 'D',
      message: `Anomalies detected: ${components.D.anomalies?.length || 0} issues`
    });
  }
  
  // Attention warnings
  if (components.A.value < 0.60) {
    warnings.push({
      level: 'LOW',
      component: 'A',
      message: `Attention quality low: may have missed relevant context`
    });
  }
  
  // Memory warnings
  if (components.M.value < 0.50) {
    warnings.push({
      level: 'LOW',
      component: 'M',
      message: `Memory continuity issues: some context may be lost`
    });
  }
  
  // Causal warnings
  if (components.K.value < 0.50) {
    warnings.push({
      level: 'MEDIUM',
      component: 'K',
      message: `Causal reasoning incomplete: predictions may be unreliable`
    });
  }
  
  return warnings;
}
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# MANUFACTURING EXAMPLES v2.0
# ═══════════════════════════════════════════════════════════════════════════════

## EXAMPLE 1: Normal Operation

```
CONTEXT: Calculate cutting parameters for 6061-T6 aluminum

COMPONENT VALUES:
  R(x) = 0.92  │ Good physics-based reasoning
  C(x) = 0.88  │ Code quality acceptable
  P(x) = 0.90  │ Followed workflow
  S(x) = 0.95  │ All safety checks passed ✓
  L(x) = 0.85  │ Good historical data
  D(x) = 0.92  │ No anomalies detected ✓
  A(x) = 0.88  │ Good context focus
  K(x) = 0.85  │ Causal relationships understood
  M(x) = 0.90  │ Session continuity maintained

CONSTRAINT CHECK:
  S(x) = 0.95 ≥ 0.70 ✓
  D(x) = 0.92 ≥ 0.30 ✓

Ω(x) = 0.18×0.92 + 0.14×0.88 + 0.10×0.90 + 0.22×0.95 + 0.06×0.85
     + 0.10×0.92 + 0.08×0.88 + 0.07×0.85 + 0.05×0.90
     = 0.166 + 0.123 + 0.090 + 0.209 + 0.051
     + 0.092 + 0.070 + 0.060 + 0.045
     = 0.906

DECISION: RELEASE (Ω ≥ 0.85, Ω_lower ≥ 0.70)
OUTPUT: "Cutting speed: 300 m/min, Feed: 0.15 mm/rev
        Based on verified material data (Confidence: High)"
```

## EXAMPLE 2: Anomaly Detected

```
CONTEXT: Generate speeds for titanium with suspicious material data

COMPONENT VALUES:
  R(x) = 0.82  │ Reasoning attempted
  C(x) = 0.85  │ Code fine
  P(x) = 0.88  │ Process followed
  S(x) = 0.75  │ Safety checks marginal
  L(x) = 0.70  │ Limited Ti data
  D(x) = 0.22  │ ANOMALY: kc1.1 value 3x normal ✗
  A(x) = 0.80  │ Focus OK
  K(x) = 0.78  │ Causal model OK
  M(x) = 0.85  │ Memory OK

CONSTRAINT CHECK:
  S(x) = 0.75 ≥ 0.70 ✓
  D(x) = 0.22 < 0.30 ✗ FAILED

Ω(x) = 0  (Anomaly constraint violated)

DECISION: BLOCK
OUTPUT: "Cannot provide cutting parameters.
        ANOMALY DETECTED: Material kc1.1 coefficient (4500 N/mm²) 
        is 3× higher than typical titanium values (1500-1800).
        
        Recommendations:
        1. Verify material data source
        2. Check for data entry errors
        3. Use conservative parameters if proceeding"
```

## EXAMPLE 3: Context Overflow with Memory Compression

```
CONTEXT: Long session, approaching context limit, continuing extraction

COMPONENT VALUES:
  R(x) = 0.85  │ Reasoning maintained
  C(x) = 0.82  │ Code quality OK
  P(x) = 0.88  │ Process followed
  S(x) = 0.90  │ Safety OK
  L(x) = 0.80  │ Learning OK
  D(x) = 0.88  │ No anomalies
  A(x) = 0.72  │ Focus degrading (context pressure)
  K(x) = 0.80  │ Causal OK
  M(x) = 0.55  │ Memory compressed (some loss)

CONSTRAINT CHECK:
  S(x) = 0.90 ≥ 0.70 ✓
  D(x) = 0.88 ≥ 0.30 ✓

Ω(x) = 0.18×0.85 + 0.14×0.82 + 0.10×0.88 + 0.22×0.90 + 0.06×0.80
     + 0.10×0.88 + 0.08×0.72 + 0.07×0.80 + 0.05×0.55
     = 0.153 + 0.115 + 0.088 + 0.198 + 0.048
     + 0.088 + 0.058 + 0.056 + 0.028
     = 0.832

DECISION: WARN
OUTPUT: "Results provided with warnings:
        - Context efficiency reduced (A=0.72)
        - Some session context compressed (M=0.55)
        - Recommend checkpointing before continuing
        - Consider starting new session for complex tasks"
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# SELF-REFLECTION INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════════

## REFLECTION HOOKS IN MASTER EQUATION

```javascript
// After Ω(x) computed, run self-reflection
async function integrateReflection(result: MasterEquationResultV2) {
  
  // REFL-001: Assess this action's quality
  const actionAssessment = await prismSelfReflection.assessAction({
    action: 'compute_master_equation',
    omega: result.omega,
    components: result.components
  });
  
  // Check for patterns in errors
  if (result.decision === 'BLOCK' || result.decision === 'WARN') {
    // REFL-002: Analyze what went wrong
    const errorAnalysis = await prismSelfReflection.analyzeError({
      decision: result.decision,
      constraints: result.constraints,
      weakest_component: findWeakest(result.components)
    });
    
    result.reflection.error_analysis = errorAnalysis;
    result.reflection.improvement_suggestions = 
      errorAnalysis.prevention_strategies;
  }
  
  // Update learning metrics for next session
  // REFL-003 will fire at session end
  result.reflection.learning_signal = {
    omega: result.omega,
    decision: result.decision,
    timestamp: Date.now()
  };
  
  return result;
}
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# INTEGRATION DIAGRAM v2.0
# ═══════════════════════════════════════════════════════════════════════════════

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║              COGNITIVE OPTIMIZATION SKILL SUITE v2.0 (COMPLETE)               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

                         ┌─────────────────────────────┐
                         │  prism-universal-formulas   │
                         │  LAYER 0 | Foundation       │
                         └──────────────┬──────────────┘
                                        │
    ┌───────────────────┬───────────────┼───────────────┬───────────────────┐
    │                   │               │               │                   │
    ▼                   ▼               ▼               ▼                   ▼
┌────────┐       ┌────────┐       ┌────────┐       ┌────────┐       ┌────────┐
│ R(x)   │       │ C(x)   │       │ P(x)   │       │ S(x)   │       │ L(x)   │
│reasoning│      │ code   │       │process │       │ safety │       │learning│
│ engine │       │perfect │       │optimize│       │framewk │       │ (RL)   │
└───┬────┘       └───┬────┘       └───┬────┘       └───┬────┘       └───┬────┘
    │                │               │               │                   │
    │     ┌──────────┴───────────────┴───────────────┴──────────┐       │
    │     │          NEW v2.0 COGNITIVE COMPONENTS               │       │
    │     │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │       │
    │     │  │ D(x)   │ │ A(x)   │ │ K(x)   │ │ M(x)   │        │       │
    │     │  │anomaly │ │attn    │ │causal  │ │memory  │        │       │
    │     │  │detect  │ │focus   │ │reason  │ │augment │        │       │
    │     │  └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘        │       │
    │     └──────┼──────────┼──────────┼──────────┼─────────────┘       │
    │            │          │          │          │                     │
    └────────────┴──────────┴────┬─────┴──────────┴─────────────────────┘
                                 │
                                 ▼
         ┌─────────────────────────────────────────────────────────────┐
         │                 PRISM MASTER EQUATION v2.0                  │
         │                 LAYER 3 | CAPSTONE                          │
         │                                                             │
         │  Ω(x) = w_R·R + w_C·C + w_P·P + w_S·S + w_L·L              │
         │       + w_D·D + w_A·A + w_K·K + w_M·M                       │
         │                                                             │
         │  CONSTRAINTS:                                               │
         │    S(x) ≥ 0.70  (Safety)                                    │
         │    D(x) ≥ 0.30  (Anomaly)                                   │
         │                                                             │
         │  ┌─────────────────────────────────────────────────────┐    │
         │  │ DECISION:                                           │    │
         │  │   Ω ≥ 0.85 & Ω_lower ≥ 0.70  → RELEASE             │    │
         │  │   Ω ≥ 0.65                    → WARN                │    │
         │  │   Ω < 0.65 OR S < 0.70 OR D < 0.30 → BLOCK         │    │
         │  └─────────────────────────────────────────────────────┘    │
         │                              │                              │
         │                              ▼                              │
         │               ┌─────────────────────────────┐               │
         │               │   prism-self-reflection     │               │
         │               │   REFL-001/002/003 hooks    │               │
         │               └─────────────────────────────┘               │
         └─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │     PRISM OUTPUT      │
                        │  (Manufacturing AI)   │
                        │                       │
                        │  ⚠️ LIVES AT STAKE ⚠️   │
                        └───────────────────────┘
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY v2.0
# ═══════════════════════════════════════════════════════════════════════════════

## The Master Equation v2.0

```
Ω(x) = w_R·R(x) + w_C·C(x) + w_P·P(x) + w_S·S(x) + w_L·L(x)
     + w_D·D(x) + w_A·A(x) + w_K·K(x) + w_M·M(x)

SUBJECT TO: S(x) ≥ 0.70 AND D(x) ≥ 0.30
```

## All 10 Components (9 + reflection)

| Component | Source | Weight | Aggregation |
|-----------|--------|--------|-------------|
| R(x) | reasoning-engine | 0.18 | Geometric mean |
| C(x) | code-perfection | 0.14 | Geometric mean |
| P(x) | process-optimizer | 0.10 | Geometric mean |
| S(x) | safety-framework | 0.22 | Minimum |
| L(x) | RL hooks | 0.06 | Geometric mean |
| D(x) | anomaly-detector | 0.10 | Penalty-based |
| A(x) | attention-focus | 0.08 | Weighted sum |
| K(x) | causal-reasoning | 0.07 | Weighted sum |
| M(x) | memory-augmentation | 0.05 | Weighted sum |
| + | self-reflection | - | Assessment hooks |

## Hook Count

| Category | Count | Purpose |
|----------|-------|---------|
| Original (Bayesian, Opt, Multi, Grad, RL) | 15 | Core AI/ML patterns |
| Anomaly (ANOM-*) | 3 | Data validation |
| Attention (ATTN-*) | 3 | Context focus |
| Causal (CAUSAL-*) | 3 | Cause-effect |
| Memory (MEM-*) | 3 | Session continuity |
| Reflection (REFL-*) | 3 | Self-assessment |
| **TOTAL** | **30** | Comprehensive coverage |

---

# VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-XX | Initial 5-component version |
| 1.1.0 | 2026-01-XX | Added sensitivity, calibration, edge cases |
| 2.0.0 | 2026-01-30 | Added D(x), A(x), K(x), M(x), self-reflection |

---

**10 COMPONENTS. 30 HOOKS. DUAL CONSTRAINTS. COMPLETE COGNITIVE SYSTEM.**
**prism-master-equation v2.0.0 | Cognitive Enhancement v7.0 | CAPSTONE**
