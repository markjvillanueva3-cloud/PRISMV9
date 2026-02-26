---
name: prism-cognitive-core
version: 9.0.0
level: L0
description: |
  Unified cognitive enhancement: core thinking patterns, reasoning metrics (R(x)),
  predictive thinking, and branch prediction. Hook-first architecture.
  Consolidates: cognitive-core v8, reasoning-engine, predictive-thinking, branch-predictor.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "cognitive", "core", "unified", "enhancement", "thinking", "patterns", "reasoning"
- Hook configuration, event management, or cadence function setup needed.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-cognitive-core")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_hook→list/get/execute for hook operations
   - prism_skill_script→skill_content(id="prism-cognitive-core") for hook reference
   - prism_nl_hook→create for natural language hook authoring

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Reference knowledge applicable to current task
- **Failure**: Content not found → verify skill exists in index

### Examples
**Example 1**: User asks about cognitive
→ Load skill: skill_content("prism-cognitive-core") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires core guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM Cognitive Core v9.0
## Unified Thinking Framework | L0 Always-On | Hook-First

## R(x) Reasoning Metrics (12 Dimensions)

| # | Metric | Weight | Measures |
|---|--------|--------|----------|
| 1 | Logical validity | 0.12 | Conclusions follow from premises |
| 2 | Evidence grounding | 0.12 | Claims backed by data/formulas |
| 3 | Completeness | 0.10 | All relevant factors considered |
| 4 | Consistency | 0.08 | No contradictions in reasoning chain |
| 5 | Precision | 0.08 | Specific over vague, quantified over qualitative |
| 6 | Uncertainty awareness | 0.10 | Known unknowns acknowledged, propagated |
| 7 | Alternative consideration | 0.08 | Other approaches examined |
| 8 | Assumption transparency | 0.08 | Hidden assumptions surfaced |
| 9 | Causal correctness | 0.06 | Cause-effect not confused with correlation |
| 10 | Boundary awareness | 0.06 | Valid range of conclusions stated |
| 11 | Step traceability | 0.06 | Each step can be verified independently |
| 12 | Falsifiability | 0.06 | What would prove this wrong? |

**R(x) = Σ(metric_i × weight_i)** — Target: R(x) ≥ 0.75

## Cognitive Patterns (Hook-First)

### Pattern 1: Challenge First
Before accepting ANY calculation result or recommendation:
1. What assumptions are we making?
2. What's the uncertainty range?
3. What would make this wrong?
4. Is there a simpler/better approach?

### Pattern 2: Evidence Over Intuition
- L1: Textbook/handbook values → cite source
- L2: Empirical data from shop floor → cite test conditions
- L3: Physics-based calculation → show work
- L4: Expert consensus → note disagreements
- L5: Estimation/interpolation → state confidence and method

### Pattern 3: Think N Steps Ahead
For every decision, ask "And then what?" at least 3 times:
```
Decision: Increase cutting speed 20%
→ Then what? Tool temperature rises ~15%
  → Then what? Tool life drops ~30% (Taylor equation)
    → Then what? More tool changes, downtime may exceed time saved
      → Conclusion: Only beneficial if current tool life >2 hours
```

## Predictive Thinking Framework

### Before Every Action
| Question | Purpose |
|----------|---------|
| What are the likely outcomes? | Map possibility space |
| What could go wrong? | Risk identification |
| What are the edge cases? | Boundary testing |
| What resources will be consumed? | Budget/token planning |
| What's the impact on downstream tasks? | Dependency analysis |

### Prediction Accuracy Tracking
After predictions, compare with outcomes:
- Calibrated: predicted 80% confidence, correct ~80% of time
- Overconfident: predicted 90%, correct only 60% → widen uncertainty
- Underconfident: predicted 50%, correct 90% → tighten bounds

## Branch Prediction (Decision Analysis)

### Decision Tree Protocol
```
For each decision point:
├── Option A: [describe]
│   ├── Probability: [estimate]
│   ├── Upside: [best case]
│   ├── Downside: [worst case]
│   └── Reversibility: [easy/hard/impossible]
├── Option B: [describe]
│   └── [same analysis]
└── Recommendation: [with reasoning]
```

### Manufacturing Decision Rules
| Factor | Bias Toward |
|--------|------------|
| Safety involved | Conservative option, always |
| Reversible choice | Try faster/cheaper option first |
| Irreversible choice | More analysis before committing |
| Time pressure | Proven approach over novel |
| Learning opportunity | Novel approach if safe to experiment |

## Hook Integration
All cognitive operations fire hooks automatically:
- `cognitive:preReason` — before reasoning chain starts
- `cognitive:postReason` — after conclusion, before output
- `cognitive:anomalyDetected` — when prediction vs. reality diverges
- Hooks enforce minimum R(x) score before output proceeds
