const PRISM_XAI_ENGINE = {
    name: 'PRISM_XAI_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 230, Ribeiro 2016',

    /**
     * Gradient Saliency
     * Compute |∂y/∂x| to highlight important input features
     */
    gradientSaliency: function(model, input, targetClass) {
        const epsilon = 1e-5;
        const saliency = [];

        // Numerical gradient approximation
        for (let i = 0; i < input.length; i++) {
            const inputPlus = [...input];
            const inputMinus = [...input];
            inputPlus[i] += epsilon;
            inputMinus[i] -= epsilon;

            const outputPlus = model(inputPlus);
            const outputMinus = model(inputMinus);

            const gradient = (outputPlus[targetClass] - outputMinus[targetClass]) / (2 * epsilon);
            saliency.push(Math.abs(gradient));
        }

        // Normalize
        const maxSal = Math.max(...saliency) || 1;
        return saliency.map(s => s / maxSal);
    },

    /**
     * Integrated Gradients
     * More principled attribution method
     */
    integratedGradients: function(model, input, baseline = null, steps = 50, targetClass = 0) {
        baseline = baseline || input.map(() => 0);
        const gradients = input.map(() => 0);
        const epsilon = 1e-5;

        for (let step = 0; step <= steps; step++) {
            const alpha = step / steps;

            // Interpolated input
            const interpolated = input.map((x, i) => baseline[i] + alpha * (x - baseline[i]));

            // Compute gradient at this point
            for (let i = 0; i < input.length; i++) {
                const interpPlus = [...interpolated];
                const interpMinus = [...interpolated];
                interpPlus[i] += epsilon;
                interpMinus[i] -= epsilon;

                const outPlus = model(interpPlus);
                const outMinus = model(interpMinus);

                const grad = (outPlus[targetClass] - outMinus[targetClass]) / (2 * epsilon);
                gradients[i] += grad;
            }
        }

        // Average gradients and multiply by (input - baseline)
        return gradients.map((g, i) => (g / (steps + 1)) * (input[i] - baseline[i]));
    },

    /**
     * LIME: Local Interpretable Model-agnostic Explanations
     */
    lime: function(model, input, numSamples = 1000, numFeatures = 10) {
        const n = input.length;
        const samples = [];
        const weights = [];
        const predictions = [];

        // Generate perturbed samples
        for (let i = 0; i < numSamples; i++) {
            // Random binary mask
            const mask = input.map(() => Math.random() > 0.5 ? 1 : 0);
            
            // Perturbed sample (zeros where mask is 0)
            const perturbed = input.map((x, j) => mask[j] ? x : 0);
            samples.push(mask);

            // Get model prediction
            const pred = model(perturbed);
            predictions.push(pred);

            // Compute weight based on distance to original
            const numDiff = mask.reduce((s, m) => s + (1 - m), 0);
            const distance = Math.sqrt(numDiff);
            const weight = Math.exp(-distance * distance / 2);
            weights.push(weight);
        }

        // Fit weighted linear model using least squares
        // Simplified: compute feature importance as weighted correlation
        const importance = [];
        const predMean = predictions.reduce((s, p) => s + p[0], 0) / numSamples;

        for (let j = 0; j < n; j++) {
            let weightedCov = 0, weightedVar = 0;
            const featureMean = samples.reduce((s, sam, i) => s + sam[j] * weights[i], 0) /
                               weights.reduce((a, b) => a + b, 0);

            for (let i = 0; i < numSamples; i++) {
                const featureDiff = samples[i][j] - featureMean;
                const predDiff = predictions[i][0] - predMean;
                weightedCov += weights[i] * featureDiff * predDiff;
                weightedVar += weights[i] * featureDiff * featureDiff;
            }

            importance.push(weightedVar > 0 ? weightedCov / weightedVar : 0);
        }

        // Sort and get top features
        const indexed = importance.map((imp, i) => ({ feature: i, importance: imp }));
        indexed.sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance));

        return {
            importance,
            topFeatures: indexed.slice(0, numFeatures)
        };
    },

    /**
     * SHAP: SHapley Additive exPlanations (Kernel SHAP approximation)
     */
    kernelShap: function(model, input, baseline = null, numSamples = 100) {
        const n = input.length;
        baseline = baseline || input.map(() => 0);

        // Generate coalition samples
        const coalitions = [];
        const predictions = [];
        const weights = [];

        for (let i = 0; i < numSamples; i++) {
            // Random coalition (subset of features)
            const coalition = input.map(() => Math.random() > 0.5);
            const numPresent = coalition.filter(c => c).length;

            // Skip trivial coalitions
            if (numPresent === 0 || numPresent === n) continue;

            // Create sample: use input for present features, baseline for absent
            const sample = input.map((x, j) => coalition[j] ? x : baseline[j]);
            
            coalitions.push(coalition);
            predictions.push(model(sample));

            // Shapley kernel weight
            const weight = (n - 1) / (this._binomial(n, numPresent) * numPresent * (n - numPresent));
            weights.push(weight);
        }

        // Compute SHAP values using weighted regression
        const shapValues = Array(n).fill(0);
        
        for (let j = 0; j < n; j++) {
            // Compute contribution of feature j
            let sumWith = 0, countWith = 0;
            let sumWithout = 0, countWithout = 0;

            for (let i = 0; i < coalitions.length; i++) {
                if (coalitions[i][j]) {
                    sumWith += predictions[i][0] * weights[i];
                    countWith += weights[i];
                } else {
                    sumWithout += predictions[i][0] * weights[i];
                    countWithout += weights[i];
                }
            }

            const avgWith = countWith > 0 ? sumWith / countWith : 0;
            const avgWithout = countWithout > 0 ? sumWithout / countWithout : 0;
            shapValues[j] = avgWith - avgWithout;
        }

        return { shapValues, baseValue: model(baseline)[0] };
    },

    /**
     * Attention Visualization
     * Extract and visualize attention weights
     */
    visualizeAttention: function(attentionWeights, inputTokens) {
        // Normalize attention for visualization
        const normalized = attentionWeights.map(row => {
            const sum = row.reduce((a, b) => a + b, 0) || 1;
            return row.map(w => w / sum);
        });

        // Create visualization data
        const visualization = [];
        for (let i = 0; i < inputTokens.length; i++) {
            for (let j = 0; j < inputTokens.length; j++) {
                visualization.push({
                    source: inputTokens[i],
                    target: inputTokens[j],
                    weight: normalized[i][j]
                });
            }
        }

        return {
            normalized,
            visualization,
            maxAttention: inputTokens.map((_, i) => {
                const row = normalized[i];
                const maxIdx = row.indexOf(Math.max(...row));
                return { token: inputTokens[maxIdx], weight: row[maxIdx] };
            })
        };
    },

    /**
     * Feature Importance via Permutation
     */
    permutationImportance: function(model, X, y, numPermutations = 10) {
        const n = X.length;
        const nFeatures = X[0].length;
        
        // Baseline score
        const baselinePreds = X.map(x => model(x));
        const baselineScore = this._accuracy(baselinePreds, y);

        const importance = [];

        for (let f = 0; f < nFeatures; f++) {
            let scoreSum = 0;

            for (let p = 0; p < numPermutations; p++) {
                // Create permuted dataset
                const permuted = X.map(x => [...x]);
                
                // Shuffle feature f
                const permutation = this._shuffle([...Array(n).keys()]);
                for (let i = 0; i < n; i++) {
                    permuted[i][f] = X[permutation[i]][f];
                }

                const permPreds = permuted.map(x => model(x));
                const permScore = this._accuracy(permPreds, y);
                scoreSum += baselineScore - permScore;
            }

            importance.push(scoreSum / numPermutations);
        }

        return { importance, baselineScore };
    },

    /**
     * Counterfactual Explanations
     * Find minimal changes to flip prediction
     */
    counterfactual: function(model, input, targetClass, maxIter = 100, stepSize = 0.1) {
        let current = [...input];
        const originalPred = model(input);
        const originalClass = originalPred.indexOf(Math.max(...originalPred));

        if (originalClass === targetClass) {
            return { found: true, counterfactual: input, changes: [] };
        }

        for (let iter = 0; iter < maxIter; iter++) {
            const pred = model(current);
            const currentClass = pred.indexOf(Math.max(...pred));

            if (currentClass === targetClass) {
                const changes = input.map((orig, i) => ({
                    feature: i,
                    original: orig,
                    counterfactual: current[i],
                    change: current[i] - orig
                })).filter(c => Math.abs(c.change) > 1e-6);

                return { found: true, counterfactual: current, changes };
            }

            // Gradient-based step toward target class
            const epsilon = 1e-5;
            for (let i = 0; i < current.length; i++) {
                const plus = [...current];
                const minus = [...current];
                plus[i] += epsilon;
                minus[i] -= epsilon;

                const gradPlus = model(plus)[targetClass];
                const gradMinus = model(minus)[targetClass];
                const gradient = (gradPlus - gradMinus) / (2 * epsilon);

                current[i] += stepSize * gradient;
            }
        }

        return { found: false, counterfactual: current, changes: [] };
    },

    // Helper functions
    _binomial: function(n, k) {
        if (k > n - k) k = n - k;
        let result = 1;
        for (let i = 0; i < k; i++) {
            result = result * (n - i) / (i + 1);
        }
        return result;
    },

    _shuffle: function(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    _accuracy: function(predictions, labels) {
        let correct = 0;
        for (let i = 0; i < predictions.length; i++) {
            const predClass = predictions[i].indexOf(Math.max(...predictions[i]));
            if (predClass === labels[i]) correct++;
        }
        return correct / predictions.length;
    }
}