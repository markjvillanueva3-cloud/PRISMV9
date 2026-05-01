const PRISM_TRANSFORMER_ENGINE = {
    name: 'PRISM_TRANSFORMER_ENGINE',
    version: '1.0.0',
    source: 'MIT 15.773, Vaswani 2017',

    /**
     * Sinusoidal Positional Encoding
     */
    positionalEncoding: function(seqLen, dModel) {
        const PE = [];
        for (let pos = 0; pos < seqLen; pos++) {
            const row = [];
            for (let i = 0; i < dModel; i++) {
                const angle = pos / Math.pow(10000, (2 * Math.floor(i / 2)) / dModel);
                row.push(i % 2 === 0 ? Math.sin(angle) : Math.cos(angle));
            }
            PE.push(row);
        }
        return PE;
    },

    /**
     * Layer Normalization
     */
    layerNorm: function(x, gamma = null, beta = null, epsilon = 1e-6) {
        const mean = x.reduce((s, v) => s + v, 0) / x.length;
        const variance = x.reduce((s, v) => s + (v - mean) ** 2, 0) / x.length;
        const std = Math.sqrt(variance + epsilon);

        return x.map((v, i) => {
            const normalized = (v - mean) / std;
            const g = gamma ? gamma[i] : 1;
            const b = beta ? beta[i] : 0;
            return g * normalized + b;
        });
    },

    /**
     * Position-wise Feed-Forward Network
     * FFN(x) = max(0, xW₁ + b₁)W₂ + b₂
     */
    feedForward: function(x, dFF, params = null) {
        const dModel = x.length;

        // Initialize weights if not provided
        const W1 = params?.W1 || Array.from({ length: dModel }, () =>
            Array.from({ length: dFF }, () => (Math.random() - 0.5) * Math.sqrt(2 / dModel)));
        const b1 = params?.b1 || Array(dFF).fill(0);
        const W2 = params?.W2 || Array.from({ length: dFF }, () =>
            Array.from({ length: dModel }, () => (Math.random() - 0.5) * Math.sqrt(2 / dFF)));
        const b2 = params?.b2 || Array(dModel).fill(0);

        // First linear + ReLU
        const hidden = b1.map((b, j) => {
            const sum = b + x.reduce((s, xi, i) => s + xi * W1[i][j], 0);
            return Math.max(0, sum); // ReLU
        });

        // Second linear
        return b2.map((b, k) => b + hidden.reduce((s, hj, j) => s + hj * W2[j][k], 0));
    },

    /**
     * GELU Activation (used in BERT, GPT)
     */
    gelu: function(x) {
        return 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x * x * x)));
    },

    /**
     * Transformer Encoder Layer
     */
    encoderLayer: function(x, params = {}) {
        const { dModel = 512, numHeads = 8, dFF = 2048, dropout = 0.1 } = params;
        const seqLen = x.length;

        // Self-attention
        const attnOutput = PRISM_ATTENTION_ENGINE.multiHeadAttention(x, x, x, numHeads, dModel);

        // Add & Norm
        const attnResidual = x.map((xi, i) => this.layerNorm(
            xi.map((v, j) => v + attnOutput[i][j])
        ));

        // Feed-forward
        const ffOutput = attnResidual.map(token => this.feedForward(token, dFF));

        // Add & Norm
        const output = attnResidual.map((xi, i) => this.layerNorm(
            xi.map((v, j) => v + ffOutput[i][j])
        ));

        return output;
    },

    /**
     * Transformer Decoder Layer
     */
    decoderLayer: function(x, encoderOutput, params = {}) {
        const { dModel = 512, numHeads = 8, dFF = 2048 } = params;
        const seqLen = x.length;

        // Causal mask for self-attention
        const causalMask = Array.from({ length: seqLen }, (_, i) =>
            Array.from({ length: seqLen }, (_, j) => j <= i ? 1 : 0));

        // Masked self-attention
        const selfAttn = PRISM_ATTENTION_ENGINE.multiHeadAttention(x, x, x, numHeads, dModel, causalMask);
        const selfAttnResidual = x.map((xi, i) => this.layerNorm(
            xi.map((v, j) => v + selfAttn[i][j])
        ));

        // Cross-attention with encoder output
        const crossAttn = PRISM_ATTENTION_ENGINE.multiHeadAttention(
            selfAttnResidual, encoderOutput, encoderOutput, numHeads, dModel);
        const crossAttnResidual = selfAttnResidual.map((xi, i) => this.layerNorm(
            xi.map((v, j) => v + crossAttn[i][j])
        ));

        // Feed-forward
        const ffOutput = crossAttnResidual.map(token => this.feedForward(token, dFF));
        const output = crossAttnResidual.map((xi, i) => this.layerNorm(
            xi.map((v, j) => v + ffOutput[i][j])
        ));

        return output;
    },

    /**
     * Full Transformer Encoder (stack of N layers)
     */
    encoder: function(x, params = {}) {
        const { numLayers = 6, dModel = 512, numHeads = 8, dFF = 2048 } = params;
        let output = x;

        // Add positional encoding
        const PE = this.positionalEncoding(x.length, dModel);
        output = output.map((token, i) => token.map((v, j) => v + PE[i][j]));

        // Stack encoder layers
        for (let l = 0; l < numLayers; l++) {
            output = this.encoderLayer(output, { dModel, numHeads, dFF });
        }

        return output;
    },

    /**
     * Full Transformer Decoder (stack of N layers)
     */
    decoder: function(x, encoderOutput, params = {}) {
        const { numLayers = 6, dModel = 512, numHeads = 8, dFF = 2048 } = params;
        let output = x;

        // Add positional encoding
        const PE = this.positionalEncoding(x.length, dModel);
        output = output.map((token, i) => token.map((v, j) => v + PE[i][j]));

        // Stack decoder layers
        for (let l = 0; l < numLayers; l++) {
            output = this.decoderLayer(output, encoderOutput, { dModel, numHeads, dFF });
        }

        return output;
    },

    /**
     * Create causal (autoregressive) mask
     */
    createCausalMask: function(seqLen) {
        return Array.from({ length: seqLen }, (_, i) =>
            Array.from({ length: seqLen }, (_, j) => j <= i ? 1 : 0));
    },

    /**
     * Create padding mask
     */
    createPaddingMask: function(lengths, maxLen) {
        return lengths.map(len =>
            Array.from({ length: maxLen }, (_, i) => i < len ? 1 : 0));
    }
}