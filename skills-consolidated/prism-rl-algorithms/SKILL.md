---
name: prism-rl-algorithms
description: |
  Reinforcement learning algorithms from Stanford CS234/Berkeley CS285. Q-learning, SARSA, REINFORCE, Actor-Critic, DQN with replay buffer.

  Stanford CS234, Berkeley CS285, CMU 10-701
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "reinforcement learning", "Q-learning", "SARSA", "policy gradient", "REINFORCE", "Actor-Critic", "DQN", "reward", "epsilon greedy"
- Source: `C:/PRISM/extracted/algorithms/PRISM_RL_ALGORITHMS.js`
- Category: machine-learning

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-rl-algorithms")`
2. Functions available: qLearning, sarsa, reinforce, actorCritic, dqn.createNetwork, dqn.train
3. Cross-reference with dispatchers:
   - prism_calc
   - prism_knowledge

### What It Returns
- **Format**: Structured computation results with parameters and formulas
- **Location**: Loaded into context via skill_content
- **Source Code**: `C:/PRISM/extracted/algorithms/PRISM_RL_ALGORITHMS.js`

### Examples
**Example 1**: Direct function call
-> Load skill -> Apply qLearning() with parameters -> Return result

**Example 2**: Auto-triggered by context
-> User mentions keyword -> Skill auto-loads -> Relevant functions available

# Prism Rl Algorithms

## Source
**Stanford CS234, Berkeley CS285, CMU 10-701**

## Functions
qLearning, sarsa, reinforce, actorCritic, dqn.createNetwork, dqn.train

## Integration
- Extracted from: `PRISM_RL_ALGORITHMS.js`
- Mapped engines: See ALGORITHM_REGISTRY.json
- Auto-load triggers: reinforcement learning, Q-learning, SARSA, policy gradient, REINFORCE
