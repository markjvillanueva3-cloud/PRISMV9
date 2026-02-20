const PRISM_REGULARIZATION_ENGINE = {
    name: 'PRISM_REGULARIZATION_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Stanford CS 231N',

    /**
     * Standard Dropout
     */
    dropout: function(x, p = 0.5, training = true) {
        if (!training || p === 0) return { output: x, mask: null };
        
        const mask = x.map(() => Math.random() > p ? 1 : 0);
        const scale = 1 / (1 - p);
        const output = x.map((v, i) => v * mask[i] * scale);
        
        return { output, mask };
    },

    /**
     * Spatial Dropout (for CNNs - drops entire channels)
     */
    spatialDropout: function(x, channels, p = 0.5, training = true) {
        if (!training || p === 0) return x;
        
        const channelSize = x.length / channels;
        const channelMask = Array(channels).fill(0).map(() => Math.random() > p ? 1 : 0);
        const scale = 1 / (1 - p);
        
        return x.map((v, i) => {
            const c = Math.floor(i / channelSize);
            return v * channelMask[c] * scale;
        });
    },

    /**
     * DropConnect (drops weights instead of activations)
     */
    dropConnect: function(weights, p = 0.5, training = true) {
        if (!training || p === 0) return weights;
        
        const scale = 1 / (1 - p);
        return weights.map(row =>
            Array.isArray(row)
                ? row.map(w => Math.random() > p ? w * scale : 0)
                : Math.random() > p ? row * scale : 0
        );
    },

    /**
     * Label Smoothing
     */
    labelSmoothing: function(labels, numClasses, smoothing = 0.1) {
        const smoothed = [];
        for (const label of labels) {
            const oneHot = Array(numClasses).fill(smoothing / numClasses);
            oneHot[label] = 1 - smoothing + smoothing / numClasses;
            smoothed.push(oneHot);
        }
        return smoothed;
    },

    /**
     * Mixup Data Augmentation
     */
    mixup: function(x1, y1, x2, y2, alpha = 0.2) {
        // Sample lambda from Beta(alpha, alpha)
        const lambda = this._sampleBeta(alpha, alpha);
        
        const mixedX = x1.map((v, i) => lambda * v + (1 - lambda) * x2[i]);
        const mixedY = y1.map((v, i) => lambda * v + (1 - lambda) * y2[i]);
        
        return { x: mixedX, y: mixedY, lambda };
    },

    /**
     * CutMix (for images represented as flat arrays)
     */
    cutmix: function(x1, y1, x2, y2, width, height) {
        const lambda = Math.random();
        const cutRatio = Math.sqrt(1 - lambda);
        
        const cutW = Math.floor(width * cutRatio);
        const cutH = Math.floor(height * cutRatio);
        const cx = Math.floor(Math.random() * width);
        const cy = Math.floor(Math.random() * height);
        
        const x1Start = Math.max(0, cx - cutW / 2);
        const y1Start = Math.max(0, cy - cutH / 2);
        const x1End = Math.min(width, cx + cutW / 2);
        const y1End = Math.min(height, cy + cutH / 2);

        const mixedX = [...x1];
        for (let y = y1Start; y < y1End; y++) {
            for (let x = x1Start; x < x1End; x++) {
                const idx = y * width + x;
                mixedX[idx] = x2[idx];
            }
        }

        const actualLambda = 1 - (x1End - x1Start) * (y1End - y1Start) / (width * height);
        const mixedY = y1.map((v, i) => actualLambda * v + (1 - actualLambda) * y2[i]);
        
        return { x: mixedX, y: mixedY, lambda: actualLambda };
    },

    /**
     * L1 Regularization (Lasso)
     */
    l1Regularization: function(weights, lambda = 0.01) {
        let penalty = 0;
        const flatten = (arr) => {
            if (!Array.isArray(arr)) return Math.abs(arr);
            return arr.reduce((sum, item) => sum + flatten(item), 0);
        };
        penalty = flatten(weights);
        return lambda * penalty;
    },

    /**
     * L2 Regularization (Ridge)
     */
    l2Regularization: function(weights, lambda = 0.01) {
        let penalty = 0;
        const flatten = (arr) => {
            if (!Array.isArray(arr)) return arr * arr;
            return arr.reduce((sum, item) => sum + flatten(item), 0);
        };
        penalty = flatten(weights);
        return 0.5 * lambda * penalty;
    },

    /**
     * Elastic Net (L1 + L2)
     */
    elasticNet: function(weights, lambda1 = 0.01, lambda2 = 0.01) {
        return this.l1Regularization(weights, lambda1) + this.l2Regularization(weights, lambda2);
    },

    // Helper: Sample from Beta distribution (approximation)
    _sampleBeta: function(alpha, beta) {
        const gamma1 = this._sampleGamma(alpha);
        const gamma2 = this._sampleGamma(beta);
        return gamma1 / (gamma1 + gamma2);
    },

    _sampleGamma: function(shape) {
        // Marsaglia and Tsang's method for shape >= 1
        if (shape < 1) {
            return this._sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
        }
        const d = shape - 1/3;
        const c = 1 / Math.sqrt(9 * d);
        while (true) {
            let x, v;
            do {
                x = this._randn();
                v = 1 + c * x;
            } while (v <= 0);
            v = v * v * v;
            const u = Math.random();
            if (u < 1 - 0.0331 * x * x * x * x) return d * v;
            if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
        }
    },

    _randn: function() {
        const u = Math.random(), v = Math.random();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
}