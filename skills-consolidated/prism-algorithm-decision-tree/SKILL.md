---
name: prism-algorithm-decision-tree
description: 3-step routing procedure — identify problem category, apply constraints, select PRISM engine — with 6 problem type tables and constraint matching
---
# Algorithm Decision Tree

## When To Use
- "Which PRISM engine handles this?" / "What algorithm for multi-objective optimization?"
- When designing a new feature that needs an algorithmic core
- When prism_calc or prism_data doesn't have a direct action for the problem
- During brainstorm phase to identify which engines to wire together
- NOT for: how to implement the algorithm (use the engine's own skill)
- NOT for: capability scoring of agents/resources (use prism-capability-scoring)

## How To Use
**STEP 1: IDENTIFY PROBLEM CATEGORY**
  Is your problem about...
  Finding optimal values? → OPTIMIZATION
  Making predictions from data? → PREDICTION / ML
  Computing physical forces/stresses? → MANUFACTURING PHYSICS
  Detecting shapes or collisions? → GEOMETRY
  Analyzing signals or vibrations? → SIGNAL PROCESSING
  Ordering tasks or allocating resources? → SCHEDULING

**STEP 2: NARROW WITHIN CATEGORY**

OPTIMIZATION problems:
  Single objective + continuous → Simplex / Interior Point → prism_calc cost_optimize
  Multiple objectives → NSGA-II → prism_calc multi_optimize
  Discrete sequence → Ant Colony / Genetic Algorithm → prism_toolpath strategy_select
  Parameter tuning → Bayesian Optimization → prism_orchestrate agent_execute
  Many local minima → Simulated Annealing → prism_calc multi_optimize

PREDICTION problems:
  Predict numeric value → Random Forest / XGBoost → prism_calc tool_life
  Classify categories → SVM → prism_data tool_recommend
  Time series → LSTM → prism_pfp assess_risk
  Uncertainty needed → Monte Carlo → prism_calc multi_optimize
  Few samples → KNN / Bayesian → prism_data material_search

MANUFACTURING PHYSICS:
  Cutting force → Kienzle model → prism_calc cutting_force
  Tool life → Taylor equation → prism_calc tool_life
  Chatter/vibration → Stability lobes → prism_calc stability
  Material flow stress → Johnson-Cook → prism_calc flow_stress
  Heat distribution → Fourier/FEM → prism_calc thermal
  Tool deflection → Beam theory → prism_calc deflection

GEOMETRY:
  Collision detection → GJK → prism_safety check_toolpath_collision
  Toolpath routing → A* / Dijkstra → prism_toolpath strategy_select

SIGNAL PROCESSING:
  Frequency analysis → FFT → prism_calc stability (frequency domain)
  Vibration detection → Wavelet → prism_calc stability

SCHEDULING:
  Job sequencing → Dispatching + metaheuristic → prism_calc cycle_time
  Resource allocation → Linear programming → prism_calc cost_optimize

**STEP 3: APPLY CONSTRAINTS**
  Must be fast (<100ms)? → Avoid metaheuristics. Use heuristics or lookup tables.
  Must be accurate? → Use ensemble methods. Run multiple algorithms, compare.
  Limited training data? → Bayesian methods. Transfer learning from similar materials.
  Need explainability? → Decision trees over neural nets. Use XAI engines.
  Real-time updates? → Kalman filter. Online learning algorithms.
  Safety-critical? → Must pass S(x) >= 0.70. Use prism_safety validators.

## What It Returns
- The correct PRISM dispatcher + action for the identified problem
- The underlying algorithm family (Kienzle, Taylor, NSGA-II, etc.)
- Constraint-adjusted recommendation (fast vs accurate vs explainable)
- If no single engine fits: a pipeline recommendation (e.g., calc → safety → validate)

## Examples
- Input: "Need to predict tool life for carbide insert in Inconel 718"
  Step 1: PREDICTION (numeric value from material/tool data)
  Step 2: Tool life → Taylor equation → prism_calc tool_life
  Step 3: Safety-critical → validate with prism_safety predict_tool_breakage
  Result: `prism_calc tool_life` then `prism_safety predict_tool_breakage` pipeline

- Input: "Optimize both cost and cycle time for a 5-axis pocket"
  Step 1: OPTIMIZATION (multiple objectives)
  Step 2: Multi-objective → NSGA-II → prism_calc multi_optimize
  Step 3: Needs toolpath context → feed results to prism_toolpath params_calculate
  Result: `prism_calc multi_optimize` with cost + time objectives, then toolpath params

- Edge case: "Need real-time chatter detection during cutting"
  Step 1: SIGNAL PROCESSING (vibration detection)
  Step 2: Vibration → stability analysis → prism_calc stability
  Step 3: Must be real-time → use frequency domain (FFT), not full wavelet
  Constraint: <100ms → FFT over wavelet. Use prism_calc stability with frequency mode.
SOURCE: Split from prism-algorithm-selector (12.4KB)
RELATED: prism-capability-scoring
