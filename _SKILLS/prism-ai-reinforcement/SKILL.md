---
name: prism-ai-reinforcement
description: |
  Reinforcement Learning algorithms for PRISM Manufacturing Intelligence.
  Covers Q-Learning, SARSA, Expected SARSA, DQN, Double DQN, and Prioritized Experience Replay.
  
  Modules Covered:
  - PRISM_RL_QLEARNING_ENGINE (650 lines) - Tabular RL methods
  - PRISM_ADVANCED_DQN (590 lines) - Deep Q-Networks
  
  Total: 2 modules, ~1,240 lines
  Parent: prism-ai-ml-master
  MIT Foundation: 6.036, Stanford CS 234, Sutton & Barto 2018
---

# PRISM AI REINFORCEMENT LEARNING
## Q-Learning, SARSA, and Deep Q-Networks
### Version 1.0 | Level 4 Reference | 2 Modules

---

## TABLE OF CONTENTS

1. [Algorithm Selection](#1-algorithm-selection)
2. [Q-Learning & SARSA](#2-q-learning--sarsa)
3. [Deep Q-Networks (DQN)](#3-deep-q-networks-dqn)
4. [Manufacturing Applications](#4-manufacturing-applications)
5. [Hyperparameter Guide](#5-hyperparameter-guide)
6. [Training Strategies](#6-training-strategies)

---

# 1. ALGORITHM SELECTION

## Decision Tree

```
RL Problem →
├── State space discrete & small?
│   ├── Want on-policy? → SARSA
│   └── Want off-policy (max Q)? → Q-Learning
│
├── State space large/continuous?
│   ├── Actions discrete?
│   │   ├── Need stability? → Double DQN
│   │   └── Standard → DQN
│   └── Actions continuous? → Actor-Critic (future)
│
└── High variance samples?
    └── → Prioritized Experience Replay
```

## Algorithm Comparison

| Feature | Q-Learning | SARSA | DQN | Double DQN |
|---------|------------|-------|-----|------------|
| State space | Discrete | Discrete | Continuous | Continuous |
| On/Off policy | Off | On | Off | Off |
| Function approx | Table | Table | Neural | Neural |
| Overestimation | Yes | Less | Yes | No |
| Stability | High | High | Medium | High |
| Sample efficiency | Low | Low | Medium | Medium |

---

# 2. Q-LEARNING & SARSA

## Module: PRISM_RL_QLEARNING_ENGINE (650 lines)

### Q-Learning Update

```javascript
// Q(s,a) ← Q(s,a) + α[r + γ max_a' Q(s',a') - Q(s,a)]

Q[s][a] += learningRate * (
  reward + 
  gamma * Math.max(...Object.values(Q[s_next])) - 
  Q[s][a]
);
```

### SARSA Update

```javascript
// Q(s,a) ← Q(s,a) + α[r + γ Q(s',a') - Q(s,a)]
// a' is the actual next action taken (on-policy)

Q[s][a] += learningRate * (
  reward + 
  gamma * Q[s_next][a_next] - 
  Q[s][a]
);
```

### Expected SARSA

```javascript
// Q(s,a) ← Q(s,a) + α[r + γ Σ_a' π(a'|s') Q(s',a') - Q(s,a)]

const expectedValue = actions.reduce((sum, a) => {
  return sum + policy(s_next, a) * Q[s_next][a];
}, 0);

Q[s][a] += learningRate * (
  reward + gamma * expectedValue - Q[s][a]
);
```

### PRISM Implementation

```javascript
const agent = new PRISM_RL_QLEARNING_ENGINE({
  algorithm: 'qlearning', // 'sarsa', 'expected_sarsa'
  learningRate: 0.1,
  gamma: 0.99,
  epsilon: 1.0,
  epsilonDecay: 0.995,
  epsilonMin: 0.01,
  actionSelection: 'epsilon_greedy' // 'softmax', 'ucb1'
});

// Define state discretization
agent.setStateDiscretization({
  speed: { min: 100, max: 1000, bins: 10 },
  feed: { min: 0.001, max: 0.020, bins: 10 },
  force: { min: 0, max: 5000, bins: 10 }
});

// Define actions
agent.setActions([
  'increase_feed', 'decrease_feed',
  'increase_speed', 'decrease_speed',
  'maintain'
]);

// Training loop
for (let episode = 0; episode < episodes; episode++) {
  let state = env.reset();
  let done = false;
  
  while (!done) {
    const action = agent.selectAction(state);
    const { nextState, reward, done: isDone } = env.step(action);
    agent.update(state, action, reward, nextState);
    state = nextState;
    done = isDone;
  }
  
  agent.decayEpsilon();
}
```

### Action Selection Methods

**Epsilon-Greedy:**
```javascript
selectAction(state) {
  if (Math.random() < this.epsilon) {
    return this.randomAction();  // Explore
  }
  return this.greedyAction(state);  // Exploit
}
```

**Softmax (Boltzmann):**
```javascript
// P(a|s) = exp(Q(s,a)/τ) / Σ exp(Q(s,a')/τ)
selectAction(state) {
  const qValues = this.getQValues(state);
  const probs = softmax(qValues, this.temperature);
  return sampleFromDistribution(probs);
}
```

**UCB1:**
```javascript
// UCB(s,a) = Q(s,a) + c√(ln(N(s))/N(s,a))
selectAction(state) {
  const ucbValues = this.actions.map(a => {
    const q = this.Q[state][a];
    const n = this.actionCounts[state][a] || 1;
    const N = this.stateCounts[state] || 1;
    return q + this.ucbC * Math.sqrt(Math.log(N) / n);
  });
  return this.actions[argmax(ucbValues)];
}
```

### State Discretization

```javascript
discretizeState(continuous) {
  return {
    speed_bin: Math.floor((continuous.speed - this.bounds.speed.min) / 
               (this.bounds.speed.max - this.bounds.speed.min) * this.bins.speed),
    feed_bin: Math.floor((continuous.feed - this.bounds.feed.min) /
              (this.bounds.feed.max - this.bounds.feed.min) * this.bins.feed),
    // ...
  };
}
```

### Save/Load

```javascript
// Save trained Q-table
const qTableJson = agent.serialize();
fs.writeFileSync('q_table.json', qTableJson);

// Load pre-trained
agent.deserialize(fs.readFileSync('q_table.json', 'utf8'));
```

---

# 3. DEEP Q-NETWORKS (DQN)

## Module: PRISM_ADVANCED_DQN (590 lines)

### Core DQN

```javascript
// Loss: L = (r + γ max_a' Q_target(s',a') - Q(s,a))²

function computeLoss(batch) {
  const { states, actions, rewards, nextStates, dones } = batch;
  
  // Current Q values
  const qCurrent = this.network.forward(states);
  const qForActions = qCurrent.gather(actions);
  
  // Target Q values
  const qNext = this.targetNetwork.forward(nextStates);
  const maxQNext = qNext.max(dim=1);
  const targets = rewards + gamma * maxQNext * (1 - dones);
  
  return mse(qForActions, targets);
}
```

### Double DQN

```javascript
// Use online network to SELECT action, target network to EVALUATE
// Reduces overestimation bias

function computeDoubleDQNTarget(nextStates, rewards, dones) {
  // Online network selects best action
  const qOnline = this.network.forward(nextStates);
  const bestActions = qOnline.argmax(dim=1);
  
  // Target network evaluates that action
  const qTarget = this.targetNetwork.forward(nextStates);
  const qSelected = qTarget.gather(bestActions);
  
  return rewards + gamma * qSelected * (1 - dones);
}
```

### Prioritized Experience Replay (PER)

```javascript
// Priority based on TD error: p = |δ| + ε
// Sampling probability: P(i) = p_i^α / Σ p_j^α
// Importance sampling weight: w_i = (N × P(i))^(-β)

class PrioritizedReplayBuffer {
  add(transition, tdError) {
    const priority = Math.pow(Math.abs(tdError) + this.epsilon, this.alpha);
    this.sumTree.add(priority, transition);
  }
  
  sample(batchSize, beta) {
    const batch = [];
    const weights = [];
    const segment = this.sumTree.total() / batchSize;
    
    for (let i = 0; i < batchSize; i++) {
      const value = Math.random() * segment + i * segment;
      const [idx, priority, data] = this.sumTree.get(value);
      
      const prob = priority / this.sumTree.total();
      const weight = Math.pow(this.size * prob, -beta);
      
      batch.push({ idx, data });
      weights.push(weight);
    }
    
    // Normalize weights
    const maxWeight = Math.max(...weights);
    weights = weights.map(w => w / maxWeight);
    
    return { batch, weights };
  }
  
  updatePriority(idx, tdError) {
    const priority = Math.pow(Math.abs(tdError) + this.epsilon, this.alpha);
    this.sumTree.update(idx, priority);
  }
}
```

### PRISM Implementation

```javascript
const dqn = new PRISM_ADVANCED_DQN({
  // Network architecture
  inputSize: 10,       // State dimensions
  hiddenLayers: [64, 64],
  outputSize: 5,       // Number of actions
  activation: 'relu',
  
  // Learning parameters
  learningRate: 0.001,
  gamma: 0.99,
  batchSize: 32,
  
  // Exploration
  epsilon: 1.0,
  epsilonDecay: 0.995,
  epsilonMin: 0.01,
  
  // Target network
  targetUpdateFreq: 100,  // Hard update every N steps
  // OR softUpdate: 0.01,  // Soft update: τ
  
  // Experience replay
  bufferSize: 10000,
  minBufferSize: 1000,
  
  // Advanced options
  doubleDQN: true,
  prioritizedReplay: true,
  perAlpha: 0.6,
  perBetaStart: 0.4,
  perBetaFrames: 10000
});

// Training loop
for (let step = 0; step < totalSteps; step++) {
  const action = dqn.selectAction(state);
  const { nextState, reward, done } = env.step(action);
  
  dqn.remember(state, action, reward, nextState, done);
  
  if (dqn.canTrain()) {
    const loss = dqn.train();
  }
  
  if (done) {
    state = env.reset();
    dqn.decayEpsilon();
  } else {
    state = nextState;
  }
  
  if (step % targetUpdateFreq === 0) {
    dqn.updateTargetNetwork();
  }
}
```

### Neural Network (Built-in)

```javascript
// Simple feedforward network with Xavier initialization
class SimpleNetwork {
  constructor(layers) {
    this.weights = [];
    this.biases = [];
    
    for (let i = 0; i < layers.length - 1; i++) {
      // Xavier initialization
      const scale = Math.sqrt(2 / (layers[i] + layers[i+1]));
      this.weights.push(randomMatrix(layers[i], layers[i+1], scale));
      this.biases.push(zeros(layers[i+1]));
    }
  }
  
  forward(x) {
    let out = x;
    for (let i = 0; i < this.weights.length; i++) {
      out = matmul(out, this.weights[i]);
      out = add(out, this.biases[i]);
      if (i < this.weights.length - 1) {
        out = relu(out);  // Hidden layers
      }
    }
    return out;
  }
}
```

### Target Network Updates

**Hard Update:**
```javascript
// Copy weights every N steps
targetNetwork.weights = JSON.parse(JSON.stringify(onlineNetwork.weights));
```

**Soft Update (Polyak averaging):**
```javascript
// Gradual blend: θ_target = τ×θ_online + (1-τ)×θ_target
for (let i = 0; i < weights.length; i++) {
  targetWeights[i] = tau * onlineWeights[i] + (1 - tau) * targetWeights[i];
}
```

---

# 4. MANUFACTURING APPLICATIONS

## Adaptive Feed Control

```javascript
// Environment: CNC machine with force sensor feedback
class FeedControlEnv {
  constructor(targetForce, machine, material) {
    this.targetForce = targetForce;
    this.machine = machine;
    this.material = material;
    this.feedOverride = 1.0;
  }
  
  reset() {
    this.feedOverride = 1.0;
    return this.getState();
  }
  
  step(action) {
    // Actions: increase, decrease, maintain
    const adjustments = { 0: 0.05, 1: -0.05, 2: 0 };
    this.feedOverride += adjustments[action];
    this.feedOverride = Math.max(0.5, Math.min(1.5, this.feedOverride));
    
    // Simulate cutting force
    const force = simulateForce(this.feedOverride, this.material);
    const error = Math.abs(force - this.targetForce) / this.targetForce;
    
    // Reward: minimize error, penalize oscillation
    const reward = -error - 0.1 * Math.abs(adjustments[action]);
    
    return {
      nextState: this.getState(),
      reward,
      done: false
    };
  }
  
  getState() {
    return [this.feedOverride, currentForce / this.targetForce, forceDerivative];
  }
}

// Train agent
const env = new FeedControlEnv(2000, machine, 'AISI_4140');
const agent = new PRISM_RL_QLEARNING_ENGINE({
  algorithm: 'qlearning',
  learningRate: 0.1,
  gamma: 0.95
});

agent.setActions([0, 1, 2]); // increase, decrease, maintain

for (let ep = 0; ep < 1000; ep++) {
  let state = env.reset();
  for (let step = 0; step < 100; step++) {
    const action = agent.selectAction(state);
    const { nextState, reward, done } = env.step(action);
    agent.update(state, action, reward, nextState);
    state = nextState;
  }
  agent.decayEpsilon();
}
```

## Tool Life Management

```javascript
// State: [speed, feed, accumulated_wear, material_hardness]
// Actions: [continue, reduce_speed, reduce_feed, change_tool]

class ToolLifeEnv {
  reset() {
    this.wear = 0;
    this.partCount = 0;
    return [this.speed, this.feed, 0, this.hardness];
  }
  
  step(action) {
    if (action === 3) {
      // Tool change: cost but fresh tool
      this.wear = 0;
      return { nextState: this.getState(), reward: -100, done: false };
    }
    
    // Adjust parameters
    if (action === 1) this.speed *= 0.9;
    if (action === 2) this.feed *= 0.9;
    
    // Simulate machining
    this.wear += calculateWearRate(this.speed, this.feed, this.hardness);
    this.partCount++;
    
    // Reward: parts produced - tool cost if worn
    let reward = 10; // Per part
    if (this.wear > 0.8) {
      reward -= 500; // Catastrophic wear
      return { nextState: this.getState(), reward, done: true };
    }
    
    return { nextState: this.getState(), reward, done: false };
  }
}
```

## Chatter Avoidance (DQN)

```javascript
// Continuous state: vibration spectrum features
// Needs DQN for function approximation

const dqn = new PRISM_ADVANCED_DQN({
  inputSize: 64,  // FFT bins
  hiddenLayers: [128, 64],
  outputSize: 9,  // 3x3 grid of speed/feed adjustments
  doubleDQN: true
});

class ChatterEnv {
  getState() {
    // FFT of vibration signal
    return computeFFT(vibrationSensor.read(), 64);
  }
  
  step(action) {
    // Decode action to speed/feed adjustment
    const speedAdj = [-10, 0, +10][action % 3];
    const feedAdj = [-10, 0, +10][Math.floor(action / 3)];
    
    applyAdjustment(speedAdj, feedAdj);
    
    const vibLevel = measureVibration();
    const reward = -vibLevel - 0.01 * Math.abs(speedAdj + feedAdj);
    
    return {
      nextState: this.getState(),
      reward,
      done: vibLevel > criticalLevel
    };
  }
}
```

---

# 5. HYPERPARAMETER GUIDE

## Q-Learning / SARSA

| Parameter | Default | Range | Effect |
|-----------|---------|-------|--------|
| learningRate (α) | 0.1 | 0.01-0.5 | Higher = faster learning, less stable |
| gamma (γ) | 0.99 | 0.9-0.999 | Higher = longer horizon |
| epsilon | 1.0 | - | Starting exploration |
| epsilonDecay | 0.995 | 0.99-0.999 | Slower = more exploration |
| epsilonMin | 0.01 | 0.01-0.1 | Minimum exploration |

## DQN

| Parameter | Default | Range | Effect |
|-----------|---------|-------|--------|
| learningRate | 0.001 | 0.0001-0.01 | Standard Adam range |
| gamma | 0.99 | 0.9-0.999 | Discount factor |
| batchSize | 32 | 16-128 | Larger = more stable |
| bufferSize | 10000 | 1000-100000 | More = better diversity |
| targetUpdateFreq | 100 | 10-1000 | Higher = more stable |
| tau (soft update) | 0.01 | 0.001-0.1 | Lower = more stable |

## PER

| Parameter | Default | Range | Effect |
|-----------|---------|-------|--------|
| alpha | 0.6 | 0-1 | 0 = uniform, 1 = full priority |
| beta_start | 0.4 | 0-1 | IS correction start |
| beta_frames | 10000 | - | Frames to anneal β → 1 |

---

# 6. TRAINING STRATEGIES

## Exploration Schedule

```javascript
// Linear decay
epsilon = Math.max(epsilonMin, epsilon - decayRate);

// Exponential decay
epsilon = Math.max(epsilonMin, epsilon * epsilonDecay);

// Step decay
if (episode % 100 === 0) epsilon *= 0.5;
```

## Reward Shaping

```javascript
// Bad: Sparse reward (only at end)
reward = done && success ? 100 : 0;

// Good: Dense reward (every step)
reward = -error - 0.1 * Math.abs(action) + 0.01 * partCount;

// With potential-based shaping (preserves optimal policy)
shapedReward = reward + gamma * potential(s') - potential(s);
```

## Training Tips

1. **Start simple**: Small state/action space first
2. **Normalize states**: Scale to [-1, 1] or [0, 1]
3. **Reward scale**: Keep rewards in reasonable range
4. **Log everything**: Track Q-values, losses, episode returns
5. **Validate offline**: Test on held-out episodes

## Common Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| No learning | Flat Q-values | Check reward function, increase exploration |
| Unstable Q | Q-values explode | Reduce learning rate, add target network |
| Overestimation | Overly optimistic | Use Double DQN |
| Forgetting | Performance drops | Increase buffer size, use PER |
| Stuck in local opt | Same actions | Increase epsilon, use UCB1 |

---

## ERROR CODES

| Code | Description | Resolution |
|------|-------------|------------|
| RL-1001 | Q-values NaN | Reduce learning rate, check rewards |
| RL-1002 | No exploration | Increase epsilon, reset schedule |
| RL-1003 | Training unstable | Add target network, reduce LR |
| RL-1004 | Memory overflow | Reduce buffer size |
| RL-1005 | Convergence failed | Reshape reward, check MDP design |

---

## SELF-TEST

```javascript
// Q-Learning self-test
const agent = new PRISM_RL_QLEARNING_ENGINE();
agent.selfTest();
// Tests: corridor navigation, gridworld

// DQN self-test  
const dqn = new PRISM_ADVANCED_DQN();
dqn.selfTest();
// Tests: network creation, replay buffer, target computation
```

---

**END OF PRISM AI REINFORCEMENT SKILL**
**Version 1.0 | Level 4 Reference | 2 Modules | ~1,240 Lines**
**MIT Foundation: 6.036, Stanford CS 234, Sutton & Barto 2018**
