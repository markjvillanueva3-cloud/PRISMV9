---
name: prism-process-optimizer
description: |
  12 process metrics for P(x) score. Optimizes workflows, checkpoints, and efficiency.
---

```
DEFINITION: Fraction of relevant skills actually used

FORMULA:
  skill_use = skills_used / skills_relevant

WHERE:
  skills_used = skills activated this session
  skills_relevant = skills that could help (based on task analysis)

MEASUREMENT:
  1. Analyze task for skill keywords
  2. Count skills that matched and activated
  3. Count skills that should have matched
  4. skill_use = intersection / should_have

IDEAL: skill_use = 1.0 (all relevant skills used)

LOW UTILIZATION INDICATORS:
  - Missed keyword triggers
  - Manual override needed
  - Suboptimal output quality
```

## METRIC 2: AGENT UTILIZATION

```
DEFINITION: Fraction of beneficial agents actually deployed

FORMULA:
  agent_use = agents_deployed / agents_optimal

WHERE:
  agents_deployed = API agents called this session
  agents_optimal = agents that would maximize quality/cost

MEASUREMENT:
  1. Identify task complexity (simple/medium/complex)
  2. Determine optimal agent set
  3. Compare to actual deployment
  4. agent_use = actual / optimal

BALANCE: Consider cost vs benefit
  - Overuse: Wasted API costs
  - Underuse: Suboptimal quality
```

## METRIC 3: WORKFLOW COMPLIANCE

```
DEFINITION: Adherence to SP.1 Core Development Workflow

FORMULA:
  workflow = phases_followed / phases_required

SP.1 WORKFLOW PHASES:
  1. BRAINSTORM → Design approval
  2. PLANNING → Task list approval
  3. EXECUTION → With checkpoints
  4. REVIEW-SPEC → Specification compliance
  5. REVIEW-QUALITY → Code quality
  6. DEBUGGING → If errors (loop back)
  7. VERIFICATION → Evidence-based proof
  8. HANDOFF → State preservation

COMPLIANCE CHECK:
  □ Brainstorm before coding?
  □ Plan before execution?
  □ Checkpoints during execution?
  □ Spec review after execution?
  □ Quality review after spec?
  □ Proper debugging process?
  □ Verification before claiming done?
  □ Handoff with state preserved?
```

## METRIC 4: CHECKPOINT COMPLIANCE

```
DEFINITION: Frequency and quality of state preservation

FORMULA:
  checkpoint = (checkpoints_made / checkpoints_required) × quality_factor

CHECKPOINTS REQUIRED:
  - At zone transitions (green→yellow→orange)
  - At microsession boundaries
  - Before any destructive operation
  - At task completion

QUALITY FACTOR:
  quality_factor = (state_completeness + resumability + accuracy) / 3
  
  state_completeness: All required fields present?
  resumability: Can next session resume from this?
  accuracy: Does state match actual progress?
```

## METRIC 5: RECOVERY SUCCESS

```
DEFINITION: Ability to recover from failures and interruptions

FORMULA:
  recovery = successful_recoveries / failure_events

RECOVERY SCENARIOS:
  - Context compaction
  - Session timeout
  - Tool failure
  - Network error
  - Invalid state

MEASUREMENT:
  Track each failure event
  Track whether recovery succeeded
  recovery = successes / total
```

## METRIC 6: EFFICIENCY

```
DEFINITION: Quality output per unit resource

FORMULA:
  efficiency = output_quality / resource_cost

WHERE:
  output_quality = task completion × quality score
  resource_cost = tokens + time + tool_calls + api_calls

NORMALIZATION:
  efficiency = (R × C × completeness) / (α×tokens + β×time + γ×calls)
  
  Typical weights: α=0.001, β=0.1, γ=0.5

IDEAL: High quality with minimal resources
```

## METRIC 7: VERIFICATION LEVEL

```
DEFINITION: Evidence level achieved for claims

FORMULA:
  verification = Σ(claim_i × evidence_level_i) / Σ(claim_i × 5)

EVIDENCE LEVELS:
  L1 = Claim only (0.2)
  L2 = Reference cited (0.4)
  L3 = Content listed (0.6)
  L4 = Sample shown (0.8)
  L5 = Verified correct (1.0)

TARGET:
  - Standard work: L3 minimum
  - Safety-critical: L5 required
```

## METRIC 8: SAFETY COMPLIANCE

