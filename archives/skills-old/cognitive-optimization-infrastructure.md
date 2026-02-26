# ═══════════════════════════════════════════════════════════════════════════════
# COGNITIVE OPTIMIZATION SKILL SUITE - SUPPORTING INFRASTRUCTURE v1.0
# ═══════════════════════════════════════════════════════════════════════════════
# MS-010: Quality Gates | MS-011: Learning System | MS-012: Orchestrator Update
# MS-013: Skill Index | MS-014: API Contracts
# ═══════════════════════════════════════════════════════════════════════════════

---
name: cognitive-optimization-infrastructure
version: 1.0.0
purpose: Supporting infrastructure for the 5 cognitive optimization skills
---

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1: QUALITY GATES (MS-010)
# ═══════════════════════════════════════════════════════════════════════════════

## 1.1 Gate Definitions

```typescript
interface QualityGate {
  name: string;
  level: 'BLOCKING' | 'WARNING' | 'INFO';
  threshold: number;
  metric: string;
  action_on_fail: string;
}

const COGNITIVE_QUALITY_GATES: QualityGate[] = [
  // BLOCKING GATES - Cannot proceed if failed
  {
    name: 'SAFETY_MINIMUM',
    level: 'BLOCKING',
    threshold: 0.70,
    metric: 'S(x)',
    action_on_fail: 'HALT output, escalate to human'
  },
  {
    name: 'OMEGA_MINIMUM',
    level: 'BLOCKING',
    threshold: 0.60,
    metric: 'Ω(x)',
    action_on_fail: 'Do not release, identify weak component'
  },
  {
    name: 'REASONING_VALIDITY',
    level: 'BLOCKING',
    threshold: 0.80,
    metric: 'R.validity',
    action_on_fail: 'Review reasoning chain for logical errors'
  },
  {
    name: 'CODE_CORRECTNESS',
    level: 'BLOCKING',
    threshold: 0.90,
    metric: 'C.correctness',
    action_on_fail: 'Fix failing tests before proceed'
  },
  
  // WARNING GATES - Flag but may proceed
  {
    name: 'OMEGA_TARGET',
    level: 'WARNING',
    threshold: 0.80,
    metric: 'Ω(x)',
    action_on_fail: 'Flag for improvement'
  },
  {
    name: 'PROCESS_COMPLIANCE',
    level: 'WARNING',
    threshold: 0.85,
    metric: 'P.workflow',
    action_on_fail: 'Note workflow deviation'
  },
  {
    name: 'CALIBRATION',
    level: 'WARNING',
    threshold: 0.80,
    metric: 'R.calibration',
    action_on_fail: 'Check confidence-accuracy alignment'
  },
  
  // INFO GATES - Track for learning
  {
    name: 'EFFICIENCY',
    level: 'INFO',
    threshold: 0.70,
    metric: 'P.efficiency',
    action_on_fail: 'Log for optimization'
  },
  {
    name: 'LEARNING_VALUE',
    level: 'INFO',
    threshold: 0.60,
    metric: 'L(x)',
    action_on_fail: 'Consider more pattern extraction'
  }
];
```

## 1.2 Gate Enforcement

```typescript
interface GateResult {
  gate: string;
  passed: boolean;
  value: number;
  threshold: number;
  action?: string;
}

function enforceQualityGates(
  metrics: MasterEquationResult
): {passed: boolean; results: GateResult[]} {
  
  const results: GateResult[] = [];
  let blockingFailed = false;
  
  for (const gate of COGNITIVE_QUALITY_GATES) {
    const value = getMetricValue(metrics, gate.metric);
    const passed = value >= gate.threshold;
    
    results.push({
      gate: gate.name,
      passed,
      value,
      threshold: gate.threshold,
      action: passed ? undefined : gate.action_on_fail
    });
    
    if (!passed && gate.level === 'BLOCKING') {
      blockingFailed = true;
    }
  }
  
  return {
    passed: !blockingFailed,
    results
  };
}
```

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2: LEARNING SYSTEM (MS-011)
# ═══════════════════════════════════════════════════════════════════════════════

## 2.1 Temporal Separation

