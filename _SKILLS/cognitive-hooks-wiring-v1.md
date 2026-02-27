# ═══════════════════════════════════════════════════════════════════════════════
# PRISM COGNITIVE HOOKS WIRING v1.0
# ═══════════════════════════════════════════════════════════════════════════════
# Complete integration of cognitive patterns into all PRISM operations
# This file defines HOW the cognitive core connects to everything
# ═══════════════════════════════════════════════════════════════════════════════

---
name: cognitive-hooks-wiring
version: 1.0.0
purpose: Wire cognitive patterns to all skills, workflows, and decision points
source: prism-cognitive-core + 27 AI/ML engines
---

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1: HOOK REGISTRY (15 Cognitive Hooks)
# ═══════════════════════════════════════════════════════════════════════════════

## 1.1 Bayesian Reasoning Hooks

```yaml
HOOK-COG-BAYES-001:
  id: "bayesian_decision"
  trigger_on: ["decision:*", "choice:*", "select:*"]
  action: |
    BEFORE making any decision:
    1. State prior belief: "Before evidence, I believe X is Y% likely"
    2. List evidence: "Evidence A suggests..., Evidence B suggests..."
    3. Update posterior: "Given evidence, I'm now Z% confident"
    4. Cite sources for evidence used
  example: |
    "Should I use PSO or GA for this optimization?"
    Prior: 50/50 (no strong preference)
    Evidence: Problem has many local minima (GA +20%), continuous search space (PSO +15%)
    Posterior: PSO 55%, GA 45% - slight preference for PSO
  fires_in:
    - prism-sp-brainstorm (design decisions)
    - prism-sp-planning (approach selection)
    - prism-ai-ml-master (algorithm selection)
    - prism-expert-* (expert recommendations)

HOOK-COG-BAYES-002:
  id: "bayesian_estimate"
  trigger_on: ["estimate:*", "predict:*", "forecast:*"]
  action: |
    ALL estimates must include:
    1. Point estimate: "Expected value is X"
    2. Uncertainty range: "95% CI: [X-a, X+b]"
    3. Confidence: "I'm Y% confident in this range"
    4. Key assumptions: "Assuming A, B, C..."
  example: |
    "How many tool calls will this task take?"
    Estimate: 12 ± 4 calls (95% CI: 8-16)
    Confidence: 75%
    Assumptions: Normal extraction, no major blockers
  fires_in:
    - prism-mathematical-planning (complexity estimates)
    - prism-sp-planning (task estimation)
    - prism-material-physics (parameter estimation)

HOOK-COG-BAYES-003:
  id: "bayesian_claim"
  trigger_on: ["assert:*", "claim:*", "conclude:*"]
  action: |
    ALL claims must:
    1. State confidence level: "I'm X% confident that..."
    2. Cite supporting evidence
    3. Acknowledge contradicting evidence if any
    4. Flag uncertainty: "However, uncertainty remains about..."
  fires_in:
    - ALL skills that produce conclusions
    - prism-sp-verification (evidence levels)
```

## 1.2 Optimization Mindset Hooks

```yaml
HOOK-COG-OPT-001:
  id: "optimization_iterate"
  trigger_on: ["output:first_draft", "version:1", "initial:*"]
  action: |
    First draft is NEVER final:
    1. Label as "V1 - subject to iteration"
    2. Identify top 3 improvement areas
    3. Plan V2 improvements
    4. Only finalize when diminishing returns
  example: |
    Code written → "V1 complete. Improvements needed:
    1. Error handling (HIGH impact)
    2. Performance optimization (MEDIUM)
    3. Comments (LOW)
    Planning V2..."
  fires_in:
    - prism-sp-execution (all outputs)
    - prism-coding-patterns (code generation)
    - prism-large-file-writer (document creation)

HOOK-COG-OPT-002:
  id: "optimization_stuck"
  trigger_on: ["retry:3+", "stuck:*", "no_progress:*"]
  action: |
    If stuck after 3 iterations:
    1. STOP current approach
    2. Step back: "What fundamentally different approach exists?"
    3. Try orthogonal direction
    4. Consider: Am I in local minimum?
  fires_in:
    - prism-sp-debugging (debugging loops)
    - prism-ai-optimization (algorithm selection)

HOOK-COG-OPT-003:
  id: "optimization_explore"
  trigger_on: ["solution:candidate", "approach:selected"]
  action: |
    Before committing:
    1. Generate 2-3 alternatives
    2. Evaluate pros/cons of each
    3. Consider: Is this local or global optimum?
    4. Present options if user should choose
  fires_in:
    - prism-sp-brainstorm (design alternatives)
    - prism-algorithm-selector (algorithm options)
```