```
DEFINITION: Adherence to safety framework

FORMULA:
  safety_compliance = safety_checks_passed / safety_checks_required

CHECKS:
  □ All 7 failure modes checked?
  □ All 7 defense layers active?
  □ Human override available?
  □ Audit trail complete?
  □ S(x) ≥ S_min?
```

## METRIC 9: THROUGHPUT

```
DEFINITION: Tasks completed per time unit

FORMULA:
  throughput = tasks_completed / session_time

NORMALIZED:
  throughput_score = actual_throughput / expected_throughput

FACTORS AFFECTING THROUGHPUT:
  - Task complexity
  - Tool availability
  - Context constraints
  - Error rate
```

## METRIC 10: COMPLETENESS

```
DEFINITION: Fraction of task actually finished

FORMULA:
  process.completeness = deliverables_complete / deliverables_required

NOT TO CONFUSE WITH:
  - reasoning.completeness (query coverage)
  - task completeness (this one)

MEASUREMENT:
  1. List all required deliverables
  2. Check each for completion
  3. completeness = complete / total
```

## METRIC 11: LEARNING VALUE

```
DEFINITION: Knowledge extracted for future sessions

FORMULA:
  learning = patterns_extracted × retention_probability × transfer_potential

TEMPORAL SEPARATION (from reasoning-engine):
  - L(x) uses ONLY previous session data
  - Current session learning → next session

PATTERNS TO EXTRACT:
  - What worked well?
  - What failed and why?
  - New approaches discovered?
  - Optimizations found?
```

## METRIC 12: OVERALL PROCESS QUALITY P(x)

```
FORMULA:
  P(x) = (skill_use × agent_use × workflow × checkpoint ×
          recovery × efficiency × verification × safety_compliance ×
          throughput × completeness × learning)^(1/11)

QUALITY GATES:
  P(x) ≥ 0.9: Excellent process
  P(x) ≥ 0.8: Good process
  P(x) ≥ 0.7: Acceptable
  P(x) < 0.7: Process failure - review and improve
```

# ═══════════════════════════════════════════════════════════════════════════════
# PART 3: 57 AGENT SELECTION CRITERIA
# ═══════════════════════════════════════════════════════════════════════════════

## SELECTION FORMULA

```
AGENT_SCORE(agent, task) =
  capability_match × 0.35 +
  cost_efficiency × 0.25 +
  availability × 0.20 +
  past_performance × 0.20

SELECT: Top scoring agents for task
LIMIT: Budget constraint on total cost
```

## TIER 1: OPUS AGENTS (17) - Complex Reasoning

```
AGENT: architect
  CAPABILITY: System design, architecture decisions
  SELECT_WHEN: new_system OR architecture_change
  COST: $75/1M tokens

AGENT: coordinator
  CAPABILITY: Multi-agent orchestration
  SELECT_WHEN: complex_task AND agents > 3
  COST: $75/1M tokens

AGENT: materials_scientist
  CAPABILITY: Material properties, behavior prediction
  SELECT_WHEN: material_analysis OR exotic_material
  COST: $75/1M tokens

AGENT: machinist
  CAPABILITY: Shop floor expertise, practical knowledge
  SELECT_WHEN: machining_question OR troubleshooting
  COST: $75/1M tokens

AGENT: physics_validator
  CAPABILITY: Validate physics calculations
  SELECT_WHEN: physics_calculation AND critical
  COST: $75/1M tokens

AGENT: domain_expert
  CAPABILITY: Deep domain knowledge
  SELECT_WHEN: specialized_question
  COST: $75/1M tokens

AGENT: migration_specialist
  CAPABILITY: Monolith to modular migration
  SELECT_WHEN: extracting_from_monolith
  COST: $75/1M tokens

AGENT: synthesizer
  CAPABILITY: Combine multiple sources
  SELECT_WHEN: multi_source_integration
  COST: $75/1M tokens

AGENT: debugger
  CAPABILITY: Complex debugging
  SELECT_WHEN: difficult_bug AND failed_simple_debug
  COST: $75/1M tokens

AGENT: root_cause_analyst
  CAPABILITY: Deep root cause analysis
  SELECT_WHEN: recurring_issue OR critical_failure
  COST: $75/1M tokens

AGENT: task_decomposer
  CAPABILITY: Break complex tasks
  SELECT_WHEN: complex_task AND unclear_approach
  COST: $75/1M tokens

AGENT: learning_extractor
  CAPABILITY: Extract patterns from experience
  SELECT_WHEN: session_end AND significant_work
  COST: $75/1M tokens

AGENT: verification_chain
  CAPABILITY: Multi-level verification
  SELECT_WHEN: critical_output AND need_L5_evidence
  COST: $75/1M tokens

AGENT: uncertainty_quantifier
  CAPABILITY: Rigorous uncertainty analysis
  SELECT_WHEN: numerical_output AND high_stakes
  COST: $75/1M tokens

AGENT: knowledge_graph_builder
  CAPABILITY: Build knowledge connections
  SELECT_WHEN: knowledge_management
  COST: $75/1M tokens

AGENT: meta_analyst
  CAPABILITY: Analyze the analysis process
  SELECT_WHEN: process_improvement
  COST: $75/1M tokens

AGENT: call_tracer
  CAPABILITY: Trace execution paths
  SELECT_WHEN: understanding_system_behavior
  COST: $75/1M tokens
```

