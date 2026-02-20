const PRISM_ENSEMBLE_METHODS = {
    name: 'PRISM Ensemble Methods',
    version: '1.0.0',
    
    Bagging: {
        bootstrapSample: function(X, y, sampleRatio = 1.0) {
            const n = X.length, sampleSize = Math.floor(n * sampleRatio);
            const indices = Array(sampleSize).fill(0).map(() => Math.floor(Math.random() * n));
            return { X: indices.map(i => X[i]), y: indices.map(i => y[i]), oobIndices: [...Array(n).keys()].filter(i => !indices.includes(i)) };
        },
        
        train: function(baseModelTrainer, X, y, nEstimators = 10) {
            const models = [], oobPredictions = Array(X.length).fill(null).map(() => []);
            for (let i = 0; i < nEstimators; i++) {
                const { X: Xb, y: yb, oobIndices } = this.bootstrapSample(X, y);
                const model = baseModelTrainer(Xb, yb);
                models.push(model);
                if (model.predict) {
                    for (const idx of oobIndices) oobPredictions[idx].push(model.predict(X[idx]));
                }
            }
            let oobCorrect = 0, oobCount = 0;
            for (let i = 0; i < X.length; i++) {
                if (oobPredictions[i].length > 0) {
                    const votes = {};
                    for (const pred of oobPredictions[i]) votes[pred] = (votes[pred] || 0) + 1;
                    if (String(Object.entries(votes).reduce((a, b) => a[1] > b[1] ? a : b)[0]) === String(y[i])) oobCorrect++;
                    oobCount++;
                }
            }
            return { models, oobScore: oobCount > 0 ? oobCorrect / oobCount : null, nEstimators };
        },
        
        predict: function(ensemble, x, aggregation = 'vote') {
            const predictions = ensemble.models.map(m => m.predict(x));
            if (aggregation === 'vote') {
                const votes = {};
                for (const pred of predictions) votes[pred] = (votes[pred] || 0) + 1;
                return Object.entries(votes).reduce((a, b) => a[1] > b[1] ? a : b)[0];
            }
            return predictions.reduce((a, b) => a + b, 0) / predictions.length;
        }
    },
    
    GradientBoosting: {
        DecisionStump: {
            train: function(X, residuals, weights) {
                const n = X.length, p = X[0].length;
                let bestSplit = { feature: 0, threshold: 0, leftVal: 0, rightVal: 0, loss: Infinity };
                
                for (let f = 0; f < p; f++) {
                    const values = [...new Set(X.map(x => x[f]))].sort((a, b) => a - b);
                    for (let t = 0; t < values.length - 1; t++) {
                        const threshold = (values[t] + values[t + 1]) / 2;
                        let leftSum = 0, leftWeight = 0, rightSum = 0, rightWeight = 0;
                        for (let i = 0; i < n; i++) {
                            const w = weights ? weights[i] : 1;
                            if (X[i][f] <= threshold) { leftSum += w * residuals[i]; leftWeight += w; }
                            else { rightSum += w * residuals[i]; rightWeight += w; }
                        }
                        const leftVal = leftWeight > 0 ? leftSum / leftWeight : 0;
                        const rightVal = rightWeight > 0 ? rightSum / rightWeight : 0;
                        let loss = 0;
                        for (let i = 0; i < n; i++) {
                            const pred = X[i][f] <= threshold ? leftVal : rightVal;
                            const w = weights ? weights[i] : 1;
                            loss += w * (residuals[i] - pred) ** 2;
                        }
                        if (loss < bestSplit.loss) bestSplit = { feature: f, threshold, leftVal, rightVal, loss };
                    }
                }
                return bestSplit;
            },
            predict: function(stump, x) { return x[stump.feature] <= stump.threshold ? stump.leftVal : stump.rightVal; }
        },
        
        train: function(X, y, config = {}) {
            const { nEstimators = 100, learningRate = 0.1 } = config;
            const n = y.length;
            const initialPrediction = y.reduce((a, b) => a + b, 0) / n;
            let predictions = Array(n).fill(initialPrediction);
            const estimators = [];
            
            for (let m = 0; m < nEstimators; m++) {
                const residuals = y.map((yi, i) => yi - predictions[i]);
                const stump = this.DecisionStump.train(X, residuals, null);
                estimators.push(stump);
                for (let i = 0; i < n; i++) predictions[i] += learningRate * this.DecisionStump.predict(stump, X[i]);
            }
            return { estimators, initialPrediction, learningRate };
        },
        
        predict: function(model, x) {
            let pred = model.initialPrediction;
            for (const stump of model.estimators) pred += model.learningRate * this.DecisionStump.predict(stump, x);
            return pred;
        }
    }
}