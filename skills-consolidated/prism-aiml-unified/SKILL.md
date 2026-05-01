---
name: prism-aiml-unified
description: |
  All AI/ML algorithms for PRISM Manufacturing Intelligence in one reference.
  Bayesian, deep learning, optimization, reinforcement learning, and learning systems.
  Consolidates: ai-bayesian, ai-deep-learning, ai-optimization, ai-reinforcement,
  aiml-engine-patterns, learning-engines.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "aiml", "unified", "algorithms", "manufacturing", "intelligence", "bayesian", "deep"
- Code architecture decision, pattern selection, or development workflow guidance.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-aiml-unified")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_dev→[relevant_action] for development tasks
   - prism_sp→[relevant_action] for superpowers workflow
   - prism_skill_script→skill_content(id="prism-aiml-unified") for pattern reference

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Reference knowledge applicable to current task
- **Failure**: Content not found → verify skill exists in index

### Examples
**Example 1**: User asks about aiml
→ Load skill: skill_content("prism-aiml-unified") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires unified guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM AI/ML Unified
## Algorithm Reference for Manufacturing Intelligence

## Algorithm Selection Matrix

| Problem Type | Algorithm | Module | When |
|-------------|-----------|--------|------|
| Uncertainty quantification | Bayesian inference | PRISM_BAYESIAN_SYSTEM | Tool life prediction, parameter confidence |
| Sequence prediction | LSTM | PRISM_LSTM_ENGINE | Time-series sensor data, wear progression |
| Pattern recognition | Neural network | PRISM_NEURAL_NETWORK | Surface finish prediction, defect detection |
| Multi-parameter optimization | PSO/GA | PRISM_PSO_OPTIMIZER | Speed/feed optimization, multi-objective |
| Adaptive control | Q-Learning/DQN | PRISM_RL_QLEARNING | Real-time parameter adjustment |
| Anomaly detection | Autoencoder | PRISM_AUTOENCODER | Sensor anomaly, tool breakage prediction |
| Active data collection | Active learning | PRISM_ACTIVE_LEARNING | Minimize experiments needed |
| Complex relationships | Transformer | PRISM_TRANSFORMER_ENGINE | Cross-feature dependencies |

## 1. PROBABILISTIC & BAYESIAN

### Bayesian Inference (PRISM_BAYESIAN_SYSTEM)
```
Prior P(θ) × Likelihood P(data|θ) → Posterior P(θ|data)
```
- **Tool life prediction:** Prior from Taylor equation, update with observed wear data
- **Parameter confidence:** Posterior distribution width = uncertainty estimate
- **Online learning:** Sequential Bayesian update as new data arrives

### Key Formulas
- Posterior: `P(θ|D) ∝ P(D|θ) × P(θ)`
- Predictive: `P(x_new|D) = ∫ P(x_new|θ) P(θ|D) dθ`
- Evidence: `P(D) = ∫ P(D|θ) P(θ) dθ`

### Manufacturing Application
- Bayesian tool life: start with Taylor C,n priors, update with shop floor data
- Material property estimation: prior from handbook, posterior from testing
- Process capability: Bayesian Cpk with uncertainty bounds

## 2. DEEP LEARNING

### Neural Network (PRISM_NEURAL_NETWORK, 106 lines)
- Feedforward: input → hidden layers → output
- Activation: ReLU (hidden), sigmoid/linear (output)
- Training: backpropagation with Adam optimizer
- Manufacturing use: surface finish prediction from cutting parameters

### LSTM (PRISM_LSTM_ENGINE, 64 lines)
- Sequence modeling with memory cells
- Gates: forget, input, output control information flow
- Manufacturing use: tool wear progression, vibration time series

### Transformer (PRISM_TRANSFORMER_ENGINE, 262 lines)
- Self-attention: model long-range dependencies
- Multi-head attention for diverse feature relationships
- Manufacturing use: complex parameter interaction modeling

### Autoencoder (PRISM_AUTOENCODER, 141 lines)
- Encoder compresses input → latent space → decoder reconstructs
- Anomaly detection: high reconstruction error = anomaly
- Manufacturing use: sensor data anomaly detection, tool breakage warning

## 3. OPTIMIZATION

