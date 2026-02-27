---
name: prism-reasoning-engine
description: |
  12 reasoning metrics for R(x) score. Validates logical consistency, evidence quality, and inference validity.
---

```
PRISM.cognitive
├── reasoning.*          # This skill's metrics
│   ├── quality          # R(x) overall score
│   ├── validity         # Logical correctness
│   ├── coherence        # Internal consistency
│   ├── completeness     # Coverage of query
│   ├── depth            # Analysis layers
│   ├── relevance        # On-topic measure
│   ├── accuracy         # Factual correctness
│   ├── confidence       # Belief strength [0,1]
│   ├── calibration      # confidence ≈ accuracy
│   ├── uncertainty      # Quantified doubt [CI]
│   ├── novelty          # New information
│   └── efficiency       # Reasoning economy
│
├── code.*               # prism-code-perfection metrics
│   ├── quality          # C(x) overall score
│   ├── correctness      # Functional accuracy
│   ├── robustness       # Error handling
│   ├── maintainability  # Long-term health
│   ├── performance      # Speed/memory
│   ├── security         # Vulnerability freedom
│   ├── testability      # Test coverage
│   ├── readability      # Human comprehension
│   ├── modularity       # Coupling/cohesion
│   ├── documentation    # Comment quality
│   ├── complexity       # Cyclomatic/cognitive
│   └── debt             # Technical debt ratio
│
├── process.*            # prism-process-optimizer metrics
│   ├── quality          # P(x) overall score
│   ├── skill_use        # Skill utilization rate
│   ├── agent_use        # Agent utilization rate
│   ├── workflow         # SP.1 compliance
│   ├── checkpoint       # State preservation
│   ├── recovery         # Failure recovery
│   ├── efficiency       # Token/time economy
│   ├── completeness     # Task completion %
│   ├── verification     # Evidence level [1-5]
│   ├── learning         # Improvement rate
│   ├── safety           # Safety score
│   └── throughput       # Tasks per session
│
├── safety.*             # Safety-specific metrics (CRITICAL)
│   ├── score            # S(x) overall
│   ├── failure_modes    # Detected count
│   ├── defense_depth    # Layers active
│   ├── human_override   # Override available
│   ├── risk             # P × Severity
│   ├── audit_trail      # Traceability
│   └── bounds           # Within safe limits
│
└── learning.*           # Learning metrics
    ├── value            # L(x) overall
    ├── rate             # Improvement speed
    ├── retention        # Knowledge persistence
    ├── transfer         # Cross-domain application
    └── stability        # No regression
```

## 1.2 BREAKING CIRCULAR DEPENDENCIES

### PROBLEM IDENTIFIED (5-loop scrutiny):
```
Learning L(x) tracks skill improvement
    ↓
Skill improvement affects master-equation weights
    ↓
Master-equation weights affect Ω(x)
    ↓
Ω(x) optimization affects learning targets
    ↓
Learning targets affect L(x)
    [CIRCULAR!]
```

### SOLUTION: TEMPORAL SEPARATION

```
RULE: L(x) uses ONLY data from PREVIOUS sessions.
      Current session learning applies to NEXT session.
      No within-session circularity.

IMPLEMENTATION:
  L(x)_current = f(sessions[0..n-1])  # Historical only
  L(x)_next = f(sessions[0..n])       # Includes current
  
  At session end:
    1. Compute learning from current session
    2. Store in session log
    3. Next session loads historical L(x)
    
TEMPORAL BOUNDARY:
  session_start → session_end = EXECUTION
  session_end → next_session_start = LEARNING UPDATE
  
  These are DISJOINT. No overlap. No circularity.
```

### DEPENDENCY GRAPH (Acyclic)

```
                    ┌─────────────────────────────────────┐
                    │         TEMPORAL BOUNDARY           │
                    │    (Learning update happens here)   │
                    └─────────────────────────────────────┘
                                    ▲
                                    │ (after session)
                                    │
┌─────────────────────────────────────────────────────────────────┐
│                    WITHIN SESSION (No Circularity)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  prism-universal-formulas (Layer 0)                            │
│          │                                                      │
│          ▼                                                      │
│  ┌───────┴───────┬───────────────┐                             │
│  │               │               │                              │
│  ▼               ▼               ▼                              │
│  reasoning    code-perf    process-opt    L(x)_historical      │
│  R(x)         C(x)         P(x)           (from prev sessions) │
│  │               │               │               │              │
│  └───────┬───────┴───────┬───────┴───────────────┘              │
│          │               │                                      │
│          ▼               ▼                                      │
│     ┌────┴────┐    ┌────┴────┐                                 │
│     │ Safety  │    │ Master  │                                 │
│     │  S(x)   │◄───┤ Equation│                                 │
│     └─────────┘    │  Ω(x)   │                                 │
│                    └─────────┘                                  │
│                         │                                       │
│                         ▼                                       │
│                    OUTPUT/ACTION                                │
│                         │                                       │
└─────────────────────────┼───────────────────────────────────────┘
                          │ (session ends)
                          ▼
                    LEARNING UPDATE
                    (Updates L(x) for next session)
```

