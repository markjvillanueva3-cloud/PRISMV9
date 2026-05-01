const PRISM_XAI_ENHANCED = {
    name: 'PRISM Explainable AI Enhanced',
    version: '1.0.0',
    
    /**
     * Gradient-based Saliency
     * ∂output/∂input for input attribution
     */
    gradientSaliency: function(model, input, targetClass) {
        // Numerical gradient estimation
        const eps = 1e-5;
        const baseline = model.forward(input);
        const targetOutput = baseline[targetClass];
        
        const saliency = input.map((_, i) => {
            const inputPlus = [...input];
            inputPlus[i] += eps;
            const outputPlus = model.forward(inputPlus)[targetClass];
            return (outputPlus - targetOutput) / eps;
        });
        
        return saliency;
    },
    
    /**
     * Integrated Gradients
     * Attribution = (x - x') × ∫(∂F/∂x)dα
     */
    integratedGradients: function(model, input, baseline = null, steps = 50) {
        if (!baseline) {
            baseline = input.map(() => 0);
        }
        
        const diff = input.map((v, i) => v - baseline[i]);
        const gradSum = input.map(() => 0);
        
        for (let step = 0; step <= steps; step++) {
            const alpha = step / steps;
            const interpolated = baseline.map((b, i) => b + alpha * diff[i]);
            const grad = this.gradientSaliency(model, interpolated, 0);
            
            for (let i = 0; i < input.length; i++) {
                gradSum[i] += grad[i];
            }
        }
        
        // Scale and multiply by difference
        return diff.map((d, i) => d * gradSum[i] / (steps + 1));
    },
    
    /**
     * LIME (simplified)
     * Local linear approximation
     */
    limeExplain: function(model, instance, numSamples = 1000, numFeatures = 5) {
        const dim = instance.length;
        
        // Generate perturbed samples
        const samples = [];
        const labels = [];
        const weights = [];
        
        for (let i = 0; i < numSamples; i++) {
            // Binary mask (which features to include)
            const mask = instance.map(() => Math.random() > 0.5 ? 1 : 0);
            const perturbed = instance.map((v, j) => mask[j] ? v : 0);
            
            const output = model.forward(perturbed);
            const distance = Math.sqrt(mask.reduce((sum, m) => sum + (1 - m) * (1 - m), 0));
            
            samples.push(mask);
            labels.push(output[0]); // Assuming single output
            weights.push(Math.exp(-distance * distance / 2));
        }
        
        // Weighted linear regression
        const coefficients = this._weightedLinearRegression(samples, labels, weights);
        
        // Return top features by importance
        return coefficients
            .map((c, i) => ({ feature: i, importance: Math.abs(c) }))
            .sort((a, b) => b.importance - a.importance)
            .slice(0, numFeatures);
    },
    
    _weightedLinearRegression: function(X, y, weights) {
        const n = X.length;
        const d = X[0].length;
        
        // XtWX and XtWy
        const XtWX = Array(d).fill(0).map(() => Array(d).fill(0));
        const XtWy = Array(d).fill(0);
        
        for (let i = 0; i < n; i++) {
            const w = weights[i];
            for (let j = 0; j < d; j++) {
                XtWy[j] += w * X[i][j] * y[i];
                for (let k = 0; k < d; k++) {
                    XtWX[j][k] += w * X[i][j] * X[i][k];
                }
            }
        }
        
        // Add regularization
        for (let j = 0; j < d; j++) {
            XtWX[j][j] += 0.01;
        }
        
        // Solve (simplified - using direct inversion for small d)
        // In practice, use proper linear algebra library
        return this._solveLinear(XtWX, XtWy);
    },
    
    _solveLinear: function(A, b) {
        const n = A.length;
        const aug = A.map((row, i) => [...row, b[i]]);
        
        // Gaussian elimination with partial pivoting
        for (let col = 0; col < n; col++) {
            let maxRow = col;
            for (let row = col + 1; row < n; row++) {
                if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
                    maxRow = row;
                }
            }
            [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
            
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
            x[i] /= aug[i][i];
        }
        
        return x;
    }
};