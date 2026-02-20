const PRISM_MODEL_COMPRESSION_ENGINE = {
    name: 'PRISM_MODEL_COMPRESSION_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Google Research',

    // ─────────────────────────────────────────────────────────────────────────
    // QUANTIZATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Uniform Quantization to INT8
     */
    quantizeToInt8: function(weights, perChannel = false) {
        if (perChannel && Array.isArray(weights[0])) {
            // Per-channel quantization
            return {
                quantized: weights.map(channel => {
                    const { quantized, scale, zeroPoint } = this._quantizeArray(channel, 8);
                    return quantized;
                }),
                scales: weights.map(channel => {
                    const min = Math.min(...this._flatten(channel));
                    const max = Math.max(...this._flatten(channel));
                    return (max - min) / 255;
                }),
                zeroPoints: weights.map(channel => {
                    const min = Math.min(...this._flatten(channel));
                    return Math.round(-min / ((Math.max(...this._flatten(channel)) - min) / 255));
                })
            };
        }

        return this._quantizeArray(weights, 8);
    },

    /**
     * Quantize to arbitrary bit width
     */
    quantize: function(weights, bits = 8) {
        return this._quantizeArray(weights, bits);
    },

    _quantizeArray: function(arr, bits) {
        const flat = this._flatten(arr);
        const min = Math.min(...flat);
        const max = Math.max(...flat);
        const levels = (1 << bits) - 1;
        const scale = (max - min) / levels || 1;
        const zeroPoint = Math.round(-min / scale);

        const quantize = (x) => Math.round((x - min) / scale);
        const quantized = this._mapNested(arr, quantize);

        return { quantized, scale, zeroPoint, min, max, bits };
    },

    /**
     * Dequantize back to float
     */
    dequantize: function(quantized, scale, zeroPoint) {
        return this._mapNested(quantized, x => (x - zeroPoint) * scale);
    },

    /**
     * Dynamic Quantization (quantize at inference time)
     */
    dynamicQuantize: function(weights) {
        const flat = this._flatten(weights);
        const absMax = Math.max(...flat.map(Math.abs));
        const scale = absMax / 127;

        return {
            quantized: this._mapNested(weights, x => Math.round(x / scale)),
            scale
        };
    },

    // ─────────────────────────────────────────────────────────────────────────
    // PRUNING
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Magnitude-based Pruning
     */
    magnitudePrune: function(weights, sparsity = 0.5) {
        const flat = this._flatten(weights);
        const magnitudes = flat.map(Math.abs).sort((a, b) => a - b);
        const threshold = magnitudes[Math.floor(magnitudes.length * sparsity)];

        const mask = this._mapNested(weights, w => Math.abs(w) >= threshold ? 1 : 0);
        const pruned = this._mapNested(weights, w => Math.abs(w) >= threshold ? w : 0);

        const prunedCount = flat.filter(w => Math.abs(w) < threshold).length;

        return {
            pruned,
            mask,
            threshold,
            actualSparsity: prunedCount / flat.length
        };
    },

    /**
     * Structured Pruning (prune entire neurons/channels)
     */
    structuredPrune: function(weights, sparsity = 0.5, dim = 0) {
        if (!Array.isArray(weights[0])) {
            return this.magnitudePrune(weights, sparsity);
        }

        // Calculate importance of each row/column
        const importance = dim === 0
            ? weights.map(row => this._l2Norm(row))
            : weights[0].map((_, j) => this._l2Norm(weights.map(row => row[j])));

        const sorted = [...importance].sort((a, b) => a - b);
        const threshold = sorted[Math.floor(sorted.length * sparsity)];

        const keepIndices = importance
            .map((imp, i) => imp >= threshold ? i : -1)
            .filter(i => i !== -1);

        let pruned;
        if (dim === 0) {
            pruned = keepIndices.map(i => weights[i]);
        } else {
            pruned = weights.map(row => keepIndices.map(j => row[j]));
        }

        return {
            pruned,
            keepIndices,
            prunedIndices: importance.map((_, i) => i).filter(i => !keepIndices.includes(i)),
            threshold
        };
    },

    /**
     * Gradual Magnitude Pruning (during training)
     */
    createGradualPruner: function(initialSparsity, finalSparsity, startStep, endStep) {
        return {
            initialSparsity,
            finalSparsity,
            startStep,
            endStep,

            getSparsity: function(step) {
                if (step < this.startStep) return this.initialSparsity;
                if (step > this.endStep) return this.finalSparsity;

                const progress = (step - this.startStep) / (this.endStep - this.startStep);
                // Cubic sparsity schedule
                return this.finalSparsity + (this.initialSparsity - this.finalSparsity) *
                       Math.pow(1 - progress, 3);
            },

            prune: function(weights, step) {
                const sparsity = this.getSparsity(step);
                return PRISM_MODEL_COMPRESSION_ENGINE.magnitudePrune(weights, sparsity);
            }
        };
    },

    /**
     * Lottery Ticket Hypothesis: Find winning tickets
     */
    findWinningTicket: function(initialWeights, trainedWeights, sparsity = 0.2) {
        // Prune based on trained magnitudes
        const { mask } = this.magnitudePrune(trainedWeights, sparsity);

        // Reset to initial values but keep mask
        const winningTicket = this._applyMask(initialWeights, mask);

        return { winningTicket, mask };
    },

    // ─────────────────────────────────────────────────────────────────────────
    // KNOWLEDGE DISTILLATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Compute Distillation Loss
     * L = α * L_hard + (1-α) * T² * KL(soft_teacher || soft_student)
     */
    distillationLoss: function(studentLogits, teacherLogits, labels, temperature = 4.0, alpha = 0.5) {
        // Soft targets from teacher
        const softTeacher = this._softmaxWithTemperature(teacherLogits, temperature);
        const softStudent = this._softmaxWithTemperature(studentLogits, temperature);

        // KL divergence for soft targets
        let klLoss = 0;
        for (let i = 0; i < softTeacher.length; i++) {
            if (softTeacher[i] > 1e-10) {
                klLoss += softTeacher[i] * Math.log(softTeacher[i] / (softStudent[i] + 1e-10));
            }
        }

        // Cross-entropy for hard targets
        const hardStudent = this._softmax(studentLogits);
        let ceLoss = 0;
        for (let i = 0; i < labels.length; i++) {
            if (labels[i] > 0) {
                ceLoss -= labels[i] * Math.log(hardStudent[i] + 1e-10);
            }
        }

        // Combined loss
        const totalLoss = alpha * ceLoss + (1 - alpha) * temperature * temperature * klLoss;

        return { totalLoss, klLoss, ceLoss };
    },

    /**
     * Feature Distillation (intermediate layers)
     */
    featureDistillationLoss: function(studentFeatures, teacherFeatures) {
        // MSE loss between feature maps
        let loss = 0;
        for (let i = 0; i < studentFeatures.length; i++) {
            loss += Math.pow(studentFeatures[i] - teacherFeatures[i], 2);
        }
        return loss / studentFeatures.length;
    },

    /**
     * Attention Transfer
     */
    attentionTransferLoss: function(studentAttention, teacherAttention) {
        // Normalize attention maps
        const normStudent = this._normalizeAttention(studentAttention);
        const normTeacher = this._normalizeAttention(teacherAttention);

        // MSE between normalized attention
        let loss = 0;
        for (let i = 0; i < normStudent.length; i++) {
            loss += Math.pow(normStudent[i] - normTeacher[i], 2);
        }
        return loss / normStudent.length;
    },

    _normalizeAttention: function(attention) {
        const sum = attention.reduce((a, b) => a + Math.abs(b), 0) || 1;
        return attention.map(a => Math.abs(a) / sum);
    },

    // Helper functions
    _flatten: function(arr) {
        if (!Array.isArray(arr)) return [arr];
        return arr.reduce((acc, item) => acc.concat(this._flatten(item)), []);
    },

    _mapNested: function(arr, fn) {
        if (!Array.isArray(arr)) return fn(arr);
        return arr.map(item => this._mapNested(item, fn));
    },

    _applyMask: function(weights, mask) {
        if (!Array.isArray(weights)) return weights * mask;
        return weights.map((w, i) => this._applyMask(w, mask[i]));
    },

    _l2Norm: function(arr) {
        const flat = this._flatten(arr);
        return Math.sqrt(flat.reduce((s, x) => s + x * x, 0));
    },

    _softmax: function(logits) {
        const max = Math.max(...logits);
        const exps = logits.map(l => Math.exp(l - max));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map(e => e / sum);
    },

    _softmaxWithTemperature: function(logits, T) {
        const scaled = logits.map(l => l / T);
        return this._softmax(scaled);
    }
}