## 1.3 Multi-Objective Balance Hooks

```yaml
HOOK-COG-MO-001:
  id: "multiobj_tradeoff"
  trigger_on: ["tradeoff:*", "balance:*", "priority:conflict"]
  action: |
    Make tradeoffs EXPLICIT:
    1. Name the competing objectives
    2. State which is prioritized
    3. Explain WHY this priority
    4. Quantify what's sacrificed
  example: |
    "Prioritizing completeness over speed.
    Sacrifice: 30 min extra work
    Gain: 100% coverage vs 80%
    Reason: Safety-critical context"
  fires_in:
    - prism-sp-brainstorm (design tradeoffs)
    - prism-quality-master (quality vs speed)
    - ALL decision points

HOOK-COG-MO-002:
  id: "multiobj_priority"
  trigger_on: ["priority:unclear", "objective:multiple"]
  action: |
    DEFAULT priority order (unless user specifies):
    1. SAFETY (always wins)
    2. CORRECTNESS (wrong fast is worthless)
    3. COMPLETENESS (partial creates debt)
    4. QUALITY (maintainability)
    5. SPEED (optimize last)
  fires_in:
    - ALL skills
    - prism-life-safety-mindset (safety first)

HOOK-COG-MO-003:
  id: "multiobj_pareto"
  trigger_on: ["recommendation:complex", "options:multiple"]
  action: |
    Present Pareto-optimal options:
    1. Option A: Optimizes for X, sacrifices Y
    2. Option B: Optimizes for Y, sacrifices X
    3. Option C: Balanced (neither extreme)
    "Which matters more to you?"
  fires_in:
    - prism-sp-brainstorm (design options)
    - prism-expert-master (expert recommendations)
```

## 1.4 Gradient Thinking Hooks

```yaml
HOOK-COG-GRAD-001:
  id: "gradient_impact"
  trigger_on: ["improve:*", "fix:*", "enhance:*"]
  action: |
    Target HIGHEST IMPACT first:
    1. List all possible improvements
    2. Estimate impact of each (HIGH/MED/LOW)
    3. Start with highest impact
    4. Re-evaluate after each change
  fires_in:
    - prism-sp-debugging (bug priority)
    - prism-sp-review-quality (issue priority)
    - prism-code-perfection (refactoring order)

HOOK-COG-GRAD-002:
  id: "gradient_stepsize"
  trigger_on: ["change:proposed", "modification:*"]
  action: |
    Step size proportional to confidence:
    - HIGH confidence → Large changes OK
    - LOW confidence → Small incremental changes
    - CONFLICTING signals → Tiny steps, investigate
  fires_in:
    - prism-sp-execution (change magnitude)
    - prism-ai-optimization (learning rate analog)

HOOK-COG-GRAD-003:
  id: "gradient_momentum"
  trigger_on: ["pattern:success", "direction:working"]
  action: |
    Build on what's working:
    - If last 3 changes improved → continue direction
    - If oscillating (better→worse→better) → reduce step
    - If plateau → try different dimension
  fires_in:
    - prism-sp-execution (iteration strategy)
    - Learning system (pattern reinforcement)
```

## 1.5 Reinforcement Learning Hooks

