const PRISM_BAYESIAN_TOOL_LIFE = {
    name: 'Bayesian Tool Life Management',
    sources: ['Stanford CS229', 'MIT 2.008'],
    patentClaim: 'Gaussian Process regression combined with Taylor tool life equation for probabilistic tool wear prediction',
    
    /**
     * Create Bayesian tool life predictor
     */
    createPredictor: function(config = {}) {
        const {
            lengthScale = 50,      // For GP kernel
            signalVariance = 1.0,
            noiseVariance = 0.1
        } = config;
        
        return {
            // Gaussian Process parameters
            gp: {
                lengthScale: lengthScale,
                signalVariance: signalVariance,
                noiseVariance: noiseVariance,
                X_train: [],       // Training inputs [speed, feed, doc]
                y_train: [],       // Training outputs (tool life)
                K_inv: null        // Inverse kernel matrix (cached)
            },
            
            // Taylor equation parameters (prior)
            taylor: {
                C: 400,            // Taylor constant (default)
                n: 0.25,           // Speed exponent
                m: 0.15,           // Feed exponent
                p: 0.10            // DOC exponent
            },
            
            // History for learning
            observations: []
        };
    },
    
    /**
     * Add observation to the predictor
     */
    addObservation: function(predictor, params, actualToolLife) {
        const { speed, feed, doc } = params;
        
        predictor.observations.push({
            params: { speed, feed, doc },
            toolLife: actualToolLife,
            timestamp: Date.now()
        });
        
        // Update GP training data
        predictor.gp.X_train.push([speed, feed, doc]);
        predictor.gp.y_train.push(actualToolLife);
        
        // Invalidate cached inverse
        predictor.gp.K_inv = null;
        
        // Update Taylor parameters using Bayesian update
        this._updateTaylorParams(predictor);
        
        return {
            observationCount: predictor.observations.length,
            updated: true
        };
    },
    
    /**
     * Predict tool life with uncertainty
     */
    predict: function(predictor, params) {
        const { speed, feed, doc } = params;
        const x_star = [speed, feed, doc];
        
        // Get Taylor baseline prediction
        const taylorLife = this._taylorPredict(predictor.taylor, speed, feed, doc);
        
        // If no training data, return Taylor with high uncertainty
        if (predictor.gp.X_train.length === 0) {
            return {
                mean: taylorLife,
                std: taylorLife * 0.3,
                confidence95: [taylorLife * 0.4, taylorLife * 1.6],
                source: 'taylor_prior',
                confidence: 0.5
            };
        }
        
        // GP prediction
        const gpPrediction = this._gpPredict(predictor.gp, x_star);
        
        // Combine Taylor prior with GP
        const combinedMean = 0.3 * taylorLife + 0.7 * gpPrediction.mean;
        const combinedStd = Math.sqrt(
            0.3 * 0.3 * Math.pow(taylorLife * 0.2, 2) + 
            0.7 * 0.7 * gpPrediction.variance
        );
        
        return {
            mean: combinedMean,
            std: combinedStd,
            confidence95: [
                combinedMean - 1.96 * combinedStd,
                combinedMean + 1.96 * combinedStd
            ],
            taylorPrediction: taylorLife,
            gpPrediction: gpPrediction.mean,
            source: 'bayesian_combined',
            confidence: Math.min(0.95, 0.5 + predictor.observations.length * 0.05)
        };
    },
    
    /**
     * Get optimal replacement time
     */
    getReplacementTime: function(predictor, params, riskTolerance = 0.1) {
        const prediction = this.predict(predictor, params);
        
        // Calculate time at which P(failure) = riskTolerance
        // Using normal CDF inverse
        const z = this._normInv(1 - riskTolerance);
        const safeLife = prediction.mean - z * prediction.std;
        
        return {
            recommendedReplacement: Math.max(0, safeLife),
            expectedLife: prediction.mean,
            uncertainty: prediction.std,
            riskTolerance: riskTolerance,
            confidence: prediction.confidence
        };
    },
    
    /**
     * Calculate expected cost considering uncertainty
     */
    calculateExpectedCost: function(predictor, params, costs) {
        const {
            toolCost = 50,
            downTimeCost = 200,     // Cost per hour of unplanned downtime
            plannedChangeCost = 20  // Cost of planned tool change
        } = costs;
        
        const prediction = this.predict(predictor, params);
        
        // Monte Carlo cost estimation
        const numSamples = 1000;
        let totalCost = 0;
        
        for (let i = 0; i < numSamples; i++) {
            // Sample tool life
            const sampledLife = prediction.mean + prediction.std * this._randn();
            
            // If tool fails before planned change, add downtime cost
            const plannedChange = prediction.mean * 0.8; // Plan to change at 80% of expected life
            
            if (sampledLife < plannedChange) {
                totalCost += toolCost + downTimeCost * 0.5; // Assume 30 min downtime
            } else {
                totalCost += toolCost + plannedChangeCost;
            }
        }
        
        const avgCost = totalCost / numSamples;
        
        // Find optimal replacement time
        const optimalReplacement = this._findOptimalReplacement(prediction, costs);
        
        return {
            expectedCostPerTool: avgCost,
            optimalReplacementTime: optimalReplacement.time,
            expectedSavings: optimalReplacement.savings,
            recommendation: optimalReplacement.recommendation
        };
    },
    
    _taylorPredict: function(taylor, speed, feed, doc) {
        // Extended Taylor: T = C / (V^n * f^m * d^p)
        return taylor.C / (Math.pow(speed / 100, taylor.n) * 
                          Math.pow(feed / 0.1, taylor.m) * 
                          Math.pow(doc / 1.0, taylor.p));
    },
    
    _gpPredict: function(gp, x_star) {
        const n = gp.X_train.length;
        
        if (n === 0) {
            return { mean: 0, variance: gp.signalVariance };
        }
        
        // Compute kernel vector k_star
        const k_star = gp.X_train.map(x => this._rbfKernel(x, x_star, gp));
        
        // Compute or use cached K inverse
        if (!gp.K_inv) {
            const K = this._computeKernelMatrix(gp);
            gp.K_inv = this._invertMatrix(K);
        }
        
        // Mean: k_star^T * K^-1 * y
        const alpha = this._matVecMult(gp.K_inv, gp.y_train);
        const mean = k_star.reduce((sum, k, i) => sum + k * alpha[i], 0);
        
        // Variance: k(x*, x*) - k_star^T * K^-1 * k_star
        const k_ss = this._rbfKernel(x_star, x_star, gp);
        const v = this._matVecMult(gp.K_inv, k_star);
        const variance = k_ss - k_star.reduce((sum, k, i) => sum + k * v[i], 0);
        
        return { mean, variance: Math.max(0.01, variance) };
    },
    
    _rbfKernel: function(x1, x2, gp) {
        let sqDist = 0;
        for (let i = 0; i < x1.length; i++) {
            sqDist += Math.pow(x1[i] - x2[i], 2);
        }
        return gp.signalVariance * Math.exp(-sqDist / (2 * gp.lengthScale * gp.lengthScale));
    },
    
    _computeKernelMatrix: function(gp) {
        const n = gp.X_train.length;
        const K = Array(n).fill(null).map(() => Array(n).fill(0));
        
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                K[i][j] = this._rbfKernel(gp.X_train[i], gp.X_train[j], gp);
                if (i === j) K[i][j] += gp.noiseVariance;
            }
        }
        
        return K;
    },
    
    _invertMatrix: function(A) {
        // Simple matrix inversion using Gauss-Jordan
        const n = A.length;
        const aug = A.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);
        
        // Forward elimination
        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
            }
            [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
            
            if (Math.abs(aug[i][i]) < 1e-10) {
                aug[i][i] = 1e-10; // Regularization
            }
            
            for (let k = i + 1; k < n; k++) {
                const factor = aug[k][i] / aug[i][i];
                for (let j = i; j < 2 * n; j++) {
                    aug[k][j] -= factor * aug[i][j];
                }
            }
        }
        
        // Back substitution
        for (let i = n - 1; i >= 0; i--) {
            const pivot = aug[i][i];
            for (let j = i; j < 2 * n; j++) {
                aug[i][j] /= pivot;
            }
            for (let k = 0; k < i; k++) {
                const factor = aug[k][i];
                for (let j = i; j < 2 * n; j++) {
                    aug[k][j] -= factor * aug[i][j];
                }
            }
        }
        
        return aug.map(row => row.slice(n));
    },
    
    _matVecMult: function(A, v) {
        return A.map(row => row.reduce((sum, a, j) => sum + a * v[j], 0));
    },
    
    _updateTaylorParams: function(predictor) {
        if (predictor.observations.length < 5) return;
        
        // Simple least squares fit to update Taylor parameters
        // In production, would use proper Bayesian parameter estimation
        const recent = predictor.observations.slice(-20);
        
        // Calculate average error and adjust C
        let totalError = 0;
        for (const obs of recent) {
            const predicted = this._taylorPredict(predictor.taylor, 
                obs.params.speed, obs.params.feed, obs.params.doc);
            totalError += obs.toolLife / predicted;
        }
        
        // Adjust C based on average ratio
        const avgRatio = totalError / recent.length;
        predictor.taylor.C *= avgRatio;
    },
    
    _normInv: function(p) {
        // Approximate inverse normal CDF
        const a = [0, -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
                   1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
        const b = [0, -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
                   6.680131188771972e1, -1.328068155288572e1];
        
        const q = p - 0.5;
        let r, x;
        
        if (Math.abs(q) <= 0.425) {
            r = 0.180625 - q * q;
            x = q * (((((((a[7] * r + a[6]) * r + a[5]) * r + a[4]) * r + a[3]) * r + a[2]) * r + a[1]) * r + a[0]) /
                    (((((((b[7] * r + b[6]) * r + b[5]) * r + b[4]) * r + b[3]) * r + b[2]) * r + b[1]) * r + 1);
        } else {
            r = q < 0 ? p : 1 - p;
            r = Math.sqrt(-Math.log(r));
            x = (((((((a[7] * r + a[6]) * r + a[5]) * r + a[4]) * r + a[3]) * r + a[2]) * r + a[1]) * r + a[0]) /
                (((((((b[7] * r + b[6]) * r + b[5]) * r + b[4]) * r + b[3]) * r + b[2]) * r + b[1]) * r + 1);
            if (q < 0) x = -x;
        }
        
        return x;
    },
    
    _randn: function() {
        // Box-Muller transform
        const u1 = Math.random();
        const u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    },
    
    _findOptimalReplacement: function(prediction, costs) {
        // Search for optimal replacement time
        let bestTime = prediction.mean * 0.8;
        let bestCost = Infinity;
        
        for (let t = prediction.mean * 0.5; t <= prediction.mean * 1.0; t += prediction.mean * 0.05) {
            // P(failure before t)
            const pFailure = this._normalCDF((t - prediction.mean) / prediction.std);
            
            const expectedCost = costs.toolCost + 
                pFailure * costs.downTimeCost * 0.5 + 
                (1 - pFailure) * costs.plannedChangeCost;
            
            if (expectedCost < bestCost) {
                bestCost = expectedCost;
                bestTime = t;
            }
        }
        
        return {
            time: bestTime,
            savings: (prediction.mean * 0.8 - bestTime) * costs.downTimeCost * 0.01,
            recommendation: `Replace at ${bestTime.toFixed(0)} minutes`
        };
    },
    
    _normalCDF: function(x) {
        const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
        const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
        
        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x) / Math.sqrt(2);
        
        const t = 1 / (1 + p * x);
        const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        
        return 0.5 * (1 + sign * y);
    }
}