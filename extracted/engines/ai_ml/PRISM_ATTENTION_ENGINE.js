/**
 * PRISM_ATTENTION_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 275
 * Session: R2.3.1 Engine Gap Extraction Round 2
 */

const PRISM_ATTENTION_ENGINE = {
    name: 'PRISM_ATTENTION_ENGINE',
    version: '1.0.0',
    source: 'MIT 15.773, Vaswani 2017',

    // Helper: Matrix multiply
    _matmul: function(A, B) {
        const m = A.length, n = B[0].length, k = B.length;
        const result = Array.from({ length: m }, () => Array(n).fill(0));
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                for (let p = 0; p < k; p++) {
                    result[i][j] += A[i][p] * B[p][j];
                }
            }
        }
        return result;
    },

    // Helper: Transpose
    _transpose: function(A) {
        const m = A.length, n = A[0].length;
        return Array.from({ length: n }, (_, j) => 
            Array.from({ length: m }, (_, i) => A[i][j]));
    },

    // Helper: 2D Softmax (row-wise)
    _softmax2D: function(scores) {
        return scores.map(row => {
            const maxVal = Math.max(...row);
            const exps = row.map(s => Math.exp(s - maxVal));
            const sum = exps.reduce((a, b) => a + b, 0);
            return exps.map(e => e / sum);
        });
    },

    // Helper: Dot product
    _dotProduct: function(a, b) {
        return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    },

    /**
     * Scaled Dot-Product Attention
     * Attention(Q,K,V) = softmax(QK^T / √d_k) V
     */
    scaledDotProductAttention: function(Q, K, V, mask = null) {
        const dk = K[0].length;
        const scale = Math.sqrt(dk);

        // QK^T / sqrt(dk)
        const scores = this._matmul(Q, this._transpose(K));
        for (let i = 0; i < scores.length; i++) {
            for (let j = 0; j < scores[i].length; j++) {
                scores[i][j] /= scale;
                if (mask && mask[i][j] === 0) {
                    scores[i][j] = -1e9;
                }
            }
        }

        const attention = this._softmax2D(scores);
        const output = this._matmul(attention, V);

        return { output, weights: attention };
    },

    /**
     * Multi-Head Attention
     * MultiHead(Q,K,V) = Concat(head_1,...,head_h) W^O
     */
    multiHeadAttention: function(Q, K, V, numHeads, dModel, mask = null) {
        const dHead = Math.floor(dModel / numHeads);
        const seqLen = Q.length;
        const heads = [];

        for (let h = 0; h < numHeads; h++) {
            // Project Q, K, V for this head (simplified linear projection)
            const Qh = Q.map(q => q.slice(h * dHead, (h + 1) * dHead));
            const Kh = K.map(k => k.slice(h * dHead, (h + 1) * dHead));
            const Vh = V.map(v => v.slice(h * dHead, (h + 1) * dHead));

            const { output } = this.scaledDotProductAttention(Qh, Kh, Vh, mask);
            heads.push(output);
        }

        // Concatenate heads
        const concatenated = Array.from({ length: seqLen }, (_, i) =>
            heads.reduce((acc, head) => acc.concat(head[i]), []));

        return concatenated;
    },

    /**
     * Cross Attention (Encoder-Decoder)
     * Q from decoder, K and V from encoder
     */
    crossAttention: function(decoderState, encoderOutput, mask = null) {
        return this.scaledDotProductAttention(decoderState, encoderOutput, encoderOutput, mask);
    },

    /**
     * Sparse Attention (Longformer-style)
     * Local window + global tokens
     */
    sparseAttention: function(Q, K, V, windowSize = 256, globalTokens = [0]) {
        const seqLen = Q.length;
        const dk = K[0].length;
        const scores = [];

        for (let i = 0; i < seqLen; i++) {
            const rowScores = [];
            for (let j = 0; j < seqLen; j++) {
                const isGlobal = globalTokens.includes(j) || globalTokens.includes(i);
                const isLocal = Math.abs(i - j) <= windowSize / 2;

                if (isGlobal || isLocal) {
                    rowScores.push(this._dotProduct(Q[i], K[j]) / Math.sqrt(dk));
                } else {
                    rowScores.push(-1e9);
                }
            }
            scores.push(rowScores);
        }

        const attention = this._softmax2D(scores);
        return this._matmul(attention, V);
    },

    /**
     * Linear Attention (O(n) complexity)
     * Uses kernel feature maps φ(x)
     */
    linearAttention: function(Q, K, V, featureMap = 'elu') {
        const n = Q.length, dk = Q[0].length, dv = V[0].length;

        // Apply feature map φ to Q and K
        const phi = (x) => {
            if (featureMap === 'elu') {
                return x.map(xi => xi >= 0 ? xi + 1 : Math.exp(xi));
            }
            return x.map(xi => Math.max(0, xi) + 1);
        };

        const Q_prime = Q.map(phi);
        const K_prime = K.map(phi);

        // Compute K'^T V (dₖ × dᵥ)
        const KV = Array.from({ length: dk }, () => Array(dv).fill(0));
        for (let j = 0; j < n; j++) {
            for (let a = 0; a < dk; a++) {
                for (let b = 0; b < dv; b++) {
                    KV[a][b] += K_prime[j][a] * V[j][b];
                }
            }
        }

        // Compute K'^T 1 (normalizer)
        const K_sum = Array(dk).fill(0);
        for (let j = 0; j < n; j++) {
            for (let a = 0; a < dk; a++) {
                K_sum[a] += K_prime[j][a];
            }
        }

        // Output: (Q' × KV) / (Q' × K_sum)
        const output = [];
        for (let i = 0; i < n; i++) {
            const row = [];
            const normalizer = Q_prime[i].reduce((s, q, a) => s + q * K_sum[a], 0);
            for (let b = 0; b < dv; b++) {
                let val = 0;
                for (let a = 0; a < dk; a++) {
                    val += Q_prime[i][a] * KV[a][b];
                }
                row.push(val / (normalizer + 1e-9));
            }
            output.push(row);
        }

        return output;
    },

    /**
     * Relative Position Attention (T5-style)
     */
    relativePositionAttention: function(Q, K, V, maxRelativePosition = 32) {
        const seqLen = Q.length, dk = K[0].length;
        const scores = [];

        // Create relative position bias
        const biases = {};
        for (let d = -maxRelativePosition; d <= maxRelativePosition; d++) {
            biases[d] = (Math.random() - 0.5) * 0.1; // Learned parameter
        }

        for (let i = 0; i < seqLen; i++) {
            const rowScores = [];
            for (let j = 0; j < seqLen; j++) {
                const relPos = Math.max(-maxRelativePosition, Math.min(maxRelativePosition, j - i));
                const score = this._dotProduct(Q[i], K[j]) / Math.sqrt(dk) + biases[relPos];
                rowScores.push(score);
            }
            scores.push(rowScores);
        }

        const attention = this._softmax2D(scores);
        return { output: this._matmul(attention, V), weights: attention };
    },

    /**
     * Flash Attention (memory-efficient, simplified)
     */
    flashAttention: function(Q, K, V, blockSize = 64) {
        const seqLen = Q.length, dv = V[0].length;
        const numBlocks = Math.ceil(seqLen / blockSize);
        const output = Array.from({ length: seqLen }, () => Array(dv).fill(0));
        const logsumexp = Array(seqLen).fill(-Infinity);

        for (let bi = 0; bi < numBlocks; bi++) {
            const iStart = bi * blockSize;
            const iEnd = Math.min(iStart + blockSize, seqLen);

            for (let bj = 0; bj < numBlocks; bj++) {
                const jStart = bj * blockSize;
                const jEnd = Math.min(jStart + blockSize, seqLen);

                for (let i = iStart; i < iEnd; i++) {
                    for (let j = jStart; j < jEnd; j++) {
                        const score = this._dotProduct(Q[i], K[j]) / Math.sqrt(K[0].length);
                        const oldMax = logsumexp[i];
                        const newMax = Math.max(oldMax, score);

                        const expOld = Math.exp(oldMax - newMax);
                        const expNew = Math.exp(score - newMax);

                        for (let d = 0; d < dv; d++) {
                            output[i][d] = output[i][d] * expOld + expNew * V[j][d];
                        }
                        logsumexp[i] = newMax + Math.log(expOld + expNew);
                    }
                }
            }
        }

        // Normalize
        for (let i = 0; i < seqLen; i++) {
            const norm = Math.exp(logsumexp[i]);
            for (let d = 0; d < dv; d++) {
                output[i][d] /= norm;
            }
        }

        return output;
    },

    /**
     * Rotary Position Embedding (RoPE)
     */
    applyRotaryEmbedding: function(x, position) {
        const dim = x.length;
        const result = new Array(dim);

        for (let i = 0; i < dim; i += 2) {
            const freq = 1.0 / Math.pow(10000, i / dim);
            const angle = position * freq;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            result[i] = x[i] * cos - (x[i + 1] || 0) * sin;
            result[i + 1] = x[i] * sin + (x[i + 1] || 0) * cos;
        }

        return result;
    }
}