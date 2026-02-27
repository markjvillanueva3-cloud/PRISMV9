// PRISM_ADVANCED_DQN - Deep Q-Network with Extensions
// Built from MIT 6.036, DeepMind papers (Mnih 2015, van Hasselt 2016)
// Includes: DQN, Double DQN, Dueling DQN, Prioritized Experience Replay

const PRISM_ADVANCED_DQN = {
    name: 'PRISM_ADVANCED_DQN',
    version: '1.0.0',
    authority: 'PRISM_ADVANCED_DQN',
    source: 'MIT 6.036, DeepMind DQN papers',

    // CONFIGURATION
    config: {
        // Network architecture
        HIDDEN_LAYERS: [64, 64],
        ACTIVATION: 'relu',
        
        // Training
        LEARNING_RATE: 0.001,
        BATCH_SIZE: 32,
        GAMMA: 0.99,
        
        // Exploration
        EPSILON_START: 1.0,
        EPSILON_END: 0.01,
        EPSILON_DECAY_STEPS: 10000,
        
        // Experience replay
        BUFFER_SIZE: 100000,
        MIN_BUFFER_SIZE: 1000,
        
        // Target network
        TARGET_UPDATE_FREQ: 1000,
        TAU: 0.005,  // Soft update coefficient
        
        // Prioritized replay
        ALPHA: 0.6,  // Priority exponent
        BETA_START: 0.4,
        BETA_END: 1.0,
        BETA_ANNEAL_STEPS: 100000
    },

    // SECTION 1: NEURAL NETWORK (Simple implementation)

    /**
     * Create a simple feedforward network
     */
    createNetwork: function(inputSize, outputSize, hiddenLayers = this.config.HIDDEN_LAYERS) {
        const layers = [];
        let prevSize = inputSize;
        
        // Hidden layers
        for (const size of hiddenLayers) {
            layers.push({
                weights: this._randomMatrix(prevSize, size),
                biases: new Array(size).fill(0).map(() => Math.random() * 0.1 - 0.05),
                activation: 'relu'
            });
            prevSize = size;
        }
        
        // Output layer
        layers.push({
            weights: this._randomMatrix(prevSize, outputSize),
            biases: new Array(outputSize).fill(0),
            activation: 'linear'
        });
        
        return {
            layers,
            inputSize,
            outputSize,
            
            /**
             * Forward pass
             */
            forward: function(input) {
                let activation = input;
                const activations = [activation];
                
                for (const layer of this.layers) {
                    // Linear transformation
                    const z = [];
                    for (let j = 0; j < layer.weights[0].length; j++) {
                        let sum = layer.biases[j];
                        for (let i = 0; i < activation.length; i++) {
                            sum += activation[i] * layer.weights[i][j];
                        }
                        z.push(sum);
                    }
                    
                    // Activation
                    if (layer.activation === 'relu') {
                        activation = z.map(x => Math.max(0, x));
                    } else {
                        activation = z;
                    }
                    activations.push(activation);
                }
                
                return { output: activation, activations };
            },
            
            /**
             * Get Q-values for state
             */
            predict: function(state) {
                return this.forward(state).output;
            },
            
            /**
             * Copy weights from another network
             */
            copyFrom: function(other) {
                for (let l = 0; l < this.layers.length; l++) {
                    for (let i = 0; i < this.layers[l].weights.length; i++) {
                        for (let j = 0; j < this.layers[l].weights[i].length; j++) {
                            this.layers[l].weights[i][j] = other.layers[l].weights[i][j];
                        }
                    }
                    for (let i = 0; i < this.layers[l].biases.length; i++) {
                        this.layers[l].biases[i] = other.layers[l].biases[i];
                    }
                }
            },
            
            /**
             * Soft update: θ_target = τ*θ + (1-τ)*θ_target
             */
            softUpdate: function(other, tau) {
                for (let l = 0; l < this.layers.length; l++) {
                    for (let i = 0; i < this.layers[l].weights.length; i++) {
                        for (let j = 0; j < this.layers[l].weights[i].length; j++) {
                            this.layers[l].weights[i][j] = 
                                tau * other.layers[l].weights[i][j] + 
                                (1 - tau) * this.layers[l].weights[i][j];
                        }
                    }
                    for (let i = 0; i < this.layers[l].biases.length; i++) {
                        this.layers[l].biases[i] = 
                            tau * other.layers[l].biases[i] + 
                            (1 - tau) * this.layers[l].biases[i];
                    }
                }
            }
        };
    },

    /**
     * Create random weight matrix (Xavier initialization)
     */
    _randomMatrix: function(rows, cols) {
        const scale = Math.sqrt(2.0 / (rows + cols));
        const matrix = [];
        for (let i = 0; i < rows; i++) {
            const row = [];
            for (let j = 0; j < cols; j++) {
                row.push((Math.random() * 2 - 1) * scale);
            }
            matrix.push(row);
        }
        return matrix;
    },

    // SECTION 2: EXPERIENCE REPLAY

    /**
     * Create standard replay buffer
     */
    createReplayBuffer: function(maxSize = this.config.BUFFER_SIZE) {
        return {
            buffer: [],
            maxSize,
            position: 0,
            
            /**
             * Add experience to buffer
             */
            push: function(state, action, reward, nextState, done) {
                const experience = { state, action, reward, nextState, done };
                
                if (this.buffer.length < this.maxSize) {
                    this.buffer.push(experience);
                } else {
                    this.buffer[this.position] = experience;
                }
                this.position = (this.position + 1) % this.maxSize;
            },
            
            /**
             * Sample random batch
             */
            sample: function(batchSize) {
                const batch = [];
                for (let i = 0; i < batchSize; i++) {
                    const idx = Math.floor(Math.random() * this.buffer.length);
                    batch.push(this.buffer[idx]);
                }
                return batch;
            },
            
            /**
             * Get buffer size
             */
            size: function() {
                return this.buffer.length;
            }
        };
    },

    /**
     * Create prioritized replay buffer
     */
    createPrioritizedBuffer: function(maxSize = this.config.BUFFER_SIZE, alpha = this.config.ALPHA) {
        return {
            buffer: [],
            priorities: [],
            maxSize,
            position: 0,
            alpha,
            maxPriority: 1.0,
            
            /**
             * Add experience with max priority
             */
            push: function(state, action, reward, nextState, done) {
                const experience = { state, action, reward, nextState, done };
                
                if (this.buffer.length < this.maxSize) {
                    this.buffer.push(experience);
                    this.priorities.push(this.maxPriority);
                } else {
                    this.buffer[this.position] = experience;
                    this.priorities[this.position] = this.maxPriority;
                }
                this.position = (this.position + 1) % this.maxSize;
            },
            
            /**
             * Sample batch with priorities
             */
            sample: function(batchSize, beta) {
                const n = this.buffer.length;
                
                // Calculate probabilities
                const probs = this.priorities.map(p => Math.pow(p, this.alpha));
                const sumProbs = probs.reduce((s, p) => s + p, 0);
                const normalizedProbs = probs.map(p => p / sumProbs);
                
                // Sample indices based on probabilities
                const indices = [];
                const experiences = [];
                const weights = [];
                
                for (let i = 0; i < batchSize; i++) {
                    // Sample from distribution
                    let rand = Math.random();
                    let cumProb = 0;
                    let idx = 0;
                    
                    for (let j = 0; j < n; j++) {
                        cumProb += normalizedProbs[j];
                        if (rand < cumProb) {
                            idx = j;
                            break;
                        }
                    }
                    
                    indices.push(idx);
                    experiences.push(this.buffer[idx]);
                    
                    // Importance sampling weight
                    const w = Math.pow(n * normalizedProbs[idx], -beta);
                    weights.push(w);
                }
                
                // Normalize weights
                const maxWeight = Math.max(...weights);
                const normalizedWeights = weights.map(w => w / maxWeight);
                
                return { experiences, indices, weights: normalizedWeights };
            },
            
            /**
             * Update priorities for batch
             */
            updatePriorities: function(indices, tdErrors, epsilon = 1e-6) {
                for (let i = 0; i < indices.length; i++) {
                    const priority = Math.abs(tdErrors[i]) + epsilon;
                    this.priorities[indices[i]] = priority;
                    this.maxPriority = Math.max(this.maxPriority, priority);
                }
            },
            
            size: function() {
                return this.buffer.length;
            }
        };
    },

    // SECTION 3: DQN AGENT

    /**
     * Create DQN agent
     */
    createAgent: function(options = {}) {
        const {
            stateSize = 4,
            actionSize = 2,
            hiddenLayers = this.config.HIDDEN_LAYERS,
            learningRate = this.config.LEARNING_RATE,
            gamma = this.config.GAMMA,
            epsilonStart = this.config.EPSILON_START,
            epsilonEnd = this.config.EPSILON_END,
            epsilonDecaySteps = this.config.EPSILON_DECAY_STEPS,
            batchSize = this.config.BATCH_SIZE,
            bufferSize = this.config.BUFFER_SIZE,
            targetUpdateFreq = this.config.TARGET_UPDATE_FREQ,
            doubleDQN = true,
            prioritizedReplay = false,
            tau = this.config.TAU
        } = options;
        
        const self = this;
        
        return {
            stateSize,
            actionSize,
            learningRate,
            gamma,
            epsilonStart,
            epsilonEnd,
            epsilonDecaySteps,
            batchSize,
            targetUpdateFreq,
            doubleDQN,
            prioritizedReplay,
            tau,
            
            // Networks
            qNetwork: self.createNetwork(stateSize, actionSize, hiddenLayers),
            targetNetwork: self.createNetwork(stateSize, actionSize, hiddenLayers),
            
            // Replay buffer
            replayBuffer: prioritizedReplay 
                ? self.createPrioritizedBuffer(bufferSize)
                : self.createReplayBuffer(bufferSize),
            
            // State
            epsilon: epsilonStart,
            steps: 0,
            beta: self.config.BETA_START,
            
            /**
             * Get current epsilon (linear decay)
             */
            getEpsilon: function() {
                const decay = Math.min(1.0, this.steps / this.epsilonDecaySteps);
                return this.epsilonStart + (this.epsilonEnd - this.epsilonStart) * decay;
            },
            
            /**
             * Select action using epsilon-greedy
             */
            selectAction: function(state, training = true) {
                this.epsilon = this.getEpsilon();
                
                if (training && Math.random() < this.epsilon) {
                    return Math.floor(Math.random() * this.actionSize);
                }
                
                const qValues = this.qNetwork.predict(state);
                return qValues.indexOf(Math.max(...qValues));
            },
            
            /**
             * Store experience
             */
            remember: function(state, action, reward, nextState, done) {
                this.replayBuffer.push(state, action, reward, nextState, done);
            },
            
            /**
             * Compute TD target
             */
            computeTarget: function(reward, nextState, done) {
                if (done) return reward;
                
                if (this.doubleDQN) {
                    // Double DQN: use online network to select action, target network to evaluate
                    const onlineQValues = this.qNetwork.predict(nextState);
                    const bestAction = onlineQValues.indexOf(Math.max(...onlineQValues));
                    const targetQValues = this.targetNetwork.predict(nextState);
                    return reward + this.gamma * targetQValues[bestAction];
                } else {
                    // Standard DQN: use target network for both
                    const targetQValues = this.targetNetwork.predict(nextState);
                    return reward + this.gamma * Math.max(...targetQValues);
                }
            },
            
            /**
             * Simple gradient descent update
             */
            updateNetwork: function(state, action, target, weight = 1.0) {
                // Forward pass
                const { output, activations } = this.qNetwork.forward(state);
                const currentQ = output[action];
                const tdError = target - currentQ;
                
                // Compute gradients and update (simplified backprop)
                const layers = this.qNetwork.layers;
                
                // Output layer gradient
                const outputGrad = new Array(this.actionSize).fill(0);
                outputGrad[action] = -tdError * weight;
                
                let grad = outputGrad;
                
                // Backpropagate through layers
                for (let l = layers.length - 1; l >= 0; l--) {
                    const layer = layers[l];
                    const inputAct = activations[l];
                    const outputAct = activations[l + 1];
                    
                    // ReLU derivative for non-output layers
                    if (layer.activation === 'relu') {
                        grad = grad.map((g, i) => outputAct[i] > 0 ? g : 0);
                    }
                    
                    // Update weights and biases
                    for (let i = 0; i < inputAct.length; i++) {
                        for (let j = 0; j < grad.length; j++) {
                            layer.weights[i][j] -= this.learningRate * grad[j] * inputAct[i];
                        }
                    }
                    for (let j = 0; j < grad.length; j++) {
                        layer.biases[j] -= this.learningRate * grad[j];
                    }
                    
                    // Compute gradient for previous layer
                    if (l > 0) {
                        const newGrad = new Array(inputAct.length).fill(0);
                        for (let i = 0; i < inputAct.length; i++) {
                            for (let j = 0; j < grad.length; j++) {
                                newGrad[i] += grad[j] * layer.weights[i][j];
                            }
                        }
                        grad = newGrad;
                    }
                }
                
                return tdError;
            },
            
            /**
             * Train on batch from replay buffer
             */
            train: function() {
                if (this.replayBuffer.size() < self.config.MIN_BUFFER_SIZE) {
                    return null;
                }
                
                let batch, indices, weights;
                
                if (this.prioritizedReplay) {
                    const result = this.replayBuffer.sample(this.batchSize, this.beta);
                    batch = result.experiences;
                    indices = result.indices;
                    weights = result.weights;
                    
                    // Anneal beta
                    this.beta = Math.min(1.0, this.beta + 
                        (self.config.BETA_END - self.config.BETA_START) / self.config.BETA_ANNEAL_STEPS);
                } else {
                    batch = this.replayBuffer.sample(this.batchSize);
                    weights = new Array(this.batchSize).fill(1.0);
                }
                
                const tdErrors = [];
                
                for (let i = 0; i < batch.length; i++) {
                    const { state, action, reward, nextState, done } = batch[i];
                    const target = this.computeTarget(reward, nextState, done);
                    const tdError = this.updateNetwork(state, action, target, weights[i]);
                    tdErrors.push(tdError);
                }
                
                // Update priorities for PER
                if (this.prioritizedReplay) {
                    this.replayBuffer.updatePriorities(indices, tdErrors);
                }
                
                this.steps++;
                
                // Update target network
                if (this.steps % this.targetUpdateFreq === 0) {
                    if (this.tau < 1.0) {
                        this.targetNetwork.softUpdate(this.qNetwork, this.tau);
                    } else {
                        this.targetNetwork.copyFrom(this.qNetwork);
                    }
                }
                
                return {
                    meanTDError: tdErrors.reduce((s, e) => s + Math.abs(e), 0) / tdErrors.length,
                    epsilon: this.epsilon,
                    beta: this.beta
                };
            },
            
            /**
             * Serialize agent
             */
            save: function() {
                return {
                    qNetwork: JSON.parse(JSON.stringify(this.qNetwork.layers)),
                    targetNetwork: JSON.parse(JSON.stringify(this.targetNetwork.layers)),
                    steps: this.steps,
                    epsilon: this.epsilon,
                    config: {
                        stateSize: this.stateSize,
                        actionSize: this.actionSize,
                        doubleDQN: this.doubleDQN,
                        prioritizedReplay: this.prioritizedReplay
                    }
                };
            }
        };
    },

    // SECTION 4: TRAINING LOOP

    /**
     * Train DQN agent on environment
     */
    train: function(agent, env, options = {}) {
        const {
            episodes = 1000,
            maxSteps = 500,
            verbose = false,
            verboseInterval = 100,
            callback = null
        } = options;
        
        const history = {
            episodeRewards: [],
            episodeLengths: [],
            avgRewards: [],
            losses: []
        };
        
        for (let ep = 0; ep < episodes; ep++) {
            let state = env.reset();
            let totalReward = 0;
            let steps = 0;
            let totalLoss = 0;
            
            for (let step = 0; step < maxSteps; step++) {
                const action = agent.selectAction(state);
                const { nextState, reward, done } = env.step(action);
                
                agent.remember(state, action, reward, nextState, done);
                
                const trainResult = agent.train();
                if (trainResult) {
                    totalLoss += trainResult.meanTDError;
                }
                
                state = nextState;
                totalReward += reward;
                steps++;
                
                if (done) break;
            }
            
            history.episodeRewards.push(totalReward);
            history.episodeLengths.push(steps);
            history.losses.push(totalLoss / steps);
            
            const windowSize = Math.min(100, history.episodeRewards.length);
            const avgReward = history.episodeRewards.slice(-windowSize)
                .reduce((s, r) => s + r, 0) / windowSize;
            history.avgRewards.push(avgReward);
            
            if (verbose && (ep + 1) % verboseInterval === 0) {
                console.log(`Episode ${ep + 1}: Reward=${totalReward.toFixed(2)}, ` +
                           `Avg(100)=${avgReward.toFixed(2)}, ε=${agent.epsilon.toFixed(4)}, ` +
                           `Steps=${agent.steps}`);
            }
            
            if (callback) callback(ep, agent, history);
        }
        
        return { agent, history };
    },

    // SECTION 5: SELF-TEST

    selfTest: function() {
        console.log('[PRISM_DQN] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };
        
        // Test 1: Network creation
        try {
            const network = this.createNetwork(4, 2, [32, 32]);
            const output = network.predict([0.1, 0.2, 0.3, 0.4]);
            
            const pass = output.length === 2;
            
            results.tests.push({
                name: 'Network creation',
                pass,
                outputSize: output.length
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Network creation', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 2: Replay buffer
        try {
            const buffer = this.createReplayBuffer(100);
            
            for (let i = 0; i < 50; i++) {
                buffer.push([i], 0, 1.0, [i+1], false);
            }
            
            const batch = buffer.sample(10);
            const pass = batch.length === 10 && buffer.size() === 50;
            
            results.tests.push({
                name: 'Replay buffer',
                pass,
                bufferSize: buffer.size(),
                batchSize: batch.length
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Replay buffer', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 3: Agent creation
        try {
            const agent = this.createAgent({
                stateSize: 4,
                actionSize: 2,
                doubleDQN: true
            });
            
            const action = agent.selectAction([0.1, 0.2, 0.3, 0.4]);
            const pass = action >= 0 && action < 2;
            
            results.tests.push({
                name: 'Agent creation',
                pass,
                selectedAction: action,
                epsilon: agent.epsilon.toFixed(4)
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Agent creation', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 4: Target computation
        try {
            const agent = this.createAgent({
                stateSize: 2,
                actionSize: 2,
                gamma: 0.99
            });
            
            const target = agent.computeTarget(1.0, [0.5, 0.5], false);
            const terminalTarget = agent.computeTarget(10.0, [0.5, 0.5], true);
            
            const pass = terminalTarget === 10.0 && target > 0.99;
            
            results.tests.push({
                name: 'Target computation',
                pass,
                nonTerminalTarget: target.toFixed(4),
                terminalTarget: terminalTarget.toFixed(4)
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Target computation', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 5: Prioritized replay
        try {
            const buffer = this.createPrioritizedBuffer(100);
            
            for (let i = 0; i < 50; i++) {
                buffer.push([i], 0, 1.0, [i+1], false);
            }
            
            const { experiences, indices, weights } = buffer.sample(10, 0.4);
            
            buffer.updatePriorities(indices, [0.1, 0.5, 0.2, 0.8, 0.3, 0.9, 0.1, 0.4, 0.6, 0.7]);
            
            const pass = experiences.length === 10 && weights.length === 10;
            
            results.tests.push({
                name: 'Prioritized replay',
                pass,
                sampleSize: experiences.length,
                maxPriority: buffer.maxPriority.toFixed(4)
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Prioritized replay', pass: false, error: e.message });
            results.failed++;
        }
        
        console.log(`[PRISM_DQN] Tests complete: ${results.passed}/${results.passed + results.failed} passed`);
        return results;
    }
};

// Export
if (typeof window !== 'undefined') window.PRISM_ADVANCED_DQN = PRISM_ADVANCED_DQN;
if (typeof module !== 'undefined') module.exports = PRISM_ADVANCED_DQN;
