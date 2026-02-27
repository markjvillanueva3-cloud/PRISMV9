---
name: prism-cognitive-core
description: |
  Level 0 Always-On cognitive enhancement with 5 AI/ML patterns and 30 hooks. v2.0 includes 10 components for Omega(x) computation.
---

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ UPDATE BELIEFS WITH EVIDENCE - NEVER GUESS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  P(H|E) = P(E|H) × P(H) / P(E)                                              │
│                                                                             │
│  APPLICATION:                                                                │
│  1. START WITH PRIOR: What do I believe before looking? (0-100%)            │
│  2. GATHER EVIDENCE: What data supports/contradicts?                        │
│  3. UPDATE BELIEF: New confidence = f(prior, evidence strength)             │
│  4. QUANTIFY: "I'm X% confident because Y, Z evidence"                      │
│                                                                             │
│  HOOKS: BAYES-001 (initialize), BAYES-002 (update), BAYES-003 (decide)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## PATTERN 2: OPTIMIZATION MINDSET
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ EXPLORE → EXPLOIT → ITERATE → IMPROVE                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  THREE TENSIONS:                                                             │
│  1. EXPLORE vs EXPLOIT: 20% explore, 80% exploit (adjust by context)        │
│  2. LOCAL vs GLOBAL: If stuck >3 iterations, try different approach         │
│  3. GREEDY vs LONG-TERM: Discount future by ~10% per uncertainty step      │
│                                                                             │
│  ITERATION: Create → Evaluate → Improve → Repeat                            │
│                                                                             │
│  HOOKS: OPT-001 (objective), OPT-002 (constraint), OPT-003 (verify)        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## PATTERN 3: MULTI-OBJECTIVE BALANCE
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ EVERYTHING IS A TRADEOFF - MAKE THEM EXPLICIT                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  COMPETING OBJECTIVES:                                                       │
│  SPEED ←→ QUALITY | SAFETY ←→ INNOVATION | COMPLETENESS ←→ SIMPLICITY      │
│                                                                             │
│  DEFAULT PRIORITY: SAFETY > CORRECTNESS > COMPLETENESS > QUALITY > SPEED   │
│                                                                             │
│  PARETO: Present optimal options, let user choose                           │
│                                                                             │
│  HOOKS: MULTI-001 (conflict), MULTI-002 (tradeoff), MULTI-003 (select)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## PATTERN 4: GRADIENT THINKING
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WHICH DIRECTION IMPROVES? HOW BIG A STEP?                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  QUESTIONS:                                                                  │
│  1. Which change would MOST improve the output?                             │
│  2. How confident am I this change helps? (step size)                       │
│  3. What's the cost of this change?                                         │
│                                                                             │
│  STEP SIZE: High confidence → large steps | Low confidence → small steps   │
│                                                                             │
│  HOOKS: GRAD-001 (compute), GRAD-002 (step), GRAD-003 (converge)           │
└─────────────────────────────────────────────────────────────────────────────┘
```

## PATTERN 5: REINFORCEMENT SIGNALS
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ LEARN FROM OUTCOMES - WHAT'S THE REWARD SIGNAL?                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  REWARD SIGNALS:                                                             │
│  +10: User explicitly satisfied | -10: Safety issue or critical failure    │
│   +5: Task completed, no complaints | -5: Error or bug introduced          │
│   +3: Partial success | -3: Required significant rework                    │
│                                                                             │
│  LEARNING: Positive → Do more | Negative → Avoid | Neutral → Add missing   │
│                                                                             │
│  HOOKS: RL-001 (record), RL-002 (reward), RL-003 (update)                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3: COMPLETE HOOK INVENTORY (30 HOOKS)
# ═══════════════════════════════════════════════════════════════════════════════

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    ALL 30 COGNITIVE HOOKS - v2.0 COMPLETE                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ORIGINAL HOOKS (15) - from v1.0                                              ║
║  ─────────────────────────────────────────────────────────────────────────    ║
║  BAYESIAN:                                                                    ║
║    BAYES-001  session:preStart       Initialize priors                        ║
║    BAYES-002  evidence:received      Update beliefs                           ║
║    BAYES-003  decision:required      Compute posteriors                       ║
║                                                                               ║
║  OPTIMIZATION:                                                                ║
║    OPT-001    task:start             Set objective function                   ║
║    OPT-002    constraint:detected    Add to feasible region                   ║
║    OPT-003    solution:found         Verify optimality                        ║
║                                                                               ║
║  MULTI-OBJECTIVE:                                                             ║
║    MULTI-001  conflict:detected      Activate Pareto analysis                 ║
║    MULTI-002  tradeoff:required      Compute trade-off surface                ║
║    MULTI-003  selection:made         Document rationale                       ║
║                                                                               ║
║  GRADIENT:                                                                    ║
║    GRAD-001   iteration:start        Compute gradient                         ║
║    GRAD-002   step:taken             Update parameters                        ║
║    GRAD-003   convergence:check      Evaluate stopping                        ║
║                                                                               ║
║  REINFORCEMENT:                                                               ║
║    RL-001     action:taken           Record state-action                      ║
║    RL-002     outcome:observed       Compute reward                           ║
║    RL-003     policy:update          Adjust behavior                          ║
║                                                                               ║
║  ═════════════════════════════════════════════════════════════════════════    ║
║                                                                               ║
║  NEW HOOKS (15) - Cognitive Enhancement v7.0                                  ║
║  ─────────────────────────────────────────────────────────────────────────    ║
║  ANOMALY DETECTION (D(x)):                                                    ║
║    ANOM-001   data:received          Validate incoming data                   ║
║    ANOM-002   pattern:unusual        Flag detected anomalies                  ║
║    ANOM-003   safety:check           Final verification                       ║
║                                                                               ║
║  ATTENTION FOCUS (A(x)):                                                      ║
║    ATTN-001   context:loaded         Compute relevance scores                 ║
║    ATTN-002   query:received         Focus on relevant sections               ║
║    ATTN-003   output:generating      Prioritize information                   ║
║                                                                               ║
║  CAUSAL REASONING (K(x)):                                                     ║
║    CAUSAL-001 relationship:detected  Build causal graph                       ║
║    CAUSAL-002 prediction:needed      Trace causal chains                      ║
║    CAUSAL-003 failure:analyzed       Identify root causes                     ║
║                                                                               ║
║  MEMORY AUGMENTATION (M(x)):                                                  ║
║    MEM-001    session:start          Load relevant memories                   ║
║    MEM-002    pattern:learned        Encode new memories                      ║
║    MEM-003    context:overflow       Compress and persist                     ║
║                                                                               ║
║  SELF-REFLECTION:                                                             ║
║    REFL-001   action:completed       Assess quality                           ║
║    REFL-002   error:detected         Analyze mistake                          ║
║    REFL-003   session:end            Compute improvement                      ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5: MASTER EQUATION v2.0 (Quick Reference)
# ═══════════════════════════════════════════════════════════════════════════════

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                         MASTER EQUATION v2.0                                   ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Ω(x) = w_R·R(x) + w_C·C(x) + w_P·P(x) + w_S·S(x) + w_L·L(x)                 ║
║       + w_D·D(x) + w_A·A(x) + w_K·K(x) + w_M·M(x)                            ║
║                                                                               ║
║  HARD CONSTRAINTS:                                                            ║
║    S(x) ≥ 0.70  (Safety)    → If violated: Ω(x) = 0, OUTPUT BLOCKED          ║
║    D(x) ≥ 0.30  (Anomaly)   → If violated: Ω(x) = 0, OUTPUT BLOCKED          ║
║                                                                               ║
║  DEFAULT WEIGHTS (v2.0):                                                      ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  R(x) = 0.18  │  Reasoning quality                                      │  ║
║  │  C(x) = 0.14  │  Code quality                                           │  ║
║  │  P(x) = 0.10  │  Process quality                                        │  ║
║  │  S(x) = 0.22  │  Safety score (highest)                                 │  ║
║  │  L(x) = 0.06  │  Learning value                                         │  ║
║  │  D(x) = 0.10  │  Anomaly detection                                      │  ║
║  │  A(x) = 0.08  │  Attention focus                                        │  ║
║  │  K(x) = 0.07  │  Causal knowledge                                       │  ║
║  │  M(x) = 0.05  │  Memory quality                                         │  ║
║  │  TOTAL = 1.00                                                           │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                                                                               ║
║  DECISIONS:                                                                   ║
║    Ω ≥ 0.85 AND Ω_lower ≥ 0.70  → RELEASE                                    ║
║    Ω ≥ 0.65                      → WARN                                       ║
║    Ω < 0.65 OR S < 0.70 OR D < 0.30 → BLOCK                                  ║
║                                                                               ║
║  For detailed computation → Load prism-master-equation (L2)                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 7: COGNITIVE CHECKLIST (v2.0)
# ═══════════════════════════════════════════════════════════════════════════════

## PRE-TASK (Before starting ANY work)
```
ORIGINAL PATTERNS:
□ BAYESIAN: What's my prior belief? What evidence do I need?
□ OPTIMIZATION: Explore (new approach) or exploit (known good)?
□ MULTI-OBJ: What are the competing objectives? Priority order?
□ GRADIENT: Which aspect needs most improvement?
□ RL: What's the reward signal for this task?

