const PRISM_RL_ENHANCED = {
    name: 'PRISM Reinforcement Learning Enhanced',
    version: '1.0.0',
    source: 'Stanford CS 229, MIT 6.036',
    
    // ─────────────────────────────────────────────────────────────────────────
    // SARSA: On-Policy TD Control
    // Q(s,a) ← Q(s,a) + α[r + γQ(s',a') - Q(s,a)]
    // ─────────────────────────────────────────────────────────────────────────
    SARSA: {
        /**
         * Initialize Q-table for SARSA
         * @param {Array} states - List of state identifiers
         * @param {Array} actions - List of action identifiers
         * @returns {Object} Initialized Q-table
         */
        initQTable: function(states, actions) {
            const Q = {};
            for (const s of states) {
                Q[s] = {};
                for (const a of actions) {
                    Q[s][a] = 0;
                }
            }
            return Q;
        },
        
        /**
         * Select action using epsilon-greedy policy
         * @param {Object} Q - Q-table
         * @param {string} state - Current state
         * @param {Array} actions - Available actions
         * @param {number} epsilon - Exploration rate
         * @returns {string} Selected action
         */
        selectAction: function(Q, state, actions, epsilon = 0.1) {
            if (Math.random() < epsilon) {
                // Explore: random action
                return actions[Math.floor(Math.random() * actions.length)];
            } else {
                // Exploit: best known action
                let bestAction = actions[0];
                let bestValue = Q[state]?.[actions[0]] || 0;
                for (const a of actions) {
                    const value = Q[state]?.[a] || 0;
                    if (value > bestValue) {
                        bestValue = value;
                        bestAction = a;
                    }
                }
                return bestAction;
            }
        },
        
        /**
         * SARSA update step
         * @param {Object} Q - Q-table
         * @param {string} s - Current state
         * @param {string} a - Action taken
         * @param {number} r - Reward received
         * @param {string} s_next - Next state
         * @param {string} a_next - Next action (on-policy)
         * @param {number} alpha - Learning rate
         * @param {number} gamma - Discount factor
         * @returns {Object} Updated Q-table
         */
        update: function(Q, s, a, r, s_next, a_next, alpha = 0.1, gamma = 0.99) {
            // Q(s,a) ← Q(s,a) + α[r + γQ(s',a') - Q(s,a)]
            const currentQ = Q[s]?.[a] || 0;
            const nextQ = Q[s_next]?.[a_next] || 0;
            const target = r + gamma * nextQ;
            const tdError = target - currentQ;
            
            if (!Q[s]) Q[s] = {};
            Q[s][a] = currentQ + alpha * tdError;
            
            return { Q, tdError };
        },
        
        /**
         * Full SARSA episode
         * @param {Object} env - Environment with step(action) method
         * @param {Object} Q - Q-table
         * @param {Object} params - {alpha, gamma, epsilon}
         * @returns {Object} {Q, totalReward}
         */
        episode: function(env, Q, params = {}) {
            const { alpha = 0.1, gamma = 0.99, epsilon = 0.1 } = params;
            const actions = env.getActions();
            
            let state = env.reset();
            let action = this.selectAction(Q, state, actions, epsilon);
            let totalReward = 0;
            let done = false;
            
            while (!done) {
                const { nextState, reward, isDone } = env.step(action);
                const nextAction = this.selectAction(Q, nextState, actions, epsilon);
                
                this.update(Q, state, action, reward, nextState, nextAction, alpha, gamma);
                
                totalReward += reward;
                state = nextState;
                action = nextAction;
                done = isDone;
            }
            
            return { Q, totalReward };
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // Value Iteration (MDP)
    // V(s) = max_a [R(s,a) + γ Σ P(s'|s,a)V(s')]
    // ─────────────────────────────────────────────────────────────────────────
    ValueIteration: {
        /**
         * Run value iteration algorithm
         * @param {Object} mdp - {states, actions, transitions, rewards, gamma}
         * @param {number} epsilon - Convergence threshold
         * @param {number} maxIter - Maximum iterations
         * @returns {Object} {V, policy}
         */
        solve: function(mdp, epsilon = 1e-6, maxIter = 1000) {
            const { states, actions, transitions, rewards, gamma = 0.99 } = mdp;
            
            // Initialize value function
            const V = {};
            for (const s of states) V[s] = 0;
            
            // Iterate until convergence
            for (let iter = 0; iter < maxIter; iter++) {
                let maxDelta = 0;
                
                for (const s of states) {
                    const oldV = V[s];
                    
                    // V(s) = max_a [R(s,a) + γ Σ P(s'|s,a)V(s')]
                    let maxValue = -Infinity;
                    
                    for (const a of actions) {
                        let value = rewards[s]?.[a] || rewards[s] || 0;
                        
                        // Sum over all possible next states
                        for (const s_next of states) {
                            const prob = transitions[s]?.[a]?.[s_next] || 0;
                            value += gamma * prob * V[s_next];
                        }
                        
                        if (value > maxValue) {
                            maxValue = value;
                        }
                    }
                    
                    V[s] = maxValue === -Infinity ? 0 : maxValue;
                    maxDelta = Math.max(maxDelta, Math.abs(oldV - V[s]));
                }
                
                if (maxDelta < epsilon) {
                    console.log(`[ValueIteration] Converged in ${iter} iterations`);
                    break;
                }
            }
            
            // Extract optimal policy
            const policy = this.extractPolicy(mdp, V);
            
            return { V, policy };
        },
        
        /**
         * Extract optimal policy from value function
         */
        extractPolicy: function(mdp, V) {
            const { states, actions, transitions, rewards, gamma = 0.99 } = mdp;
            const policy = {};
            
            for (const s of states) {
                let bestAction = null;
                let bestValue = -Infinity;
                
                for (const a of actions) {
                    let value = rewards[s]?.[a] || rewards[s] || 0;
                    
                    for (const s_next of states) {
                        const prob = transitions[s]?.[a]?.[s_next] || 0;
                        value += gamma * prob * V[s_next];
                    }
                    
                    if (value > bestValue) {
                        bestValue = value;
                        bestAction = a;
                    }
                }
                
                policy[s] = bestAction;
            }
            
            return policy;
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // Policy Gradient (REINFORCE)
    // ∇J(θ) = E[∇log(π(a|s,θ)) * G_t]
    // ─────────────────────────────────────────────────────────────────────────
    PolicyGradient: {
        /**
         * Initialize policy network weights
         */
        initPolicy: function(inputDim, outputDim) {
            // Simple linear softmax policy
            const weights = {
                W: Array(inputDim).fill(0).map(() => 
                    Array(outputDim).fill(0).map(() => (Math.random() - 0.5) * 0.1)
                ),
                b: Array(outputDim).fill(0)
            };
            return weights;
        },
        
        /**
         * Compute softmax probabilities
         */
        softmax: function(logits) {
            const maxLogit = Math.max(...logits);
            const expLogits = logits.map(l => Math.exp(l - maxLogit));
            const sumExp = expLogits.reduce((a, b) => a + b, 0);
            return expLogits.map(e => e / sumExp);
        },
        
        /**
         * Forward pass: state → action probabilities
         */
        forward: function(weights, state) {
            const logits = weights.b.map((b, j) => 
                b + state.reduce((sum, s_i, i) => sum + s_i * weights.W[i][j], 0)
            );
            return this.softmax(logits);
        },
        
        /**
         * Sample action from policy
         */
        sampleAction: function(probs) {
            const r = Math.random();
            let cumProb = 0;
            for (let i = 0; i < probs.length; i++) {
                cumProb += probs[i];
                if (r < cumProb) return i;
            }
            return probs.length - 1;
        },
        
        /**
         * Compute policy gradient
         * ∇log(π(a|s,θ)) = x * (1[a=j] - π(j|s))
         */
        gradLogPolicy: function(weights, state, action) {
            const probs = this.forward(weights, state);
            const gradW = weights.W.map((row, i) => 
                row.map((_, j) => state[i] * ((j === action ? 1 : 0) - probs[j]))
            );
            const gradB = probs.map((p, j) => (j === action ? 1 : 0) - p);
            return { gradW, gradB };
        },
        
        /**
         * REINFORCE update after episode
         * @param {Object} weights - Policy weights
         * @param {Array} trajectory - [{state, action, reward}, ...]
         * @param {number} alpha - Learning rate
         * @param {number} gamma - Discount factor
         */
        update: function(weights, trajectory, alpha = 0.01, gamma = 0.99) {
            // Compute returns G_t
            const T = trajectory.length;
            const returns = new Array(T);
            returns[T - 1] = trajectory[T - 1].reward;
            for (let t = T - 2; t >= 0; t--) {
                returns[t] = trajectory[t].reward + gamma * returns[t + 1];
            }
            
            // Update weights using policy gradient
            for (let t = 0; t < T; t++) {
                const { state, action } = trajectory[t];
                const G_t = returns[t];
                const { gradW, gradB } = this.gradLogPolicy(weights, state, action);
                
                // θ ← θ + α * G_t * ∇log(π(a|s,θ))
                for (let i = 0; i < weights.W.length; i++) {
                    for (let j = 0; j < weights.W[i].length; j++) {
                        weights.W[i][j] += alpha * G_t * gradW[i][j];
                    }
                }
                for (let j = 0; j < weights.b.length; j++) {
                    weights.b[j] += alpha * G_t * gradB[j];
                }
            }
            
            return weights;
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // Actor-Critic
    // Actor: π(a|s,θ), Critic: V(s,w)
    // ─────────────────────────────────────────────────────────────────────────
    ActorCritic: {
        /**
         * Initialize actor-critic networks
         */
        init: function(stateDim, actionDim) {
            return {
                actor: {
                    W: Array(stateDim).fill(0).map(() => 
                        Array(actionDim).fill(0).map(() => (Math.random() - 0.5) * 0.1)
                    ),
                    b: Array(actionDim).fill(0)
                },
                critic: {
                    w: Array(stateDim).fill(0).map(() => (Math.random() - 0.5) * 0.1),
                    b: 0
                }
            };
        },
        
        /**
         * Critic: estimate V(s)
         */
        estimateValue: function(critic, state) {
            return critic.b + state.reduce((sum, s, i) => sum + s * critic.w[i], 0);
        },
        
        /**
         * Actor-Critic update step
         */
        update: function(networks, s, a, r, s_next, done, params = {}) {
            const { alphaActor = 0.01, alphaCritic = 0.1, gamma = 0.99 } = params;
            
            // Compute TD error (advantage estimate)
            const V_s = this.estimateValue(networks.critic, s);
            const V_next = done ? 0 : this.estimateValue(networks.critic, s_next);
            const tdError = r + gamma * V_next - V_s;
            
            // Update Critic: w ← w + α_c * δ * ∇V(s)
            for (let i = 0; i < networks.critic.w.length; i++) {
                networks.critic.w[i] += alphaCritic * tdError * s[i];
            }
            networks.critic.b += alphaCritic * tdError;
            
            // Update Actor: θ ← θ + α_a * δ * ∇log(π(a|s))
            const probs = PRISM_RL_ENHANCED.PolicyGradient.forward(networks.actor, s);
            for (let i = 0; i < networks.actor.W.length; i++) {
                for (let j = 0; j < networks.actor.W[i].length; j++) {
                    const gradLog = s[i] * ((j === a ? 1 : 0) - probs[j]);
                    networks.actor.W[i][j] += alphaActor * tdError * gradLog;
                }
            }
            for (let j = 0; j < networks.actor.b.length; j++) {
                networks.actor.b[j] += alphaActor * tdError * ((j === a ? 1 : 0) - probs[j]);
            }
            
            return { networks, tdError };
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // DQN (Deep Q-Network) - Simplified
    // ─────────────────────────────────────────────────────────────────────────
    DQN: {
        /**
         * Experience replay buffer
         */
        ReplayBuffer: function(capacity = 10000) {
            return {
                buffer: [],
                capacity,
                add: function(experience) {
                    if (this.buffer.length >= this.capacity) {
                        this.buffer.shift();
                    }
                    this.buffer.push(experience);
                },
                sample: function(batchSize) {
                    const samples = [];
                    for (let i = 0; i < batchSize; i++) {
                        const idx = Math.floor(Math.random() * this.buffer.length);
                        samples.push(this.buffer[idx]);
                    }
                    return samples;
                },
                size: function() {
                    return this.buffer.length;
                }
            };
        },
        
        /**
         * Initialize simple Q-network
         */
        initNetwork: function(inputDim, hiddenDim, outputDim) {
            const xavier = (fanIn, fanOut) => Math.sqrt(6 / (fanIn + fanOut));
            return {
                W1: Array(inputDim).fill(0).map(() => 
                    Array(hiddenDim).fill(0).map(() => (Math.random() - 0.5) * 2 * xavier(inputDim, hiddenDim))
                ),
                b1: Array(hiddenDim).fill(0),
                W2: Array(hiddenDim).fill(0).map(() => 
                    Array(outputDim).fill(0).map(() => (Math.random() - 0.5) * 2 * xavier(hiddenDim, outputDim))
                ),
                b2: Array(outputDim).fill(0)
            };
        },
        
        /**
         * Forward pass through Q-network
         */
        forward: function(network, state) {
            // Hidden layer with ReLU
            const hidden = network.b1.map((b, j) => {
                let sum = b;
                for (let i = 0; i < state.length; i++) {
                    sum += state[i] * network.W1[i][j];
                }
                return Math.max(0, sum); // ReLU
            });
            
            // Output layer (Q-values)
            const qValues = network.b2.map((b, k) => {
                let sum = b;
                for (let j = 0; j < hidden.length; j++) {
                    sum += hidden[j] * network.W2[j][k];
                }
                return sum;
            });
            
            return { qValues, hidden };
        },
        
        /**
         * DQN training step with experience replay
         */
        trainStep: function(network, targetNetwork, replayBuffer, params = {}) {
            const { batchSize = 32, gamma = 0.99, alpha = 0.001 } = params;
            
            if (replayBuffer.size() < batchSize) return;
            
            const batch = replayBuffer.sample(batchSize);
            
            for (const { state, action, reward, nextState, done } of batch) {
                // Current Q-values
                const { qValues, hidden } = this.forward(network, state);
                
                // Target Q-value
                const { qValues: nextQ } = this.forward(targetNetwork, nextState);
                const maxNextQ = done ? 0 : Math.max(...nextQ);
                const target = reward + gamma * maxNextQ;
                
                // TD error for selected action
                const tdError = target - qValues[action];
                
                // Simple gradient update (backprop through network)
                // Update W2
                for (let j = 0; j < network.W2.length; j++) {
                    network.W2[j][action] += alpha * tdError * hidden[j];
                }
                network.b2[action] += alpha * tdError;
                
                // Update W1 (simplified - only affects hidden neurons that contributed to action)
                for (let i = 0; i < network.W1.length; i++) {
                    for (let j = 0; j < network.W1[i].length; j++) {
                        if (hidden[j] > 0) { // ReLU derivative
                            network.W1[i][j] += alpha * tdError * network.W2[j][action] * state[i];
                        }
                    }
                }
            }
        },
        
        /**
         * Copy weights from online to target network
         */
        updateTarget: function(network, targetNetwork) {
            for (let i = 0; i < network.W1.length; i++) {
                targetNetwork.W1[i] = [...network.W1[i]];
            }
            targetNetwork.b1 = [...network.b1];
            for (let j = 0; j < network.W2.length; j++) {
                targetNetwork.W2[j] = [...network.W2[j]];
            }
            targetNetwork.b2 = [...network.b2];
        }
    }
}