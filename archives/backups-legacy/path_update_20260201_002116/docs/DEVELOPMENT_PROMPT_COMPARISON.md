# PRISM DEVELOPMENT PROMPT COMPARISON ANALYSIS
## v13.0 (ILP Coordination) vs v10.4 (Battle-Ready)
### Generated: 2026-01-28

---

## EXECUTIVE SUMMARY

| Aspect | v13.0 | v10.4 |
|--------|-------|-------|
| **Focus** | Mathematical coordination infrastructure | Operational protocols & session management |
| **Path Structure** | `C:\PRISM\` | `C:\PRISM REBUILD...\` |
| **Total Resources** | 691 | 106 |
| **Skills** | 99 | 34 (24 SP + 10 refs) |
| **Agents** | 64 | Not detailed |
| **Formulas** | 22 | Mentioned, not listed |
| **Laws/Rules** | 8 Laws | 10 Commandments + 4 Always-On |

### CRITICAL INSIGHT
**These are COMPLEMENTARY, not competing!**
- v13 = Mathematical foundation + ILP optimization
- v10.4 = Operational protocols + Quality assurance

---

## WHAT v13 HAS THAT v10.4 IS MISSING

### 1. ILP-Based Optimization System

```
Master Equation (F-PSI-001):
Ψ(T,R) = argmax [ Σᵢ Cap(rᵢ,T) × Syn(R) × Ω(R) / Cost(R) ]

Constraints:
- |skills| ≤ 8, |agents| ≤ 8
- S(R) ≥ 0.70 (safety)
- M(R) ≥ 0.60 (rigor)
- Coverage = 1.0
```

### 2. Coordination Infrastructure (NEW in v13)
| Component | Count | Purpose |
|-----------|-------|---------|
| RESOURCE_REGISTRY.json | 691 items | Complete resource inventory |
| CAPABILITY_MATRIX.json | n×m | Resource-to-task matching |
| SYNERGY_MATRIX.json | 150+ pairs | Learned pairwise interactions |
| AGENT_REGISTRY.json | 64 agents | Agent tier optimization |

### 3. New Coordination Skills (6)
- prism-combination-engine (L0) - Master ILP optimization
- prism-swarm-coordinator (L1) - Multi-agent swarm orchestration
- prism-resource-optimizer (L1) - Capability scoring
- prism-agent-selector (L1) - Agent selection
- prism-synergy-calculator (L1) - Synergy computation
- prism-claude-code-bridge (L2) - Script execution bridge

### 4. New Agents (6 + 3 upgrades = 9)
| Agent | Tier | Role |
|-------|------|------|
| combination_optimizer | OPUS | ILP solver |
| synergy_analyst | OPUS | Pattern learning |
| proof_generator | OPUS | Math proofs |
| resource_auditor | SONNET | Registry maintenance |
| calibration_engineer | SONNET | Coefficient calibration |
| test_orchestrator | SONNET | Ralph loop testing |
| coordinator_v2 | OPUS | UPGRADED |
| meta_analyst_v2 | OPUS | UPGRADED |
| learning_extractor_v2 | OPUS | UPGRADED |

### 5. Coordination Formulas (7 NEW)
| ID | Name | Purpose |
|----|------|---------|
| F-PSI-001 | Master Combination | ILP optimization |
| F-RESOURCE-001 | Capability Score | Resource-task matching |
| F-SYNERGY-001 | Synergy Calculator | Geometric mean of pairs |
| F-COVERAGE-001 | Coverage Score | Requirement completeness |
| F-SWARM-001 | Swarm Efficiency | Output/Cost ratio |
| F-AGENT-001 | Agent Selection | Minimum cost subset |
| F-PROOF-001 | Optimality Proof | LP duality certificates |

### 6. Optimality Proof Certificates
| Certificate | Gap | Meaning |
|-------------|-----|---------|
| OPTIMAL | 0% | Provably optimal |
| NEAR_OPTIMAL | ≤2% | Within 2% of maximum |
| GOOD | ≤5% | Acceptable |
| HEURISTIC | N/A | ILP timeout, greedy fallback |

### 7. Orchestrator v6 Commands
```powershell
# ILP-optimized intelligent swarm (NEW)
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --intelligent "Task"

# Specific swarm pattern
py -3 ...\prism_unified_system_v6.py --swarm deep_extraction_swarm "Task"

