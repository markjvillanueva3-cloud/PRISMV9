/**
 * PRISM_ENSEMBLE_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * References: 6
 * Lines: 253
 * Session: R2.3.1 Wave 3 Engine Gap Extraction
 */

const PRISM_ENSEMBLE_ENGINE = {
    name: 'PRISM_ENSEMBLE_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 229, MIT 6.036',

    /**
     * Bagging (Bootstrap Aggregating)
     */
    bagging: function(baseModelCreator, X, y, numModels = 10, sampleRatio = 1.0) {
        const n = X.length;
        const sampleSize = Math.floor(n * sampleRatio);
        const models = [];

        for (let i = 0; i < numModels; i++) {
            // Bootstrap sample
            const indices = [];
            for (let j = 0; j < sampleSize; j++) {
                indices.push(Math.floor(Math.random() * n));
            }
            
            const Xsample = indices.map(idx => X[idx]);
            const ysample = indices.map(idx => y[idx]);

            // Train model
            const model = baseModelCreator();
            model.fit(Xsample, ysample);
            models.push(model);
        }

        return {
            models,
            predict: function(x) {
                const predictions = models.map(m => m.predict(x));
                // Classification: majority vote
                if (typeof predictions[0] === 'number' && Number.isInteger(predictions[0])) {
                    const counts = {};
                    for (const p of predictions) {
                        counts[p] = (counts[p] || 0) + 1;
                    }
                    return parseInt(Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b));
                }
                // Regression: average
                return predictions.reduce((a, b) => a + b, 0) / predictions.length;
            },
            predictProba: function(x) {
                const probas = models.map(m => m.predictProba ? m.predictProba(x) : [m.predict(x)]);
                // Average probabilities
                const numClasses = probas[0].length;
                const avgProba = Array(numClasses).fill(0);
                for (const p of probas) {
                    for (let c = 0; c < numClasses; c++) {
                        avgProba[c] += p[c];
                    }
                }
                return avgProba.map(p => p / numModels);
            }
        };
    },

    /**
     * AdaBoost (Adaptive Boosting)
     */
    adaBoost: function(baseModelCreator, X, y, numModels = 50) {
        const n = X.length;
        let weights = Array(n).fill(1 / n);
        const models = [];
        const alphas = [];

        for (let m = 0; m < numModels; m++) {
            // Train weak learner with weighted samples
            const model = baseModelCreator();
            model.fit(X, y, weights);

            // Get predictions and calculate error
            let weightedError = 0;
            const predictions = X.map(x => model.predict(x));
            
            for (let i = 0; i < n; i++) {
                if (predictions[i] !== y[i]) {
                    weightedError += weights[i];
                }
            }

            // Calculate alpha
            if (weightedError >= 0.5) break;
            const alpha = 0.5 * Math.log((1 - weightedError) / (weightedError + 1e-10));
            
            // Update weights
            for (let i = 0; i < n; i++) {
                if (predictions[i] !== y[i]) {
                    weights[i] *= Math.exp(alpha);
                } else {
                    weights[i] *= Math.exp(-alpha);
                }
            }
            
            // Normalize weights
            const weightSum = weights.reduce((a, b) => a + b, 0);
            weights = weights.map(w => w / weightSum);

            models.push(model);
            alphas.push(alpha);
        }

        return {
            models,
            alphas,
            predict: function(x) {
                const weightedVotes = {};
                for (let m = 0; m < models.length; m++) {
                    const pred = models[m].predict(x);
                    weightedVotes[pred] = (weightedVotes[pred] || 0) + alphas[m];
                }
                return parseInt(Object.keys(weightedVotes).reduce((a, b) =>
                    weightedVotes[a] > weightedVotes[b] ? a : b));
            }
        };
    },

    /**
     * Gradient Boosting (simplified)
     */
    gradientBoosting: function(baseModelCreator, X, y, numModels = 100, learningRate = 0.1) {
        const n = X.length;
        const models = [];
        
        // Initialize with mean
        const mean = y.reduce((a, b) => a + b, 0) / n;
        let predictions = Array(n).fill(mean);

        for (let m = 0; m < numModels; m++) {
            // Compute residuals
            const residuals = y.map((yi, i) => yi - predictions[i]);

            // Fit model to residuals
            const model = baseModelCreator();
            model.fit(X, residuals);
            models.push(model);

            // Update predictions
            for (let i = 0; i < n; i++) {
                predictions[i] += learningRate * model.predict(X[i]);
            }
        }

        return {
            models,
            mean,
            learningRate,
            predict: function(x) {
                let pred = this.mean;
                for (const model of this.models) {
                    pred += this.learningRate * model.predict(x);
                }
                return pred;
            }
        };
    },

    /**
     * Stacking (Meta-learning)
     */
    stacking: function(baseModels, metaModelCreator, X, y, cv = 5) {
        const n = X.length;
        const numBaseModels = baseModels.length;
        const foldSize = Math.floor(n / cv);
        
        // Generate meta-features through cross-validation
        const metaFeatures = Array.from({ length: n }, () => Array(numBaseModels).fill(0));
        
        for (let fold = 0; fold < cv; fold++) {
            const valStart = fold * foldSize;
            const valEnd = fold === cv - 1 ? n : (fold + 1) * foldSize;
            
            // Split data
            const trainIdx = [], valIdx = [];
            for (let i = 0; i < n; i++) {
                if (i >= valStart && i < valEnd) {
                    valIdx.push(i);
                } else {
                    trainIdx.push(i);
                }
            }
            
            const Xtrain = trainIdx.map(i => X[i]);
            const ytrain = trainIdx.map(i => y[i]);
            
            // Train each base model and predict on validation
            for (let m = 0; m < numBaseModels; m++) {
                const model = baseModels[m]();
                model.fit(Xtrain, ytrain);
                
                for (const i of valIdx) {
                    metaFeatures[i][m] = model.predict(X[i]);
                }
            }
        }
        
        // Train base models on full data
        const trainedBaseModels = baseModels.map(creator => {
            const model = creator();
            model.fit(X, y);
            return model;
        });
        
        // Train meta-model
        const metaModel = metaModelCreator();
        metaModel.fit(metaFeatures, y);
        
        return {
            baseModels: trainedBaseModels,
            metaModel,
            predict: function(x) {
                const basePreds = this.baseModels.map(m => m.predict(x));
                return this.metaModel.predict(basePreds);
            }
        };
    },

    /**
     * Voting Ensemble (simple)
     */
    voting: function(models, weights = null, type = 'hard') {
        weights = weights || Array(models.length).fill(1 / models.length);

        return {
            models,
            weights,
            predict: function(x) {
                if (type === 'hard') {
                    const votes = {};
                    for (let i = 0; i < models.length; i++) {
                        const pred = models[i].predict(x);
                        votes[pred] = (votes[pred] || 0) + weights[i];
                    }
                    return Object.keys(votes).reduce((a, b) => votes[a] > votes[b] ? a : b);
                } else { // soft voting
                    const probas = models.map(m => m.predictProba(x));
                    const numClasses = probas[0].length;
                    const weighted = Array(numClasses).fill(0);
                    
                    for (let i = 0; i < models.length; i++) {
                        for (let c = 0; c < numClasses; c++) {
                            weighted[c] += weights[i] * probas[i][c];
                        }
                    }
                    
                    return weighted.indexOf(Math.max(...weighted));
                }
            }
        };
    }
}