## TIER 2: SONNET AGENTS (32) - Balanced Tasks

```
AGENT: extractor
  CAPABILITY: Extract content from sources
  SELECT_WHEN: extraction_task
  COST: $15/1M tokens

AGENT: validator
  CAPABILITY: Validate data/outputs
  SELECT_WHEN: validation_needed
  COST: $15/1M tokens

AGENT: merger
  CAPABILITY: Merge data sources
  SELECT_WHEN: combining_data
  COST: $15/1M tokens

AGENT: coder
  CAPABILITY: Write code
  SELECT_WHEN: coding_task
  COST: $15/1M tokens

AGENT: analyst
  CAPABILITY: Analyze data/situations
  SELECT_WHEN: analysis_needed
  COST: $15/1M tokens

AGENT: researcher
  CAPABILITY: Research topics
  SELECT_WHEN: research_task
  COST: $15/1M tokens

AGENT: tool_engineer
  CAPABILITY: Tool selection/design
  SELECT_WHEN: tooling_question
  COST: $15/1M tokens

AGENT: cam_specialist
  CAPABILITY: CAM programming
  SELECT_WHEN: cam_task
  COST: $15/1M tokens

AGENT: quality_engineer
  CAPABILITY: Quality processes
  SELECT_WHEN: quality_question
  COST: $15/1M tokens

AGENT: process_engineer
  CAPABILITY: Manufacturing processes
  SELECT_WHEN: process_optimization
  COST: $15/1M tokens

AGENT: machine_specialist
  CAPABILITY: Machine specifics
  SELECT_WHEN: machine_question
  COST: $15/1M tokens

AGENT: gcode_expert
  CAPABILITY: G-code generation/review
  SELECT_WHEN: gcode_task
  COST: $15/1M tokens

AGENT: monolith_navigator
  CAPABILITY: Navigate large codebases
  SELECT_WHEN: monolith_navigation
  COST: $15/1M tokens

AGENT: schema_designer
  CAPABILITY: Design data schemas
  SELECT_WHEN: schema_task
  COST: $15/1M tokens

AGENT: api_designer
  CAPABILITY: Design APIs
  SELECT_WHEN: api_design
  COST: $15/1M tokens

AGENT: completeness_auditor
  CAPABILITY: Check completeness
  SELECT_WHEN: completeness_check
  COST: $15/1M tokens

AGENT: regression_checker
  CAPABILITY: Check for regressions
  SELECT_WHEN: change_verification
  COST: $15/1M tokens

AGENT: test_generator
  CAPABILITY: Generate tests
  SELECT_WHEN: need_tests
  COST: $15/1M tokens

AGENT: code_reviewer
  CAPABILITY: Review code
  SELECT_WHEN: code_review
  COST: $15/1M tokens

AGENT: optimizer
  CAPABILITY: Optimize code/processes
  SELECT_WHEN: optimization_task
  COST: $15/1M tokens

AGENT: refactorer
  CAPABILITY: Refactor code
  SELECT_WHEN: refactoring_needed
  COST: $15/1M tokens

AGENT: security_auditor
  CAPABILITY: Security analysis
  SELECT_WHEN: security_check
  COST: $15/1M tokens

AGENT: documentation_writer
  CAPABILITY: Write documentation
  SELECT_WHEN: documentation_needed
  COST: $15/1M tokens

AGENT: thermal_calculator
  CAPABILITY: Thermal calculations
  SELECT_WHEN: thermal_analysis
  COST: $15/1M tokens

AGENT: force_calculator
  CAPABILITY: Force calculations
  SELECT_WHEN: force_analysis
  COST: $15/1M tokens

AGENT: estimator
  CAPABILITY: Estimation tasks
  SELECT_WHEN: estimation_needed
  COST: $15/1M tokens

AGENT: context_builder
  CAPABILITY: Build task context
  SELECT_WHEN: context_needed
  COST: $15/1M tokens

AGENT: cross_referencer
  CAPABILITY: Cross-reference sources
  SELECT_WHEN: verification_needed
  COST: $15/1M tokens

AGENT: pattern_matcher
  CAPABILITY: Find patterns
  SELECT_WHEN: pattern_recognition
  COST: $15/1M tokens

AGENT: quality_gate
  CAPABILITY: Enforce quality gates
  SELECT_WHEN: gate_check
  COST: $15/1M tokens

AGENT: session_continuity
  CAPABILITY: Maintain session state
  SELECT_WHEN: session_management
  COST: $15/1M tokens

AGENT: dependency_analyzer
  CAPABILITY: Analyze dependencies
  SELECT_WHEN: dependency_analysis
  COST: $15/1M tokens
```

