const PRISM_XAI_COMPLETE = {
    name: 'PRISM Explainable AI Complete',
    version: '1.0.0',
    source: 'MIT 6.867, Ribeiro et al. (LIME), Lundberg & Lee (SHAP)',
    
    // ─────────────────────────────────────────────────────────────────────────────────────────
    // LIME: Local Interpretable Model-agnostic Explanations
    // ─────────────────────────────────────────────────────────────────────────────────────────
    LIME: {
        /**
         * Explain a prediction using LIME
         * @param {Function} predictFn - Model prediction function
         * @param {Array} instance - Input to explain
         * @param {number} numSamples - Number of perturbed samples
         * @param {number} numFeatures - Top features to return
         * @returns {Object} {explanation, weights, intercept}
         */
        explain: function(predictFn, instance, numSamples = 1000, numFeatures = 10) {
            const dim = instance.length;
            
            // Generate perturbed samples
            const samples = [];
            const labels = [];
            const weights = [];
            
            // Original instance prediction
            const originalPred = predictFn(instance);
            
            for (let i = 0; i < numSamples; i++) {
                // Perturb instance
                const perturbed = instance.map((v, j) => {
                    if (Math.random() < 0.5) {
                        return v + (Math.random() - 0.5) * Math.abs(v) * 0.5;
                    }
                    return v;
                });
                
                samples.push(perturbed);
                labels.push(predictFn(perturbed));
                
                // Weight by distance to original
                const distance = Math.sqrt(instance.reduce((sum, v, j) => 
                    sum + (v - perturbed[j]) ** 2, 0));
                weights.push(Math.exp(-distance * distance / 2));
            }
            
            // Fit weighted linear model
            const coefficients = this._weightedLinearRegression(samples, labels, weights);
            
            // Return top features
            const explanation = coefficients
                .map((c, i) => ({ feature: i, importance: c, absImportance: Math.abs(c) }))
                .sort((a, b) => b.absImportance - a.absImportance)
                .slice(0, numFeatures);
            
            return {
                explanation,
                allCoefficients: coefficients,
                originalPrediction: originalPred,
                numSamples
            };
        },
        
        _weightedLinearRegression: function(X, y, weights) {
            const n = X.length;
            const d = X[0].length;
            
            // Add bias term
            const Xb = X.map(row => [1, ...row]);
            const db = d + 1;
            
            // XtWX and XtWy
            const XtWX = Array(db).fill(0).map(() => Array(db).fill(0));
            const XtWy = Array(db).fill(0);
            
            for (let i = 0; i < n; i++) {
                const w = weights[i];
                for (let j = 0; j < db; j++) {
                    XtWy[j] += w * Xb[i][j] * y[i];
                    for (let k = 0; k < db; k++) {
                        XtWX[j][k] += w * Xb[i][j] * Xb[i][k];
                    }
                }
            }
            
            // Regularization
            for (let j = 0; j < db; j++) {
                XtWX[j][j] += 0.001;
            }
            
            // Solve
            const coeffs = this._solveLinear(XtWX, XtWy);
            return coeffs.slice(1); // Remove bias
        },
        
        _solveLinear: function(A, b) {
            const n = A.length;
            const aug = A.map((row, i) => [...row, b[i]]);
            
            // Gaussian elimination
            for (let col = 0; col < n; col++) {
                let maxRow = col;
                for (let row = col + 1; row < n; row++) {
                    if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
                        maxRow = row;
                    }
                }
                [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
                
                if (Math.abs(aug[col][col]) < 1e-10) continue;
                
                for (let row = col + 1; row < n; row++) {
                    const factor = aug[row][col] / aug[col][col];
                    for (let j = col; j <= n; j++) {
                        aug[row][j] -= factor * aug[col][j];
                    }
                }
            }
            
            // Back substitution
            const x = Array(n).fill(0);
            for (let i = n - 1; i >= 0; i--) {
                x[i] = aug[i][n];
                for (let j = i + 1; j < n; j++) {
                    x[i] -= aug[i][j] * x[j];
                }
                x[i] /= aug[i][i] || 1;
            }
            
            return x;
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────────
    // SHAP: Shapley Additive Explanations (Kernel SHAP approximation)
    // ─────────────────────────────────────────────────────────────────────────────────────────
    SHAP: {
        /**
         * Compute SHAP values using Kernel SHAP
         * @param {Function} predictFn - Model prediction function
         * @param {Array} instance - Input to explain
         * @param {Array} background - Background dataset for expected value
         * @param {number} numSamples - Number of coalition samples
         * @returns {Object} {shapValues, expectedValue}
         */
        explain: function(predictFn, instance, background, numSamples = 2000) {
            const dim = instance.length;
            
            // Compute expected value (average prediction on background)
            const expectedValue = background.reduce((sum, bg) => 
                sum + predictFn(bg), 0) / background.length;
            
            // Sample coalitions and compute SHAP kernel weights
            const coalitions = [];
            const predictions = [];
            const kernelWeights = [];
            
            // Always include empty and full coalitions
            coalitions.push(Array(dim).fill(0));
            coalitions.push(Array(dim).fill(1));
            
            // Sample random coalitions
            for (let i = 0; i < numSamples - 2; i++) {
                const coalition = Array(dim).fill(0).map(() => Math.random() < 0.5 ? 1 : 0);
                coalitions.push(coalition);
            }
            
            // Evaluate each coalition
            for (const coalition of coalitions) {
                const numOnes = coalition.reduce((a, b) => a + b, 0);
                
                // Kernel weight (SHAP kernel)
                const weight = this._shapleyKernelWeight(dim, numOnes);
                kernelWeights.push(weight);
                
                // Create masked instance (average over background for excluded features)
                let pred = 0;
                const numBg = Math.min(10, background.length); // Limit for efficiency
                
                for (let b = 0; b < numBg; b++) {
                    const bg = background[Math.floor(Math.random() * background.length)];
                    const masked = instance.map((v, j) => coalition[j] ? v : bg[j]);
                    pred += predictFn(masked);
                }
                pred /= numBg;
                
                predictions.push(pred);
            }
            
            // Fit weighted linear model to get SHAP values
            const shapValues = this._fitShapValues(coalitions, predictions, kernelWeights, dim);
            
            return {
                shapValues,
                expectedValue,
                instancePrediction: predictFn(instance),
                // Verify: sum of SHAP values + expected ≈ prediction
                sumCheck: shapValues.reduce((a, b) => a + b, 0) + expectedValue
            };
        },
        
        _shapleyKernelWeight: function(M, s) {
            // Shapley kernel: (M-1) / (C(M,s) * s * (M-s))
            if (s === 0 || s === M) return 1e6; // Large weight for empty/full
            
            const binomial = this._binomial(M, s);
            return (M - 1) / (binomial * s * (M - s));
        },
        
        _binomial: function(n, k) {
            if (k < 0 || k > n) return 0;
            if (k === 0 || k === n) return 1;
            
            let result = 1;
            for (let i = 0; i < k; i++) {
                result = result * (n - i) / (i + 1);
            }
            return result;
        },
        
        _fitShapValues: function(coalitions, predictions, weights, dim) {
            // Weighted least squares: find φ such that Σ φ_i * z_i ≈ f(x|z) - E[f]
            // Using coalition z as feature, predictions as targets
            
            const n = coalitions.length;
            
            // Build weighted normal equations
            const XtWX = Array(dim).fill(0).map(() => Array(dim).fill(0));
            const XtWy = Array(dim).fill(0);
            
            for (let i = 0; i < n; i++) {
                const w = weights[i];
                const z = coalitions[i];
                const y = predictions[i];
                
                for (let j = 0; j < dim; j++) {
                    XtWy[j] += w * z[j] * y;
                    for (let k = 0; k < dim; k++) {
                        XtWX[j][k] += w * z[j] * z[k];
                    }
                }
            }
            
            // Add regularization
            for (let j = 0; j < dim; j++) {
                XtWX[j][j] += 0.001;
            }
            
            // Solve
            return PRISM_XAI_COMPLETE.LIME._solveLinear(XtWX, XtWy);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────────
    // GRADIENT-BASED EXPLANATIONS
    // ─────────────────────────────────────────────────────────────────────────────────────────
    Gradients: {
        /**
         * Compute gradient saliency map
         * @param {Function} gradFn - Function returning gradients: gradFn(input) -> gradients
         * @param {Array} input - Input to explain
         * @returns {Array} Saliency scores for each input feature
         */
        saliency: function(gradFn, input) {
            const gradients = gradFn(input);
            
            // Saliency = |gradient|
            return gradients.map(g => Math.abs(g));
        },
        
        /**
         * Integrated Gradients
         * @param {Function} predictFn - Model prediction function
         * @param {Function} gradFn - Gradient function
         * @param {Array} input - Input to explain
         * @param {Array} baseline - Baseline input (default: zeros)
         * @param {number} steps - Number of integration steps
         */
        integratedGradients: function(predictFn, gradFn, input, baseline = null, steps = 50) {
            baseline = baseline || Array(input.length).fill(0);
            
            // Integrate gradients along path from baseline to input
            const integratedGrads = Array(input.length).fill(0);
            
            for (let i = 0; i <= steps; i++) {
                const alpha = i / steps;
                
                // Interpolated input
                const interpolated = input.map((v, j) => 
                    baseline[j] + alpha * (v - baseline[j])
                );
                
                // Get gradients at this point
                const grads = gradFn(interpolated);
                
                // Accumulate (trapezoidal rule)
                const weight = (i === 0 || i === steps) ? 0.5 : 1;
                for (let j = 0; j < input.length; j++) {
                    integratedGrads[j] += weight * grads[j] / steps;
                }
            }
            
            // Scale by (input - baseline)
            return integratedGrads.map((g, j) => g * (input[j] - baseline[j]));
        },
        
        /**
         * SmoothGrad: Reduce noise by averaging gradients over noisy inputs
         * @param {Function} gradFn - Gradient function
         * @param {Array} input - Input to explain
         * @param {number} numSamples - Number of noisy samples
         * @param {number} noise - Standard deviation of noise
         */
        smoothGrad: function(gradFn, input, numSamples = 50, noise = 0.1) {
            const smoothGrads = Array(input.length).fill(0);
            
            for (let i = 0; i < numSamples; i++) {
                // Add noise to input
                const noisyInput = input.map(v => v + noise * this._randn());
                
                // Get gradients
                const grads = gradFn(noisyInput);
                
                // Accumulate
                for (let j = 0; j < input.length; j++) {
                    smoothGrads[j] += Math.abs(grads[j]) / numSamples;
                }
            }
            
            return smoothGrads;
        },
        
        _randn: function() {
            const u1 = Math.random();
            const u2 = Math.random();
            return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────────
    // MANUFACTURING XAI APPLICATIONS
    // ─────────────────────────────────────────────────────────────────────────────────────────
    Manufacturing: {
        /**
         * Explain speed/feed recommendation
         * @param {Function} recommendFn - Function that produces recommendation
         * @param {Object} params - {material, tool, machine, ...}
         * @returns {Object} Explanation of recommendation
         */
        explainSpeedFeed: function(recommendFn, params) {
            // Convert params to feature array
            const features = this._paramsToFeatures(params);
            const featureNames = Object.keys(params);
            
            // Get LIME explanation
            const predictFn = (f) => {
                const p = this._featuresToParams(f, featureNames);
                const result = recommendFn(p);
                return result.speed || result.vc || 0;
            };
            
            const explanation = PRISM_XAI_COMPLETE.LIME.explain(
                predictFn, features, 500, 5
            );
            
            // Format explanation
            return {
                recommendation: recommendFn(params),
                topFactors: explanation.explanation.map(e => ({
                    factor: featureNames[e.feature],
                    influence: e.importance,
                    direction: e.importance > 0 ? 'increases' : 'decreases'
                })),
                confidence: 0.85 // Placeholder
            };
        },
        
        _paramsToFeatures: function(params) {
            return Object.values(params).map(v => 
                typeof v === 'number' ? v : 0
            );
        },
        
        _featuresToParams: function(features, names) {
            const params = {};
            names.forEach((name, i) => {
                params[name] = features[i];
            });
            return params;
        }
    }
}