const PRISM_ATTENTION_ADVANCED = {
    // Scaled Dot-Product Attention
    scaledDotProductAttention(Q, K, V, mask = null) {
        const dk = K[0].length;
        const scale = Math.sqrt(dk);
        
        // QK^T / sqrt(dk)
        const scores = this._matmul(Q, this._transpose(K));
        for (let i = 0; i < scores.length; i++) {
            for (let j = 0; j < scores[i].length; j++) {
                scores[i][j] /= scale;
            }
        }
        
        // Apply mask (for causal attention)
        if (mask) {
            for (let i = 0; i < scores.length; i++) {
                for (let j = 0; j < scores[i].length; j++) {
                    if (mask[i][j] === 0) {
                        scores[i][j] = -1e9;
                    }
                }
            }
        }
        
        // Softmax
        const attention = this._softmax2D(scores);
        
        // Attention * V
        return {
            output: this._matmul(attention, V),
            weights: attention
        };
    },
    
    // Multi-Head Attention
    multiHeadAttention(Q, K, V, numHeads, dModel, mask = null) {
        const dHead = Math.floor(dModel / numHeads);
        const seqLen = Q.length;
        
        // Linear projections for each head
        const heads = [];
        
        for (let h = 0; h < numHeads; h++) {
            // Project Q, K, V for this head
            const Qh = this._projectHead(Q, h, dHead);
            const Kh = this._projectHead(K, h, dHead);
            const Vh = this._projectHead(V, h, dHead);
            
            // Attention for this head
            const { output } = this.scaledDotProductAttention(Qh, Kh, Vh, mask);
            heads.push(output);
        }
        
        // Concatenate heads
        const concatenated = this._concatHeads(heads);
        
        // Final linear projection (simplified)
        return concatenated;
    },
    
    // Cross Attention (encoder-decoder)
    crossAttention(decoderState, encoderOutput, mask = null) {
        // Q from decoder, K and V from encoder
        return this.scaledDotProductAttention(decoderState, encoderOutput, encoderOutput, mask);
    },
    
    // Sparse Attention (local window + global tokens)
    sparseAttention(Q, K, V, windowSize = 256, globalTokens = [0]) {
        const seqLen = Q.length;
        const scores = [];
        
        for (let i = 0; i < seqLen; i++) {
            const rowScores = [];
            
            for (let j = 0; j < seqLen; j++) {
                // Attend to: global tokens, local window, or self
                const isGlobal = globalTokens.includes(j) || globalTokens.includes(i);
                const isLocal = Math.abs(i - j) <= windowSize / 2;
                
                if (isGlobal || isLocal) {
                    rowScores.push(this._dotProduct(Q[i], K[j]) / Math.sqrt(K[0].length));
                } else {
                    rowScores.push(-1e9);
                }
            }
            
            scores.push(rowScores);
        }
        
        const attention = this._softmax2D(scores);
        return this._matmul(attention, V);
    },
    
    // Linear Attention (O(n) complexity)
    linearAttention(Q, K, V, featureMap = 'elu') {
        // Apply feature map to Q and K
        const phiQ = Q.map(q => this._featureMap(q, featureMap));
        const phiK = K.map(k => this._featureMap(k, featureMap));
        
        // Compute KV product first (associative property)
        const KV = this._outerProductSum(phiK, V);
        
        // Compute normalizer
        const Z = phiK.reduce((sum, k) => sum.map((s, i) => s + k[i]), 
                              new Array(phiK[0].length).fill(0));
        
        // Compute output for each query
        const output = phiQ.map(q => {
            const numerator = KV.map(row => this._dotProduct(q, row));
            const denominator = this._dotProduct(q, Z);
            return numerator.map(n => n / (denominator + 1e-6));
        });
        
        return output;
    },
    
    // Relative Position Attention (like in T5)
    relativePositionAttention(Q, K, V, maxRelativePosition = 32) {
        const seqLen = Q.length;
        const scores = this._matmul(Q, this._transpose(K));
        
        // Add relative position bias
        for (let i = 0; i < seqLen; i++) {
            for (let j = 0; j < seqLen; j++) {
                const relPos = Math.min(Math.max(j - i, -maxRelativePosition), maxRelativePosition);
                const bucket = this._getRelativePositionBucket(relPos, maxRelativePosition);
                scores[i][j] += this._getPositionBias(bucket);
            }
        }
        
        const scale = Math.sqrt(K[0].length);
        for (let i = 0; i < scores.length; i++) {
            for (let j = 0; j < scores[i].length; j++) {
                scores[i][j] /= scale;
            }
        }
        
        const attention = this._softmax2D(scores);
        return this._matmul(attention, V);
    },
    
    // Rotary Position Embedding (RoPE)
    applyRotaryEmbedding(x, position) {
        const dim = x.length;
        const result = new Array(dim);
        
        for (let i = 0; i < dim; i += 2) {
            const freq = 1.0 / Math.pow(10000, (i / dim));
            const angle = position * freq;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            
            result[i] = x[i] * cos - x[i + 1] * sin;
            result[i + 1] = x[i] * sin + x[i + 1] * cos;
        }
        
        return result;
    },
    
    // Flash Attention (memory-efficient, simplified)
    flashAttention(Q, K, V, blockSize = 64) {
        const seqLen = Q.length;
        const numBlocks = Math.ceil(seqLen / blockSize);
        const output = Q.map(() => new Array(V[0].length).fill(0));
        const logsumexp = new Array(seqLen).fill(-Infinity);
        
        // Process in blocks
        for (let bi = 0; bi < numBlocks; bi++) {
            const iStart = bi * blockSize;
            const iEnd = Math.min(iStart + blockSize, seqLen);
            
            for (let bj = 0; bj < numBlocks; bj++) {
                const jStart = bj * blockSize;
                const jEnd = Math.min(jStart + blockSize, seqLen);
                
                // Compute block attention
                for (let i = iStart; i < iEnd; i++) {
                    for (let j = jStart; j < jEnd; j++) {
                        const score = this._dotProduct(Q[i], K[j]) / Math.sqrt(K[0].length);
                        const oldMax = logsumexp[i];
                        const newMax = Math.max(oldMax, score);
                        
                        const expOld = Math.exp(oldMax - newMax);
                        const expNew = Math.exp(score - newMax);
                        
                        // Update output and logsumexp
                        for (let d = 0; d < V[0].length; d++) {
                            output[i][d] = output[i][d] * expOld + V[j][d] * expNew;
                        }
                        logsumexp[i] = newMax + Math.log(expOld + expNew);
                    }
                }
            }
        }
        
        // Normalize
        for (let i = 0; i < seqLen; i++) {
            const norm = Math.exp(logsumexp[i]);
            for (let d = 0; d < output[i].length; d++) {
                output[i][d] /= norm;
            }
        }
        
        return output;
    },
    
    // Helper functions
    _matmul(A, B) {
        const result = [];
        for (let i = 0; i < A.length; i++) {
            result[i] = [];
            for (let j = 0; j < B[0].length; j++) {
                let sum = 0;
                for (let k = 0; k < A[0].length; k++) {
                    sum += A[i][k] * B[k][j];
                }
                result[i][j] = sum;
            }
        }
        return result;
    },
    
    _transpose(A) {
        return A[0].map((_, i) => A.map(row => row[i]));
    },
    
    _softmax2D(scores) {
        return scores.map(row => {
            const max = Math.max(...row);
            const exps = row.map(s => Math.exp(s - max));
            const sum = exps.reduce((a, b) => a + b, 0);
            return exps.map(e => e / sum);
        });
    },
    
    _dotProduct(a, b) {
        return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    },
    
    _projectHead(X, headIdx, dHead) {
        // Simplified: extract slice for head
        return X.map(x => x.slice(headIdx * dHead, (headIdx + 1) * dHead));
    },
    
    _concatHeads(heads) {
        const seqLen = heads[0].length;
        return Array(seqLen).fill().map((_, i) => 
            heads.flatMap(h => h[i])
        );
    },
    
    _featureMap(x, type) {
        switch (type) {
            case 'elu':
                return x.map(v => v > 0 ? v + 1 : Math.exp(v));
            case 'relu':
                return x.map(v => Math.max(0, v));
            default:
                return x;
        }
    },
    
    _outerProductSum(K, V) {
        const dK = K[0].length;
        const dV = V[0].length;
        const result = Array(dV).fill().map(() => new Array(dK).fill(0));
        
        for (let i = 0; i < K.length; i++) {
            for (let j = 0; j < dV; j++) {
                for (let k = 0; k < dK; k++) {
                    result[j][k] += K[i][k] * V[i][j];
                }
            }
        }
        
        return result;
    },
    
    _getRelativePositionBucket(relPos, maxPos) {
        // Simplified bucketing
        return Math.floor((relPos + maxPos) / 2);
    },
    
    _getPositionBias(bucket) {
        // Would be learned in practice
        return 0.1 * Math.exp(-bucket / 10);
    }
}