## TIER 3: HAIKU AGENTS (8) - Fast Lookups

```
AGENT: state_manager
  CAPABILITY: State file operations
  SELECT_WHEN: state_operation
  COST: $1.25/1M tokens

AGENT: cutting_calculator
  CAPABILITY: Quick cutting calculations
  SELECT_WHEN: simple_cutting_calc
  COST: $1.25/1M tokens

AGENT: surface_calculator
  CAPABILITY: Surface finish calculations
  SELECT_WHEN: surface_calc
  COST: $1.25/1M tokens

AGENT: standards_expert
  CAPABILITY: Standards lookup
  SELECT_WHEN: standards_question
  COST: $1.25/1M tokens

AGENT: formula_lookup
  CAPABILITY: Formula retrieval
  SELECT_WHEN: formula_needed
  COST: $1.25/1M tokens

AGENT: material_lookup
  CAPABILITY: Material data retrieval
  SELECT_WHEN: material_data_needed
  COST: $1.25/1M tokens

AGENT: tool_lookup
  CAPABILITY: Tool data retrieval
  SELECT_WHEN: tool_data_needed
  COST: $1.25/1M tokens

AGENT: quick_validator
  CAPABILITY: Fast validation checks
  SELECT_WHEN: quick_validation
  COST: $1.25/1M tokens
```

# VERSION: 1.0.0
# MS-006/007 RALPH LOOP 1 COMPLETE
# NEXT: RALPH LOOP 2 (SCRUTINIZE & ENHANCE)

# ENHANCEMENTS

## ENHANCEMENT 1: SKILL SELECTION ALGORITHM

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// INTELLIGENT SKILL SELECTION
// ═══════════════════════════════════════════════════════════════════════════

interface SkillMatch {
  skill: string;
  score: number;
  reason: string;
}

function selectSkills(task: string, context: Context): SkillMatch[] {
  const matches: SkillMatch[] = [];
  
  // LEVEL 0: Always-on (auto-include)
  ALWAYS_ON_SKILLS.forEach(skill => {
    matches.push({skill, score: 1.0, reason: "Always-on"});
  });
  
  // LEVEL 2+: Score-based selection
  for (const [skill, config] of SKILL_CONFIGS) {
    let score = 0;
    let reasons: string[] = [];
    
    // Keyword matching (40%)
    const keywordScore = calculateKeywordMatch(task, config.keywords);
    score += keywordScore * 0.4;
    if (keywordScore > 0) reasons.push(`keywords: ${keywordScore.toFixed(2)}`);
    
    // Task fit (30%)
    const fitScore = calculateTaskFit(task, context, config.taskFit);
    score += fitScore * 0.3;
    if (fitScore > 0) reasons.push(`fit: ${fitScore.toFixed(2)}`);
    
    // Dependencies ready (20%)
    const depScore = checkDependencies(config.depends, context);
    score += depScore * 0.2;
    if (depScore < 1) reasons.push(`deps: ${depScore.toFixed(2)}`);
    
    // Resources available (10%)
    const resScore = checkResources(config.resources);
    score += resScore * 0.1;
    
    if (score > 0.5) {
      matches.push({
        skill,
        score,
        reason: reasons.join(", ")
      });
    }
  }
  
  // Sort by score, return top matches
  return matches.sort((a, b) => b.score - a.score);
}