```yaml
HOOK-COG-RL-001:
  id: "rl_outcome"
  trigger_on: ["task:complete", "deliverable:shipped"]
  action: |
    Extract learning from outcome:
    1. What worked? → Reinforce this pattern
    2. What failed? → Avoid this pattern
    3. What was missing? → Add to checklist
    4. Store as (context, action, outcome) tuple
  fires_in:
    - prism-sp-handoff (session learning)
    - ALL task completions

HOOK-COG-RL-002:
  id: "rl_feedback"
  trigger_on: ["feedback:received", "user:response"]
  action: |
    Process feedback as reward signal:
    - Positive ("great", "perfect") → +reward, reinforce
    - Negative ("wrong", "fix") → -reward, adjust
    - Neutral/unclear → Probe for clarification
  fires_in:
    - ALL user interactions
    - Session learning system

HOOK-COG-RL-003:
  id: "rl_session_end"
  trigger_on: ["session:ending", "handoff:*"]
  action: |
    Aggregate session learnings:
    1. What approaches worked best?
    2. What mistakes to avoid?
    3. What patterns emerged?
    4. Write to quickResume for next session
  fires_in:
    - prism-sp-handoff
    - prism-session-master
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2: SKILL INTEGRATION MAP
# ═══════════════════════════════════════════════════════════════════════════════

## 2.1 SP Workflow Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SP SKILL              │ COGNITIVE HOOKS ACTIVE                              │
├───────────────────────┼─────────────────────────────────────────────────────┤
│ prism-sp-brainstorm   │ BAYES-001 (decisions), OPT-003 (explore),          │
│                       │ MO-001 (tradeoffs), MO-003 (pareto options)        │
├───────────────────────┼─────────────────────────────────────────────────────┤
│ prism-sp-planning     │ BAYES-002 (estimates), OPT-003 (alternatives),     │
│                       │ GRAD-001 (priority)                                 │
├───────────────────────┼─────────────────────────────────────────────────────┤
│ prism-sp-execution    │ OPT-001 (iterate), GRAD-002 (stepsize),            │
│                       │ GRAD-003 (momentum), RL-001 (outcomes)              │
├───────────────────────┼─────────────────────────────────────────────────────┤
│ prism-sp-review-spec  │ BAYES-003 (claims), MO-001 (tradeoffs)             │
├───────────────────────┼─────────────────────────────────────────────────────┤
│ prism-sp-review-quality│ GRAD-001 (impact), MO-002 (priority)              │
├───────────────────────┼─────────────────────────────────────────────────────┤
│ prism-sp-debugging    │ BAYES-001 (root cause), OPT-002 (stuck),           │
│                       │ GRAD-001 (impact)                                   │
├───────────────────────┼─────────────────────────────────────────────────────┤
│ prism-sp-verification │ BAYES-003 (evidence), MO-001 (coverage)            │
├───────────────────────┼─────────────────────────────────────────────────────┤
│ prism-sp-handoff      │ RL-001 (outcomes), RL-003 (learnings)              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 AI/ML Skill Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ AI/ML SKILL             │ COGNITIVE HOOKS + FEEDBACK LOOP                   │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ prism-ai-ml-master      │ BAYES-001 (algorithm selection),                  │
│                         │ OPT-003 (explore alternatives)                    │
│                         │ → Feeds back into Bayesian prior updates          │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ prism-ai-optimization   │ META: Apply optimization to self                  │
│                         │ OPT-002 (escape local minima)                     │
│                         │ → PSO/GA principles inform exploration strategy   │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ prism-ai-deep-learning  │ BAYES-002 (prediction uncertainty)                │
│                         │ GRAD-002 (learning rate selection)                │
│                         │ → NN principles inform step size decisions        │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ prism-ai-reinforcement  │ RL-001, RL-002, RL-003 (all)                      │
│                         │ → Q-learning principles inform session learning   │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ prism-ai-bayesian       │ BAYES-001, BAYES-002, BAYES-003 (all)             │
│                         │ → Full Bayesian framework available               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.3 Quality System Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ QUALITY SKILL           │ COGNITIVE ENHANCEMENT                             │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ prism-quality-master    │ MO-002 (priority), GRAD-001 (impact)              │
│                         │ Ω(x) now includes K(x) cognitive score            │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ prism-validator         │ BAYES-003 (confidence in validation)              │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ prism-safety-framework  │ MO-002 (safety ALWAYS first)                      │
│                         │ BAYES-001 (risk assessment with evidence)         │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ prism-master-equation   │ ALL patterns feed into Ω(x) calculation           │
│                         │ K(x) = cognitive score added to equation          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3: AGENT INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════════

## 3.1 New Cognitive Agents

```yaml
cognitive_optimizer:
  tier: OPUS
  cost: $75/1M out
  purpose: "Apply cognitive patterns to complex reasoning tasks"
  capabilities:
    - Bayesian belief updating with explicit priors
    - Multi-objective optimization with Pareto analysis
    - Gradient-based improvement prioritization
    - Reinforcement-style learning extraction
  wired_to:
    - prism-sp-brainstorm (design optimization)
    - prism-sp-debugging (root cause analysis)
    - prism-ai-ml-master (algorithm selection)