# Ralph improvement loop
py -3 ...\prism_unified_system_v6.py --ralph validator "Task" 3
```

### 8. Testing Suite Commands
```powershell
py -3 C:\PRISM\scripts\testing\run_full_suite.py
py -3 C:\PRISM\scripts\testing\regression_tests.py
py -3 C:\PRISM\scripts\testing\ralph_loop_tester.py --suite
```

---

## WHAT v10.4 HAS THAT v13 IS MISSING

### 1. Part 0: Always-On Mindsets (EMBEDDED)

```
4 ALWAYS-ON LAWS - APPLY TO EVERY TASK:

1. LIFE-SAFETY: "Can this hurt someone?"
   → Manufacturing software controls machines that can injure/kill

2. MAXIMUM COMPLETENESS: "Is this 100%?"
   → 100% theoretical, mathematical, statistical completeness

3. ANTI-REGRESSION: "Am I losing anything?"
   → v10.0 lost 54% of v9.0 - NEVER AGAIN
   → MUST inventory before replacing, compare before shipping

4. PREDICTIVE THINKING: "What goes wrong?"
   → Think N steps ahead, prevent failures
```

### 2. Session Start Protocol (Detailed Steps)
```
STEP 0: Always-On Mindsets active (embedded)
STEP 1: Verify filesystem access (Filesystem:list_allowed_directories)
STEP 2: Read CURRENT_STATE.json
STEP 3: Check task continuity (IN_PROGRESS → Resume)
STEP 4: Load relevant skills (orchestrator + phase)
STEP 5: Estimate complexity (SIMPLE/MODERATE/COMPLEX)
STEP 6: Announce session start with buffer zone
```

### 3. Defensive Layer - 7 Validation Gates
| Gate | Check | If Failed |
|------|-------|-----------|
| G1 | Filesystem accessible | STOP, inform user |
| G2 | State file valid | Create new, warn |
| G3 | Input understood | Clarify first |
| G4 | Skills available | Use embedded knowledge |
| G5 | Output path on C: | NEVER /home/claude |
| G6 | Evidence of completion | Don't claim "done" |
| G7 | Replacement ≥ original size | Investigate loss |

### 4. Replacement Protection Protocol
```
TRIGGERED BY: update, replace, new version, rewrite, merge, consolidate

BEFORE CREATING REPLACEMENT:
1. INVENTORY original completely
2. COUNT sections/functions/features
3. MEASURE size (lines, KB)
4. LIST all content items

AFTER CREATION:
7. COMPARE sizes: new vs old
8. RUN: python regression_checker.py old new
9. INVESTIGATE if >20% smaller
```

### 5. Predictive Layer - Context Budget
```
BUFFER ZONES:
🟢 GREEN (0-8 calls)    Normal operation
🟡 YELLOW (9-14 calls)  Plan checkpoint within 2-3 calls
🔴 RED (15-18 calls)    IMMEDIATE checkpoint
⚫ CRITICAL (19+ calls) STOP ALL WORK, save everything
```

### 6. Complexity Forecasting
```javascript
function estimateComplexity(task) {
  if (lines > 1000 || toolCalls > 25) return "MULTI_SESSION";
  if (lines > 500 || toolCalls > 15) return "COMPLEX";
  if (lines > 200 || toolCalls > 8) return "MODERATE";
  return "SIMPLE";
}
```

### 7. Superpowers Workflow (Full)
```
REQUEST → BRAINSTORM → PLAN → EXECUTE → REVIEW-SPEC → REVIEW-QUALITY → HANDOFF
              │
              ▼
         MANDATORY STOP
         Present in chunks:
         Chunk 1: SCOPE → approval
         Chunk 2: APPROACH → approval
         Chunk 3: DETAILS → approval
```

### 8. Two-Stage Review
```
STAGE 1: SPECIFICATION COMPLIANCE
☐ Does output match requirements?
☐ Are all requested features present?
→ MUST PASS Stage 1 before Stage 2

STAGE 2: QUALITY REVIEW
☐ Is code well-structured?
☐ Are patterns consistent?
→ Both stages must pass
```

### 9. Four-Phase Debugging (MANDATORY ORDER)
```
PHASE 1: EVIDENCE COLLECTION
☐ Reproduce issue 3+ times
☐ Document exact steps
▼ MANDATORY before Phase 2

PHASE 2: ROOT CAUSE TRACING
☐ Trace backward from error
☐ Identify FIRST point of failure
▼ MANDATORY before Phase 3

PHASE 3: HYPOTHESIS TESTING
☐ Form specific hypothesis
☐ Design MINIMAL test
▼ MANDATORY before Phase 4

