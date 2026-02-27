---
name: prism-skill-orchestrator
description: |
  Master integration skill for 37 PRISM skills and 56 API agents.
---

```
prism-cognitive-core           (NEW - 5 cognitive patterns)
prism-life-safety-mindset      (safety enforcement)
prism-maximum-completeness     (100% completion)
prism-anti-regression          (anti-loss protection)
prism-predictive-thinking      (N-step lookahead)
prism-mandatory-microsession   (chunk work)
prism-uncertainty-propagation  (±uncertainty)
prism-mathematical-planning    (MATHPLAN gate)
```

## Level 1: Cognitive Framework (6 skills) - Load for Deep Analysis

```
prism-universal-formulas       (109 formulas, 20 domains)
prism-reasoning-engine         (R(x), 12 metrics)
prism-code-perfection          (C(x), 11 metrics)
prism-process-optimizer        (P(x), 39 skills, 57 agents)
prism-safety-framework         (S(x), 7 FM, 7 DL)
prism-master-equation          (Ω(x) integration)
```

## Level 2: SP Workflow (8 skills)

```
prism-sp-brainstorm            (Socratic design)
prism-sp-planning              (task decomposition)
prism-sp-execution             (checkpoint execution)
prism-sp-review-spec           (spec compliance)
prism-sp-review-quality        (code quality)
prism-sp-debugging             (4-phase debugging)
prism-sp-verification          (evidence levels)
prism-sp-handoff               (session transition)
```

## Level 3: Domain Masters (12 skills)

```
prism-session-master           (consolidates 8)
prism-quality-master           (consolidates 5)
prism-code-master              (consolidates 6)
prism-knowledge-master         (consolidates 3)
prism-expert-master            (consolidates 10)
prism-controller-quick-ref     (navigation for 4)
prism-dev-utilities            (consolidates 8)
prism-monolith-index           (831 modules map)
prism-monolith-extractor       (extraction protocols)
prism-monolith-navigator       (search strategies)
prism-extraction-orchestrator  (campaign coordination)
prism-ai-ml-master             (27 AI/ML modules)
```

## Level 4: AI/ML Skills (5 skills)

```
prism-ai-optimization          (PSO, GA, SA, DE - 6 modules)
prism-ai-deep-learning         (NN, LSTM, Transformer - 4 modules)
prism-ai-reinforcement         (Q-Learning, DQN - 2 modules)
prism-ai-bayesian              (Bayesian systems - 3 modules)
prism-aiml-engine-patterns     (algorithm templates)
```

## Level 5: Materials System (5 skills)

```
prism-material-schema          (127 parameters)
prism-material-physics         (6 physics models)
prism-material-lookup          (13 access methods)
prism-material-validator       (4-level validation)
prism-material-enhancer        (7-tier sources)
```

## Level 6: Expert Roles (10 skills)

```
prism-expert-master-machinist  prism-expert-materials-scientist
prism-expert-cam-programmer    prism-expert-post-processor
prism-expert-cad-expert        prism-expert-mechanical-engineer
prism-expert-quality-control   prism-expert-thermodynamics
prism-expert-quality-manager   prism-expert-mathematics
```

## Level 7: Reference Skills (10 skills)

```
prism-api-contracts            prism-error-catalog
prism-manufacturing-tables     prism-wiring-templates
prism-product-calculators      prism-post-processor-reference
prism-fanuc-programming        prism-siemens-programming
prism-heidenhain-programming   prism-gcode-reference
```

## Level 8: Utilities & Support (11 skills)

```
prism-swarm-extraction         prism-module-builder
prism-coding-patterns          prism-algorithm-selector
prism-dependency-graph         prism-large-file-writer
prism-unit-converter           prism-tool-selector
prism-validator                prism-tdd
prism-debugging
```

# ═══════════════════════════════════════════════════════════════════════════════
# SKILL LOADING PROTOCOL
# ═══════════════════════════════════════════════════════════════════════════════

## Automatic Loading Order

```
STEP 1: L0 ALWAYS-ON (automatic, cannot skip)
  ├── prism-cognitive-core          ← NEW: 5 cognitive patterns
  ├── prism-life-safety-mindset
  ├── prism-maximum-completeness
  ├── prism-anti-regression
  ├── prism-predictive-thinking
  ├── prism-mandatory-microsession
  ├── prism-uncertainty-propagation
  └── prism-mathematical-planning

STEP 2: WORKFLOW SKILLS (based on phase)
  ├── brainstorm → prism-sp-brainstorm
  ├── planning   → prism-sp-planning
  ├── execution  → prism-sp-execution
  ├── review     → prism-sp-review-spec, prism-sp-review-quality
  ├── debugging  → prism-sp-debugging
  ├── verify     → prism-sp-verification
  └── handoff    → prism-sp-handoff

STEP 3: DOMAIN SKILLS (based on task type)
  ├── materials  → prism-material-*, prism-expert-materials-scientist
  ├── extraction → prism-monolith-*, prism-extraction-orchestrator
  ├── ai/ml      → prism-ai-ml-master, prism-ai-*
  ├── coding     → prism-code-master, prism-coding-patterns
  ├── g-code     → prism-controller-quick-ref, prism-*-programming
  └── quality    → prism-quality-master, prism-validator

STEP 4: COGNITIVE DEEP DIVE (when needed)
  ├── reasoning analysis → prism-reasoning-engine
  ├── code quality deep  → prism-code-perfection
  ├── process optimize   → prism-process-optimizer
  ├── safety analysis    → prism-safety-framework
  └── compute Ω(x)       → prism-master-equation
```

