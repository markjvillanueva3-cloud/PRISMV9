---
name: prism-ai-reinforcement
description: |
  Reinforcement learning patterns. Q-learning, policy gradient.
---

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

## ERROR CODES

| Code | Description | Resolution |
|------|-------------|------------|
| RL-1001 | Q-values NaN | Reduce learning rate, check rewards |
| RL-1002 | No exploration | Increase epsilon, reset schedule |
| RL-1003 | Training unstable | Add target network, reduce LR |
| RL-1004 | Memory overflow | Reduce buffer size |
| RL-1005 | Convergence failed | Reshape reward, check MDP design |

**END OF PRISM AI REINFORCEMENT SKILL**
**Version 1.0 | Level 4 Reference | 2 Modules | ~1,240 Lines**
**MIT Foundation: 6.036, Stanford CS 234, Sutton & Barto 2018**