function calculateKeywordMatch(task: string, keywords: string[]): number {
  const taskLower = task.toLowerCase();
  const matches = keywords.filter(kw => 
    new RegExp(kw, 'i').test(taskLower)
  );
  return matches.length / Math.max(keywords.length, 1);
}
```

## ENHANCEMENT 2: AGENT SELECTION ALGORITHM

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// INTELLIGENT AGENT SELECTION WITH BUDGET OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════

interface AgentSelection {
  agents: string[];
  totalCost: number;
  expectedQuality: number;
  costEfficiency: number;
}

function selectAgents(
  task: TaskAnalysis,
  budget: number,
  qualityTarget: number
): AgentSelection {
  
  const candidates: Array<{
    agent: string;
    score: number;
    cost: number;
    tier: 'opus' | 'sonnet' | 'haiku';
  }> = [];
  
  // Score all agents
  for (const [agent, config] of AGENT_CONFIGS) {
    const score = calculateAgentScore(agent, task, config);
    if (score > 0.3) {  // Minimum relevance threshold
      candidates.push({
        agent,
        score,
        cost: config.cost,
        tier: config.tier
      });
    }
  }
  
  // Optimize selection: Maximize quality within budget
  // Using greedy approach with cost-efficiency ratio
  candidates.sort((a, b) => (b.score / b.cost) - (a.score / a.cost));
  
  const selected: string[] = [];
  let totalCost = 0;
  let totalScore = 0;
  
  for (const candidate of candidates) {
    if (totalCost + candidate.cost <= budget) {
      selected.push(candidate.agent);
      totalCost += candidate.cost;
      totalScore += candidate.score;
    }
  }
  
  return {
    agents: selected,
    totalCost,
    expectedQuality: totalScore / selected.length,
    costEfficiency: totalScore / totalCost
  };
}

// COST TIERS
const AGENT_COSTS = {
  opus: 75,    // $/1M tokens
  sonnet: 15,  // $/1M tokens
  haiku: 1.25  // $/1M tokens
};

// ESTIMATED TOKENS PER TASK TYPE
const TASK_TOKENS = {
  simple: 1000,
  medium: 5000,
  complex: 20000,
  research: 50000
};

function estimateCost(agents: string[], taskType: string): number {
  const tokens = TASK_TOKENS[taskType] || 5000;
  return agents.reduce((total, agent) => {
    const tier = AGENT_CONFIGS.get(agent)?.tier || 'sonnet';
    return total + (AGENT_COSTS[tier] * tokens / 1000000);
  }, 0);
}
```

## ENHANCEMENT 3: RALPH LOOP INTEGRATION

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// RALPH LOOP PROCESS OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════

interface RalphIteration {
  iteration: number;
  quality: number;
  improved: boolean;
  changes: string[];
}

async function runRalphLoop(
  task: string,
  maxIterations: number = 10,
  qualityThreshold: number = 0.95
): Promise<RalphResult> {
  
  const iterations: RalphIteration[] = [];
  let currentQuality = 0;
  let output: any = null;
  
  for (let i = 1; i <= maxIterations; i++) {
    // LOOP 1: Execute
    const result = await executeTask(task, output);
    
    // LOOP 2: Scrutinize
    const scrutiny = await scrutinizeResult(result);
    
    // LOOP 3: Enhance if needed
    if (scrutiny.quality < qualityThreshold && i < maxIterations) {
      output = await enhanceResult(result, scrutiny.gaps);
      iterations.push({
        iteration: i,
        quality: scrutiny.quality,
        improved: true,
        changes: scrutiny.gaps
      });
    } else {
      iterations.push({
        iteration: i,
        quality: scrutiny.quality,
        improved: false,
        changes: []
      });
      
      if (scrutiny.quality >= qualityThreshold) {
        return {
          success: true,
          finalQuality: scrutiny.quality,
          iterations,
          output: result
        };
      }
    }
    
    currentQuality = scrutiny.quality;
  }
  
  return {
    success: currentQuality >= qualityThreshold * 0.9, // 90% of target
    finalQuality: currentQuality,
    iterations,
    output
  };
}
```

## ENHANCEMENT 4: MANUFACTURING PROCESS EXAMPLES

```
MANUFACTURING SCENARIO 1: New Part Programming
────────────────────────────────────────────────────────────────────────────────

Task: "Create G-code for new aluminum pocket"