NEW v2.0:
□ ANOMALY: What could be invalid/unusual in this input?
□ ATTENTION: What context is most relevant? What can I deprioritize?
□ CAUSAL: What cause-effect relationships apply here?
□ MEMORY: What do I remember from previous sessions about this?
□ REFLECTION: What errors have I made on similar tasks?
```

## DURING-TASK (Every decision point)
```
ORIGINAL PATTERNS:
□ BAYESIAN: Does new evidence change my confidence?
□ OPTIMIZATION: Am I stuck? Try different direction?
□ MULTI-OBJ: Am I sacrificing one thing too much?
□ GRADIENT: Is this change moving toward improvement?
□ RL: Is this action leading toward reward?

NEW v2.0:
□ ANOMALY: Are any values looking suspicious or unusual?
□ ATTENTION: Am I still focused on the right things?
□ CAUSAL: Am I following the cause-effect chain correctly?
□ MEMORY: Should I save this insight for later?
□ REFLECTION: Am I making any of my common errors?
```

## POST-TASK (After completing work)
```
ORIGINAL PATTERNS:
□ BAYESIAN: How confident am I in the result? (quantify)
□ OPTIMIZATION: Could this be improved? Diminishing returns?
□ MULTI-OBJ: Did I balance the tradeoffs well?
□ GRADIENT: What's the next improvement to make?
□ RL: What worked? What to repeat/avoid?

