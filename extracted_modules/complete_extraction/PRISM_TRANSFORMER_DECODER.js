const PRISM_TRANSFORMER_DECODER = {
    name: 'PRISM Transformer Decoder',
    version: '1.0.0',
    
    createDecoderLayer: function(dModel, nHeads, dFF, dropout = 0.1) {
        const dK = Math.floor(dModel / nHeads);
        const xavier = (fanIn, fanOut) => Math.sqrt(6 / (fanIn + fanOut));
        const initWeights = () => Array(dModel).fill(0).map(() => Array(dModel).fill(0).map(() => (Math.random()-0.5)*2*xavier(dModel,dModel)));
        return {
            dModel, nHeads, dK, dFF, dropout,
            selfAttn: { WQ: initWeights(), WK: initWeights(), WV: initWeights(), WO: initWeights() },
            crossAttn: { WQ: initWeights(), WK: initWeights(), WV: initWeights(), WO: initWeights() },
            W1: Array(dModel).fill(0).map(() => Array(dFF).fill(0).map(() => (Math.random()-0.5)*2*xavier(dModel,dFF))),
            b1: Array(dFF).fill(0),
            W2: Array(dFF).fill(0).map(() => Array(dModel).fill(0).map(() => (Math.random()-0.5)*2*xavier(dFF,dModel))),
            b2: Array(dModel).fill(0),
            ln1Gamma: Array(dModel).fill(1), ln1Beta: Array(dModel).fill(0),
            ln2Gamma: Array(dModel).fill(1), ln2Beta: Array(dModel).fill(0),
            ln3Gamma: Array(dModel).fill(1), ln3Beta: Array(dModel).fill(0)
        };
    },
    
    _project: function(x, W) {
        return x.map(row => W[0].map((_, j) => row.reduce((sum, v, i) => sum + v * W[i][j], 0)));
    },
    
    _splitHeads: function(x, nHeads, dK) {
        return Array(nHeads).fill(null).map((_, h) => x.map(row => row.slice(h * dK, (h + 1) * dK)));
    },
    
    _layerNorm: function(x, gamma, beta, epsilon = 1e-6) {
        return x.map(row => {
            const mean = row.reduce((a, v) => a + v, 0) / row.length;
            const variance = row.reduce((a, v) => a + (v - mean) ** 2, 0) / row.length;
            return row.map((v, i) => gamma[i] * (v - mean) / Math.sqrt(variance + epsilon) + beta[i]);
        });
    },
    
    maskedSelfAttention: function(layer, x) {
        const seqLen = x.length;
        const { nHeads, dK } = layer;
        const Q = this._project(x, layer.selfAttn.WQ);
        const K = this._project(x, layer.selfAttn.WK);
        const V = this._project(x, layer.selfAttn.WV);
        const Qheads = this._splitHeads(Q, nHeads, dK);
        const Kheads = this._splitHeads(K, nHeads, dK);
        const Vheads = this._splitHeads(V, nHeads, dK);
        
        const headOutputs = [];
        for (let h = 0; h < nHeads; h++) {
            const scores = Array(seqLen).fill(null).map((_, i) => Array(seqLen).fill(0).map((_, j) => {
                if (j > i) return -1e9;
                return Qheads[h][i].reduce((sum, v, k) => sum + v * Kheads[h][j][k], 0) / Math.sqrt(dK);
            }));
            const attnWeights = scores.map(row => {
                const maxVal = Math.max(...row);
                const exp = row.map(v => Math.exp(v - maxVal));
                const sum = exp.reduce((a, b) => a + b, 0);
                return exp.map(v => v / sum);
            });
            headOutputs.push(Array(seqLen).fill(null).map((_, i) => Array(dK).fill(0).map((_, k) => 
                attnWeights[i].reduce((sum, w, j) => sum + w * Vheads[h][j][k], 0)
            )));
        }
        return this._project(Array(seqLen).fill(null).map((_, i) => headOutputs.flatMap(head => head[i])), layer.selfAttn.WO);
    },
    
    crossAttention: function(layer, x, encoderOutput) {
        const decoderLen = x.length, encoderLen = encoderOutput.length;
        const { nHeads, dK } = layer;
        const Q = this._project(x, layer.crossAttn.WQ);
        const K = this._project(encoderOutput, layer.crossAttn.WK);
        const V = this._project(encoderOutput, layer.crossAttn.WV);
        const Qheads = this._splitHeads(Q, nHeads, dK);
        const Kheads = this._splitHeads(K, nHeads, dK);
        const Vheads = this._splitHeads(V, nHeads, dK);
        
        const headOutputs = [];
        for (let h = 0; h < nHeads; h++) {
            const scores = Array(decoderLen).fill(null).map((_, i) => Array(encoderLen).fill(0).map((_, j) => 
                Qheads[h][i].reduce((sum, v, k) => sum + v * Kheads[h][j][k], 0) / Math.sqrt(dK)
            ));
            const attnWeights = scores.map(row => {
                const maxVal = Math.max(...row);
                const exp = row.map(v => Math.exp(v - maxVal));
                const sum = exp.reduce((a, b) => a + b, 0);
                return exp.map(v => v / sum);
            });
            headOutputs.push(Array(decoderLen).fill(null).map((_, i) => Array(dK).fill(0).map((_, k) => 
                attnWeights[i].reduce((sum, w, j) => sum + w * Vheads[h][j][k], 0)
            )));
        }
        return this._project(Array(decoderLen).fill(null).map((_, i) => headOutputs.flatMap(head => head[i])), layer.crossAttn.WO);
    },
    
    forward: function(layer, x, encoderOutput) {
        const selfAttnOut = this.maskedSelfAttention(layer, x);
        let residual = x.map((row, i) => row.map((v, j) => v + selfAttnOut[i][j]));
        let normalized = this._layerNorm(residual, layer.ln1Gamma, layer.ln1Beta);
        
        const crossAttnOut = this.crossAttention(layer, normalized, encoderOutput);
        residual = normalized.map((row, i) => row.map((v, j) => v + crossAttnOut[i][j]));
        normalized = this._layerNorm(residual, layer.ln2Gamma, layer.ln2Beta);
        
        const ffnOut = normalized.map(row => {
            const hidden = layer.b1.map((b, j) => {
                let sum = b;
                for (let i = 0; i < row.length; i++) sum += row[i] * layer.W1[i][j];
                return sum * 0.5 * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (sum + 0.044715 * sum ** 3)));
            });
            return layer.b2.map((b, j) => {
                let sum = b;
                for (let i = 0; i < hidden.length; i++) sum += hidden[i] * layer.W2[i][j];
                return sum;
            });
        });
        residual = normalized.map((row, i) => row.map((v, j) => v + ffnOut[i][j]));
        return this._layerNorm(residual, layer.ln3Gamma, layer.ln3Beta);
    }
}