```
CRITICAL RULE: L(x) uses ONLY data from PREVIOUS sessions.

┌─────────────────────────────────────────────────────────────────┐
│ SESSION N-1                                                     │
│   Actions → Outcomes → Patterns extracted at END                │
└───────────────────────────────────┬─────────────────────────────┘
                                    │ (after session ends)
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ LEARNING UPDATE (between sessions)                              │
│   - Aggregate patterns from session N-1                         │
│   - Update L(x) components                                      │
│   - Store in session history                                    │
└───────────────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ SESSION N (current)                                             │
│   - Load L(x) from history (sessions 0..N-1)                    │
│   - Use in Ω(x) computation                                     │
│   - Current session learning → stored for N+1                   │
└─────────────────────────────────────────────────────────────────┘

NO CIRCULARITY: Current session cannot influence its own L(x).
```

## 2.2 Learning Components

```typescript
interface LearningData {
  session_id: string;
  timestamp: string;
  
  // What worked
  successful_patterns: Pattern[];
  effective_skills: string[];
  high_quality_outputs: string[];
  
  // What failed
  failures: FailureRecord[];
  mistakes: string[];
  inefficiencies: string[];
  
  // Metrics at session end
  final_R: number;
  final_C: number;
  final_P: number;
  final_S: number;
  final_omega: number;
}

interface Pattern {
  context: string;
  action: string;
  outcome: 'SUCCESS' | 'PARTIAL' | 'FAILURE';
  confidence: number;
}

function computeLearningValue(
  history: LearningData[]
): MetricOutput {
  if (history.length === 0) {
    return {
      value: 0.5,  // Maximum entropy
      confidence: 0.3,
      uncertainty: {ci_lower: 0.2, ci_upper: 0.8, method: 'prior'}
    };
  }
  
  // Learning rate: Improvement over time
  const omegas = history.map(h => h.final_omega);
  const learning_rate = computeTrend(omegas);
  
  // Retention: Patterns that persist
  const retention = computePatternRetention(history);
  
  // Transfer: Cross-domain application
  const transfer = computeTransferLearning(history);
  
  // Stability: No regression
  const stability = computeStability(omegas);
  
  const L = geometricMean([learning_rate, retention, transfer, stability]);
  
  return {
    value: L,
    confidence: Math.min(...[learning_rate, retention, transfer, stability]),
    components: {learning_rate, retention, transfer, stability}
  };
}
```

## 2.3 Pattern Extraction

```typescript
// Run at END of each session
async function extractSessionLearning(
  session: SessionData
): Promise<LearningData> {
  
  const patterns: Pattern[] = [];
  
  // Extract successful patterns
  for (const task of session.completed_tasks) {
    if (task.quality >= 0.8) {
      patterns.push({
        context: task.context,
        action: task.approach,
        outcome: 'SUCCESS',
        confidence: task.quality
      });
    }
  }
  
  // Extract failure patterns
  const failures: FailureRecord[] = [];
  for (const error of session.errors) {
    failures.push({
      context: error.context,
      error_type: error.type,
      root_cause: await analyzeRootCause(error),
      prevention: await suggestPrevention(error)
    });
  }
  
  return {
    session_id: session.id,
    timestamp: new Date().toISOString(),
    successful_patterns: patterns,
    effective_skills: session.skills_with_high_impact,
    high_quality_outputs: session.outputs_above_threshold,
    failures,
    mistakes: session.detected_mistakes,
    inefficiencies: session.inefficiencies,
    final_R: session.final_metrics.R,
    final_C: session.final_metrics.C,
    final_P: session.final_metrics.P,
    final_S: session.final_metrics.S,
    final_omega: session.final_metrics.omega
  };
}
```

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3: SKILL ORCHESTRATOR UPDATE (MS-012)
# ═══════════════════════════════════════════════════════════════════════════════

## 3.1 Updated Orchestrator Configuration

```yaml
# prism-skill-orchestrator v5.1 - Cognitive Optimization Integration

SKILL_HIERARCHY:
  LEVEL_0_ALWAYS_ON:
    - prism-life-safety-mindset
    - prism-maximum-completeness
    - prism-anti-regression
    - prism-predictive-thinking
    - prism-mandatory-microsession
    - prism-skill-orchestrator
    
  LEVEL_1_COGNITIVE_FOUNDATION:
    - prism-universal-formulas      # NEW: 109 formulas
    - prism-reasoning-engine        # NEW: R(x)
    - prism-code-perfection         # NEW: C(x)
    
  LEVEL_2_COGNITIVE_ADVANCED:
    - prism-process-optimizer       # NEW: P(x), 39 skills, 57 agents
    - prism-safety-framework        # NEW: S(x), 7 FM, 7 DL
    
  LEVEL_3_COGNITIVE_CAPSTONE:
    - prism-master-equation         # NEW: Ω(x) integration

ACTIVATION_PRIORITY:
  1. Safety skills (always first)
  2. Master equation (quality gate)
  3. Reasoning engine (for all reasoning tasks)
  4. Code perfection (for all coding tasks)
  5. Process optimizer (for workflow optimization)
  6. Universal formulas (on demand)

QUALITY_ENFORCEMENT:
  before_output:
    - compute_omega: true
    - check_safety: true
    - enforce_gates: true
  
  thresholds:
    S_min: 0.70
    omega_min: 0.60
    omega_target: 0.80
```

