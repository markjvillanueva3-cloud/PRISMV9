---
name: prism-master-equation
description: |
  Master quality equation Omega(x) v2.0. Integrates 10 components with dual hard constraints.
---

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

# VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-XX | Initial 5-component version |
| 1.1.0 | 2026-01-XX | Added sensitivity, calibration, edge cases |
| 2.0.0 | 2026-01-30 | Added D(x), A(x), K(x), M(x), self-reflection |

---

**10 COMPONENTS. 30 HOOKS. DUAL CONSTRAINTS. COMPLETE COGNITIVE SYSTEM.**
**prism-master-equation v2.0.0 | Cognitive Enhancement v7.0 | CAPSTONE**
