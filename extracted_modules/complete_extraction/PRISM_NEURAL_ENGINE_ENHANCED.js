const PRISM_NEURAL_ENGINE_ENHANCED = {
    // Activation functions
    activations: {
        relu: x => Math.max(0, x),
        leakyRelu: (x, alpha = 0.01) => x > 0 ? x : alpha * x,
        elu: (x, alpha = 1) => x > 0 ? x : alpha * (Math.exp(x) - 1),
        gelu: x => 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * Math.pow(x, 3)))),
        swish: x => x * (1 / (1 + Math.exp(-x))),
        sigmoid: x => 1 / (1 + Math.exp(-Math.min(Math.max(x, -500), 500))),
        tanh: x => Math.tanh(x),
        softmax: arr => {
            const max = Math.max(...arr);
            const exps = arr.map(x => Math.exp(x - max));
            const sum = exps.reduce((a, b) => a + b, 0);
            return exps.map(e => e / sum);
        },
        softplus: x => Math.log(1 + Math.exp(x)),
        mish: x => x * Math.tanh(Math.log(1 + Math.exp(x)))
    },
    
    // Activation derivatives
    activationDerivatives: {
        relu: x => x > 0 ? 1 : 0,
        leakyRelu: (x, alpha = 0.01) => x > 0 ? 1 : alpha,
        sigmoid: x => { const s = 1 / (1 + Math.exp(-x)); return s * (1 - s); },
        tanh: x => 1 - Math.pow(Math.tanh(x), 2),
        swish: x => {
            const sig = 1 / (1 + Math.exp(-x));
            return sig + x * sig * (1 - sig);
        }
    },
    
    // Loss functions
    losses: {
        mse: (pred, target) => {
            let sum = 0;
            for (let i = 0; i < pred.length; i++) {
                sum += Math.pow(pred[i] - target[i], 2);
            }
            return sum / pred.length;
        },
        mae: (pred, target) => {
            let sum = 0;
            for (let i = 0; i < pred.length; i++) {
                sum += Math.abs(pred[i] - target[i]);
            }
            return sum / pred.length;
        },
        binaryCrossEntropy: (pred, target) => {
            let sum = 0;
            for (let i = 0; i < pred.length; i++) {
                const p = Math.max(Math.min(pred[i], 1 - 1e-7), 1e-7);
                sum -= target[i] * Math.log(p) + (1 - target[i]) * Math.log(1 - p);
            }
            return sum / pred.length;
        },
        crossEntropy: (pred, target) => {
            let sum = 0;
            for (let i = 0; i < pred.length; i++) {
                if (target[i] > 0) {
                    sum -= target[i] * Math.log(Math.max(pred[i], 1e-7));
                }
            }
            return sum;
        },
        huber: (pred, target, delta = 1.0) => {
            let sum = 0;
            for (let i = 0; i < pred.length; i++) {
                const diff = Math.abs(pred[i] - target[i]);
                sum += diff <= delta ? 0.5 * diff * diff : delta * (diff - 0.5 * delta);
            }
            return sum / pred.length;
        }
    },
    
    // Weight initialization
    initWeights: {
        xavier: (fanIn, fanOut) => {
            const std = Math.sqrt(2.0 / (fanIn + fanOut));
            return () => (Math.random() * 2 - 1) * std;
        },
        he: (fanIn) => {
            const std = Math.sqrt(2.0 / fanIn);
            return () => (Math.random() * 2 - 1) * std;
        },
        lecun: (fanIn) => {
            const std = Math.sqrt(1.0 / fanIn);
            return () => (Math.random() * 2 - 1) * std;
        },
        uniform: (limit = 0.1) => () => (Math.random() * 2 - 1) * limit,
        zeros: () => () => 0,
        ones: () => () => 1
    },
    
    // Layer types
    createDenseLayer(inputSize, outputSize, activation = 'relu', options = {}) {
        const initFn = this.initWeights[options.init || 'he'](inputSize);
        
        const weights = Array(outputSize).fill().map(() => 
            Array(inputSize).fill().map(initFn)
        );
        const biases = Array(outputSize).fill(0);
        
        // Velocity for momentum
        const vWeights = weights.map(row => row.map(() => 0));
        const vBiases = biases.map(() => 0);
        
        // AdaGrad/RMSprop accumulators
        const gWeights = weights.map(row => row.map(() => 0));
        const gBiases = biases.map(() => 0);
        
        return {
            type: 'dense',
            inputSize,
            outputSize,
            activation,
            weights,
            biases,
            vWeights,
            vBiases,
            gWeights,
            gBiases,
            dropout: options.dropout || 0,
            
            forward(input, training = false) {
                this.input = input;
                this.preActivation = [];
                
                for (let i = 0; i < this.outputSize; i++) {
                    let sum = this.biases[i];
                    for (let j = 0; j < this.inputSize; j++) {
                        sum += input[j] * this.weights[i][j];
                    }
                    this.preActivation.push(sum);
                }
                
                // Apply activation
                const activationFn = PRISM_NEURAL_ENGINE_ENHANCED.activations[this.activation];
                if (this.activation === 'softmax') {
                    this.output = activationFn(this.preActivation);
                } else {
                    this.output = this.preActivation.map(activationFn);
                }
                
                // Apply dropout during training
                if (training && this.dropout > 0) {
                    this.dropoutMask = this.output.map(() => Math.random() > this.dropout ? 1 : 0);
                    this.output = this.output.map((v, i) => v * this.dropoutMask[i] / (1 - this.dropout));
                }
                
                return this.output;
            },
            
            backward(gradOutput, learningRate, optimizer = 'adam', t = 1) {
                const activationDeriv = PRISM_NEURAL_ENGINE_ENHANCED.activationDerivatives[this.activation];
                
                // Gradient through activation
                let gradPreActivation;
                if (this.activation === 'softmax') {
                    gradPreActivation = gradOutput; // Assume combined with cross-entropy
                } else {
                    gradPreActivation = gradOutput.map((g, i) => g * activationDeriv(this.preActivation[i]));
                }
                
                // Apply dropout mask
                if (this.dropoutMask) {
                    gradPreActivation = gradPreActivation.map((g, i) => g * this.dropoutMask[i]);
                }
                
                const gradInput = Array(this.inputSize).fill(0);
                
                // Update weights and biases
                for (let i = 0; i < this.outputSize; i++) {
                    for (let j = 0; j < this.inputSize; j++) {
                        const grad = gradPreActivation[i] * this.input[j];
                        gradInput[j] += gradPreActivation[i] * this.weights[i][j];
                        
                        // Apply optimizer
                        this._updateWeight(i, j, grad, learningRate, optimizer, t);
                    }
                    this._updateBias(i, gradPreActivation[i], learningRate, optimizer, t);
                }
                
                return gradInput;
            },
            
            _updateWeight(i, j, grad, lr, optimizer, t) {
                const beta1 = 0.9, beta2 = 0.999, eps = 1e-8;
                
                switch (optimizer) {
                    case 'sgd':
                        this.weights[i][j] -= lr * grad;
                        break;
                    case 'momentum':
                        this.vWeights[i][j] = 0.9 * this.vWeights[i][j] + lr * grad;
                        this.weights[i][j] -= this.vWeights[i][j];
                        break;
                    case 'rmsprop':
                        this.gWeights[i][j] = 0.9 * this.gWeights[i][j] + 0.1 * grad * grad;
                        this.weights[i][j] -= lr * grad / (Math.sqrt(this.gWeights[i][j]) + eps);
                        break;
                    case 'adam':
                    default:
                        this.vWeights[i][j] = beta1 * this.vWeights[i][j] + (1 - beta1) * grad;
                        this.gWeights[i][j] = beta2 * this.gWeights[i][j] + (1 - beta2) * grad * grad;
                        const mHat = this.vWeights[i][j] / (1 - Math.pow(beta1, t));
                        const vHat = this.gWeights[i][j] / (1 - Math.pow(beta2, t));
                        this.weights[i][j] -= lr * mHat / (Math.sqrt(vHat) + eps);
                        break;
                }
            },
            
            _updateBias(i, grad, lr, optimizer, t) {
                const beta1 = 0.9, beta2 = 0.999, eps = 1e-8;
                
                switch (optimizer) {
                    case 'sgd':
                        this.biases[i] -= lr * grad;
                        break;
                    case 'momentum':
                        this.vBiases[i] = 0.9 * this.vBiases[i] + lr * grad;
                        this.biases[i] -= this.vBiases[i];
                        break;
                    case 'rmsprop':
                        this.gBiases[i] = 0.9 * this.gBiases[i] + 0.1 * grad * grad;
                        this.biases[i] -= lr * grad / (Math.sqrt(this.gBiases[i]) + eps);
                        break;
                    case 'adam':
                    default:
                        this.vBiases[i] = beta1 * this.vBiases[i] + (1 - beta1) * grad;
                        this.gBiases[i] = beta2 * this.gBiases[i] + (1 - beta2) * grad * grad;
                        const mHat = this.vBiases[i] / (1 - Math.pow(beta1, t));
                        const vHat = this.gBiases[i] / (1 - Math.pow(beta2, t));
                        this.biases[i] -= lr * mHat / (Math.sqrt(vHat) + eps);
                        break;
                }
            },
            
            getParams() {
                return { weights: this.weights, biases: this.biases };
            },
            
            setParams(params) {
                this.weights = params.weights;
                this.biases = params.biases;
            }
        };
    },
    
    // Batch normalization layer
    createBatchNormLayer(size, momentum = 0.1) {
        return {
            type: 'batchnorm',
            size,
            gamma: Array(size).fill(1),
            beta: Array(size).fill(0),
            runningMean: Array(size).fill(0),
            runningVar: Array(size).fill(1),
            momentum,
            eps: 1e-5,
            
            forward(input, training = false) {
                this.input = input;
                
                if (training) {
                    // Calculate batch statistics (single sample here, would batch in practice)
                    const mean = input.reduce((a, b) => a + b, 0) / input.length;
                    const variance = input.reduce((a, x) => a + Math.pow(x - mean, 2), 0) / input.length;
                    
                    // Update running statistics
                    for (let i = 0; i < this.size; i++) {
                        this.runningMean[i] = (1 - this.momentum) * this.runningMean[i] + this.momentum * mean;
                        this.runningVar[i] = (1 - this.momentum) * this.runningVar[i] + this.momentum * variance;
                    }
                    
                    this.mean = mean;
                    this.var = variance;
                } else {
                    this.mean = this.runningMean[0];
                    this.var = this.runningVar[0];
                }
                
                // Normalize and scale
                this.normalized = input.map(x => (x - this.mean) / Math.sqrt(this.var + this.eps));
                this.output = this.normalized.map((x, i) => this.gamma[i % this.gamma.length] * x + this.beta[i % this.beta.length]);
                
                return this.output;
            },
            
            backward(gradOutput, learningRate) {
                // Simplified backward pass
                const gradInput = gradOutput.map((g, i) => g * this.gamma[i % this.gamma.length] / Math.sqrt(this.var + this.eps));
                
                // Update gamma and beta
                for (let i = 0; i < this.size; i++) {
                    this.gamma[i] -= learningRate * gradOutput[i] * this.normalized[i];
                    this.beta[i] -= learningRate * gradOutput[i];
                }
                
                return gradInput;
            }
        };
    },
    
    // Residual connection wrapper
    createResidualBlock(layers) {
        return {
            type: 'residual',
            layers,
            
            forward(input, training = false) {
                let x = input;
                for (const layer of this.layers) {
                    x = layer.forward(x, training);
                }
                // Add skip connection
                this.output = x.map((v, i) => v + (input[i] || 0));
                return this.output;
            },
            
            backward(gradOutput, learningRate, optimizer, t) {
                let grad = gradOutput;
                for (let i = this.layers.length - 1; i >= 0; i--) {
                    grad = this.layers[i].backward(grad, learningRate, optimizer, t);
                }
                // Gradient flows through skip connection too
                return gradOutput.map((g, i) => g + grad[i]);
            }
        };
    }
}