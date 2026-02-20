const PRISM_UNCERTAINTY = {
    // Monte Carlo Dropout uncertainty
    mcDropoutPredict(model, input, numSamples = 30, dropoutRate = 0.1) {
        const predictions = [];
        
        for (let i = 0; i < numSamples; i++) {
            // Apply dropout at inference
            const pred = model.forward(input, true); // training=true enables dropout
            predictions.push(pred);
        }
        
        // Calculate mean and variance
        const mean = this._arrayMean(predictions);
        const variance = this._arrayVariance(predictions, mean);
        const std = variance.map(Math.sqrt);
        
        // Epistemic uncertainty (model uncertainty) - variance of predictions
        const epistemic = std;
        
        return {
            mean,
            std,
            epistemic,
            predictions,
            confidence: this._calculateConfidence(std)
        };
    },
    
    // Deep Ensemble uncertainty
    ensemblePredict(models, input) {
        const predictions = models.map(m => m.forward(input, false));
        
        const mean = this._arrayMean(predictions);
        const variance = this._arrayVariance(predictions, mean);
        const std = variance.map(Math.sqrt);
        
        return {
            mean,
            std,
            epistemic: std,
            predictions,
            confidence: this._calculateConfidence(std)
        };
    },
    
    // Calibration
    calibration: {
        // Temperature scaling (post-hoc calibration)
        temperatureScale(logits, temperature) {
            const scaled = logits.map(l => l / temperature);
            return PRISM_UNCERTAINTY._softmax(scaled);
        },
        
        // Find optimal temperature using validation set
        findOptimalTemperature(logits, labels, minTemp = 0.1, maxTemp = 10, steps = 100) {
            let bestTemp = 1.0;
            let bestNLL = Infinity;
            
            for (let i = 0; i <= steps; i++) {
                const temp = minTemp + (maxTemp - minTemp) * i / steps;
                const nll = this._negativeLogLikelihood(logits, labels, temp);
                
                if (nll < bestNLL) {
                    bestNLL = nll;
                    bestTemp = temp;
                }
            }
            
            return { temperature: bestTemp, nll: bestNLL };
        },
        
        // Expected Calibration Error (ECE)
        calculateECE(predictions, labels, numBins = 10) {
            const bins = Array(numBins).fill().map(() => ({ count: 0, correct: 0, confidence: 0 }));
            
            for (let i = 0; i < predictions.length; i++) {
                const confidence = Math.max(...predictions[i]);
                const predicted = predictions[i].indexOf(confidence);
                const correct = predicted === labels[i] ? 1 : 0;
                
                const binIdx = Math.min(Math.floor(confidence * numBins), numBins - 1);
                bins[binIdx].count++;
                bins[binIdx].correct += correct;
                bins[binIdx].confidence += confidence;
            }
            
            let ece = 0;
            const totalSamples = predictions.length;
            
            for (const bin of bins) {
                if (bin.count > 0) {
                    const accuracy = bin.correct / bin.count;
                    const avgConfidence = bin.confidence / bin.count;
                    ece += (bin.count / totalSamples) * Math.abs(accuracy - avgConfidence);
                }
            }
            
            return ece;
        },
        
        // Reliability diagram data
        getReliabilityDiagram(predictions, labels, numBins = 10) {
            const bins = Array(numBins).fill().map(() => ({ count: 0, correct: 0, confidence: 0 }));
            
            for (let i = 0; i < predictions.length; i++) {
                const confidence = Math.max(...predictions[i]);
                const predicted = predictions[i].indexOf(confidence);
                const correct = predicted === labels[i] ? 1 : 0;
                
                const binIdx = Math.min(Math.floor(confidence * numBins), numBins - 1);
                bins[binIdx].count++;
                bins[binIdx].correct += correct;
                bins[binIdx].confidence += confidence;
            }
            
            return bins.map((bin, i) => ({
                binRange: [(i / numBins), ((i + 1) / numBins)],
                binCenter: (i + 0.5) / numBins,
                accuracy: bin.count > 0 ? bin.correct / bin.count : 0,
                avgConfidence: bin.count > 0 ? bin.confidence / bin.count : 0,
                count: bin.count
            }));
        },
        
        _negativeLogLikelihood(logits, labels, temperature) {
            let nll = 0;
            for (let i = 0; i < logits.length; i++) {
                const probs = PRISM_UNCERTAINTY.calibration._softmaxWithTemp(logits[i], temperature);
                nll -= Math.log(probs[labels[i]] + 1e-10);
            }
            return nll / logits.length;
        },
        
        _softmaxWithTemp(logits, temp) {
            const scaled = logits.map(l => l / temp);
            const max = Math.max(...scaled);
            const exps = scaled.map(l => Math.exp(l - max));
            const sum = exps.reduce((a, b) => a + b, 0);
            return exps.map(e => e / sum);
        }
    },
    
    // Bayesian approximation helpers
    bayesian: {
        // Sample from weight posterior (simplified)
        sampleWeights(meanWeights, stdWeights) {
            return meanWeights.map((mean, i) => 
                mean + stdWeights[i] * (Math.random() + Math.random() + Math.random() - 1.5) * 1.22
            );
        },
        
        // KL divergence for variational inference
        klDivergenceGaussian(muQ, sigmaQ, muP = 0, sigmaP = 1) {
            // KL(q||p) for Gaussians
            const logRatio = Math.log(sigmaP / sigmaQ);
            const varianceRatio = (sigmaQ * sigmaQ) / (sigmaP * sigmaP);
            const meanDiff = (muQ - muP) * (muQ - muP) / (sigmaP * sigmaP);
            
            return 0.5 * (logRatio + varianceRatio + meanDiff - 1);
        }
    },
    
    // Predictive entropy (total uncertainty)
    predictiveEntropy(probs) {
        let entropy = 0;
        for (const p of probs) {
            if (p > 0) {
                entropy -= p * Math.log2(p);
            }
        }
        return entropy;
    },
    
    // Mutual information (epistemic uncertainty from ensemble/MC)
    mutualInformation(allPredictions) {
        // Mean prediction
        const meanPred = this._arrayMean(allPredictions);
        
        // Total entropy (predictive entropy of mean)
        const totalEntropy = this.predictiveEntropy(meanPred);
        
        // Expected entropy (mean of individual entropies)
        let expectedEntropy = 0;
        for (const pred of allPredictions) {
            expectedEntropy += this.predictiveEntropy(pred);
        }
        expectedEntropy /= allPredictions.length;
        
        // MI = total entropy - expected entropy
        return totalEntropy - expectedEntropy;
    },
    
    // Helper functions
    _softmax(logits) {
        const max = Math.max(...logits);
        const exps = logits.map(l => Math.exp(l - max));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map(e => e / sum);
    },
    
    _arrayMean(arrays) {
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
    
    _arrayVariance(arrays, mean) {
        const n = arrays.length;
        const len = arrays[0].length;
        const variance = new Array(len).fill(0);
        
        for (const arr of arrays) {
            for (let i = 0; i < len; i++) {
                variance[i] += Math.pow(arr[i] - mean[i], 2);
            }
        }
        
        return variance.map(v => v / n);
    },
    
    _calculateConfidence(std) {
        // Higher std = lower confidence
        const avgStd = std.reduce((a, b) => a + b, 0) / std.length;
        return Math.exp(-avgStd);
    }
}