### Particle Swarm (PRISM_PSO_OPTIMIZER, 862 lines)
```
v_i(t+1) = w×v_i(t) + c1×r1×(pbest_i - x_i) + c2×r2×(gbest - x_i)
x_i(t+1) = x_i(t) + v_i(t+1)
```
- Swarm size: 20-50 particles. Inertia w: 0.4-0.9 (adaptive).
- Best for: continuous optimization, speed/feed optimization

### Genetic Algorithm (PRISM_GA_ENGINE, 520 lines)
- Population → Selection → Crossover → Mutation → Evaluation
- Tournament selection (k=3), single-point crossover, Gaussian mutation
- Best for: discrete/combinatorial problems, tool selection

### Simulated Annealing (PRISM_SIMULATED_ANNEALING, 490 lines)
- Accept worse solutions with probability `exp(-ΔE/T)`
- Temperature schedule: geometric cooling T(t+1) = α×T(t), α=0.95
- Best for: avoiding local optima, single-objective with many local minima

### Differential Evolution (PRISM_DIFFERENTIAL_EVOLUTION, 580 lines)
- Mutation: `v = x_r1 + F×(x_r2 - x_r3)`, F=0.5-1.0
- Crossover: binomial with CR=0.7-0.9
- Best for: robust optimization, noisy objective functions

### Gradient Optimizers (PRISM_OPTIMIZERS_ENGINE, 314 lines)
| Optimizer | Update Rule | Best For |
|-----------|-------------|----------|
| SGD | `w -= lr × grad` | Simple, well-understood |
| Adam | Adaptive moment estimation | Default choice, robust |
| AdaGrad | Per-parameter learning rate | Sparse features |
| RMSprop | Decay average of squared gradients | Non-stationary |

## 4. REINFORCEMENT LEARNING

### Q-Learning (PRISM_RL_QLEARNING_ENGINE, 650 lines)
```
Q(s,a) ← Q(s,a) + α[r + γ×max_a'Q(s',a') - Q(s,a)]
```
- Off-policy, tabular. α=0.1 (learning rate), γ=0.99 (discount).
- Manufacturing: adaptive feed rate control

### SARSA / Expected SARSA
- On-policy: follows behavior policy. Safer for real-time control.
- Expected SARSA: `E[Q(s',a')]` reduces variance

### DQN / Double DQN (PRISM_ADVANCED_DQN, 590 lines)
- Neural network approximates Q(s,a) for large state spaces
- Experience replay: sample random minibatches from memory
- Double DQN: separate target network reduces overestimation
- Prioritized replay: sample high-error transitions more often
- Manufacturing: real-time spindle speed optimization

## 5. LEARNING SYSTEMS

### Active Learning (PRISM_ACTIVE_LEARNING)
- **Uncertainty sampling:** Query most uncertain predictions
- **Query by committee:** Multiple models vote, query where they disagree
- **Expected model change:** Query points that would change model most
- Manufacturing: minimize expensive machining experiments

### Learning Persistence (PRISM_LEARNING_PERSISTENCE_ENGINE)
- Save/load trained models, learned parameters, performance history
- Version models, track degradation, trigger retraining
- Storage: `C:\PRISM\state\learned_models\`

### Domain-Specific Learning
- **CAM learning** (PRISM_CAM_LEARNING_ENGINE): toolpath pattern recognition, strategy recommendation
- **Machine behavior** (PRISM_MACHINE_3D_LEARNING_ENGINE): machine-specific compensation, thermal drift
- **Axis dynamics** (PRISM_AXIS_BEHAVIOR_LEARNING_ENGINE): axis-specific accel/decel profiles

## Shared Patterns

### Training Pipeline
`Data → Validate → Split (80/10/10) → Normalize → Train → Validate → Test → Deploy`

### Uncertainty Quantification
All predictions MUST include confidence/uncertainty:
- Bayesian: posterior distribution width
- Neural: MC dropout or ensemble variance
- RL: action-value spread

### Integration with PRISM Dispatchers
| Dispatcher | AI/ML Usage |
|------------|-------------|
| `prism_calc` | Physics-informed predictions |
| `prism_data→material_search` | Similarity via embeddings |
| `prism_toolpath→strategy_select` | ML-based strategy recommendation |
| `prism_safety` | Anomaly detection on predictions |
