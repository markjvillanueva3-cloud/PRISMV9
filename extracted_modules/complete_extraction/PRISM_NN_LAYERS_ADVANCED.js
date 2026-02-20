const PRISM_NN_LAYERS_ADVANCED = {

    /**
     * Conv2D - Convolutional Layer
     * For image/grid-based feature extraction
     */
    Conv2D: class {
        constructor(inChannels, outChannels, kernelSize, stride = 1, padding = 0) {
            this.inChannels = inChannels;
            this.outChannels = outChannels;
            this.kernelSize = kernelSize;
            this.stride = stride;
            this.padding = padding;

            // He initialization for ReLU
            const scale = Math.sqrt(2.0 / (inChannels * kernelSize * kernelSize));
            this.kernels = [];
            for (let o = 0; o < outChannels; o++) {
                this.kernels[o] = [];
                for (let i = 0; i < inChannels; i++) {
                    this.kernels[o][i] = PRISM_TENSOR_ENHANCED.randomNormal(
                        [kernelSize, kernelSize], 0, scale
                    );
                }
            }
            this.biases = Array(outChannels).fill(0);

            // Adam optimizer state
            this.mK = PRISM_TENSOR_ENHANCED.zeros([outChannels, inChannels, kernelSize, kernelSize]);
            this.vK = PRISM_TENSOR_ENHANCED.zeros([outChannels, inChannels, kernelSize, kernelSize]);
            this.mB = Array(outChannels).fill(0);
            this.vB = Array(outChannels).fill(0);
            this.t = 0;

            // Cache
            this.lastInput = null;
            this.lastOutput = null;
        }
        forward(input) {
            // input: [channels, height, width]
            this.lastInput = PRISM_TENSOR_ENHANCED.clone(input);

            const [C, H, W] = [input.length, input[0].length, input[0][0].length];
            const outH = Math.floor((H + 2 * this.padding - this.kernelSize) / this.stride) + 1;
            const outW = Math.floor((W + 2 * this.padding - this.kernelSize) / this.stride) + 1;

            const output = [];
            for (let o = 0; o < this.outChannels; o++) {
                const featureMap = PRISM_TENSOR_ENHANCED.zeros([outH, outW]);

                for (let i = 0; i < outH; i++) {
                    for (let j = 0; j < outW; j++) {
                        let sum = this.biases[o];
                        for (let c = 0; c < this.inChannels; c++) {
                            for (let ki = 0; ki < this.kernelSize; ki++) {
                                for (let kj = 0; kj < this.kernelSize; kj++) {
                                    const ii = i * this.stride + ki - this.padding;
                                    const jj = j * this.stride + kj - this.padding;
                                    if (ii >= 0 && ii < H && jj >= 0 && jj < W) {
                                        sum += input[c][ii][jj] * this.kernels[o][c][ki][kj];
                                    }
                                }
                            }
                        }
                        featureMap[i][j] = Math.max(0, sum); // ReLU activation
                    }
                }
                output.push(featureMap);
            }
            this.lastOutput = output;
            return output;
        }
        backward(gradOutput, learningRate = 0.001) {
            this.t++;
            const beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8;

            const [C, H, W] = [this.lastInput.length, this.lastInput[0].length, this.lastInput[0][0].length];
            const [outH, outW] = [gradOutput[0].length, gradOutput[0][0].length];

            // Gradient w.r.t. input
            const gradInput = PRISM_TENSOR_ENHANCED.zeros([C, H, W]);

            for (let o = 0; o < this.outChannels; o++) {
                // Apply ReLU derivative
                const reluGrad = gradOutput[o].map((row, i) =>
                    row.map((g, j) => this.lastOutput[o][i][j] > 0 ? g : 0)
                );

                // Compute gradients
                let gradBias = 0;
                for (let i = 0; i < outH; i++) {
                    for (let j = 0; j < outW; j++) {
                        gradBias += reluGrad[i][j];

                        for (let c = 0; c < this.inChannels; c++) {
                            for (let ki = 0; ki < this.kernelSize; ki++) {
                                for (let kj = 0; kj < this.kernelSize; kj++) {
                                    const ii = i * this.stride + ki - this.padding;
                                    const jj = j * this.stride + kj - this.padding;

                                    if (ii >= 0 && ii < H && jj >= 0 && jj < W) {
                                        // Gradient w.r.t. kernel
                                        const gK = reluGrad[i][j] * this.lastInput[c][ii][jj];

                                        // Adam update for kernel
                                        this.mK[o][c][ki][kj] = beta1 * this.mK[o][c][ki][kj] + (1 - beta1) * gK;
                                        this.vK[o][c][ki][kj] = beta2 * this.vK[o][c][ki][kj] + (1 - beta2) * gK * gK;

                                        const mHat = this.mK[o][c][ki][kj] / (1 - Math.pow(beta1, this.t));
                                        const vHat = this.vK[o][c][ki][kj] / (1 - Math.pow(beta2, this.t));

                                        this.kernels[o][c][ki][kj] -= learningRate * mHat / (Math.sqrt(vHat) + epsilon);

                                        // Gradient w.r.t. input
                                        gradInput[c][ii][jj] += reluGrad[i][j] * this.kernels[o][c][ki][kj];
                                    }
                                }
                            }
                        }
                    }
                }
                // Adam update for bias
                this.mB[o] = beta1 * this.mB[o] + (1 - beta1) * gradBias;
                this.vB[o] = beta2 * this.vB[o] + (1 - beta2) * gradBias * gradBias;
                const mHatB = this.mB[o] / (1 - Math.pow(beta1, this.t));
                const vHatB = this.vB[o] / (1 - Math.pow(beta2, this.t));
                this.biases[o] -= learningRate * mHatB / (Math.sqrt(vHatB) + epsilon);
            }
            return gradInput;
        }
        getParams() {
            return {
                kernels: PRISM_TENSOR_ENHANCED.clone(this.kernels),
                biases: [...this.biases]
            };
        }
        setParams(params) {
            this.kernels = PRISM_TENSOR_ENHANCED.clone(params.kernels);
            this.biases = [...params.biases];
        }
    },
    /**
     * MaxPool2D - Max Pooling Layer
     */
    MaxPool2D: class {
        constructor(poolSize = 2, stride = null) {
            this.poolSize = poolSize;
            this.stride = stride || poolSize;
            this.lastIndices = null;
            this.lastInputShape = null;
        }
        forward(input) {
            // input: [channels, height, width]
            this.lastInputShape = [input.length, input[0].length, input[0][0].length];

            const output = [];
            this.lastIndices = [];

            for (let c = 0; c < input.length; c++) {
                const { output: pooled, indices } = PRISM_TENSOR_ENHANCED.maxPool2d(
                    input[c], this.poolSize, this.stride
                );
                output.push(pooled);
                this.lastIndices.push(indices);
            }
            return output;
        }
        backward(gradOutput, learningRate = 0.001) {
            const [C, H, W] = this.lastInputShape;
            const gradInput = PRISM_TENSOR_ENHANCED.zeros([C, H, W]);

            for (let c = 0; c < C; c++) {
                const [outH, outW] = [gradOutput[c].length, gradOutput[c][0].length];
                for (let i = 0; i < outH; i++) {
                    for (let j = 0; j < outW; j++) {
                        const [maxI, maxJ] = this.lastIndices[c][i][j];
                        gradInput[c][maxI][maxJ] += gradOutput[c][i][j];
                    }
                }
            }
            return gradInput;
        }
    },
    /**
     * Flatten - Converts 3D to 1D for Dense layers
     */
    Flatten: class {
        constructor() {
            this.lastInputShape = null;
        }
        forward(input) {
            this.lastInputShape = PRISM_TENSOR_ENHANCED.shape(input);
            return PRISM_TENSOR_ENHANCED.flatten(input);
        }
        backward(gradOutput, learningRate = 0.001) {
            return PRISM_TENSOR_ENHANCED.reshape(gradOutput, this.lastInputShape);
        }
    },
    /**
     * LSTM - Long Short-Term Memory Layer
     * For sequence prediction (tool wear over time, etc.)
     */
    LSTM: class {
        constructor(inputSize, hiddenSize, returnSequences = false) {
            this.inputSize = inputSize;
            this.hiddenSize = hiddenSize;
            this.returnSequences = returnSequences;

            // Xavier initialization
            const scale = Math.sqrt(2.0 / (inputSize + hiddenSize));

            // Gates: forget, input, cell, output
            // Weights for input
            this.Wi = PRISM_TENSOR_ENHANCED.randomNormal([4, hiddenSize, inputSize], 0, scale);
            // Weights for hidden state
            this.Wh = PRISM_TENSOR_ENHANCED.randomNormal([4, hiddenSize, hiddenSize], 0, scale);
            // Biases (initialize forget gate bias to 1 for better gradient flow)
            this.b = [
                Array(hiddenSize).fill(1),  // Forget gate - bias to 1
                Array(hiddenSize).fill(0),  // Input gate
                Array(hiddenSize).fill(0),  // Cell gate
                Array(hiddenSize).fill(0)   // Output gate
            ];

            // Adam optimizer state
            this.mWi = PRISM_TENSOR_ENHANCED.zeros([4, hiddenSize, inputSize]);
            this.vWi = PRISM_TENSOR_ENHANCED.zeros([4, hiddenSize, inputSize]);
            this.mWh = PRISM_TENSOR_ENHANCED.zeros([4, hiddenSize, hiddenSize]);
            this.vWh = PRISM_TENSOR_ENHANCED.zeros([4, hiddenSize, hiddenSize]);
            this.mb = PRISM_TENSOR_ENHANCED.zeros([4, hiddenSize]);
            this.vb = PRISM_TENSOR_ENHANCED.zeros([4, hiddenSize]);
            this.t = 0;

            // Cache for backprop
            this.cache = [];
        }
        _sigmoid(x) {
            return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
        }
        _tanh(x) {
            return Math.tanh(x);
        }
        forward(sequence) {
            // sequence: [seqLength, inputSize]
            const seqLength = sequence.length;
            let h = Array(this.hiddenSize).fill(0);
            let c = Array(this.hiddenSize).fill(0);

            this.cache = [];
            const outputs = [];

            for (let t = 0; t < seqLength; t++) {
                const x = sequence[t];
                const prevH = [...h];
                const prevC = [...c];

                // Compute gates
                const gates = [];
                for (let g = 0; g < 4; g++) {
                    const gate = [];
                    for (let j = 0; j < this.hiddenSize; j++) {
                        let sum = this.b[g][j];
                        for (let k = 0; k < this.inputSize; k++) {
                            sum += this.Wi[g][j][k] * x[k];
                        }
                        for (let k = 0; k < this.hiddenSize; k++) {
                            sum += this.Wh[g][j][k] * prevH[k];
                        }
                        gate.push(sum);
                    }
                    gates.push(gate);
                }
                // Apply activations
                const f = gates[0].map(v => this._sigmoid(v)); // Forget gate
                const i = gates[1].map(v => this._sigmoid(v)); // Input gate
                const cTilde = gates[2].map(v => this._tanh(v)); // Cell candidate
                const o = gates[3].map(v => this._sigmoid(v)); // Output gate

                // New cell state and hidden state
                c = c.map((cPrev, j) => f[j] * cPrev + i[j] * cTilde[j]);
                h = c.map((cNew, j) => o[j] * this._tanh(cNew));

                // Cache for backward pass
                this.cache.push({ x, prevH, prevC, f, i, cTilde, o, c: [...c], h: [...h] });

                if (this.returnSequences) {
                    outputs.push([...h]);
                }
            }
            return this.returnSequences ? outputs : h;
        }
        backward(gradOutput, learningRate = 0.001) {
            this.t++;
            const beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8;

            // Initialize gradients
            const gradWi = PRISM_TENSOR_ENHANCED.zeros([4, this.hiddenSize, this.inputSize]);
            const gradWh = PRISM_TENSOR_ENHANCED.zeros([4, this.hiddenSize, this.hiddenSize]);
            const gradb = PRISM_TENSOR_ENHANCED.zeros([4, this.hiddenSize]);

            let dh_next = Array(this.hiddenSize).fill(0);
            let dc_next = Array(this.hiddenSize).fill(0);

            // Handle gradOutput format
            const seqLength = this.cache.length;
            const gradH = this.returnSequences ? gradOutput :
                Array(seqLength - 1).fill(Array(this.hiddenSize).fill(0)).concat([gradOutput]);

            // Backward through time
            for (let t = seqLength - 1; t >= 0; t--) {
                const { x, prevH, prevC, f, i, cTilde, o, c, h } = this.cache[t];

                // Total gradient on hidden state
                const dh = gradH[t].map((g, j) => g + dh_next[j]);

                // Gradient through output gate
                const do_ = dh.map((dh_j, j) => dh_j * this._tanh(c[j]));
                const do_raw = do_.map((d, j) => d * o[j] * (1 - o[j]));

                // Gradient on cell state
                const dc = dh.map((dh_j, j) =>
                    dh_j * o[j] * (1 - Math.pow(this._tanh(c[j]), 2)) + dc_next[j]
                );

                // Gradient through forget gate
                const df = dc.map((dc_j, j) => dc_j * prevC[j]);
                const df_raw = df.map((d, j) => d * f[j] * (1 - f[j]));

                // Gradient through input gate
                const di = dc.map((dc_j, j) => dc_j * cTilde[j]);
                const di_raw = di.map((d, j) => d * i[j] * (1 - i[j]));

                // Gradient through cell candidate
                const dcTilde = dc.map((dc_j, j) => dc_j * i[j]);
                const dcTilde_raw = dcTilde.map((d, j) => d * (1 - Math.pow(cTilde[j], 2)));

                const gateGrads = [df_raw, di_raw, dcTilde_raw, do_raw];

                // Accumulate weight gradients
                for (let g = 0; g < 4; g++) {
                    for (let j = 0; j < this.hiddenSize; j++) {
                        gradb[g][j] += gateGrads[g][j];
                        for (let k = 0; k < this.inputSize; k++) {
                            gradWi[g][j][k] += gateGrads[g][j] * x[k];
                        }
                        for (let k = 0; k < this.hiddenSize; k++) {
                            gradWh[g][j][k] += gateGrads[g][j] * prevH[k];
                        }
                    }
                }
                // Gradient for next timestep
                dh_next = Array(this.hiddenSize).fill(0);
                for (let j = 0; j < this.hiddenSize; j++) {
                    for (let g = 0; g < 4; g++) {
                        for (let k = 0; k < this.hiddenSize; k++) {
                            dh_next[k] += gateGrads[g][j] * this.Wh[g][j][k];
                        }
                    }
                }
                dc_next = dc.map((dc_j, j) => dc_j * f[j]);
            }
            // Adam update
            for (let g = 0; g < 4; g++) {
                for (let j = 0; j < this.hiddenSize; j++) {
                    // Bias update
                    this.mb[g][j] = beta1 * this.mb[g][j] + (1 - beta1) * gradb[g][j];
                    this.vb[g][j] = beta2 * this.vb[g][j] + (1 - beta2) * gradb[g][j] * gradb[g][j];
                    const mHatB = this.mb[g][j] / (1 - Math.pow(beta1, this.t));
                    const vHatB = this.vb[g][j] / (1 - Math.pow(beta2, this.t));
                    this.b[g][j] -= learningRate * mHatB / (Math.sqrt(vHatB) + epsilon);

                    // Weight updates
                    for (let k = 0; k < this.inputSize; k++) {
                        this.mWi[g][j][k] = beta1 * this.mWi[g][j][k] + (1 - beta1) * gradWi[g][j][k];
                        this.vWi[g][j][k] = beta2 * this.vWi[g][j][k] + (1 - beta2) * gradWi[g][j][k] * gradWi[g][j][k];
                        const mHat = this.mWi[g][j][k] / (1 - Math.pow(beta1, this.t));
                        const vHat = this.vWi[g][j][k] / (1 - Math.pow(beta2, this.t));
                        this.Wi[g][j][k] -= learningRate * mHat / (Math.sqrt(vHat) + epsilon);
                    }
                    for (let k = 0; k < this.hiddenSize; k++) {
                        this.mWh[g][j][k] = beta1 * this.mWh[g][j][k] + (1 - beta1) * gradWh[g][j][k];
                        this.vWh[g][j][k] = beta2 * this.vWh[g][j][k] + (1 - beta2) * gradWh[g][j][k] * gradWh[g][j][k];
                        const mHat = this.mWh[g][j][k] / (1 - Math.pow(beta1, this.t));
                        const vHat = this.vWh[g][j][k] / (1 - Math.pow(beta2, this.t));
                        this.Wh[g][j][k] -= learningRate * mHat / (Math.sqrt(vHat) + epsilon);
                    }
                }
            }
            return dh_next;
        }
        getParams() {
            return {
                Wi: PRISM_TENSOR_ENHANCED.clone(this.Wi),
                Wh: PRISM_TENSOR_ENHANCED.clone(this.Wh),
                b: this.b.map(g => [...g])
            };
        }
        setParams(params) {
            this.Wi = PRISM_TENSOR_ENHANCED.clone(params.Wi);
            this.Wh = PRISM_TENSOR_ENHANCED.clone(params.Wh);
            this.b = params.b.map(g => [...g]);
        }
    },
    /**
     * GRU - Gated Recurrent Unit (simpler than LSTM)
     */
    GRU: class {
        constructor(inputSize, hiddenSize, returnSequences = false) {
            this.inputSize = inputSize;
            this.hiddenSize = hiddenSize;
            this.returnSequences = returnSequences;

            const scale = Math.sqrt(2.0 / (inputSize + hiddenSize));

            // Gates: reset, update, candidate
            this.Wi = PRISM_TENSOR_ENHANCED.randomNormal([3, hiddenSize, inputSize], 0, scale);
            this.Wh = PRISM_TENSOR_ENHANCED.randomNormal([3, hiddenSize, hiddenSize], 0, scale);
            this.b = [
                Array(hiddenSize).fill(0),
                Array(hiddenSize).fill(0),
                Array(hiddenSize).fill(0)
            ];

            this.cache = [];
        }
        _sigmoid(x) {
            return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
        }
        forward(sequence) {
            const seqLength = sequence.length;
            let h = Array(this.hiddenSize).fill(0);

            this.cache = [];
            const outputs = [];

            for (let t = 0; t < seqLength; t++) {
                const x = sequence[t];
                const prevH = [...h];

                // Compute gates
                const gates = [];
                for (let g = 0; g < 3; g++) {
                    const gate = [];
                    for (let j = 0; j < this.hiddenSize; j++) {
                        let sum = this.b[g][j];
                        for (let k = 0; k < this.inputSize; k++) {
                            sum += this.Wi[g][j][k] * x[k];
                        }
                        for (let k = 0; k < this.hiddenSize; k++) {
                            sum += this.Wh[g][j][k] * prevH[k];
                        }
                        gate.push(sum);
                    }
                    gates.push(gate);
                }
                const r = gates[0].map(v => this._sigmoid(v)); // Reset gate
                const z = gates[1].map(v => this._sigmoid(v)); // Update gate

                // Candidate with reset gate applied
                const hTilde = [];
                for (let j = 0; j < this.hiddenSize; j++) {
                    let sum = this.b[2][j];
                    for (let k = 0; k < this.inputSize; k++) {
                        sum += this.Wi[2][j][k] * x[k];
                    }
                    for (let k = 0; k < this.hiddenSize; k++) {
                        sum += this.Wh[2][j][k] * (r[k] * prevH[k]);
                    }
                    hTilde.push(Math.tanh(sum));
                }
                // New hidden state
                h = h.map((_, j) => (1 - z[j]) * prevH[j] + z[j] * hTilde[j]);

                this.cache.push({ x, prevH, r, z, hTilde, h: [...h] });

                if (this.returnSequences) {
                    outputs.push([...h]);
                }
            }
            return this.returnSequences ? outputs : h;
        }
        backward(gradOutput, learningRate = 0.001) {
            // Simplified backward pass (full implementation would be similar to LSTM)
            return gradOutput;
        }
    },
    /**
     * MultiHeadAttention - Transformer-style attention
     */
    MultiHeadAttention: class {
        constructor(dModel, numHeads) {
            this.dModel = dModel;
            this.numHeads = numHeads;
            this.dK = Math.floor(dModel / numHeads);

            const scale = Math.sqrt(2.0 / dModel);

            // Query, Key, Value projections
            this.Wq = PRISM_TENSOR_ENHANCED.randomNormal([dModel, dModel], 0, scale);
            this.Wk = PRISM_TENSOR_ENHANCED.randomNormal([dModel, dModel], 0, scale);
            this.Wv = PRISM_TENSOR_ENHANCED.randomNormal([dModel, dModel], 0, scale);
            this.Wo = PRISM_TENSOR_ENHANCED.randomNormal([dModel, dModel], 0, scale);

            this.cache = null;
        }
        _softmax(arr) {
            const max = Math.max(...arr);
            const exps = arr.map(x => Math.exp(x - max));
            const sum = exps.reduce((a, b) => a + b, 0);
            return exps.map(e => e / sum);
        }
        forward(query, key, value, mask = null) {
            // query, key, value: [seqLen, dModel]
            const seqLen = query.length;

            // Linear projections
            const Q = query.map(q => {
                const result = [];
                for (let i = 0; i < this.dModel; i++) {
                    let sum = 0;
                    for (let j = 0; j < this.dModel; j++) {
                        sum += q[j] * this.Wq[j][i];
                    }
                    result.push(sum);
                }
                return result;
            });

            const K = key.map(k => {
                const result = [];
                for (let i = 0; i < this.dModel; i++) {
                    let sum = 0;
                    for (let j = 0; j < this.dModel; j++) {
                        sum += k[j] * this.Wk[j][i];
                    }
                    result.push(sum);
                }
                return result;
            });

            const V = value.map(v => {
                const result = [];
                for (let i = 0; i < this.dModel; i++) {
                    let sum = 0;
                    for (let j = 0; j < this.dModel; j++) {
                        sum += v[j] * this.Wv[j][i];
                    }
                    result.push(sum);
                }
                return result;
            });

            // Scaled dot-product attention for each head
            const scale = Math.sqrt(this.dK);
            const outputs = [];

            for (let h = 0; h < this.numHeads; h++) {
                const headStart = h * this.dK;
                const headEnd = headStart + this.dK;

                // Extract head slices
                const Qh = Q.map(q => q.slice(headStart, headEnd));
                const Kh = K.map(k => k.slice(headStart, headEnd));
                const Vh = V.map(v => v.slice(headStart, headEnd));

                // Compute attention scores
                const scores = [];
                for (let i = 0; i < seqLen; i++) {
                    const row = [];
                    for (let j = 0; j < seqLen; j++) {
                        let score = 0;
                        for (let k = 0; k < this.dK; k++) {
                            score += Qh[i][k] * Kh[j][k];
                        }
                        row.push(score / scale);
                    }
                    scores.push(row);
                }
                // Apply mask if provided
                if (mask) {
                    for (let i = 0; i < seqLen; i++) {
                        for (let j = 0; j < seqLen; j++) {
                            if (mask[i][j] === 0) {
                                scores[i][j] = -1e9;
                            }
                        }
                    }
                }
                // Softmax
                const attnWeights = scores.map(row => this._softmax(row));

                // Apply attention to values
                const headOutput = [];
                for (let i = 0; i < seqLen; i++) {
                    const weighted = Array(this.dK).fill(0);
                    for (let j = 0; j < seqLen; j++) {
                        for (let k = 0; k < this.dK; k++) {
                            weighted[k] += attnWeights[i][j] * Vh[j][k];
                        }
                    }
                    headOutput.push(weighted);
                }
                outputs.push(headOutput);
            }
            // Concatenate heads and project
            const concat = [];
            for (let i = 0; i < seqLen; i++) {
                const row = [];
                for (let h = 0; h < this.numHeads; h++) {
                    row.push(...outputs[h][i]);
                }
                concat.push(row);
            }
            // Output projection
            const output = concat.map(c => {
                const result = [];
                for (let i = 0; i < this.dModel; i++) {
                    let sum = 0;
                    for (let j = 0; j < this.dModel; j++) {
                        sum += c[j] * this.Wo[j][i];
                    }
                    result.push(sum);
                }
                return result;
            });

            this.cache = { Q, K, V, outputs };
            return output;
        }
        backward(gradOutput, learningRate = 0.001) {
            // Simplified backward - full implementation would compute all gradients
            return gradOutput;
        }
    },
    /**
     * LayerNorm - Layer Normalization
     */
    LayerNorm: class {
        constructor(size, eps = 1e-6) {
            this.size = size;
            this.eps = eps;
            this.gamma = Array(size).fill(1);
            this.beta = Array(size).fill(0);
            this.cache = null;
        }
        forward(input) {
            // input: [batchSize, size] or just [size]
            const is2D = Array.isArray(input[0]);
            const data = is2D ? input : [input];

            const output = data.map(x => {
                const mean = x.reduce((a, b) => a + b, 0) / x.length;
                const variance = x.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / x.length;
                const std = Math.sqrt(variance + this.eps);

                return x.map((v, i) => this.gamma[i] * ((v - mean) / std) + this.beta[i]);
            });

            this.cache = { data, output };
            return is2D ? output : output[0];
        }
        backward(gradOutput, learningRate = 0.001) {
            return gradOutput;
        }
    },
    /**
     * BatchNorm1D - Batch Normalization for 1D inputs
     */
    BatchNorm1D: class {
        constructor(numFeatures, momentum = 0.1, eps = 1e-5) {
            this.numFeatures = numFeatures;
            this.momentum = momentum;
            this.eps = eps;

            this.gamma = Array(numFeatures).fill(1);
            this.beta = Array(numFeatures).fill(0);

            this.runningMean = Array(numFeatures).fill(0);
            this.runningVar = Array(numFeatures).fill(1);

            this.training = true;
            this.cache = null;
        }
        forward(input) {
            // input: [batchSize, numFeatures]
            const batchSize = input.length;

            let mean, variance;

            if (this.training) {
                // Compute batch statistics
                mean = Array(this.numFeatures).fill(0);
                for (let i = 0; i < batchSize; i++) {
                    for (let j = 0; j < this.numFeatures; j++) {
                        mean[j] += input[i][j];
                    }
                }
                mean = mean.map(m => m / batchSize);

                variance = Array(this.numFeatures).fill(0);
                for (let i = 0; i < batchSize; i++) {
                    for (let j = 0; j < this.numFeatures; j++) {
                        variance[j] += Math.pow(input[i][j] - mean[j], 2);
                    }
                }
                variance = variance.map(v => v / batchSize);

                // Update running statistics
                for (let j = 0; j < this.numFeatures; j++) {
                    this.runningMean[j] = (1 - this.momentum) * this.runningMean[j] + this.momentum * mean[j];
                    this.runningVar[j] = (1 - this.momentum) * this.runningVar[j] + this.momentum * variance[j];
                }
            } else {
                mean = this.runningMean;
                variance = this.runningVar;
            }
            // Normalize
            const std = variance.map(v => Math.sqrt(v + this.eps));
            const normalized = input.map(x =>
                x.map((v, j) => (v - mean[j]) / std[j])
            );

            // Scale and shift
            const output = normalized.map(x =>
                x.map((v, j) => this.gamma[j] * v + this.beta[j])
            );

            this.cache = { input, normalized, mean, variance, std };
            return output;
        }
        backward(gradOutput, learningRate = 0.001) {
            const { input, normalized, mean, variance, std } = this.cache;
            const batchSize = input.length;

            // Gradients for gamma and beta
            const gradGamma = Array(this.numFeatures).fill(0);
            const gradBeta = Array(this.numFeatures).fill(0);

            for (let i = 0; i < batchSize; i++) {
                for (let j = 0; j < this.numFeatures; j++) {
                    gradGamma[j] += gradOutput[i][j] * normalized[i][j];
                    gradBeta[j] += gradOutput[i][j];
                }
            }
            // Update parameters
            for (let j = 0; j < this.numFeatures; j++) {
                this.gamma[j] -= learningRate * gradGamma[j];
                this.beta[j] -= learningRate * gradBeta[j];
            }
            // Gradient for input
            const gradInput = input.map((x, i) =>
                x.map((_, j) => {
                    const gradNorm = gradOutput[i][j] * this.gamma[j];
                    return gradNorm / std[j];
                })
            );

            return gradInput;
        }
        setTraining(mode) {
            this.training = mode;
        }
    }
}