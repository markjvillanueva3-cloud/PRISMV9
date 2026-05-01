// PRISM_UNCERTAINTY_COMPLETE - Lines 906559-906780 (222 lines) - Uncertainty complete\n\nconst PRISM_UNCERTAINTY_COMPLETE = {
    name: 'PRISM Uncertainty Quantification Complete',
    version: '1.0.0',
    
    /**
     * Monte Carlo Dropout for uncertainty estimation
     */
    mcDropout: function(model, input, options = {}) {
        const {
            numSamples = 100,
            dropoutRate = 0.5
        } = options;
        
        const predictions = [];
        
        for (let i = 0; i < numSamples; i++) {
            // Apply dropout during inference
            const pred = model.forward ? 
                model.forward(input, true) : // training=true to apply dropout
                model.predict(input);
            predictions.push(Array.isArray(pred) ? pred : [pred]);
        }
        
        // Compute statistics
        const mean = this._arrayMean(predictions);
        const std = this._arrayStd(predictions, mean);
        
        return {
            mean,
            std,
            confidence: this._calculateConfidence(std),
            samples: predictions.length,
            epistemic: std // Epistemic uncertainty from dropout variability
        };
    },
    
    /**
     * Deep Ensemble for uncertainty
     */
    deepEnsemble: function(models, input) {
        const predictions = models.map(model => {
            const pred = model.forward ? model.forward(input) : model.predict(input);
            return Array.isArray(pred) ? pred : [pred];
        });
        
        const mean = this._arrayMean(predictions);
        const std = this._arrayStd(predictions, mean);
        
        // Decompose uncertainty
        const aleatoric = this._computeAleatoric(predictions);
        const epistemic = std;
        
        return {
            mean,
            std,
            confidence: this._calculateConfidence(std),
            aleatoric,
            epistemic,
            ensembleSize: models.length
        };
    },
    
    /**
     * Temperature scaling for calibration
     */
    temperatureScaling: {
        temperature: 1.0,
        
        fit: function(logits, labels, options = {}) {
            const { maxIter = 100, lr = 0.01 } = options;
            
            let T = 1.0;
            
            for (let iter = 0; iter < maxIter; iter++) {
                let gradSum = 0;
                
                for (let i = 0; i < logits.length; i++) {
                    const scaledLogits = logits[i].map(l => l / T);
                    const probs = this._softmax(scaledLogits);
                    
                    // Gradient of NLL w.r.t. temperature
                    const y = labels[i];
                    for (let c = 0; c < probs.length; c++) {
                        const indicator = c === y ? 1 : 0;
                        gradSum += (probs[c] - indicator) * (-logits[i][c] / (T * T));
                    }
                }
                
                T -= lr * gradSum / logits.length;
                T = Math.max(0.1, Math.min(10, T)); // Clamp
            }
            
            this.temperature = T;
            return T;
        },
        
        calibrate: function(logits) {
            return logits.map(l => l / this.temperature);
        },
        
        _softmax: function(logits) {
            const max = Math.max(...logits);
            const exps = logits.map(l => Math.exp(l - max));
            const sum = exps.reduce((a, b) => a + b, 0);
            return exps.map(e => e / sum);
        }
    },
    
    /**
     * Expected Calibration Error (ECE)
     */
    computeECE: function(predictions, labels, numBins = 10) {
        const bins = Array(numBins).fill(null).map(() => ({
            count: 0,
            accuracy: 0,
            confidence: 0
        }));
        
        for (let i = 0; i < predictions.length; i++) {
            const probs = predictions[i].probabilities || [predictions[i].confidence];
            const confidence = Math.max(...probs);
            const predicted = probs.indexOf(confidence);
            const correct = predicted === labels[i] ? 1 : 0;
            
            const binIdx = Math.min(numBins - 1, Math.floor(confidence * numBins));
            bins[binIdx].count++;
            bins[binIdx].accuracy += correct;
            bins[binIdx].confidence += confidence;
        }
        
        let ece = 0;
        const n = predictions.length;
        
        for (const bin of bins) {
            if (bin.count > 0) {
                const avgAccuracy = bin.accuracy / bin.count;
                const avgConfidence = bin.confidence / bin.count;
                ece += (bin.count / n) * Math.abs(avgAccuracy - avgConfidence);
            }
        }
        
        return {
            ece,
            bins: bins.map((b, i) => ({
                range: [i / numBins, (i + 1) / numBins],
                count: b.count,
                avgAccuracy: b.count > 0 ? b.accuracy / b.count : 0,
                avgConfidence: b.count > 0 ? b.confidence / b.count : 0
            }))
        };
    },
    
    /**
     * Predictive entropy (total uncertainty)
     */
    predictiveEntropy: function(probs) {
        let entropy = 0;
        for (const p of probs) {
            if (p > 0) {
                entropy -= p * Math.log2(p);
            }
        }
        return entropy;
    },
    
    /**
     * Mutual information (epistemic uncertainty from ensemble/MC)
     */
    mutualInformation: function(allPredictions) {
        const meanPred = this._arrayMean(allPredictions);
        const totalEntropy = this.predictiveEntropy(meanPred);
        
        let expectedEntropy = 0;
        for (const pred of allPredictions) {
            expectedEntropy += this.predictiveEntropy(pred);
        }
        expectedEntropy /= allPredictions.length;
        
        return totalEntropy - expectedEntropy;
    },
    
    _arrayMean: function(arrays) {
        const n = arrays.length;
        const len = arrays[0].length;
        const mean = new Array(len).fill(0);
        
        for (const arr of arrays) {
            for (let i = 0; i < len; i++) {
                mean[i] += arr[i];
            }
        }
        
        return mean.map(m => m / n);
    },
    
    _arrayStd: function(arrays, mean) {
        const n = arrays.length;
        const len = arrays[0].length;
        const variance = new Array(len).fill(0);
        
        for (const arr of arrays) {
            for (let i = 0; i < len; i++) {
                variance[i] += Math.pow(arr[i] - mean[i], 2);
            }
        }
        
        return variance.map(v => Math.sqrt(v / n));
    },
    
    _computeAleatoric: function(predictions) {
        // Approximate aleatoric uncertainty from prediction variance
        if (predictions.length === 0) return [0];
        
        const mean = this._arrayMean(predictions);
        return mean.map(m => Math.sqrt(m * (1 - m)));
    },
    
    _calculateConfidence: function(std) {
        const avgStd = std.reduce((a, b) => a + b, 0) / std.length;
        return Math.exp(-avgStd);
    }
};
