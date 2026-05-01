const PRISM_MODEL_COMPRESSION = {
    // Quantization
    quantization: {
        // Post-training quantization to INT8
        quantizeToInt8(weights, perChannel = false) {
            if (perChannel) {
                // Per-channel quantization (better accuracy)
                return weights.map(channel => {
                    const { scale, zeroPoint } = this._computeQuantParams(channel);
                    const quantized = channel.map(w => 
                        Math.round(w / scale + zeroPoint)
                    ).map(q => Math.max(-128, Math.min(127, q)));
                    return { quantized, scale, zeroPoint };
                });
            } else {
                // Per-tensor quantization
                const flat = weights.flat(Infinity);
                const { scale, zeroPoint } = this._computeQuantParams(flat);
                
                const quantize = (w) => {
                    const q = Math.round(w / scale + zeroPoint);
                    return Math.max(-128, Math.min(127, q));
                };
                
                const quantized = this._mapNested(weights, quantize);
                return { quantized, scale, zeroPoint };
            }
        },
        
        // Dequantize INT8 back to float
        dequantize(quantized, scale, zeroPoint) {
            const dequantize = (q) => (q - zeroPoint) * scale;
            return this._mapNested(quantized, dequantize);
        },
        
        // Dynamic quantization (quantize activations at runtime)
        dynamicQuantize(tensor) {
            const { scale, zeroPoint } = this._computeQuantParams(tensor.flat());
            const quantized = this._mapNested(tensor, w => 
                Math.max(-128, Math.min(127, Math.round(w / scale + zeroPoint)))
            );
            return { quantized, scale, zeroPoint };
        },
        
        // Simulate quantization during training (QAT)
        simulateQuantization(tensor, numBits = 8) {
            const minVal = Math.min(...tensor.flat());
            const maxVal = Math.max(...tensor.flat());
            const qmin = 0;
            const qmax = Math.pow(2, numBits) - 1;
            
            const scale = (maxVal - minVal) / (qmax - qmin);
            const zeroPoint = qmin - Math.round(minVal / scale);
            
            // Quantize then dequantize (straight-through estimator for gradients)
            return this._mapNested(tensor, w => {
                const q = Math.round(w / scale + zeroPoint);
                const qClamped = Math.max(qmin, Math.min(qmax, q));
                return (qClamped - zeroPoint) * scale;
            });
        },
        
        _computeQuantParams(values) {
            const minVal = Math.min(...values);
            const maxVal = Math.max(...values);
            
            // Symmetric quantization
            const absMax = Math.max(Math.abs(minVal), Math.abs(maxVal));
            const scale = absMax / 127;
            const zeroPoint = 0;
            
            return { scale: scale || 1e-8, zeroPoint };
        },
        
        _mapNested(arr, fn) {
            if (Array.isArray(arr)) {
                return arr.map(item => this._mapNested(item, fn));
            }
            return fn(arr);
        }
    },
    
    // Pruning
    pruning: {
        // Magnitude-based pruning
        magnitudePrune(weights, sparsity = 0.5) {
            const flat = weights.flat(Infinity);
            const magnitudes = flat.map(Math.abs);
            const sorted = [...magnitudes].sort((a, b) => a - b);
            const threshold = sorted[Math.floor(sorted.length * sparsity)];
            
            const prune = (w) => Math.abs(w) < threshold ? 0 : w;
            return this._mapNested(weights, prune);
        },
        
        // Structured pruning (prune entire filters/channels)
        structuredPrune(weights, pruneRatio = 0.5, axis = 0) {
            // Calculate importance of each filter (L1 norm)
            const importance = [];
            for (let i = 0; i < weights.length; i++) {
                const norm = this._l1Norm(weights[i]);
                importance.push({ index: i, norm });
            }
            
            // Sort by importance
            importance.sort((a, b) => a.norm - b.norm);
            
            // Determine which to prune
            const numPrune = Math.floor(weights.length * pruneRatio);
            const pruneIndices = new Set(importance.slice(0, numPrune).map(x => x.index));
            
            // Return mask and pruned weights
            const mask = weights.map((_, i) => pruneIndices.has(i) ? 0 : 1);
            const pruned = weights.filter((_, i) => !pruneIndices.has(i));
            
            return { pruned, mask, prunedIndices: Array.from(pruneIndices) };
        },
        
        // Gradual magnitude pruning (during training)
        createGradualPruner(initialSparsity, finalSparsity, startStep, endStep) {
            return {
                initialSparsity,
                finalSparsity,
                startStep,
                endStep,
                
                getSparsity(step) {
                    if (step < this.startStep) return this.initialSparsity;
                    if (step > this.endStep) return this.finalSparsity;
                    
                    const progress = (step - this.startStep) / (this.endStep - this.startStep);
                    // Cubic sparsity schedule
                    return this.finalSparsity + (this.initialSparsity - this.finalSparsity) * 
                           Math.pow(1 - progress, 3);
                },
                
                prune(weights, step) {
                    const sparsity = this.getSparsity(step);
                    return PRISM_MODEL_COMPRESSION.pruning.magnitudePrune(weights, sparsity);
                }
            };
        },
        
        _l1Norm(arr) {
            if (Array.isArray(arr)) {
                return arr.reduce((sum, item) => sum + this._l1Norm(item), 0);
            }
            return Math.abs(arr);
        },
        
        _mapNested(arr, fn) {
            if (Array.isArray(arr)) {
                return arr.map(item => this._mapNested(item, fn));
            }
            return fn(arr);
        }
    },
    
    // Knowledge Distillation
    distillation: {
        // Compute distillation loss
        distillationLoss(studentLogits, teacherLogits, labels, temperature = 4.0, alpha = 0.7) {
            // Soft targets from teacher
            const teacherSoft = this._softmaxWithTemp(teacherLogits, temperature);
            const studentSoft = this._softmaxWithTemp(studentLogits, temperature);
            
            // KL divergence for soft targets
            const softLoss = this._klDivergence(studentSoft, teacherSoft);
            
            // Cross-entropy for hard targets
            const studentProbs = this._softmaxWithTemp(studentLogits, 1.0);
            const hardLoss = this._crossEntropy(studentProbs, labels);
            
            // Combined loss
            return alpha * softLoss * (temperature * temperature) + (1 - alpha) * hardLoss;
        },
        
        // Feature distillation (intermediate layers)
        featureDistillationLoss(studentFeatures, teacherFeatures) {
            // MSE loss between features
            let loss = 0;
            for (let i = 0; i < studentFeatures.length; i++) {
                const diff = studentFeatures[i] - teacherFeatures[i];
                loss += diff * diff;
            }
            return loss / studentFeatures.length;
        },
        
        // Attention transfer
        attentionTransferLoss(studentAttention, teacherAttention) {
            // Normalize attention maps
            const normStudent = this._normalizeAttention(studentAttention);
            const normTeacher = this._normalizeAttention(teacherAttention);
            
            // MSE between attention maps
            let loss = 0;
            for (let i = 0; i < normStudent.length; i++) {
                const diff = normStudent[i] - normTeacher[i];
                loss += diff * diff;
            }
            return loss / normStudent.length;
        },
        
        _softmaxWithTemp(logits, temperature) {
            const scaled = logits.map(l => l / temperature);
            const maxLogit = Math.max(...scaled);
            const exps = scaled.map(l => Math.exp(l - maxLogit));
            const sum = exps.reduce((a, b) => a + b, 0);
            return exps.map(e => e / sum);
        },
        
        _klDivergence(p, q) {
            let kl = 0;
            for (let i = 0; i < p.length; i++) {
                if (p[i] > 0 && q[i] > 0) {
                    kl += p[i] * Math.log(p[i] / q[i]);
                }
            }
            return kl;
        },
        
        _crossEntropy(probs, labels) {
            let loss = 0;
            for (let i = 0; i < probs.length; i++) {
                if (labels[i] > 0) {
                    loss -= labels[i] * Math.log(probs[i] + 1e-10);
                }
            }
            return loss;
        },
        
        _normalizeAttention(attention) {
            const sum = attention.reduce((a, b) => a + Math.abs(b), 0);
            return attention.map(a => Math.abs(a) / (sum + 1e-10));
        }
    },
    
    // Compute compression statistics
    getCompressionStats(original, compressed) {
        const originalSize = this._countParams(original);
        const compressedSize = this._countNonZero(compressed);
        
        return {
            originalParams: originalSize,
            compressedParams: compressedSize,
            sparsity: 1 - compressedSize / originalSize,
            compressionRatio: originalSize / compressedSize
        };
    },
    
    _countParams(arr) {
        if (Array.isArray(arr)) {
            return arr.reduce((sum, item) => sum + this._countParams(item), 0);
        }
        return 1;
    },
    
    _countNonZero(arr) {
        if (Array.isArray(arr)) {
            return arr.reduce((sum, item) => sum + this._countNonZero(item), 0);
        }
        return arr !== 0 ? 1 : 0;
    }
}