PHASE 4: FIX + PREVENTION
☐ Fix at ROOT CAUSE
☐ Add 3+ defense-in-depth layers
☐ Create regression test
```

### 10. Evidence-Based Verification (L1-L5)
```
L1: CLAIM ONLY - Insufficient
L2: FILE LISTING - Partial credit
L3: CONTENT SAMPLE - Task completion (min for "COMPLETE")
L4: REPRODUCIBLE - Major milestone
L5: USER VERIFIED - Stage completion

MINIMUM FOR "COMPLETE": L3
```

### 11. MIT/Stanford Course Integration
```
LOCATION: C:\PRISM REBUILD\MIT COURSES\
FILES:
  - MIT_COURSE_INDEX.json (225 courses, 17 categories)
  - ALGORITHM_REGISTRY.json (285 algorithms mapped)

COVERAGE: 87.8% of PRISM engines have academic foundation

DOMAINS:
  Machining:      2.810, 2.85, 2.008
  Thermal:        2.51, 2.55
  Vibration:      2.032, 6.011
  Optimization:   6.255, 15.093
  ML/AI:          6.867, 9.520
```

### 12. Algorithm Selection Decision Tree
```
WHAT ARE YOU OPTIMIZING?

├── Single objective, continuous → Interior Point, Trust Region
├── Single objective, discrete → ACO, Genetic Algorithm
├── Multiple objectives (2-3) → NSGA-II
├── Multiple objectives (4+) → NSGA-III, MOEA/D
├── Uncertainty present → Monte Carlo, Bayesian
├── Sequential decisions → RL (DQN, PPO)
└── Pattern recognition
    ├── Tabular → XGBoost, Random Forest
    ├── Sequences → LSTM, Transformer
    └── Graphs → GNN
```

### 13. Database Consumer Requirements
```
MINIMUM CONSUMERS:
PRISM_MATERIALS_MASTER     → 15+ consumers
PRISM_MACHINES_DATABASE    → 12+ consumers
PRISM_TOOLS_DATABASE       → 10+ consumers
PRISM_WORKHOLDING_DATABASE →  8+ consumers
PRISM_CONTROLLER_DATABASE  →  8+ consumers

RULE: No database enters v9.0 without ALL consumers wired.
```

### 14. The 10 Commandments
| # | Commandment | Meaning |
|---|-------------|---------|
| 1 | IF IT EXISTS, USE IT EVERYWHERE | 100% utilization |
| 2 | FUSE THE UNFUSABLE | Cross-domain integration |
| 3 | TRUST BUT VERIFY | Physics + empirical + historical |
| 4 | LEARN FROM EVERYTHING | Every interaction → ML |
| 5 | PREDICT WITH UNCERTAINTY | Confidence intervals |
| 6 | EXPLAIN EVERYTHING | XAI for recommendations |
| 7 | FAIL GRACEFULLY | Fallbacks, never crash |
| 8 | PROTECT EVERYTHING | Validate, sanitize, backup |
| 9 | PERFORM ALWAYS | <2s load, <500ms calc |
| 10 | OBSESS OVER USERS | 3-click rule |

### 15. Database Layers
```
LAYER 4: LEARNED (AI-generated)     ← Highest priority
LAYER 3: USER (Shop-specific)       ← Customer customizations
LAYER 2: ENHANCED (Manufacturer)    ← 33+ manufacturers
LAYER 1: CORE (Infrastructure)      ← Foundation

RESOLUTION: LEARNED → USER → ENHANCED → CORE
```

### 16. Tool Selection Guide
| Task | Tool | Notes |
|------|------|-------|
| Read C: file (small) | `Filesystem:read_file` | <50KB |
| Read C: file (large) | `Desktop Commander:read_file` | offset/length |
| Write C: file | `Filesystem:write_file` | <25KB chunks |
| List C: directory | `Filesystem:list_directory` | Verify paths |
| Search content | `Desktop Commander:start_search` | searchType:"content" |
| Run Python | `Desktop Commander:start_process` | Scripts |

### 17. Python Automation Scripts (14)
| Script | Purpose |
|--------|---------|
| session_manager.py | Session lifecycle |
| update_state.py | Quick state updates |
| regression_checker.py | Compare versions for loss |
| extract_module.py | Module extraction |
| database_auditor.py | Audit DB utilization |
| skill_validator.py | Validate skill files |
| dependency_mapper.py | Map dependencies |
| prism_toolkit.py | Master coordination |

### 18. Unified Checklists
```
SESSION START:
□ Mindsets ACTIVE (embedded)
□ Filesystem access verified
□ Read CURRENT_STATE.json
□ Check IN_PROGRESS → Resume
□ Load orchestrator + phase skills
□ Estimate complexity, plan checkpoints
□ Note buffer zone

