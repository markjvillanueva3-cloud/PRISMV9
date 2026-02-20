const PRISM_RL_COMPLETE = {
    name: 'PRISM Reinforcement Learning Complete',
    version: '1.0.0',
    source: 'Stanford CS 229, MIT 6.036, MIT 6.867',
    
    // ─────────────────────────────────────────────────────────────────────────────────────────
    // Q-LEARNING: Off-Policy TD Control
    // Q(s,a) ← Q(s,a) + α[r + γ max_a' Q(s',a') - Q(s,a)]
    // ─────────────────────────────────────────────────────────────────────────────────────────
    QLearning: {
        /**
         * Initialize Q-table for Q-Learning
         * @param {Array} states - List of state identifiers
         * @param {Array} actions - List of action identifiers
         * @param {number} initValue - Initial Q-value (default 0)
         * @returns {Map} Q-table as Map for efficient lookup
         */
        createAgent: function(states, actions, initValue = 0) {
            const Q = new Map();
            for (const s of states) {
                const actionValues = new Map();
                for (const a of actions) {
                    actionValues.set(a, initValue);
                }
                Q.set(s, actionValues);
            }
            return {
                Q,
                actions,
                episodeRewards: [],
                totalSteps: 0
            };
        },
        
        /**
         * Get Q-value for state-action pair
         */
        getQ: function(agent, state, action) {
            if (!agent.Q.has(state)) {
                agent.Q.set(state, new Map());
            }
            if (!agent.Q.get(state).has(action)) {
                agent.Q.get(state).set(action, 0);
            }
            return agent.Q.get(state).get(action);
        },
        
        /**
         * Set Q-value for state-action pair
         */
        setQ: function(agent, state, action, value) {
            if (!agent.Q.has(state)) {
                agent.Q.set(state, new Map());
            }
            agent.Q.get(state).set(action, value);
        },
        
        /**
         * Select action using epsilon-greedy policy
         */
        selectAction: function(agent, state, epsilon = 0.1) {
            if (Math.random() < epsilon) {
                // Explore: random action
                return agent.actions[Math.floor(Math.random() * agent.actions.length)];
            } else {
                // Exploit: best known action
                return this.getBestAction(agent, state);
            }
        },
        
        /**
         * Get best action for a state
         */
        getBestAction: function(agent, state) {
            let bestAction = agent.actions[0];
            let bestValue = this.getQ(agent, state, agent.actions[0]);
            
            for (const action of agent.actions) {
                const value = this.getQ(agent, state, action);
                if (value > bestValue) {
                    bestValue = value;
                    bestAction = action;
                }
            }
            return bestAction;
        },
        
        /**
         * Q-Learning update step (off-policy)
         * @param {Object} agent - Q-learning agent
         * @param {*} state - Current state
         * @param {*} action - Action taken
         * @param {number} reward - Reward received
         * @param {*} nextState - Next state
         * @param {boolean} done - Episode terminal flag
         * @param {number} alpha - Learning rate
         * @param {number} gamma - Discount factor
         */
        update: function(agent, state, action, reward, nextState, done, alpha = 0.1, gamma = 0.99) {
            const currentQ = this.getQ(agent, state, action);
            
            // Find max Q-value for next state (off-policy: use max, not actual next action)
            let maxNextQ = 0;
            if (!done) {
                maxNextQ = Math.max(...agent.actions.map(a => this.getQ(agent, nextState, a)));
            }
            
            // Q-learning update: Q(s,a) ← Q(s,a) + α[r + γ max_a' Q(s',a') - Q(s,a)]
            const target = reward + gamma * maxNextQ;
            const tdError = target - currentQ;
            const newQ = currentQ + alpha * tdError;
            
            this.setQ(agent, state, action, newQ);
            agent.totalSteps++;
            
            return { newQ, tdError, target };
        },
        
        /**
         * Run full Q-Learning episode
         */
        episode: function(agent, env, params = {}) {
            const { alpha = 0.1, gamma = 0.99, epsilon = 0.1, maxSteps = 1000 } = params;
            
            let state = env.reset();
            let totalReward = 0;
            let steps = 0;
            
            while (steps < maxSteps) {
                const action = this.selectAction(agent, state, epsilon);
                const { nextState, reward, done } = env.step(action);
                
                this.update(agent, state, action, reward, nextState, done, alpha, gamma);
                
                totalReward += reward;
                state = nextState;
                steps++;
                
                if (done) break;
            }
            
            agent.episodeRewards.push(totalReward);
            return { totalReward, steps };
        },
        
        /**
         * Get policy from Q-table
         */
        extractPolicy: function(agent) {
            const policy = {};
            for (const [state, _] of agent.Q) {
                policy[state] = this.getBestAction(agent, state);
            }
            return policy;
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────────
    // VALUE ITERATION: Dynamic Programming for Known MDPs
    // V(s) = max_a [R(s,a) + γ Σ P(s'|s,a)V(s')]
    // ─────────────────────────────────────────────────────────────────────────────────────────
    ValueIteration: {
        /**
         * Value Iteration algorithm for known MDP
         * @param {Object} mdp - {states, actions, transitions, rewards, gamma}
         * @param {number} epsilon - Convergence threshold
         * @param {number} maxIter - Maximum iterations
         * @returns {Object} {V, policy, iterations}
         */
        solve: function(mdp, epsilon = 1e-6, maxIter = 1000) {
            const { states, actions, transitions, rewards, gamma = 0.99 } = mdp;
            
            // Initialize value function
            const V = new Map();
            for (const s of states) {
                V.set(s, 0);
            }
            
            let iterations = 0;
            
            // Iterate until convergence
            for (let iter = 0; iter < maxIter; iter++) {
                let maxDelta = 0;
                iterations++;
                
                for (const s of states) {
                    const oldV = V.get(s);
                    
                    // V(s) = max_a [R(s,a) + γ Σ P(s'|s,a)V(s')]
                    let maxValue = -Infinity;
                    
                    for (const a of actions) {
                        // Get reward for (s,a)
                        let value = this._getReward(rewards, s, a);
                        
                        // Sum over all possible next states
                        for (const s_next of states) {
                            const prob = this._getTransitionProb(transitions, s, a, s_next);
                            value += gamma * prob * V.get(s_next);
                        }
                        
                        maxValue = Math.max(maxValue, value);
                    }
                    
                    V.set(s, maxValue === -Infinity ? 0 : maxValue);
                    maxDelta = Math.max(maxDelta, Math.abs(oldV - V.get(s)));
                }
                
                if (maxDelta < epsilon) {
                    console.log(`[ValueIteration] Converged in ${iter + 1} iterations (delta=${maxDelta.toExponential(2)})`);
                    break;
                }
            }
            
            // Extract optimal policy
            const policy = this.extractPolicy(mdp, V);
            
            return { V: Object.fromEntries(V), policy, iterations };
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
                    let value = this._getReward(rewards, s, a);
                    
                    for (const s_next of states) {
                        const prob = this._getTransitionProb(transitions, s, a, s_next);
                        value += gamma * prob * V.get(s_next);
                    }
                    
                    if (value > bestValue) {
                        bestValue = value;
                        bestAction = a;
                    }
                }
                
                policy[s] = bestAction;
            }
            
            return policy;
        },
        
        _getReward: function(rewards, s, a) {
            if (typeof rewards === 'function') return rewards(s, a);
            if (rewards[s]?.[a] !== undefined) return rewards[s][a];
            if (rewards[s] !== undefined) return rewards[s];
            return 0;
        },
        
        _getTransitionProb: function(transitions, s, a, s_next) {
            if (typeof transitions === 'function') return transitions(s, a, s_next);
            return transitions[s]?.[a]?.[s_next] || 0;
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────────
    // POLICY GRADIENT: REINFORCE with Baseline
    // ∇J(θ) = E[∇log(π(a|s,θ)) * (G_t - b(s))]
    // ─────────────────────────────────────────────────────────────────────────────────────────
    PolicyGradient: {
        /**
         * Initialize policy network (softmax linear policy)
         */
        createAgent: function(inputDim, outputDim) {
            const he = (fanIn) => Math.sqrt(2 / fanIn);
            return {
                // Policy weights
                W: Array(inputDim).fill(0).map(() => 
                    Array(outputDim).fill(0).map(() => (Math.random() - 0.5) * 2 * he(inputDim))
                ),
                b: Array(outputDim).fill(0),
                // Baseline (value function approximation)
                V_w: Array(inputDim).fill(0).map(() => (Math.random() - 0.5) * 0.1),
                V_b: 0,
                // Statistics
                episodeRewards: []
            };
        },
        
        /**
         * Softmax probabilities
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
        forward: function(agent, state) {
            const logits = agent.b.map((b, j) => 
                b + state.reduce((sum, s_i, i) => sum + s_i * agent.W[i][j], 0)
            );
            return this.softmax(logits);
        },
        
        /**
         * Estimate baseline value V(s)
         */
        baseline: function(agent, state) {
            return agent.V_b + state.reduce((sum, s, i) => sum + s * agent.V_w[i], 0);
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
         * REINFORCE update with baseline
         * @param {Object} agent - Policy gradient agent
         * @param {Array} trajectory - [{state, action, reward}, ...]
         * @param {Object} params - {alphaPolicy, alphaBaseline, gamma}
         */
        update: function(agent, trajectory, params = {}) {
            const { alphaPolicy = 0.01, alphaBaseline = 0.1, gamma = 0.99 } = params;
            
            const T = trajectory.length;
            if (T === 0) return agent;
            
            // Compute returns G_t
            const returns = new Array(T);
            returns[T - 1] = trajectory[T - 1].reward;
            for (let t = T - 2; t >= 0; t--) {
                returns[t] = trajectory[t].reward + gamma * returns[t + 1];
            }
            
            // Update policy and baseline
            for (let t = 0; t < T; t++) {
                const { state, action } = trajectory[t];
                const G_t = returns[t];
                const b_t = this.baseline(agent, state);
                const advantage = G_t - b_t;
                
                // Update baseline (value function)
                const baselineError = G_t - b_t;
                for (let i = 0; i < agent.V_w.length; i++) {
                    agent.V_w[i] += alphaBaseline * baselineError * state[i];
                }
                agent.V_b += alphaBaseline * baselineError;
                
                // Update policy: θ ← θ + α * advantage * ∇log(π(a|s,θ))
                const probs = this.forward(agent, state);
                for (let i = 0; i < agent.W.length; i++) {
                    for (let j = 0; j < agent.W[i].length; j++) {
                        const gradLog = state[i] * ((j === action ? 1 : 0) - probs[j]);
                        agent.W[i][j] += alphaPolicy * advantage * gradLog;
                    }
                }
                for (let j = 0; j < agent.b.length; j++) {
                    agent.b[j] += alphaPolicy * advantage * ((j === action ? 1 : 0) - probs[j]);
                }
            }
            
            return agent;
        },
        
        /**
         * Run episode with REINFORCE
         */
        episode: function(agent, env, params = {}) {
            const { alphaPolicy = 0.01, alphaBaseline = 0.1, gamma = 0.99, maxSteps = 1000 } = params;
            
            const trajectory = [];
            let state = env.reset();
            let totalReward = 0;
            
            for (let step = 0; step < maxSteps; step++) {
                const probs = this.forward(agent, state);
                const action = this.sampleAction(probs);
                const { nextState, reward, done } = env.step(action);
                
                trajectory.push({ state: [...state], action, reward });
                totalReward += reward;
                
                if (done) break;
                state = nextState;
            }
            
            // Update agent with collected trajectory
            this.update(agent, trajectory, params);
            agent.episodeRewards.push(totalReward);
            
            return { totalReward, steps: trajectory.length, trajectory };
        }
    }
}