## 3.2 Integration Points

```typescript
// Orchestrator hooks for cognitive optimization
const COGNITIVE_HOOKS = {
  
  // Before any task
  pre_task: async (context: SkillInput) => {
    // Activate Level 0 + Level 1 skills
    await activateAlwaysOnSkills();
    await activateCognitiveFoundation(context);
    
    // Initialize metrics tracking
    initializeMetricsTracking();
  },
  
  // During task execution
  during_execution: async (partial_result: any) => {
    // Real-time quality monitoring
    const metrics = await computePartialMetrics(partial_result);
    
    // Early warning if quality dropping
    if (metrics.estimated_omega < 0.7) {
      console.warn('Quality trending low - consider intervention');
    }
  },
  
  // After task completion
  post_task: async (result: any, context: SkillInput) => {
    // Compute final Ω(x)
    const omega_result = await computeMasterEquation(context);
    
    // Enforce quality gates
    const gate_result = enforceQualityGates(omega_result);
    
    if (!gate_result.passed) {
      // Block release, escalate
      throw new QualityGateFailure(gate_result);
    }
    
    // Extract learning for next session
    await extractSessionLearning(getCurrentSession());
  }
};
```

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4: SKILL INDEX (MS-013)
# ═══════════════════════════════════════════════════════════════════════════════

## 4.1 Cognitive Optimization Skills Index

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║               COGNITIVE OPTIMIZATION SKILL SUITE INDEX                         ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  ID   │ SKILL NAME              │ VERSION │ LINES │ LAYER │ PURPOSE          ║
╠═══════╪═════════════════════════╪═════════╪═══════╪═══════╪══════════════════╣
║  CO-1 │ prism-universal-formulas│  1.1.0  │  469  │   0   │ 109 math formulas║
║  CO-2 │ prism-reasoning-engine  │  1.1.0  │  955  │   1   │ R(x), 12 metrics ║
║  CO-3 │ prism-code-perfection   │  1.1.0  │  907  │   1   │ C(x), 11 metrics ║
║  CO-4 │ prism-process-optimizer │  1.1.0  │ 1273  │   2   │ P(x), 39sk, 57ag ║
║  CO-5 │ prism-safety-framework  │  1.1.0  │ 1183  │   2   │ S(x), 7FM, 7DL   ║
║  CO-6 │ prism-master-equation   │  1.1.0  │  975  │   3   │ Ω(x) integration ║
╠═══════╪═════════════════════════╪═════════╪═══════╪═══════╪══════════════════╣
║       │ TOTAL                   │         │ 5762  │       │                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝

SUPPORTING DOCUMENTS:
  - cognitive-optimization-wiring.md (568 lines) - Consumer connections
  - cognitive-optimization-infrastructure.md (THIS) - Quality gates, learning, etc.

TOTAL SUITE: ~6600 lines
```

## 4.2 Activation Keywords

```
SKILL → KEYWORDS (for auto-activation)

prism-universal-formulas:
  entropy, probability, bayes, optimization, gradient, game theory,
  control, kalman, graph, complexity, reliability, queue, ML metric,
  chaos, network, type theory, logic, numerical, geometry, algebra

prism-reasoning-engine:
  reasoning, logic, inference, accuracy, confidence, calibration,
  valid, coherent, complete, quality check, evaluate, uncertainty

prism-code-perfection:
  code quality, refactor, test coverage, complexity, maintainability,
  security, performance, robustness, documentation, debt

prism-process-optimizer:
  workflow, process, skill, agent, efficiency, checkpoint, recovery,
  throughput, completion, verification, learning

prism-safety-framework:
  safety, risk, failure mode, defense, constraint, human override,
  audit, critical, dangerous, life, injury, protect

prism-master-equation:
  omega, overall quality, release decision, quality gate, final check