## 1.3 FORMAL TERM DEFINITIONS

### Core Terms

| Term | Symbol | Domain | Definition | Range |
|------|--------|--------|------------|-------|
| Quality | Q | All | Geometric mean of component metrics | [0, 1] |
| Confidence | conf | reasoning | Subjective belief strength | [0, 1] |
| Accuracy | acc | reasoning | P(correct \| stated) | [0, 1] |
| Calibration | cal | reasoning | \|conf - acc\| (lower = better) | [0, 1] |
| Completeness | comp | All | Fraction of required elements present | [0, 1] |
| Uncertainty | σ | All | Standard deviation or CI width | ℝ⁺ |
| Risk | risk | safety | P(failure) × Severity | [0, ∞) |

### Composite Scores

```
REASONING QUALITY:
  R(x) = (validity × coherence × completeness × depth × 
          relevance × accuracy × calibration × efficiency)^(1/8)
  
  Each component ∈ [0, 1], so R(x) ∈ [0, 1]
  Geometric mean penalizes any weak component

CODE QUALITY:
  C(x) = (correctness × robustness × maintainability × performance ×
          security × testability × readability × modularity)^(1/8)

PROCESS QUALITY:
  P(x) = (skill_use × agent_use × workflow × checkpoint ×
          recovery × efficiency × verification × safety)^(1/8)

SAFETY SCORE:
  S(x) = min(failure_detection, defense_depth, human_override, 
             risk_bound, audit_trail)
  
  Minimum because safety is only as strong as weakest link

LEARNING VALUE (from previous sessions only):
  L(x) = (learning_rate × retention × transfer × stability)^(1/4)

MASTER EQUATION:
  Ω(x) = w_R×R(x) + w_C×C(x) + w_P×P(x) + w_S×S(x) + w_L×L(x)
  
  Subject to: S(x) ≥ S_min (safety constraint)
              Σw = 1, w ≥ 0
```

## 1.4 STANDARD DATA CONTRACTS

### MetricOutput (All skills produce this)

```typescript
interface MetricOutput {
  // Core value
  value: number;              // [0, 1] normalized
  
  // Uncertainty (MANDATORY per Commandment #5)
  confidence: number;         // [0, 1] subjective belief
  uncertainty: {
    ci_lower: number;         // 95% CI lower bound
    ci_upper: number;         // 95% CI upper bound
    method: 'analytical' | 'bootstrap' | 'monte_carlo';
  };
  
  // Components
  components: Record<string, number>;  // Sub-metrics that compose this
  
  // Traceability (MANDATORY for safety)
  source: string;             // Skill that produced this
  timestamp: string;          // ISO8601
  session_id: string;         // For temporal separation
  
  // Evidence (for verification)
  evidence_level: 1 | 2 | 3 | 4 | 5;  // L1=claim to L5=verified
  evidence_refs: string[];    // Supporting references
}
```

### SkillInput (All skills accept this)

```typescript
interface SkillInput {
  // What to analyze
  content: string | object;
  content_type: 'text' | 'code' | 'data' | 'mixed';
  
  // Context
  task: string;               // What user wants
  constraints: string[];      // Must satisfy
  preferences: string[];      // Should satisfy
  
  // Historical (for learning, PREVIOUS sessions only)
  session_history?: SessionSummary[];  // Past sessions
  
  // Safety bounds
  safety_requirements: {
    min_confidence: number;
    max_risk: number;
    require_human_override: boolean;
  };
}
```

### SessionSummary (For temporal separation)

```typescript
interface SessionSummary {
  session_id: string;
  timestamp_start: string;
  timestamp_end: string;
  
  // Metrics at session end
  R_final: number;
  C_final: number;
  P_final: number;
  S_final: number;
  
  // Learning extracted (for NEXT session)
  improvements: string[];
  patterns: string[];
  mistakes: string[];
  
  // NOT included in current session L(x) - only future
}
```

# ═══════════════════════════════════════════════════════════════════════════════
# PART 3: INTEGRATION WITH OTHER SKILLS
# ═══════════════════════════════════════════════════════════════════════════════

## 3.1 IMPORTS FROM prism-universal-formulas

