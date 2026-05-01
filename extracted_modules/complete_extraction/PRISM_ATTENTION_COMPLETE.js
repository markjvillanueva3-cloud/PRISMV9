const PRISM_ATTENTION_COMPLETE = {
    name: 'PRISM Attention Mechanisms Complete',
    version: '1.0.0',
    source: 'Vaswani et al., MIT 15.773',
    
    // ─────────────────────────────────────────────────────────────────────────────────────────
    // SCALED DOT-PRODUCT ATTENTION
    // Attention(Q, K, V) = softmax(QK^T / sqrt(d_k))V
    // ─────────────────────────────────────────────────────────────────────────────────────────
    ScaledDotProduct: {
        /**
         * Compute scaled dot-product attention
         * @param {Array} Q - Query matrix [seq_len, d_k]
         * @param {Array} K - Key matrix [seq_len, d_k]
         * @param {Array} V - Value matrix [seq_len, d_v]
         * @param {Array} mask - Optional attention mask
         * @returns {Object} {output, attentionWeights}
         */
        attention: function(Q, K, V, mask = null) {
            const seqLen = Q.length;
            const d_k = Q[0].length;
            const scale = Math.sqrt(d_k);
            
            // Compute QK^T / sqrt(d_k)
            const scores = Array(seqLen).fill(0).map(() => Array(seqLen).fill(0));
            
            for (let i = 0; i < seqLen; i++) {
                for (let j = 0; j < seqLen; j++) {
                    let dot = 0;
                    for (let k = 0; k < d_k; k++) {
                        dot += Q[i][k] * K[j][k];
                    }
                    scores[i][j] = dot / scale;
                    
                    // Apply mask if provided
                    if (mask && !mask[i][j]) {
                        scores[i][j] = -1e9;
                    }
                }
            }
            
            // Softmax
            const attentionWeights = scores.map(row => {
                const maxScore = Math.max(...row);
                const expScores = row.map(s => Math.exp(s - maxScore));
                const sumExp = expScores.reduce((a, b) => a + b, 0);
                return expScores.map(e => e / sumExp);
            });
            
            // Weighted sum of values
            const d_v = V[0].length;
            const output = Array(seqLen).fill(0).map(() => Array(d_v).fill(0));
            
            for (let i = 0; i < seqLen; i++) {
                for (let j = 0; j < seqLen; j++) {
                    for (let k = 0; k < d_v; k++) {
                        output[i][k] += attentionWeights[i][j] * V[j][k];
                    }
                }
            }
            
            return { output, attentionWeights };
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────────
    // MULTI-HEAD ATTENTION
    // ─────────────────────────────────────────────────────────────────────────────────────────
    MultiHead: {
        /**
         * Initialize multi-head attention weights
         * @param {number} d_model - Model dimension
         * @param {number} numHeads - Number of attention heads
         */
        init: function(d_model, numHeads) {
            const d_k = Math.floor(d_model / numHeads);
            const d_v = d_k;
            
            const xavier = (fanIn, fanOut) => Math.sqrt(6 / (fanIn + fanOut));
            
            return {
                numHeads,
                d_k,
                d_v,
                d_model,
                // Projection weights for each head
                W_Q: Array(numHeads).fill(0).map(() => 
                    this._randomMatrix(d_model, d_k, xavier(d_model, d_k))
                ),
                W_K: Array(numHeads).fill(0).map(() => 
                    this._randomMatrix(d_model, d_k, xavier(d_model, d_k))
                ),
                W_V: Array(numHeads).fill(0).map(() => 
                    this._randomMatrix(d_model, d_v, xavier(d_model, d_v))
                ),
                W_O: this._randomMatrix(numHeads * d_v, d_model, xavier(numHeads * d_v, d_model))
            };
        },
        
        _randomMatrix: function(rows, cols, scale) {
            return Array(rows).fill(0).map(() => 
                Array(cols).fill(0).map(() => (Math.random() - 0.5) * 2 * scale)
            );
        },
        
        /**
         * Compute multi-head attention
         * @param {Object} weights - Attention weights from init()
         * @param {Array} X - Input [seq_len, d_model]
         * @param {Array} mask - Optional attention mask
         */
        forward: function(weights, X, mask = null) {
            const { numHeads, d_k, d_v, W_Q, W_K, W_V, W_O } = weights;
            const seqLen = X.length;
            
            const headsOutput = [];
            const headsAttention = [];
            
            // Compute attention for each head
            for (let h = 0; h < numHeads; h++) {
                // Project to Q, K, V
                const Q = this._matmul(X, W_Q[h]);
                const K = this._matmul(X, W_K[h]);
                const V = this._matmul(X, W_V[h]);
                
                // Scaled dot-product attention
                const { output, attentionWeights } = PRISM_ATTENTION_COMPLETE.ScaledDotProduct.attention(Q, K, V, mask);
                
                headsOutput.push(output);
                headsAttention.push(attentionWeights);
            }
            
            // Concatenate heads
            const concat = Array(seqLen).fill(0).map((_, i) => {
                const row = [];
                for (let h = 0; h < numHeads; h++) {
                    row.push(...headsOutput[h][i]);
                }
                return row;
            });
            
            // Final linear projection
            const output = this._matmul(concat, W_O);
            
            return { output, attentionWeights: headsAttention };
        },
        
        _matmul: function(A, B) {
            const m = A.length;
            const n = B[0].length;
            const k = A[0].length;
            
            const result = Array(m).fill(0).map(() => Array(n).fill(0));
            
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < n; j++) {
                    for (let l = 0; l < k; l++) {
                        result[i][j] += A[i][l] * B[l][j];
                    }
                }
            }
            
            return result;
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────────
    // TRANSFORMER ENCODER LAYER
    // ─────────────────────────────────────────────────────────────────────────────────────────
    TransformerEncoder: {
        /**
         * Initialize transformer encoder layer
         */
        init: function(d_model, numHeads, d_ff) {
            const xavier = (fanIn, fanOut) => Math.sqrt(6 / (fanIn + fanOut));
            
            return {
                attention: PRISM_ATTENTION_COMPLETE.MultiHead.init(d_model, numHeads),
                // Feed-forward network
                ff_W1: PRISM_ATTENTION_COMPLETE.MultiHead._randomMatrix(d_model, d_ff, xavier(d_model, d_ff)),
                ff_b1: Array(d_ff).fill(0),
                ff_W2: PRISM_ATTENTION_COMPLETE.MultiHead._randomMatrix(d_ff, d_model, xavier(d_ff, d_model)),
                ff_b2: Array(d_model).fill(0),
                // Layer normalization parameters
                ln1_gamma: Array(d_model).fill(1),
                ln1_beta: Array(d_model).fill(0),
                ln2_gamma: Array(d_model).fill(1),
                ln2_beta: Array(d_model).fill(0),
                d_model
            };
        },
        
        /**
         * Forward pass through encoder layer
         */
        forward: function(weights, X, mask = null) {
            const seqLen = X.length;
            
            // Multi-head self-attention
            const { output: attnOutput } = PRISM_ATTENTION_COMPLETE.MultiHead.forward(
                weights.attention, X, mask
            );
            
            // Add & Norm
            let residual = X.map((row, i) => row.map((v, j) => v + attnOutput[i][j]));
            residual = this._layerNorm(residual, weights.ln1_gamma, weights.ln1_beta);
            
            // Feed-forward
            const ffOutput = this._feedForward(
                residual, 
                weights.ff_W1, weights.ff_b1,
                weights.ff_W2, weights.ff_b2
            );
            
            // Add & Norm
            let output = residual.map((row, i) => row.map((v, j) => v + ffOutput[i][j]));
            output = this._layerNorm(output, weights.ln2_gamma, weights.ln2_beta);
            
            return output;
        },
        
        _feedForward: function(X, W1, b1, W2, b2) {
            const seqLen = X.length;
            const d_ff = W1[0].length;
            const d_model = W2[0].length;
            
            // First linear + GELU
            const hidden = Array(seqLen).fill(0).map((_, i) => {
                const row = Array(d_ff).fill(0);
                for (let j = 0; j < d_ff; j++) {
                    row[j] = b1[j];
                    for (let k = 0; k < X[i].length; k++) {
                        row[j] += X[i][k] * W1[k][j];
                    }
                    // GELU activation
                    row[j] = row[j] * 0.5 * (1 + Math.tanh(
                        Math.sqrt(2 / Math.PI) * (row[j] + 0.044715 * row[j] * row[j] * row[j])
                    ));
                }
                return row;
            });
            
            // Second linear
            const output = Array(seqLen).fill(0).map((_, i) => {
                const row = Array(d_model).fill(0);
                for (let j = 0; j < d_model; j++) {
                    row[j] = b2[j];
                    for (let k = 0; k < d_ff; k++) {
                        row[j] += hidden[i][k] * W2[k][j];
                    }
                }
                return row;
            });
            
            return output;
        },
        
        _layerNorm: function(X, gamma, beta, eps = 1e-5) {
            return X.map(row => {
                const mean = row.reduce((a, b) => a + b, 0) / row.length;
                const variance = row.reduce((sum, v) => sum + (v - mean) ** 2, 0) / row.length;
                const std = Math.sqrt(variance + eps);
                
                return row.map((v, j) => gamma[j] * (v - mean) / std + beta[j]);
            });
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────────
    // POSITIONAL ENCODING
    // ─────────────────────────────────────────────────────────────────────────────────────────
    PositionalEncoding: {
        /**
         * Generate sinusoidal positional encoding
         * @param {number} maxLen - Maximum sequence length
         * @param {number} d_model - Model dimension
         */
        sinusoidal: function(maxLen, d_model) {
            const PE = Array(maxLen).fill(0).map(() => Array(d_model).fill(0));
            
            for (let pos = 0; pos < maxLen; pos++) {
                for (let i = 0; i < d_model; i++) {
                    const angle = pos / Math.pow(10000, (2 * Math.floor(i / 2)) / d_model);
                    PE[pos][i] = i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
                }
            }
            
            return PE;
        },
        
        /**
         * Add positional encoding to embeddings
         */
        add: function(embeddings, PE) {
            return embeddings.map((row, i) => 
                row.map((v, j) => v + PE[i][j])
            );
        }
    }
}