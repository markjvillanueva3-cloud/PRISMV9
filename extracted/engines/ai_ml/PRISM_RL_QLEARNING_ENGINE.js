// PRISM_RL_QLEARNING_ENGINE - Q-Learning and SARSA Implementation
// Built from MIT 6.036, Stanford CS 234, Sutton & Barto 2018
// No monolith source found - built from academic foundations

const PRISM_RL_QLEARNING_ENGINE = {
    name: 'PRISM_RL_QLEARNING_ENGINE',
    version: '1.0.0',
    authority: 'PRISM_RL_QLEARNING_ENGINE',
    source: 'MIT 6.036, Stanford CS 234, Sutton & Barto 2018',

    // CONFIGURATION
    config: {
        // Learning parameters
        LEARNING_RATE: 0.1,           // α - step size
        DISCOUNT_FACTOR: 0.99,        // γ - importance of future rewards
        
        // Exploration
        EPSILON: 1.0,                 // Initial exploration rate
        EPSILON_MIN: 0.01,            // Minimum exploration
        EPSILON_DECAY: 0.995,         // Decay per episode
        
        // Training
        MAX_EPISODES: 1000,
        MAX_STEPS_PER_EPISODE: 500,
        
        // State discretization
        STATE_BINS: 20                // For continuous state spaces
    },

    // SECTION 1: Q-TABLE MANAGEMENT

    /**
     * Create Q-Learning agent
     */
    createAgent: function(options = {}) {
        const {
            stateSize = 10,
            actionSize = 4,
            learningRate = this.config.LEARNING_RATE,
            discountFactor = this.config.DISCOUNT_FACTOR,
            epsilon = this.config.EPSILON,
            epsilonMin = this.config.EPSILON_MIN,
            epsilonDecay = this.config.EPSILON_DECAY,
            algorithm = 'qlearning'  // 'qlearning' or 'sarsa'
        } = options;
        
        return {
            stateSize,
            actionSize,
            learningRate,
            discountFactor,
            epsilon,
            epsilonMin,
            epsilonDecay,
            algorithm,
            qTable: new Map(),
            visitCounts: new Map(),
            totalSteps: 0,
            episodeRewards: [],
            
            /**
             * Convert state to string key
             */
            _stateKey: function(state) {
                if (Array.isArray(state)) {
                    return state.map(s => s.toFixed(4)).join(',');
                }
                return String(state);
            },
            
            /**
             * Get Q-value for state-action pair
             */
            getQ: function(state, action) {
                const key = this._stateKey(state);
                if (!this.qTable.has(key)) {
                    this.qTable.set(key, new Array(this.actionSize).fill(0));
                }
                return this.qTable.get(key)[action];
            },
            
            /**
             * Set Q-value
             */
            setQ: function(state, action, value) {
                const key = this._stateKey(state);
                if (!this.qTable.has(key)) {
                    this.qTable.set(key, new Array(this.actionSize).fill(0));
                }
                this.qTable.get(key)[action] = value;
            },
            
            /**
             * Get all Q-values for a state
             */
            getQValues: function(state) {
                const key = this._stateKey(state);
                if (!this.qTable.has(key)) {
                    this.qTable.set(key, new Array(this.actionSize).fill(0));
                }
                return this.qTable.get(key);
            },
            
            /**
             * Epsilon-greedy action selection
             */
            selectAction: function(state, training = true) {
                // Exploration
                if (training && Math.random() < this.epsilon) {
                    return Math.floor(Math.random() * this.actionSize);
                }
                
                // Exploitation - select best action
                const qValues = this.getQValues(state);
                const maxQ = Math.max(...qValues);
                
                // Random tie-breaking among max actions
                const maxActions = qValues.map((q, i) => q === maxQ ? i : -1).filter(i => i >= 0);
                return maxActions[Math.floor(Math.random() * maxActions.length)];
            },
            
            /**
             * Softmax action selection (Boltzmann exploration)
             */
            selectActionSoftmax: function(state, temperature = 1.0) {
                const qValues = this.getQValues(state);
                const maxQ = Math.max(...qValues);
                
                // Compute softmax probabilities (with numerical stability)
                const expValues = qValues.map(q => Math.exp((q - maxQ) / temperature));
                const sumExp = expValues.reduce((s, e) => s + e, 0);
                const probabilities = expValues.map(e => e / sumExp);
                
                // Sample from distribution
                const rand = Math.random();
                let cumProb = 0;
                for (let i = 0; i < probabilities.length; i++) {
                    cumProb += probabilities[i];
                    if (rand < cumProb) return i;
                }
                return this.actionSize - 1;
            },
            
            /**
             * UCB1 action selection
             */
            selectActionUCB: function(state, c = 2.0) {
                const key = this._stateKey(state);
                const qValues = this.getQValues(state);
                
                if (!this.visitCounts.has(key)) {
                    this.visitCounts.set(key, new Array(this.actionSize).fill(0));
                }
                const visits = this.visitCounts.get(key);
                const totalVisits = visits.reduce((s, v) => s + v, 0);
                
                // If any action not tried, try it
                for (let i = 0; i < this.actionSize; i++) {
                    if (visits[i] === 0) return i;
                }
                
                // UCB1 formula
                const ucbValues = qValues.map((q, i) => 
                    q + c * Math.sqrt(Math.log(totalVisits) / visits[i])
                );
                
                return ucbValues.indexOf(Math.max(...ucbValues));
            },
            
            /**
             * Q-Learning update (off-policy)
             * Q(s,a) ← Q(s,a) + α[r + γ·max_a' Q(s',a') - Q(s,a)]
             */
            learnQLearning: function(state, action, reward, nextState, done) {
                const currentQ = this.getQ(state, action);
                
                let targetQ;
                if (done) {
                    targetQ = reward;
                } else {
                    const nextQValues = this.getQValues(nextState);
                    const maxNextQ = Math.max(...nextQValues);
                    targetQ = reward + this.discountFactor * maxNextQ;
                }
                
                // TD update
                const newQ = currentQ + this.learningRate * (targetQ - currentQ);
                this.setQ(state, action, newQ);
                
                // Update visit count
                const key = this._stateKey(state);
                if (!this.visitCounts.has(key)) {
                    this.visitCounts.set(key, new Array(this.actionSize).fill(0));
                }
                this.visitCounts.get(key)[action]++;
                this.totalSteps++;
                
                return { tdError: targetQ - currentQ, newQ };
            },
            
            /**
             * SARSA update (on-policy)
             * Q(s,a) ← Q(s,a) + α[r + γ·Q(s',a') - Q(s,a)]
             */
            learnSARSA: function(state, action, reward, nextState, nextAction, done) {
                const currentQ = this.getQ(state, action);
                
                let targetQ;
                if (done) {
                    targetQ = reward;
                } else {
                    targetQ = reward + this.discountFactor * this.getQ(nextState, nextAction);
                }
                
                const newQ = currentQ + this.learningRate * (targetQ - currentQ);
                this.setQ(state, action, newQ);
                
                const key = this._stateKey(state);
                if (!this.visitCounts.has(key)) {
                    this.visitCounts.set(key, new Array(this.actionSize).fill(0));
                }
                this.visitCounts.get(key)[action]++;
                this.totalSteps++;
                
                return { tdError: targetQ - currentQ, newQ };
            },
            
            /**
             * Expected SARSA update
             */
            learnExpectedSARSA: function(state, action, reward, nextState, done) {
                const currentQ = this.getQ(state, action);
                
                let targetQ;
                if (done) {
                    targetQ = reward;
                } else {
                    const nextQValues = this.getQValues(nextState);
                    const maxQ = Math.max(...nextQValues);
                    
                    // Expected value under ε-greedy policy
                    const greedyProb = 1 - this.epsilon + this.epsilon / this.actionSize;
                    const randomProb = this.epsilon / this.actionSize;
                    
                    let expectedQ = 0;
                    for (let a = 0; a < this.actionSize; a++) {
                        if (nextQValues[a] === maxQ) {
                            expectedQ += greedyProb * nextQValues[a];
                        } else {
                            expectedQ += randomProb * nextQValues[a];
                        }
                    }
                    
                    targetQ = reward + this.discountFactor * expectedQ;
                }
                
                const newQ = currentQ + this.learningRate * (targetQ - currentQ);
                this.setQ(state, action, newQ);
                this.totalSteps++;
                
                return { tdError: targetQ - currentQ, newQ };
            },
            
            /**
             * Main learn function - dispatches to appropriate algorithm
             */
            learn: function(state, action, reward, nextState, done, nextAction = null) {
                switch (this.algorithm) {
                    case 'sarsa':
                        if (nextAction === null) {
                            nextAction = this.selectAction(nextState);
                        }
                        return this.learnSARSA(state, action, reward, nextState, nextAction, done);
                    case 'expected_sarsa':
                        return this.learnExpectedSARSA(state, action, reward, nextState, done);
                    case 'qlearning':
                    default:
                        return this.learnQLearning(state, action, reward, nextState, done);
                }
            },
            
            /**
             * Decay exploration rate
             */
            decayEpsilon: function() {
                this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);
            },
            
            /**
             * Get optimal policy
             */
            getPolicy: function() {
                const policy = {};
                for (const [state, qValues] of this.qTable.entries()) {
                    policy[state] = qValues.indexOf(Math.max(...qValues));
                }
                return policy;
            },
            
            /**
             * Serialize agent for saving
             */
            save: function() {
                return {
                    qTable: Array.from(this.qTable.entries()),
                    visitCounts: Array.from(this.visitCounts.entries()),
                    epsilon: this.epsilon,
                    totalSteps: this.totalSteps,
                    episodeRewards: this.episodeRewards,
                    config: {
                        stateSize: this.stateSize,
                        actionSize: this.actionSize,
                        learningRate: this.learningRate,
                        discountFactor: this.discountFactor,
                        epsilonMin: this.epsilonMin,
                        epsilonDecay: this.epsilonDecay,
                        algorithm: this.algorithm
                    }
                };
            },
            
            /**
             * Load serialized agent
             */
            load: function(data) {
                this.qTable = new Map(data.qTable);
                this.visitCounts = new Map(data.visitCounts || []);
                this.epsilon = data.epsilon;
                this.totalSteps = data.totalSteps || 0;
                this.episodeRewards = data.episodeRewards || [];
                Object.assign(this, data.config);
            }
        };
    },

    // SECTION 2: TRAINING UTILITIES

    /**
     * Train agent on environment
     */
    train: function(agent, env, options = {}) {
        const {
            episodes = this.config.MAX_EPISODES,
            maxSteps = this.config.MAX_STEPS_PER_EPISODE,
            verbose = false,
            verboseInterval = 100,
            callback = null,
            earlyStop = null  // Function(agent, episode) => boolean
        } = options;
        
        const history = {
            episodeRewards: [],
            episodeLengths: [],
            epsilons: [],
            avgRewards: []
        };
        
        for (let ep = 0; ep < episodes; ep++) {
            let state = env.reset();
            let totalReward = 0;
            let steps = 0;
            
            let action = agent.selectAction(state);  // For SARSA
            
            for (let step = 0; step < maxSteps; step++) {
                if (agent.algorithm === 'qlearning' || agent.algorithm === 'expected_sarsa') {
                    action = agent.selectAction(state);
                }
                
                const result = env.step(action);
                const { nextState, reward, done } = result;
                
                let nextAction = null;
                if (agent.algorithm === 'sarsa' && !done) {
                    nextAction = agent.selectAction(nextState);
                }
                
                agent.learn(state, action, reward, nextState, done, nextAction);
                
                state = nextState;
                action = nextAction || action;
                totalReward += reward;
                steps++;
                
                if (done) break;
            }
            
            agent.decayEpsilon();
            agent.episodeRewards.push(totalReward);
            
            history.episodeRewards.push(totalReward);
            history.episodeLengths.push(steps);
            history.epsilons.push(agent.epsilon);
            
            // Running average
            const windowSize = Math.min(100, history.episodeRewards.length);
            const recentRewards = history.episodeRewards.slice(-windowSize);
            const avgReward = recentRewards.reduce((s, r) => s + r, 0) / windowSize;
            history.avgRewards.push(avgReward);
            
            if (verbose && (ep + 1) % verboseInterval === 0) {
                console.log(`Episode ${ep + 1}: Reward=${totalReward.toFixed(2)}, ` +
                           `Avg(100)=${avgReward.toFixed(2)}, ε=${agent.epsilon.toFixed(4)}, ` +
                           `States=${agent.qTable.size}`);
            }
            
            if (callback) callback(ep, agent, history);
            
            if (earlyStop && earlyStop(agent, ep)) {
                console.log(`Early stopping at episode ${ep + 1}`);
                break;
            }
        }
        
        return { agent, history };
    },

    /**
     * Evaluate agent (no learning)
     */
    evaluate: function(agent, env, options = {}) {
        const { episodes = 100, maxSteps = 500 } = options;
        
        const savedEpsilon = agent.epsilon;
        agent.epsilon = 0;  // Pure exploitation
        
        const rewards = [];
        const lengths = [];
        
        for (let ep = 0; ep < episodes; ep++) {
            let state = env.reset();
            let totalReward = 0;
            let steps = 0;
            
            for (let step = 0; step < maxSteps; step++) {
                const action = agent.selectAction(state, false);
                const { nextState, reward, done } = env.step(action);
                
                state = nextState;
                totalReward += reward;
                steps++;
                
                if (done) break;
            }
            
            rewards.push(totalReward);
            lengths.push(steps);
        }
        
        agent.epsilon = savedEpsilon;  // Restore
        
        return {
            meanReward: rewards.reduce((s, r) => s + r, 0) / episodes,
            stdReward: Math.sqrt(rewards.reduce((s, r, _, arr) => {
                const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
                return s + Math.pow(r - mean, 2);
            }, 0) / episodes),
            maxReward: Math.max(...rewards),
            minReward: Math.min(...rewards),
            meanLength: lengths.reduce((s, l) => s + l, 0) / episodes,
            rewards,
            lengths
        };
    },

    // SECTION 3: STATE DISCRETIZATION

    /**
     * Discretize continuous state
     */
    discretizeState: function(state, bounds, bins = this.config.STATE_BINS) {
        return state.map((value, i) => {
            const [min, max] = bounds[i];
            const binSize = (max - min) / bins;
            let bin = Math.floor((value - min) / binSize);
            bin = Math.max(0, Math.min(bins - 1, bin));
            return bin;
        });
    },

    /**
     * Create discretizing wrapper for continuous environments
     */
    discretizeEnvironment: function(env, stateBounds, bins = this.config.STATE_BINS) {
        const self = this;
        return {
            ...env,
            reset: function() {
                const state = env.reset();
                return self.discretizeState(state, stateBounds, bins);
            },
            step: function(action) {
                const result = env.step(action);
                return {
                    ...result,
                    nextState: self.discretizeState(result.nextState, stateBounds, bins)
                };
            }
        };
    },

    // SECTION 4: MANUFACTURING RL APPLICATION

    /**
     * Create cutting parameter optimization agent
     */
    createCuttingOptimizationAgent: function(options = {}) {
        // State: [wear_level, force_level, temp_level, quality_level]
        // Actions: [increase_feedrate, decrease_feedrate, increase_rpm, decrease_rpm, maintain]
        
        return this.createAgent({
            stateSize: 4,
            actionSize: 5,
            learningRate: options.learningRate || 0.05,
            discountFactor: options.discountFactor || 0.95,
            epsilon: 0.8,
            epsilonDecay: 0.99,
            algorithm: 'qlearning'
        });
    },

    // SECTION 5: SELF-TEST

    selfTest: function() {
        console.log('[PRISM_RL_Q] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };
        
        // Test 1: Agent creation
        try {
            const agent = this.createAgent({ stateSize: 5, actionSize: 3 });
            const pass = agent && agent.qTable instanceof Map;
            
            results.tests.push({
                name: 'Agent creation',
                pass,
                stateSize: agent.stateSize,
                actionSize: agent.actionSize
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Agent creation', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 2: Q-value updates
        try {
            const agent = this.createAgent({ actionSize: 4 });
            
            const state = [0, 1];
            const action = 2;
            
            agent.setQ(state, action, 5.0);
            const retrieved = agent.getQ(state, action);
            
            const pass = retrieved === 5.0;
            
            results.tests.push({
                name: 'Q-value storage',
                pass,
                stored: 5.0,
                retrieved
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Q-value storage', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 3: Learning update
        try {
            const agent = this.createAgent({ 
                actionSize: 2, 
                learningRate: 0.5,
                discountFactor: 0.9 
            });
            
            // Q(s,a) should move toward r + γ*max(Q(s'))
            const state = [0];
            const nextState = [1];
            agent.setQ(nextState, 0, 10);
            agent.setQ(nextState, 1, 5);
            
            const result = agent.learnQLearning(state, 0, 1, nextState, false);
            // Target = 1 + 0.9 * 10 = 10
            // New Q = 0 + 0.5 * (10 - 0) = 5
            
            const pass = Math.abs(result.newQ - 5) < 0.01;
            
            results.tests.push({
                name: 'Q-Learning update',
                pass,
                expectedNewQ: 5,
                actualNewQ: result.newQ.toFixed(2)
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Q-Learning update', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 4: Action selection
        try {
            const agent = this.createAgent({ actionSize: 3 });
            
            // Set up Q-values so action 1 is best
            const state = [0];
            agent.setQ(state, 0, 1);
            agent.setQ(state, 1, 10);
            agent.setQ(state, 2, 5);
            
            // With epsilon=0, should always pick action 1
            agent.epsilon = 0;
            let correct = 0;
            for (let i = 0; i < 10; i++) {
                if (agent.selectAction(state) === 1) correct++;
            }
            
            const pass = correct === 10;
            
            results.tests.push({
                name: 'Greedy action selection',
                pass,
                correctSelections: correct
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Action selection', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 5: Simple environment training
        try {
            // Simple corridor: states 0-9, actions left(0)/right(1), goal at 9
            const corridorEnv = {
                state: 0,
                reset: function() { this.state = 0; return [this.state]; },
                step: function(action) {
                    if (action === 1) this.state = Math.min(9, this.state + 1);
                    else this.state = Math.max(0, this.state - 1);
                    
                    const done = this.state === 9;
                    const reward = done ? 10 : -0.1;
                    return { nextState: [this.state], reward, done };
                }
            };
            
            const agent = this.createAgent({
                actionSize: 2,
                learningRate: 0.3,
                discountFactor: 0.95,
                epsilon: 0.3
            });
            
            // Quick training
            for (let ep = 0; ep < 100; ep++) {
                let state = corridorEnv.reset();
                for (let step = 0; step < 50; step++) {
                    const action = agent.selectAction(state);
                    const { nextState, reward, done } = corridorEnv.step(action);
                    agent.learnQLearning(state, action, reward, nextState, done);
                    state = nextState;
                    if (done) break;
                }
            }
            
            // Test: agent should prefer right (1) in most states
            agent.epsilon = 0;
            let preferRight = 0;
            for (let s = 0; s < 9; s++) {
                if (agent.selectAction([s]) === 1) preferRight++;
            }
            
            const pass = preferRight >= 7;
            
            results.tests.push({
                name: 'Corridor training',
                pass,
                statesPreferringRight: preferRight,
                qTableSize: agent.qTable.size
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Corridor training', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 6: Save/Load
        try {
            const agent = this.createAgent({ actionSize: 3 });
            agent.setQ([0], 1, 5.5);
            agent.epsilon = 0.42;
            
            const saved = agent.save();
            
            const newAgent = this.createAgent({ actionSize: 3 });
            newAgent.load(saved);
            
            const pass = newAgent.getQ([0], 1) === 5.5 && newAgent.epsilon === 0.42;
            
            results.tests.push({
                name: 'Save/Load',
                pass,
                restoredQ: newAgent.getQ([0], 1),
                restoredEpsilon: newAgent.epsilon
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Save/Load', pass: false, error: e.message });
            results.failed++;
        }
        
        console.log(`[PRISM_RL_Q] Tests complete: ${results.passed}/${results.passed + results.failed} passed`);
        return results;
    }
};

// Export
if (typeof window !== 'undefined') window.PRISM_RL_QLEARNING_ENGINE = PRISM_RL_QLEARNING_ENGINE;
if (typeof module !== 'undefined') module.exports = PRISM_RL_QLEARNING_ENGINE;