# ═══════════════════════════════════════════════════════════════════════════════
# COGNITIVE WIRING TO ALL WORKFLOWS
# ═══════════════════════════════════════════════════════════════════════════════

## SP.1 Workflow Enhancement

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SKILL                 │ COGNITIVE ENHANCEMENT APPLIED                       │
├───────────────────────┼─────────────────────────────────────────────────────┤
│ prism-sp-brainstorm   │ BAYESIAN: Weight evidence for design decisions     │
│                       │ MULTI-OBJ: Present Pareto-optimal design options   │
│                       │ OPTIMIZATION: Explore multiple approaches          │
├───────────────────────┼─────────────────────────────────────────────────────┤
│ prism-sp-planning     │ BAYESIAN: Estimate complexity with uncertainty     │
│                       │ OPTIMIZATION: Optimize task sequence               │
│                       │ GRADIENT: Prioritize highest-value tasks first     │
├───────────────────────┼─────────────────────────────────────────────────────┤
│ prism-sp-execution    │ OPTIMIZATION: Iterate, don't accept first draft    │
│                       │ GRADIENT: Focus on highest-impact improvements     │
│                       │ RL: Track what approaches work                     │
├───────────────────────┼─────────────────────────────────────────────────────┤
│ prism-sp-review-spec  │ BAYESIAN: Confidence in spec compliance            │
│                       │ MULTI-OBJ: Balance coverage vs depth               │
├───────────────────────┼─────────────────────────────────────────────────────┤
│ prism-sp-review-quality│ MULTI-OBJ: Balance multiple quality dimensions    │
│                       │ GRADIENT: Fix highest-impact issues first          │
├───────────────────────┼─────────────────────────────────────────────────────┤
│ prism-sp-debugging    │ BAYESIAN: P(cause | symptoms) - update with tests  │
│                       │ GRADIENT: Binary search toward root cause          │
│                       │ RL: Learn from debugging patterns                  │
├───────────────────────┼─────────────────────────────────────────────────────┤
│ prism-sp-verification │ BAYESIAN: Evidence-based confidence levels         │
│                       │ MULTI-OBJ: Coverage vs depth of verification       │
├───────────────────────┼─────────────────────────────────────────────────────┤
│ prism-sp-handoff      │ RL: Extract session learnings for next time        │
│                       │ BAYESIAN: Confidence in continuation success       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## AI/ML Skill Enhancement

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SKILL                   │ COGNITIVE ENHANCEMENT                             │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ prism-ai-optimization   │ META: Apply optimization to optimization itself  │
│                         │ GRADIENT: Choose algorithm by problem gradient    │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ prism-ai-deep-learning  │ BAYESIAN: Uncertainty in predictions              │
│                         │ OPTIMIZATION: Architecture search                 │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ prism-ai-reinforcement  │ RL: Meta-learning from RL applications           │
│                         │ OPTIMIZATION: Explore-exploit in algorithm choice│
├─────────────────────────┼───────────────────────────────────────────────────┤
│ prism-ai-bayesian       │ BAYESIAN: Full probabilistic reasoning           │
│                         │ UNCERTAINTY: Proper propagation                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

# ═══════════════════════════════════════════════════════════════════════════════
# STATISTICS v6.0
# ═══════════════════════════════════════════════════════════════════════════════

```
TOTAL SKILLS:           75 (was 68 in v5.0)
  L0 Always-On:          8 (+1 cognitive-core)
  L1 Cognitive:          6 (formulas, R, C, P, S, Ω)
  L2 Workflow:           8 (SP skills)
  L3 Domain Masters:    12
  L4 AI/ML:              5
  L5 Materials:          5
  L6 Expert Roles:      10
  L7 Reference:         10
  L8 Utilities:         11

TOTAL AGENTS:           64 (+2 cognitive agents)
  OPUS:                 18
  SONNET:               28
  HAIKU:                18

TOTAL HOOKS:           162 (was 147, +15 cognitive)

COGNITIVE PATTERNS:      5 (always active)
AI/ML MODULES:          27 (covered by skills)
FORMULAS:               22
```

**v6.0 | 2026-01-30 | 75 Skills | 64 Agents | 162 Hooks | COGNITIVE ENHANCEMENT ACTIVE**