SKILLS ACTIVATED:
  ✓ prism-sp-brainstorm (score: 0.85) - "new" keyword
  ✓ prism-material-physics (score: 0.72) - material calculations
  ✓ prism-controller-quick-ref (score: 0.68) - G-code reference
  ✓ prism-safety-framework (score: 1.0) - always on

AGENTS SELECTED (Budget: $5):
  1. cam_specialist (SONNET, $15/1M) - Main programming
  2. materials_scientist (OPUS, $75/1M) - Cutting parameters
  3. gcode_expert (SONNET, $15/1M) - Code review
  4. safety_auditor (SONNET, $15/1M) - Safety check
  
  Estimated cost: $2.40 for 20K token task

PROCESS QUALITY TRACKING:
  skill_use: 4/4 = 1.0
  agent_use: 4/4 = 1.0
  workflow: Following SP.1 = 1.0
  checkpoint: At each phase = 1.0
  P(x) = 0.95 (Excellent)

────────────────────────────────────────────────────────────────────────────────

MANUFACTURING SCENARIO 2: Debugging Tool Breakage
────────────────────────────────────────────────────────────────────────────────

Task: "Tool keeps breaking on titanium part"

SKILLS ACTIVATED:
  ✓ prism-sp-debugging (score: 0.92) - "breaking" = error
  ✓ prism-root-cause-tracing (score: 0.88) - need root cause
  ✓ prism-material-physics (score: 0.75) - titanium physics
  ✓ prism-safety-framework (score: 1.0) - CRITICAL for breakage

AGENTS SELECTED (Budget: $10):
  1. root_cause_analyst (OPUS) - Deep investigation
  2. machinist (OPUS) - Practical experience
  3. materials_scientist (OPUS) - Material behavior
  4. tool_engineer (SONNET) - Tool selection
  
  Estimated cost: $7.50 for 30K token investigation

RALPH LOOP EXECUTION:
  Iteration 1: Quality 0.60 - Found symptom, not cause
  Iteration 2: Quality 0.75 - Identified heat issue
  Iteration 3: Quality 0.92 - Root cause: inadequate coolant pressure
  
  Final recommendation: Increase coolant pressure from 300 to 800 PSI
```

## ENHANCEMENT 5: PROCESS OPTIMIZATION METRICS

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// REAL-TIME PROCESS MONITORING
// ═══════════════════════════════════════════════════════════════════════════

interface ProcessMetrics {
  skill_use: number;
  agent_use: number;
  workflow: number;
  checkpoint: number;
  recovery: number;
  efficiency: number;
  verification: number;
  safety_compliance: number;
  throughput: number;
  completeness: number;
  learning: number;
  P_score: number;
}

function computeProcessMetrics(session: SessionData): ProcessMetrics {
  const metrics: ProcessMetrics = {
    // Skill utilization
    skill_use: session.skills_used.length / session.skills_relevant.length,
    
    // Agent utilization
    agent_use: session.agents_deployed.length / session.agents_optimal.length,
    
    // Workflow compliance
    workflow: session.phases_completed / session.phases_required,
    
    // Checkpoint compliance
    checkpoint: session.checkpoints_made / session.checkpoints_required,
    
    // Recovery success
    recovery: session.successful_recoveries / Math.max(session.failure_events, 1),
    
    // Efficiency
    efficiency: (session.quality * session.completeness) / session.resource_cost,
    
    // Verification level
    verification: session.evidence_levels.reduce((a,b) => a+b, 0) / 
                  (session.claims.length * 5),
    
    // Safety compliance
    safety_compliance: session.safety_checks_passed / session.safety_checks_required,
    
    // Throughput
    throughput: session.tasks_completed / session.time_hours,
    
    // Completeness
    completeness: session.deliverables_complete / session.deliverables_required,
    
    // Learning value
    learning: session.patterns_extracted * session.retention * session.transfer,
    
    // Overall P(x)
    P_score: 0  // Computed below
  };
  
  // Geometric mean for P(x)
  const values = Object.values(metrics).filter(v => v !== metrics.P_score);
  metrics.P_score = geometricMean(values);
  
  return metrics;
}

function geometricMean(values: number[]): number {
  const logSum = values.reduce((sum, v) => sum + Math.log(Math.max(v, 1e-10)), 0);
  return Math.exp(logSum / values.length);
}
```

# VERSION: 1.1.0 (Enhanced)
# MS-006/007 RALPH LOOP 2 COMPLETE ✅
