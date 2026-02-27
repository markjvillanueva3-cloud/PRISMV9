/**
 * PRISM_SEQUENCE_MODEL_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 192
 * Session: R2.3.1 Engine Gap Extraction Round 2
 */

const PRISM_SEQUENCE_MODEL_ENGINE = {
    name: 'PRISM_SEQUENCE_MODEL_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Stanford CS 224N',

    _sigmoid: function(x) { return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x)))); },
    _tanh: function(x) { return Math.tanh(x); },

    /**
     * Create LSTM Cell
     */
    createLSTMCell: function(inputSize, hiddenSize) {
        const scale = Math.sqrt(2 / (inputSize + hiddenSize));
        const initWeights = (rows, cols) => Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => (Math.random() - 0.5) * scale));

        return {
            // Gates: forget, input, output, cell
            Wf: initWeights(inputSize + hiddenSize, hiddenSize),
            Wi: initWeights(inputSize + hiddenSize, hiddenSize),
            Wo: initWeights(inputSize + hiddenSize, hiddenSize),
            Wc: initWeights(inputSize + hiddenSize, hiddenSize),
            bf: Array(hiddenSize).fill(1), // Initialize forget bias to 1
            bi: Array(hiddenSize).fill(0),
            bo: Array(hiddenSize).fill(0),
            bc: Array(hiddenSize).fill(0),
            hiddenSize,
            inputSize,

            forward: function(x, h_prev, c_prev) {
                h_prev = h_prev || Array(hiddenSize).fill(0);
                c_prev = c_prev || Array(hiddenSize).fill(0);

                const combined = [...x, ...h_prev];

                // Gate computations
                const computeGate = (W, b, activation) => {
                    return b.map((bi, j) => {
                        const sum = bi + combined.reduce((s, xi, i) => s + xi * W[i][j], 0);
                        return activation(sum);
                    });
                };

                const f = computeGate(this.Wf, this.bf, PRISM_SEQUENCE_MODEL_ENGINE._sigmoid);
                const i = computeGate(this.Wi, this.bi, PRISM_SEQUENCE_MODEL_ENGINE._sigmoid);
                const o = computeGate(this.Wo, this.bo, PRISM_SEQUENCE_MODEL_ENGINE._sigmoid);
                const c_tilde = computeGate(this.Wc, this.bc, PRISM_SEQUENCE_MODEL_ENGINE._tanh);

                // Cell state update: c = f * c_prev + i * c_tilde
                const c = c_prev.map((cp, j) => f[j] * cp + i[j] * c_tilde[j]);

                // Hidden state: h = o * tanh(c)
                const h = c.map((cj, j) => o[j] * Math.tanh(cj));

                return { h, c, gates: { f, i, o, c_tilde } };
            }
        };
    },

    /**
     * Create GRU Cell
     */
    createGRUCell: function(inputSize, hiddenSize) {
        const scale = Math.sqrt(2 / (inputSize + hiddenSize));
        const initWeights = (rows, cols) => Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => (Math.random() - 0.5) * scale));

        return {
            Wz: initWeights(inputSize + hiddenSize, hiddenSize), // Update gate
            Wr: initWeights(inputSize + hiddenSize, hiddenSize), // Reset gate
            Wh: initWeights(inputSize + hiddenSize, hiddenSize), // Candidate
            bz: Array(hiddenSize).fill(0),
            br: Array(hiddenSize).fill(0),
            bh: Array(hiddenSize).fill(0),
            hiddenSize,
            inputSize,

            forward: function(x, h_prev) {
                h_prev = h_prev || Array(hiddenSize).fill(0);
                const combined = [...x, ...h_prev];

                // Update gate
                const z = this.bz.map((b, j) => {
                    const sum = b + combined.reduce((s, xi, i) => s + xi * this.Wz[i][j], 0);
                    return PRISM_SEQUENCE_MODEL_ENGINE._sigmoid(sum);
                });

                // Reset gate
                const r = this.br.map((b, j) => {
                    const sum = b + combined.reduce((s, xi, i) => s + xi * this.Wr[i][j], 0);
                    return PRISM_SEQUENCE_MODEL_ENGINE._sigmoid(sum);
                });

                // Candidate hidden state
                const combinedReset = [...x, ...h_prev.map((hp, j) => r[j] * hp)];
                const h_tilde = this.bh.map((b, j) => {
                    const sum = b + combinedReset.reduce((s, xi, i) => s + xi * this.Wh[i][j], 0);
                    return PRISM_SEQUENCE_MODEL_ENGINE._tanh(sum);
                });

                // Hidden state: h = (1 - z) * h_prev + z * h_tilde
                const h = h_prev.map((hp, j) => (1 - z[j]) * hp + z[j] * h_tilde[j]);

                return { h, gates: { z, r, h_tilde } };
            }
        };
    },

    /**
     * Create Simple RNN Cell
     */
    createRNNCell: function(inputSize, hiddenSize, activation = 'tanh') {
        const scale = Math.sqrt(2 / (inputSize + hiddenSize));
        return {
            Wxh: Array.from({ length: inputSize }, () =>
                Array.from({ length: hiddenSize }, () => (Math.random() - 0.5) * scale)),
            Whh: Array.from({ length: hiddenSize }, () =>
                Array.from({ length: hiddenSize }, () => (Math.random() - 0.5) * scale)),
            bh: Array(hiddenSize).fill(0),
            hiddenSize,
            activation,

            forward: function(x, h_prev) {
                h_prev = h_prev || Array(hiddenSize).fill(0);

                const h = this.bh.map((b, j) => {
                    let sum = b;
                    for (let i = 0; i < x.length; i++) sum += x[i] * this.Wxh[i][j];
                    for (let i = 0; i < h_prev.length; i++) sum += h_prev[i] * this.Whh[i][j];
                    return this.activation === 'relu' ? Math.max(0, sum) : Math.tanh(sum);
                });

                return { h };
            }
        };
    },

    /**
     * Bidirectional RNN wrapper
     */
    createBidirectionalRNN: function(forwardCell, backwardCell) {
        return {
            forward: forwardCell,
            backward: backwardCell,

            process: function(sequence) {
                const seqLen = sequence.length;
                const forwardOutputs = [], backwardOutputs = [];

                // Forward pass
                let hF = null, cF = null;
                for (let t = 0; t < seqLen; t++) {
                    const result = this.forward.forward(sequence[t], hF, cF);
                    hF = result.h;
                    cF = result.c;
                    forwardOutputs.push(hF);
                }

                // Backward pass
                let hB = null, cB = null;
                for (let t = seqLen - 1; t >= 0; t--) {
                    const result = this.backward.forward(sequence[t], hB, cB);
                    hB = result.h;
                    cB = result.c;
                    backwardOutputs.unshift(hB);
                }

                // Concatenate outputs
                const outputs = forwardOutputs.map((fwd, t) => [...fwd, ...backwardOutputs[t]]);

                return { outputs, finalForward: hF, finalBackward: hB };
            }
        };
    },

    /**
     * Process sequence through RNN/LSTM/GRU
     */
    processSequence: function(cell, sequence) {
        const outputs = [];
        let h = null, c = null;

        for (const x of sequence) {
            const result = cell.forward(x, h, c);
            h = result.h;
            c = result.c;
            outputs.push(h);
        }

        return { outputs, finalHidden: h, finalCell: c };
    }
}