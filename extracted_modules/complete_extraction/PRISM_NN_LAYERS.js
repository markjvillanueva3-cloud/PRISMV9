const PRISM_NN_LAYERS = {

    /**
     * Dense (Fully Connected) Layer with Adam optimizer
     */
    Dense: class {
        constructor(inputSize, outputSize, activation = 'relu') {
            this.inputSize = inputSize;
            this.outputSize = outputSize;
            this.activation = activation;

            // Xavier initialization
            const scale = Math.sqrt(2.0 / (inputSize + outputSize));
            this.weights = [];
            for (let i = 0; i < inputSize; i++) {
                this.weights[i] = [];
                for (let j = 0; j < outputSize; j++) {
                    this.weights[i][j] = (Math.random() - 0.5) * 2 * scale;
                }
            }
            this.biases = Array(outputSize).fill(0);

            // Adam optimizer state
            this.mW = PRISM_TENSOR.zeros([inputSize, outputSize]);
            this.vW = PRISM_TENSOR.zeros([inputSize, outputSize]);
            this.mB = Array(outputSize).fill(0);
            this.vB = Array(outputSize).fill(0);

            // Cache for backprop
            this.lastInput = null;
            this.lastOutput = null;
        }
        forward(input) {
            this.lastInput = [...input];

            // Linear transformation: y = Wx + b
            const preActivation = [];
            for (let j = 0; j < this.outputSize; j++) {
                let sum = this.biases[j];
                for (let i = 0; i < this.inputSize; i++) {
                    sum += input[i] * this.weights[i][j];
                }
                preActivation.push(sum);
            }
            // Apply activation
            this.lastOutput = this._activate(preActivation);
            return this.lastOutput;
        }
        _activate(x) {
            switch (this.activation) {
                case 'relu':
                    return x.map(v => Math.max(0, v));
                case 'sigmoid':
                    return x.map(v => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, v)))));
                case 'tanh':
                    return x.map(v => Math.tanh(v));
                case 'softmax':
                    const max = Math.max(...x);
                    const exps = x.map(v => Math.exp(v - max));
                    const sum = exps.reduce((a, b) => a + b, 0);
                    return exps.map(e => e / (sum + 1e-10));
                case 'linear':
                default:
                    return [...x];
            }
        }
        backward(gradOutput, learningRate = 0.001) {
            const input = this.lastInput;
            const output = this.lastOutput;

            // Gradient through activation
            let dPre;
            if (this.activation === 'softmax') {
                dPre = [...gradOutput];
            } else if (this.activation === 'relu') {
                dPre = gradOutput.map((g, i) => output[i] > 0 ? g : 0);
            } else if (this.activation === 'sigmoid') {
                dPre = gradOutput.map((g, i) => g * output[i] * (1 - output[i]));
            } else if (this.activation === 'tanh') {
                dPre = gradOutput.map((g, i) => g * (1 - output[i] * output[i]));
            } else {
                dPre = [...gradOutput];
            }
            // Clip gradients to prevent explosion
            const maxGrad = 5.0;
            dPre = dPre.map(g => Math.max(-maxGrad, Math.min(maxGrad, g)));

            // Gradient w.r.t input
            const gradInput = [];
            for (let i = 0; i < this.inputSize; i++) {
                let sum = 0;
                for (let j = 0; j < this.outputSize; j++) {
                    sum += this.weights[i][j] * dPre[j];
                }
                gradInput.push(sum);
            }
            // Update weights with Adam
            const beta1 = 0.9, beta2 = 0.999, eps = 1e-8;

            for (let i = 0; i < this.inputSize; i++) {
                for (let j = 0; j < this.outputSize; j++) {
                    const grad = input[i] * dPre[j];
                    this.mW[i][j] = beta1 * this.mW[i][j] + (1 - beta1) * grad;
                    this.vW[i][j] = beta2 * this.vW[i][j] + (1 - beta2) * grad * grad;
                    this.weights[i][j] -= learningRate * this.mW[i][j] / (Math.sqrt(this.vW[i][j]) + eps);
                }
            }
            for (let j = 0; j < this.outputSize; j++) {
                const grad = dPre[j];
                this.mB[j] = beta1 * this.mB[j] + (1 - beta1) * grad;
                this.vB[j] = beta2 * this.vB[j] + (1 - beta2) * grad * grad;
                this.biases[j] -= learningRate * this.mB[j] / (Math.sqrt(this.vB[j]) + eps);
            }
            return gradInput;
        }
        getParams() {
            return {
                weights: PRISM_TENSOR.clone(this.weights),
                biases: [...this.biases]
            };
        }
        setParams(params) {
            this.weights = PRISM_TENSOR.clone(params.weights);
            this.biases = [...params.biases];
        }
    },
    /**
     * Dropout Layer for regularization
     */
    Dropout: class {
        constructor(rate = 0.5) {
            this.rate = rate;
            this.training = true;
            this.mask = null;
        }
        forward(input) {
            if (!this.training || this.rate === 0) return [...input];
            this.mask = input.map(() => Math.random() > this.rate ? 1 / (1 - this.rate) : 0);
            return input.map((x, i) => x * this.mask[i]);
        }
        backward(gradOutput, learningRate) {
            if (!this.training || this.rate === 0) return [...gradOutput];
            return gradOutput.map((g, i) => g * this.mask[i]);
        }
        setTraining(mode) { this.training = mode; }
    }
}