```

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5: API CONTRACTS (MS-014)
# ═══════════════════════════════════════════════════════════════════════════════

## 5.1 Standard Interfaces

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// COGNITIVE OPTIMIZATION API CONTRACTS
// ═══════════════════════════════════════════════════════════════════════════

// Standard metric output (all skills produce this)
interface MetricOutput {
  value: number;              // [0, 1]
  confidence: number;         // [0, 1]
  uncertainty: {
    ci_lower: number;
    ci_upper: number;
    method: 'analytical' | 'bootstrap' | 'monte_carlo';
  };
  components: Record<string, number>;
  source: string;
  timestamp: string;
  evidence_level: 1 | 2 | 3 | 4 | 5;
}

// Standard skill input
interface SkillInput {
  content: string | object;
  content_type: 'text' | 'code' | 'data' | 'mixed';
  task: string;
  constraints: string[];
  preferences: string[];
  session_history?: SessionSummary[];
  safety_requirements: {
    min_confidence: number;
    max_risk: number;
    require_human_override: boolean;
  };
}

// Master equation result
interface MasterEquationResult {
  omega: number;
  components: {
    R: MetricOutput;
    C: MetricOutput;
    P: MetricOutput;
    S: MetricOutput;
    L: MetricOutput;
  };
  weights: Weights;
  safety_passed: boolean;
  uncertainty: {
    omega_lower: number;
    omega_upper: number;
  };
  decision: 'RELEASE' | 'WARN' | 'BLOCK';
}
```

## 5.2 API Endpoints

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// COGNITIVE OPTIMIZATION API
// ═══════════════════════════════════════════════════════════════════════════

interface CognitiveOptimizationAPI {
  
  // Universal Formulas
  universalFormulas: {
    getFormula(domain: string, name: string): Formula;
    compute(formula: string, inputs: Record<string, number>): ComputeResult;
    listDomains(): string[];
    listFormulas(domain: string): string[];
  };
  
  // Reasoning Engine
  reasoningEngine: {
    computeR(input: SkillInput): Promise<MetricOutput>;
    getMetric(name: string): number;
    checkValidity(reasoning: string): ValidityResult;
    calibrate(predictions: Prediction[]): CalibrationResult;
  };
  
  // Code Perfection
  codePerfection: {
    computeC(code: string): Promise<MetricOutput>;
    analyzeComplexity(code: string): ComplexityReport;
    checkQuality(code: string, threshold: number): QualityGateResult;
    suggestRefactoring(code: string): RefactoringPlan;
  };
  
  // Process Optimizer
  processOptimizer: {
    computeP(context: SkillInput): Promise<MetricOutput>;
    selectSkills(task: string): SkillMatch[];
    selectAgents(task: TaskAnalysis, budget: number): AgentSelection;
    optimizeWorkflow(current: WorkflowState): OptimizedWorkflow;
  };
  
  // Safety Framework
  safetyFramework: {
    computeS(context: SkillInput): Promise<MetricOutput>;
    checkFailureModes(input: any): FailureModeResult[];
    applyDefenseLayers(computation: any): DefenseResult;
    requestHumanOverride(context: any): OverrideDecision;
    getSafetyConstraint(): number;  // Returns S_MIN
  };
  
  // Master Equation
  masterEquation: {
    computeOmega(context: SkillInput, weights?: Weights): Promise<MasterEquationResult>;
    enforceQualityGates(metrics: MasterEquationResult): GateEnforcementResult;
    getDecision(result: MasterEquationResult): 'RELEASE' | 'WARN' | 'BLOCK';
    optimizeWeights(history: SessionData[]): OptimalWeights;
  };
}
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

## MS-010: Quality Gates ✅
- 4 BLOCKING gates (safety, omega, validity, correctness)
- 3 WARNING gates (target, compliance, calibration)
- 2 INFO gates (efficiency, learning)
- Enforcement function implemented

## MS-011: Learning System ✅
- Temporal separation enforced
- 4 learning components (rate, retention, transfer, stability)
- Pattern extraction at session end
- No circularity

## MS-012: Orchestrator Update ✅
- 6 cognitive skills integrated into hierarchy
- Activation priority defined
- Pre/during/post hooks implemented
- Quality enforcement configured

## MS-013: Skill Index ✅
- Complete index of 6 skills (5762 lines)
- Layer assignments
- Activation keywords
- Supporting documents

## MS-014: API Contracts ✅
- Standard interfaces (MetricOutput, SkillInput)
- API endpoints for all 6 skills
- Type definitions

---

# VERSION: 1.0.0
# MS-010 through MS-014 COMPLETE ✅
