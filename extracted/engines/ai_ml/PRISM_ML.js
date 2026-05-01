// PRISM_ML - Lines 747199-748146 (948 lines) - Core ML framework\n\nconst PRISM_ML = {

    version: '1.0.0',
    phase: 'Phase 5: Machine Learning',
    created: '2026-01-14',

    // SECTION 1: NEURAL NETWORK LAYER ENGINE
    // Source: MIT 6.036, Stanford CS231n, PRISM_AI_DEEP_LEARNING_KNOWLEDGE_DATABASE.js
    // Purpose: Flexible neural network layer building blocks

    neuralNetwork: {
        name: "Neural Network Engine",
        description: "Flexible layer-based neural network implementation",

        // Activation Functions

        activations: {
            relu: {
                forward: x => Math.max(0, x),
                backward: x => x > 0 ? 1 : 0
            },
            leakyRelu: {
                forward: (x, alpha = 0.01) => x > 0 ? x : alpha * x,
                backward: (x, alpha = 0.01) => x > 0 ? 1 : alpha
            },
            sigmoid: {
                forward: x => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x)))),
                backward: x => {
                    const s = 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
                    return s * (1 - s);
                }
            },
            tanh: {
                forward: x => Math.tanh(x),
                backward: x => 1 - Math.tanh(x) ** 2
            },
            softmax: {
                forward: (x) => {
                    const maxVal = Math.max(...x);
                    const expX = x.map(v => Math.exp(v - maxVal));
                    const sum = expX.reduce((a, b) => a + b, 0);
                    return expX.map(v => v / sum);
                },
                backward: (x) => {
                    // Jacobian - simplified for classification
                    const s = this.forward(x);
                    return s.map((si, i) => si * (1 - si));
                }
            },
            linear: {
                forward: x => x,
                backward: x => 1
            }
        },
        // Weight Initialization

        init: {
            xavier: (fanIn, fanOut) => {
                const std = Math.sqrt(2 / (fanIn + fanOut));
                return () => (Math.random() * 2 - 1) * std;
            },
            he: (fanIn) => {
                const std = Math.sqrt(2 / fanIn);
                return () => (Math.random() * 2 - 1) * std;
            },
            uniform: (min = -0.1, max = 0.1) => {
                return () => min + Math.random() * (max - min);
            },
            zeros: () => () => 0,

            ones: () => () => 1
        },
        // Layer Types

        /**
         * Dense (fully connected) layer
         */
        createDenseLayer: function(inputSize, outputSize, activation = 'relu', initMethod = 'he') {
            const initFn = this.init[initMethod](inputSize, outputSize);

            // Initialize weights and biases
            const weights = [];
            for (let i = 0; i < outputSize; i++) {
                weights[i] = [];
                for (let j = 0; j < inputSize; j++) {
                    weights[i][j] = initFn();
                }
            }
            const biases = new Array(outputSize).fill(0);

            return {
                type: 'dense',
                inputSize,
                outputSize,
                weights,
                biases,
                activation,

                // Forward pass
                forward: function(input) {
                    this.lastInput = input;
                    this.preActivation = [];

                    for (let i = 0; i < this.outputSize; i++) {
                        let sum = this.biases[i];
                        for (let j = 0; j < this.inputSize; j++) {
                            sum += this.weights[i][j] * input[j];
                        }
                        this.preActivation[i] = sum;
                    }
                    const act = PRISM_ML.neuralNetwork.activations[this.activation];
                    this.output = this.preActivation.map(x => act.forward(x));

                    return this.output;
                },
                // Backward pass
                backward: function(gradOutput, learningRate = 0.01) {
                    const act = PRISM_ML.neuralNetwork.activations[this.activation];

                    // Gradient through activation
                    const gradPreAct = gradOutput.map((g, i) =>
                        g * act.backward(this.preActivation[i])
                    );

                    // Gradient for input (to pass to previous layer)
                    const gradInput = new Array(this.inputSize).fill(0);
                    for (let j = 0; j < this.inputSize; j++) {
                        for (let i = 0; i < this.outputSize; i++) {
                            gradInput[j] += gradPreAct[i] * this.weights[i][j];
                        }
                    }
                    // Update weights and biases
                    for (let i = 0; i < this.outputSize; i++) {
                        for (let j = 0; j < this.inputSize; j++) {
                            this.weights[i][j] -= learningRate * gradPreAct[i] * this.lastInput[j];
                        }
                        this.biases[i] -= learningRate * gradPreAct[i];
                    }
                    return gradInput;
                }
            };
        },
        /**
         * Dropout layer (regularization)
         */
        createDropoutLayer: function(rate = 0.5) {
            return {
                type: 'dropout',
                rate,
                training: true,

                forward: function(input) {
                    if (!this.training) return input;

                    this.mask = input.map(() => Math.random() > this.rate ? 1 / (1 - this.rate) : 0);
                    return input.map((x, i) => x * this.mask[i]);
                },
                backward: function(gradOutput) {
                    if (!this.training) return gradOutput;
                    return gradOutput.map((g, i) => g * this.mask[i]);
                },
                setTraining: function(mode) {
                    this.training = mode;
                }
            };
        },
        /**
         * Batch normalization layer
         */
        createBatchNormLayer: function(size, momentum = 0.99, epsilon = 1e-5) {
            return {
                type: 'batchnorm',
                size,
                gamma: new Array(size).fill(1),
                beta: new Array(size).fill(0),
                runningMean: new Array(size).fill(0),
                runningVar: new Array(size).fill(1),
                momentum,
                epsilon,
                training: true,

                forward: function(input) {
                    // Input can be single sample or batch
                    const isBatch = Array.isArray(input[0]);
                    const batch = isBatch ? input : [input];
                    const batchSize = batch.length;

                    if (this.training) {
                        // Compute batch statistics
                        this.mean = new Array(this.size).fill(0);
                        this.variance = new Array(this.size).fill(0);

                        for (let j = 0; j < this.size; j++) {
                            for (let i = 0; i < batchSize; i++) {
                                this.mean[j] += batch[i][j];
                            }
                            this.mean[j] /= batchSize;
                        }
                        for (let j = 0; j < this.size; j++) {
                            for (let i = 0; i < batchSize; i++) {
                                this.variance[j] += (batch[i][j] - this.mean[j]) ** 2;
                            }
                            this.variance[j] /= batchSize;
                        }
                        // Update running statistics
                        for (let j = 0; j < this.size; j++) {
                            this.runningMean[j] = this.momentum * this.runningMean[j] +
                                                  (1 - this.momentum) * this.mean[j];
                            this.runningVar[j] = this.momentum * this.runningVar[j] +
                                                 (1 - this.momentum) * this.variance[j];
                        }
                    } else {
                        this.mean = this.runningMean;
                        this.variance = this.runningVar;
                    }
                    // Normalize
                    this.normalized = batch.map(sample =>
                        sample.map((x, j) =>
                            (x - this.mean[j]) / Math.sqrt(this.variance[j] + this.epsilon)
                        )
                    );

                    // Scale and shift
                    const output = this.normalized.map(sample =>
                        sample.map((x, j) => this.gamma[j] * x + this.beta[j])
                    );

                    return isBatch ? output : output[0];
                },
                backward: function(gradOutput, learningRate = 0.01) {
                    const isBatch = Array.isArray(gradOutput[0]);
                    const gradBatch = isBatch ? gradOutput : [gradOutput];
                    const batchSize = gradBatch.length;

                    // Gradient for gamma and beta
                    const gradGamma = new Array(this.size).fill(0);
                    const gradBeta = new Array(this.size).fill(0);

                    for (let j = 0; j < this.size; j++) {
                        for (let i = 0; i < batchSize; i++) {
                            gradGamma[j] += gradBatch[i][j] * this.normalized[i][j];
                            gradBeta[j] += gradBatch[i][j];
                        }
                    }
                    // Update parameters
                    for (let j = 0; j < this.size; j++) {
                        this.gamma[j] -= learningRate * gradGamma[j];
                        this.beta[j] -= learningRate * gradBeta[j];
                    }
                    // Gradient for input (simplified)
                    const gradInput = gradBatch.map((grad, i) =>
                        grad.map((g, j) =>
                            this.gamma[j] * g / Math.sqrt(this.variance[j] + this.epsilon)
                        )
                    );

                    return isBatch ? gradInput : gradInput[0];
                }
            };
        },
        // Network Builder

        /**
         * Create a sequential neural network
         */
        createSequential: function(layerConfigs) {
            const layers = [];

            for (const config of layerConfigs) {
                switch (config.type) {
                    case 'dense':
                        layers.push(this.createDenseLayer(
                            config.inputSize,
                            config.outputSize,
                            config.activation || 'relu',
                            config.init || 'he'
                        ));
                        break;
                    case 'dropout':
                        layers.push(this.createDropoutLayer(config.rate || 0.5));
                        break;
                    case 'batchnorm':
                        layers.push(this.createBatchNormLayer(config.size));
                        break;
                }
            }
            return {
                layers,

                forward: function(input) {
                    let output = input;
                    for (const layer of this.layers) {
                        output = layer.forward(output);
                    }
                    return output;
                },
                backward: function(gradOutput, learningRate = 0.01) {
                    let grad = gradOutput;
                    for (let i = this.layers.length - 1; i >= 0; i--) {
                        if (this.layers[i].backward) {
                            grad = this.layers[i].backward(grad, learningRate);
                        }
                    }
                    return grad;
                },
                train: function(inputs, targets, epochs = 100, learningRate = 0.01) {
                    const losses = [];

                    for (let epoch = 0; epoch < epochs; epoch++) {
                        let epochLoss = 0;

                        for (let i = 0; i < inputs.length; i++) {
                            // Forward
                            const output = this.forward(inputs[i]);

                            // Compute loss (MSE)
                            const target = Array.isArray(targets[i]) ? targets[i] : [targets[i]];
                            const loss = output.reduce((sum, o, j) =>
                                sum + (o - target[j]) ** 2, 0
                            ) / output.length;
                            epochLoss += loss;

                            // Compute gradient
                            const gradOutput = output.map((o, j) =>
                                2 * (o - target[j]) / output.length
                            );

                            // Backward
                            this.backward(gradOutput, learningRate);
                        }
                        losses.push(epochLoss / inputs.length);
                    }
                    return losses;
                },
                setTraining: function(mode) {
                    for (const layer of this.layers) {
                        if (layer.setTraining) layer.setTraining(mode);
                    }
                },
                predict: function(input) {
                    this.setTraining(false);
                    const output = this.forward(input);
                    this.setTraining(true);
                    return output;
                }
            };
        },
        // Loss Functions

        losses: {
            mse: {
                compute: (pred, target) => {
                    let sum = 0;
                    for (let i = 0; i < pred.length; i++) {
                        sum += (pred[i] - target[i]) ** 2;
                    }
                    return sum / pred.length;
                },
                gradient: (pred, target) => {
                    return pred.map((p, i) => 2 * (p - target[i]) / pred.length);
                }
            },
            crossEntropy: {
                compute: (pred, target) => {
                    let sum = 0;
                    for (let i = 0; i < pred.length; i++) {
                        sum -= target[i] * Math.log(Math.max(pred[i], 1e-10));
                    }
                    return sum;
                },
                gradient: (pred, target) => {
                    return pred.map((p, i) => p - target[i]);
                }
            }
        },
        prismApplication: "FeatureRecognitionNN, ToolWearPrediction, CuttingParameterOptimization"
    },
    // SECTION 2: REINFORCEMENT LEARNING ENGINE
    // Source: Sutton & Barto, PRISM_AI_DEEP_LEARNING_KNOWLEDGE_DATABASE.js
    // Purpose: Adaptive decision-making for machining optimization

    reinforcementLearning: {
        name: "Reinforcement Learning Engine",
        description: "Q-Learning and Policy Gradient for adaptive machining decisions",

        // Q-Learning

        /**
         * Create Q-Learning agent
         */
        createQLearning: function(stateSize, actionSize, config = {}) {
            const {
                learningRate = 0.1,
                discountFactor = 0.99,
                explorationRate = 1.0,
                explorationDecay = 0.995,
                minExploration = 0.01
            } = config;

            // Initialize Q-table
            const qTable = new Map();

            return {
                stateSize,
                actionSize,
                learningRate,
                discountFactor,
                explorationRate,
                explorationDecay,
                minExploration,
                qTable,

                /**
                 * Get Q-value for state-action pair
                 */
                getQ: function(state, action) {
                    const key = this.stateKey(state, action);
                    return this.qTable.get(key) || 0;
                },
                /**
                 * Set Q-value for state-action pair
                 */
                setQ: function(state, action, value) {
                    const key = this.stateKey(state, action);
                    this.qTable.set(key, value);
                },
                /**
                 * Generate state-action key
                 */
                stateKey: function(state, action) {
                    const stateStr = Array.isArray(state) ?
                        state.map(s => s.toFixed(2)).join(',') :
                        state.toString();
                    return `${stateStr}|${action}`;
                },
                /**
                 * Choose action using epsilon-greedy policy
                 */
                chooseAction: function(state) {
                    if (Math.random() < this.explorationRate) {
                        // Explore: random action
                        return Math.floor(Math.random() * this.actionSize);
                    } else {
                        // Exploit: best action
                        return this.bestAction(state);
                    }
                },
                /**
                 * Get best action for state
                 */
                bestAction: function(state) {
                    let bestQ = -Infinity;
                    let best = 0;

                    for (let a = 0; a < this.actionSize; a++) {
                        const q = this.getQ(state, a);
                        if (q > bestQ) {
                            bestQ = q;
                            best = a;
                        }
                    }
                    return best;
                },
                /**
                 * Update Q-value based on experience
                 */
                update: function(state, action, reward, nextState, done) {
                    const currentQ = this.getQ(state, action);

                    let targetQ;
                    if (done) {
                        targetQ = reward;
                    } else {
                        // Max Q-value for next state
                        let maxNextQ = -Infinity;
                        for (let a = 0; a < this.actionSize; a++) {
                            maxNextQ = Math.max(maxNextQ, this.getQ(nextState, a));
                        }
                        targetQ = reward + this.discountFactor * maxNextQ;
                    }
                    // Q-learning update
                    const newQ = currentQ + this.learningRate * (targetQ - currentQ);
                    this.setQ(state, action, newQ);

                    return newQ;
                },
                /**
                 * Decay exploration rate
                 */
                decayExploration: function() {
                    this.explorationRate = Math.max(
                        this.minExploration,
                        this.explorationRate * this.explorationDecay
                    );
                },
                /**
                 * Train on batch of experiences
                 */
                trainBatch: function(experiences) {
                    for (const exp of experiences) {
                        this.update(exp.state, exp.action, exp.reward, exp.nextState, exp.done);
                    }
                    this.decayExploration();
                }
            };
        },
        // Deep Q-Network (DQN)

        /**
         * Create DQN agent
         */
        createDQN: function(stateSize, actionSize, config = {}) {
            const {
                hiddenLayers = [64, 64],
                learningRate = 0.001,
                discountFactor = 0.99,
                explorationRate = 1.0,
                explorationDecay = 0.995,
                minExploration = 0.01,
                batchSize = 32,
                memorySize = 10000
            } = config;

            // Build Q-network
            const layerConfigs = [];
            let prevSize = stateSize;

            for (const size of hiddenLayers) {
                layerConfigs.push({
                    type: 'dense',
                    inputSize: prevSize,
                    outputSize: size,
                    activation: 'relu'
                });
                prevSize = size;
            }
            layerConfigs.push({
                type: 'dense',
                inputSize: prevSize,
                outputSize: actionSize,
                activation: 'linear'
            });

            const network = PRISM_ML.neuralNetwork.createSequential(layerConfigs);

            return {
                network,
                stateSize,
                actionSize,
                learningRate,
                discountFactor,
                explorationRate,
                explorationDecay,
                minExploration,
                batchSize,
                memory: [],
                memorySize,

                /**
                 * Choose action using epsilon-greedy
                 */
                chooseAction: function(state) {
                    if (Math.random() < this.explorationRate) {
                        return Math.floor(Math.random() * this.actionSize);
                    }
                    const qValues = this.network.predict(state);
                    return qValues.indexOf(Math.max(...qValues));
                },
                /**
                 * Store experience in replay memory
                 */
                remember: function(state, action, reward, nextState, done) {
                    this.memory.push({ state, action, reward, nextState, done });
                    if (this.memory.length > this.memorySize) {
                        this.memory.shift();
                    }
                },
                /**
                 * Sample batch from memory
                 */
                sampleBatch: function() {
                    const batch = [];
                    const indices = new Set();

                    while (indices.size < Math.min(this.batchSize, this.memory.length)) {
                        indices.add(Math.floor(Math.random() * this.memory.length));
                    }
                    for (const idx of indices) {
                        batch.push(this.memory[idx]);
                    }
                    return batch;
                },
                /**
                 * Train on batch of experiences
                 */
                train: function() {
                    if (this.memory.length < this.batchSize) return;

                    const batch = this.sampleBatch();

                    for (const exp of batch) {
                        const currentQ = this.network.forward(exp.state);
                        const targetQ = [...currentQ];

                        if (exp.done) {
                            targetQ[exp.action] = exp.reward;
                        } else {
                            const nextQ = this.network.predict(exp.nextState);
                            targetQ[exp.action] = exp.reward +
                                this.discountFactor * Math.max(...nextQ);
                        }
                        // Compute gradient and update
                        const gradOutput = currentQ.map((q, i) =>
                            2 * (q - targetQ[i]) / this.actionSize
                        );
                        this.network.backward(gradOutput, this.learningRate);
                    }
                    this.explorationRate = Math.max(
                        this.minExploration,
                        this.explorationRate * this.explorationDecay
                    );
                }
            };
        },
        // Policy Gradient (REINFORCE)

        /**
         * Create REINFORCE agent
         */
        createREINFORCE: function(stateSize, actionSize, config = {}) {
            const {
                hiddenLayers = [64],
                learningRate = 0.001,
                discountFactor = 0.99
            } = config;

            // Build policy network (outputs action probabilities)
            const layerConfigs = [];
            let prevSize = stateSize;

            for (const size of hiddenLayers) {
                layerConfigs.push({
                    type: 'dense',
                    inputSize: prevSize,
                    outputSize: size,
                    activation: 'relu'
                });
                prevSize = size;
            }
            layerConfigs.push({
                type: 'dense',
                inputSize: prevSize,
                outputSize: actionSize,
                activation: 'linear' // Will apply softmax manually
            });

            const network = PRISM_ML.neuralNetwork.createSequential(layerConfigs);

            return {
                network,
                stateSize,
                actionSize,
                learningRate,
                discountFactor,
                episodeStates: [],
                episodeActions: [],
                episodeRewards: [],

                /**
                 * Get action probabilities
                 */
                getPolicy: function(state) {
                    const logits = this.network.forward(state);
                    return PRISM_ML.neuralNetwork.activations.softmax.forward(logits);
                },
                /**
                 * Sample action from policy
                 */
                chooseAction: function(state) {
                    const probs = this.getPolicy(state);

                    // Sample from distribution
                    const r = Math.random();
                    let cumsum = 0;
                    for (let i = 0; i < probs.length; i++) {
                        cumsum += probs[i];
                        if (r < cumsum) return i;
                    }
                    return probs.length - 1;
                },
                /**
                 * Store step in episode
                 */
                storeStep: function(state, action, reward) {
                    this.episodeStates.push(state);
                    this.episodeActions.push(action);
                    this.episodeRewards.push(reward);
                },
                /**
                 * Compute discounted returns
                 */
                computeReturns: function() {
                    const returns = [];
                    let G = 0;

                    for (let i = this.episodeRewards.length - 1; i >= 0; i--) {
                        G = this.episodeRewards[i] + this.discountFactor * G;
                        returns.unshift(G);
                    }
                    // Normalize returns
                    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
                    const std = Math.sqrt(
                        returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length
                    ) || 1;

                    return returns.map(r => (r - mean) / std);
                },
                /**
                 * Update policy after episode
                 */
                update: function() {
                    const returns = this.computeReturns();

                    for (let i = 0; i < this.episodeStates.length; i++) {
                        const state = this.episodeStates[i];
                        const action = this.episodeActions[i];
                        const G = returns[i];

                        // Get policy
                        const probs = this.getPolicy(state);

                        // Policy gradient: ∇log(π(a|s)) * G
                        const gradOutput = probs.map((p, j) => {
                            if (j === action) {
                                return -(1 - p) * G / this.actionSize;
                            } else {
                                return p * G / this.actionSize;
                            }
                        });

                        this.network.backward(gradOutput, this.learningRate);
                    }
                    // Clear episode
                    this.episodeStates = [];
                    this.episodeActions = [];
                    this.episodeRewards = [];
                }
            };
        },
        // Manufacturing Applications

        /**
         * Create cutting parameter optimizer
         */
        createCuttingOptimizer: function(materialRange, toolRange) {
            // State: [material_hardness, tool_condition, current_speed, current_feed]
            // Actions: [decrease_speed, maintain, increase_speed, decrease_feed, increase_feed]

            const agent = this.createQLearning(4, 5, {
                learningRate: 0.2,
                discountFactor: 0.95
            });

            return {
                agent,

                getState: function(hardness, toolWear, speed, feed) {
                    // Discretize state
                    return [
                        Math.floor(hardness / 100),
                        Math.floor(toolWear * 10),
                        Math.floor(speed / 50),
                        Math.floor(feed * 100)
                    ];
                },
                applyAction: function(action, currentParams) {
                    const { speed, feed } = currentParams;
                    const speedStep = 25; // m/min
                    const feedStep = 0.02; // mm/rev

                    switch (action) {
                        case 0: return { speed: speed - speedStep, feed };
                        case 1: return { speed, feed };
                        case 2: return { speed: speed + speedStep, feed };
                        case 3: return { speed, feed: feed - feedStep };
                        case 4: return { speed, feed: feed + feedStep };
                    }
                },
                computeReward: function(mrr, surfaceQuality, toolLife) {
                    // Balance MRR, quality, and tool life
                    return 0.4 * mrr + 0.4 * surfaceQuality + 0.2 * toolLife;
                }
            };
        },
        prismApplication: "AdaptiveMachiningControl, ToolpathOptimization, ProcessLearning"
    },
    // SECTION 3: TRANSFER LEARNING ENGINE
    // Source: Stanford CS231n, PRISM_AI_DEEP_LEARNING_KNOWLEDGE_DATABASE.js
    // Purpose: Adapt pre-trained models to new machining scenarios

    transferLearning: {
        name: "Transfer Learning Engine",
        description: "Adapt pre-trained models to new domains with minimal data",

        /**
         * Freeze layers of a network
         */
        freezeLayers: function(network, layerIndices) {
            for (const idx of layerIndices) {
                if (network.layers[idx]) {
                    network.layers[idx].frozen = true;

                    // Store original backward
                    const originalBackward = network.layers[idx].backward;
                    network.layers[idx].backward = function(gradOutput) {
                        // Pass gradient through but don't update weights
                        return originalBackward ?
                            this.computeGradientOnly(gradOutput) :
                            gradOutput;
                    };
                }
            }
        },
        /**
         * Unfreeze layers of a network
         */
        unfreezeLayers: function(network, layerIndices) {
            for (const idx of layerIndices) {
                if (network.layers[idx]) {
                    network.layers[idx].frozen = false;
                }
            }
        },
        /**
         * Replace final layer(s) for new task
         */
        replaceHead: function(network, newOutputSize, numLayersToReplace = 1) {
            // Remove last layers
            const keptLayers = network.layers.slice(0, -numLayersToReplace);

            // Get size from last kept layer
            const lastKeptLayer = keptLayers[keptLayers.length - 1];
            const inputSize = lastKeptLayer.outputSize || lastKeptLayer.size;

            // Add new output layer
            const newLayer = PRISM_ML.neuralNetwork.createDenseLayer(
                inputSize,
                newOutputSize,
                'linear',
                'xavier'
            );

            keptLayers.push(newLayer);
            network.layers = keptLayers;

            return network;
        },
        /**
         * Fine-tune network on new data
         */
        fineTune: function(network, newData, config = {}) {
            const {
                epochs = 50,
                learningRate = 0.0001, // Lower learning rate for fine-tuning
                freezeRatio = 0.5 // Freeze first 50% of layers
            } = config;

            // Freeze early layers
            const numToFreeze = Math.floor(network.layers.length * freezeRatio);
            const freezeIndices = [];
            for (let i = 0; i < numToFreeze; i++) {
                freezeIndices.push(i);
            }
            this.freezeLayers(network, freezeIndices);

            // Train on new data
            const losses = network.train(
                newData.inputs,
                newData.targets,
                epochs,
                learningRate
            );

            return {
                losses,
                frozenLayers: numToFreeze,
                trainedLayers: network.layers.length - numToFreeze
            };
        },
        /**
         * Domain adaptation for different machine types
         */
        adaptToMachine: function(baseModel, machineData) {
            // Clone model
            const adaptedModel = JSON.parse(JSON.stringify(baseModel));

            // Fine-tune with machine-specific data
            return this.fineTune(adaptedModel, machineData, {
                epochs: 30,
                learningRate: 0.00005,
                freezeRatio: 0.7 // Freeze more layers for domain adaptation
            });
        },
        /**
         * Create feature extractor from pre-trained model
         */
        createFeatureExtractor: function(network, layerIndex) {
            return {
                network,
                extractionLayer: layerIndex,

                extract: function(input) {
                    let output = input;
                    for (let i = 0; i <= this.extractionLayer; i++) {
                        output = this.network.layers[i].forward(output);
                    }
                    return output;
                }
            };
        },
        // Manufacturing Applications

        /**
         * Transfer tool wear model to new material
         */
        transferToolWearModel: function(baseModel, newMaterialData) {
            console.log('[Transfer Learning] Adapting tool wear model to new material...');

            // Keep feature extraction layers, retrain prediction head
            const adaptedModel = this.replaceHead(baseModel, 1, 1);

            return this.fineTune(adaptedModel, newMaterialData, {
                epochs: 100,
                learningRate: 0.0001,
                freezeRatio: 0.6
            });
        },
        /**
         * Transfer surface quality model to new machine
         */
        transferSurfaceQualityModel: function(baseModel, newMachineData) {
            console.log('[Transfer Learning] Adapting surface quality model to new machine...');

            return this.adaptToMachine(baseModel, newMachineData);
        },
        prismApplication: "CrossMachineAdaptation, NewMaterialLearning, RapidModelDeployment"
    }
};
