const PRISM_ML = {

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
    }

}