NEW v2.0:
□ ANOMALY: Final check - any anomalies in output?
□ ATTENTION: Did I include all relevant information?
□ CAUSAL: Do my predictions follow causal logic?
□ MEMORY: What should I remember from this session?
□ REFLECTION: How did I perform? What to improve?

COMPUTE Ω(x): Is it ≥ 0.65? Are S(x) ≥ 0.70 and D(x) ≥ 0.30?
```

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 9: SUMMARY - v2.0 COMPLETE
# ═══════════════════════════════════════════════════════════════════════════════

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    PRISM COGNITIVE CORE v2.0 - SUMMARY                        ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  5 ORIGINAL PATTERNS:                                                         ║
║    1. Bayesian Reasoning     - Update beliefs with evidence                  ║
║    2. Optimization Mindset   - Explore/exploit, iterate                      ║
║    3. Multi-Objective        - Balance tradeoffs                             ║
║    4. Gradient Thinking      - Direction of improvement                      ║
║    5. Reinforcement Signals  - Learn from outcomes                           ║
║                                                                               ║
║  5 NEW COMPONENTS (v2.0):                                                     ║
║    D(x) Anomaly Detection    - Catch invalid/dangerous data                  ║
║    A(x) Attention Focus      - Prioritize relevant context                   ║
║    K(x) Causal Reasoning     - Understand cause-effect                       ║
║    M(x) Memory Augmentation  - Session continuity                            ║
║    +   Self-Reflection       - Continuous improvement                        ║
║                                                                               ║
║  30 HOOKS TOTAL:                                                              ║
║    15 Original (BAYES, OPT, MULTI, GRAD, RL × 3 each)                        ║
║    15 New (ANOM, ATTN, CAUSAL, MEM, REFL × 3 each)                           ║
║                                                                               ║
║  HARD CONSTRAINTS:                                                            ║
║    S(x) ≥ 0.70 (Safety)                                                      ║
║    D(x) ≥ 0.30 (Anomaly)                                                     ║
║                                                                               ║
║  DECISION: RELEASE if Ω ≥ 0.85, WARN if ≥ 0.65, BLOCK otherwise             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

**APPLY ALL PATTERNS AND COMPONENTS AUTOMATICALLY. WITHOUT BEING ASKED.**
```

**10 COGNITIVE COMPONENTS. 30 HOOKS. COMPLETE COGNITIVE SYSTEM.**
**prism-cognitive-core v2.0.0 | Level 0 Always-On | Universal Enhancement**