```
INFORMATION THEORY:
  - shannonEntropy(P) → H(X)
  - conditionalEntropy(P_joint) → H(X|Y)
  - mutualInformation(P_X, P_Y, P_joint) → I(X;Y)
  - kl_divergence(P, Q) → D_KL(P||Q)

PROBABILITY:
  - bayesUpdate(prior, likelihood, evidence) → posterior
  - confidenceInterval(data, confidence_level) → [lower, upper]
  - bootstrap(data, statistic, n_resamples) → CI

MACHINE LEARNING:
  - expectedCalibrationError(predictions, actuals) → ECE
  - brierScore(probabilities, outcomes) → BS
```

## 3.2 EXPORTS TO OTHER SKILLS

```
TO prism-master-equation:
  - computeR(input: SkillInput) → MetricOutput  // R(x) component
  
TO prism-process-optimizer:
  - getReasoningMetrics() → Record<string, number>  // All 12 metrics
  
TO prism-quality-master:
  - checkReasoningQuality(threshold: number) → QualityGateResult
```

## 3.3 ACTIVATION TRIGGERS

```
ALWAYS ACTIVE when:
  - Analyzing reasoning chains
  - Evaluating response quality
  - Calibrating confidence
  - Any task requiring logical analysis

LOAD reasoning-engine when keywords:
  - "reasoning", "logic", "inference"
  - "accuracy", "confidence", "calibration"
  - "valid", "coherent", "complete"
  - "quality check", "evaluate"
```

# VERSION: 1.0.0
# MS-002 RALPH LOOP 1 (CREATE) COMPLETE
# NEXT: RALPH LOOP 2 (SCRUTINIZE & ENHANCE)

# ═══════════════════════════════════════════════════════════════════════════════
# ENHANCEMENTS (Adding to address gaps)
# ═══════════════════════════════════════════════════════════════════════════════

## ENHANCEMENT 1: MANUFACTURING APPLICATIONS

```
METRIC → MANUFACTURING USE CASE
────────────────────────────────────────────────────────────────────────────────

VALIDITY → Toolpath reasoning
  "If feed rate is too high AND material is hard THEN tool will break"
  Check: Does the inference follow? Are conditions correctly evaluated?
  LIVES AT STAKE: Invalid inference about tool loads → tool breakage → injury

COHERENCE → Parameter consistency
  "Speed = 1000 RPM" and later "Speed = 800 RPM" without explicit change
  Check: Are all stated parameters internally consistent?
  LIVES AT STAKE: Inconsistent parameters → unexpected machine behavior

COMPLETENESS → Machining strategy coverage
  Query: "How to machine this pocket?"
  Must cover: Roughing, finishing, tool selection, feeds/speeds, coolant, etc.
  LIVES AT STAKE: Missing strategy element → poor part quality or crash

DEPTH → Root cause analysis
  Surface observation: "Tool wore quickly"
  Need depth: Heat → inadequate coolant → clogged nozzle → maintenance gap
  LIVES AT STAKE: Shallow analysis → recurrence → eventual catastrophe

RELEVANCE → Recommendation applicability
  User asked about aluminum, response discusses steel
  Check: Is advice actually for the specified material?
  LIVES AT STAKE: Wrong material parameters → wrong speeds → crash/fire

ACCURACY → Cutting parameter correctness
  "Recommended speed: 800 m/min for 6061-T6"
  Check: Is this actually correct per Machinery's Handbook?
  LIVES AT STAKE: Wrong speed → tool failure → shrapnel

CONFIDENCE → Certainty about recommendations
  "I am 95% confident this feed rate is safe" vs "I think this might work"
  Check: Does confidence match evidence strength?
  LIVES AT STAKE: Overconfidence → false safety → accident

CALIBRATION → Confidence accuracy over time
  If saying "95% confident" should be right 95% of the time
  Check: Historical accuracy matches stated confidence?
  LIVES AT STAKE: Miscalibrated system → operators ignore valid warnings

UNCERTAINTY → Parameter bounds
  "Speed = 800 ± 50 m/min" vs just "Speed = 800"
  Check: Are bounds provided for all numerical outputs?
  LIVES AT STAKE: Missing bounds → no safety margin → edge failures

NOVELTY → Value-added information
  Not just restating handbook values but providing optimization insight
  Check: Does response add value beyond basic lookup?
  OPERATOR BENEFIT: Better parts, faster cycle times, longer tool life

EFFICIENCY → Response economy
  Get to the point without excessive caveats for simple queries
  Check: Is response appropriately concise?
  OPERATOR BENEFIT: Faster decisions, less cognitive load
```