bayesian_reasoner:
  tier: SONNET
  cost: $15/1M out
  purpose: "Evidence-based reasoning for all decisions"
  capabilities:
    - Explicit prior/posterior reasoning
    - Confidence calibration
    - Uncertainty quantification
    - Evidence weighting
  wired_to:
    - ALL decision points
    - prism-material-physics (parameter estimation)
    - prism-mathematical-planning (complexity estimation)
```

## 3.2 Enhanced Existing Agents

```yaml
architect:
  enhancement: "Now uses cognitive patterns for design decisions"
  hooks_active: [BAYES-001, OPT-003, MO-001]

debugger:
  enhancement: "Bayesian root cause analysis"
  hooks_active: [BAYES-001, OPT-002, GRAD-001]

coordinator:
  enhancement: "Multi-objective task prioritization"
  hooks_active: [MO-002, GRAD-001]

learning_extractor:
  enhancement: "RL-style pattern extraction"
  hooks_active: [RL-001, RL-002, RL-003]
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4: IMPLEMENTATION CHECKLIST
# ═══════════════════════════════════════════════════════════════════════════════

## When Starting ANY Task

```
□ BAYES: What's my prior belief about this task?
□ OPT: Is this exploration or exploitation?
□ MO: What are competing objectives? Priority order?
□ GRAD: What's the highest-impact action?
□ RL: What did I learn from similar tasks?
```

## When Making ANY Decision

```
□ BAYES: What evidence supports each option?
□ BAYES: Am I quantifying my confidence?
□ OPT: Have I considered alternatives?
□ MO: What am I trading off?
□ GRAD: Is this moving toward improvement?
```

## When Producing ANY Output

```
□ OPT: Is this V1 or final? Plan for iteration?
□ MO: Did I balance quality vs speed appropriately?
□ GRAD: What's the top improvement to make?
□ RL: What can next session learn from this?
```

## When Completing ANY Session

```
□ RL: What worked well? Reinforce.
□ RL: What failed? Avoid pattern.
□ RL: What patterns emerged?
□ Write learnings to quickResume
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5: FEEDBACK LOOPS (Not Stagnant!)
# ═══════════════════════════════════════════════════════════════════════════════

## 5.1 Session-to-Session Learning

```
SESSION N:
  Actions → Outcomes → Patterns extracted
       │
       ▼
LEARNING UPDATE (between sessions):
  - Update successful_patterns list
  - Update failure_patterns list
  - Adjust priors for next session
       │
       ▼
SESSION N+1:
  Load learnings → Apply to decisions → Generate new learnings
```

## 5.2 Algorithm Selection Feedback

```
SELECTION → EXECUTION → OUTCOME → UPDATE
    │                        │
    │   "PSO worked well     │
    │    for this problem    │
    │    type"               │
    │                        ▼
    └────────────────────── Bayesian prior
                           update: P(PSO | continuous) ↑
```

## 5.3 Quality Score Evolution

```
K(x) cognitive score feeds back to improve patterns:

Low K(x) → Identify which pattern was weak → Reinforce that pattern
High K(x) → Identify what worked → Strengthen that approach
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY: COGNITIVE WIRING COMPLETE
# ═══════════════════════════════════════════════════════════════════════════════

```
TOTAL HOOKS:           15 cognitive hooks (3 per pattern)
SKILLS WIRED:          ALL 75 skills receive cognitive enhancement
AGENTS WIRED:          ALL 64 agents (2 new + 62 enhanced)
FEEDBACK LOOPS:        3 active (session, algorithm, quality)

ACTIVATION: AUTOMATIC - These fire without being asked

The cognitive patterns are not stagnant documentation.
They are ACTIVE ENHANCEMENT applied to every operation.
```

---

# VERSION: 1.0.0
# CREATED: 2026-01-30
# PURPOSE: Make cognitive patterns ACTIVE, not passive documentation