PRE-TASK:
□ SAFETY: Physical outcome?
□ COMPLETENESS: What is 100%?
□ REGRESSION: Replacing? → Inventory first
□ PREDICTION: 3 failure modes?

SESSION END:
□ CURRENT_STATE.json updated
□ Handoff notes documented
□ No partial implementations
□ Next session needs predicted
```

---

## CONFLICTS TO RESOLVE

### 1. Path Structure
| v13 | v10.4 |
|-----|-------|
| `C:\PRISM\` | `C:\PRISM REBUILD (UPLOAD TO BOX...)` |

**Resolution**: Both exist. v13 paths are cleaner. Suggest migrating to `C:\PRISM\`.

### 2. Resource Counts
| v13 | v10.4 |
|-----|-------|
| 691 total | 106 total |

**Resolution**: v13 includes agents (64), formulas (22), hooks (147) that v10.4 doesn't count separately.

### 3. 8 Laws vs 10 Commandments
| v13 8 Laws | v10.4 10 Commandments |
|------------|----------------------|
| LIFE-SAFETY | IF IT EXISTS USE IT |
| MICROSESSIONS | FUSE THE UNFUSABLE |
| COMPLETENESS | TRUST BUT VERIFY |
| ANTI-REGRESSION | LEARN FROM EVERYTHING |
| PREDICTIVE | PREDICT WITH UNCERTAINTY |
| CONTINUITY | EXPLAIN EVERYTHING |
| VERIFICATION | FAIL GRACEFULLY |
| MATH EVOLUTION | PROTECT EVERYTHING |
| - | PERFORM ALWAYS |
| - | OBSESS OVER USERS |

**Resolution**: BOTH are needed. 8 Laws are system constraints. 10 Commandments are design principles.

---

## MERGE RECOMMENDATION

A unified prompt should have:

### FROM v13 (Mathematical Foundation):
✓ F-PSI-001 Master Equation
✓ Coordination infrastructure (4 JSON files)
✓ 6 new coordination skills
✓ 64 agents with tiers
✓ 22 formulas
✓ 147 hooks
✓ Optimality proofs
✓ Orchestrator v6

### FROM v10.4 (Operational Protocols):
✓ Part 0 Always-On Mindsets (embedded)
✓ Session start/end protocols
✓ Defensive Layer (G1-G7)
✓ Replacement Protection Protocol
✓ Buffer zones (🟢🟡🔴⚫)
✓ Complexity forecasting
✓ Superpowers Workflow
✓ Two-Stage Review
✓ Four-Phase Debugging
✓ Evidence levels (L1-L5)
✓ MIT/Stanford integration
✓ Algorithm Decision Tree
✓ Consumer requirements
✓ 10 Commandments
✓ Database Layers
✓ Tool Selection guide
✓ Python scripts
✓ Unified checklists

### UNIFIED STRUCTURE:
```
PART 0:  Always-On Mindsets (from v10.4)
PART 1:  Role & Scope
PART 2:  Session Protocol (from v10.4)
PART 3:  Mathematical Foundation (from v13 - NEW)
PART 4:  Defensive Layer (from v10.4)
PART 5:  Predictive Layer (from v10.4)
PART 6:  Coordination Infrastructure (from v13 - NEW)
PART 7:  Resources (merged: 691+ items)
PART 8:  Superpowers Workflow (from v10.4)
PART 9:  8 Laws + 10 Commandments (BOTH)
PART 10: Unified Hierarchy (from v10.4)
PART 11: Database Layers (from v10.4)
PART 12: Reference Tables (merged)
PART 13: Checklists (from v10.4)
PART 14: Quick Reference Card (merged)
PART 15: Version History
```

---

## FILES REFERENCED

| File | Location | Purpose |
|------|----------|---------|
| CURRENT_STATE.json | C:\PRISM\state\ | v13 state |
| CURRENT_STATE.json | C:\PRISM REBUILD...\ | v10.4 state |
| RESOURCE_REGISTRY.json | C:\PRISM\data\coordination\ | 691 resources |
| CAPABILITY_MATRIX.json | C:\PRISM\data\coordination\ | Matching |
| SYNERGY_MATRIX.json | C:\PRISM\data\coordination\ | Pairs |
| FORMULA_REGISTRY.json | C:\PRISM\data\ | 22 formulas |

---

**ANALYSIS COMPLETE. MERGE RECOMMENDED.**