## ENHANCEMENT 2: EDGE CASES

```
EDGE CASE HANDLING FOR ALL METRICS
────────────────────────────────────────────────────────────────────────────────

METRIC = 0 (Total failure):
  - Log warning: "[METRIC] = 0.0 - COMPLETE FAILURE"
  - R(x) becomes 0 (geometric mean property)
  - BLOCK output - do not proceed
  - Require human review before continuing
  
METRIC = 1 (Perfect score):
  - Verify: Is this actually perfect or measurement error?
  - Flag for review if first occurrence
  - After verification: Accept and proceed

METRIC UNDEFINED (Division by zero, log(0), etc.):
  - Replace with sentinel: NaN → 0.0 with flag
  - Log: "[METRIC] undefined due to [reason]"
  - Propagate uncertainty: σ → ∞ for undefined
  - Conservative action: Assume worst case

METRIC OUT OF RANGE ([0,1] violated):
  - Clamp to valid range: max(0, min(1, value))
  - Log warning: "[METRIC] = [value] clamped to [clamped_value]"
  - Investigate cause

NO DATA (Cannot compute metric):
  - Use prior: Assume baseline from historical data
  - Increase uncertainty: σ *= 2
  - Flag: "Metric based on prior, not current data"
```

## ENHANCEMENT 3: ERROR HANDLING

```
ERROR HANDLING HIERARCHY
────────────────────────────────────────────────────────────────────────────────

LEVEL 1: COMPUTATION ERROR
  try:
    metric = compute_metric(input)
  except ComputationError:
    metric = fallback_estimate(input)
    confidence *= 0.5
    log_error("Computation failed, using fallback")

LEVEL 2: DATA ERROR
  if input_data is None or empty:
    return MetricOutput(
      value=0.5,  # Maximum entropy assumption
      confidence=0.1,
      uncertainty={ci_lower: 0, ci_upper: 1, method: 'no_data'},
      evidence_level=1
    )

LEVEL 3: SYSTEM ERROR
  if critical_failure:
    HALT
    notify_human("Critical failure in reasoning engine")
    wait_for_human_override()

GRACEFUL DEGRADATION (Commandment #7):
  1. Try primary computation
  2. Fall back to simpler model
  3. Fall back to historical average
  4. Fall back to maximum entropy (0.5)
  5. NEVER return nothing - always provide estimate with uncertainty
```

## ENHANCEMENT 4: NUMERICAL STABILITY

```
NUMERICAL STABILITY RULES
────────────────────────────────────────────────────────────────────────────────

LOG OF SMALL NUMBERS:
  # BAD: log(p) when p ≈ 0
  # GOOD: log(p + ε) where ε = 1e-10
  
  ENTROPY_EPSILON = 1e-10
  H = -sum(p * log2(p + ENTROPY_EPSILON) for p in distribution)

DIVISION:
  # BAD: a / b when b ≈ 0
  # GOOD: a / max(b, ε) or use safe_divide
  
  def safe_divide(a, b, default=0.0):
    return a / b if abs(b) > 1e-10 else default

GEOMETRIC MEAN:
  # BAD: product(values)^(1/n) - overflow/underflow
  # GOOD: exp(mean(log(values + ε)))
  
  def geometric_mean(values):
    log_values = [log(max(v, 1e-10)) for v in values]
    return exp(mean(log_values))

PROBABILITY BOUNDS:
  # Always clamp probabilities
  p = max(0.0, min(1.0, p))
  
  # For log-odds, bound away from 0 and 1
  p_safe = max(0.001, min(0.999, p))

ACCUMULATION:
  # Use Kahan summation for long sums
  # Or sort by magnitude before summing
```

## ENHANCEMENT 5: VALIDATION CHECKLIST

```
BEFORE RETURNING ANY MetricOutput:
────────────────────────────────────────────────────────────────────────────────

□ value ∈ [0, 1]?
□ confidence ∈ [0, 1]?
□ ci_lower ≤ value ≤ ci_upper?
□ ci_lower ≥ 0 and ci_upper ≤ 1?
□ source is non-empty string?
□ timestamp is valid ISO8601?
□ evidence_level ∈ {1, 2, 3, 4, 5}?
□ No NaN or Inf values?
□ Uncertainty increases if data is sparse?
□ Confidence decreases if extrapolating?

IF ANY CHECK FAILS:
  - Log violation
  - Attempt auto-correction
  - If cannot correct: Return error state, do not proceed
```

# VERSION: 1.1.0 (Enhanced)
# MS-002 RALPH LOOP 2 COMPLETE ✅
# READY FOR MS-003: Safety Framework
