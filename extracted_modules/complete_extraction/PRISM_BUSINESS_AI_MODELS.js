const PRISM_BUSINESS_AI_MODELS = {

    jobDelayPredictor: null,
    costVariancePredictor: null,
    demandForecaster: null,

    /**
     * Job Delay Predictor - predicts likelihood of job being late
     */
    createJobDelayModel: function() {
        if (typeof PRISM_NEURAL_NETWORK === 'undefined') {
            (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM Business AI] Neural network engine not loaded');
            return null;
        }
        console.log('[PRISM Business AI] Training Job Delay Predictor...');

        const model = new PRISM_NEURAL_NETWORK.Sequential('JobDelayPredictor');
        model.add(new PRISM_NN_LAYERS.Dense(6, 12, 'relu'));
        model.add(new PRISM_NN_LAYERS.Dense(12, 2, 'softmax'));
        model.compile({ loss: 'crossentropy', learningRate: 0.01 });

        // Training data: [complexity, qty, daysToDelivery, shopLoad, materialReady, programmingDone]
        const { X, y } = this._generateDelayData(400);
        model.fit(X, y, { epochs: 30, verbose: false });

        this.jobDelayPredictor = model;
        console.log('[PRISM Business AI] Job Delay Predictor ready');
        return model;
    },
    _generateDelayData: function(n) {
        const X = [], y = [];
        for (let i = 0; i < n; i++) {
            const complexity = Math.random();
            const qty = Math.random();
            const daysToDelivery = Math.random();
            const shopLoad = Math.random();
            const materialReady = Math.random() > 0.3 ? 1 : 0;
            const programmingDone = Math.random() > 0.4 ? 1 : 0;

            X.push([complexity, qty, daysToDelivery, shopLoad, materialReady, programmingDone]);

            // Delay likelihood based on factors
            const delayScore = complexity * 0.25 + qty * 0.15 - daysToDelivery * 0.3 +
                              shopLoad * 0.2 - materialReady * 0.1 - programmingDone * 0.1;

            if (delayScore > 0.3) y.push([0, 1]); // Likely delayed
            else y.push([1, 0]); // On time
        }
        return { X, y };
    },
    /**
     * Cost Variance Predictor - predicts if job will be over/under budget
     */
    createCostVarianceModel: function() {
        if (typeof PRISM_NEURAL_NETWORK === 'undefined') return null;

        console.log('[PRISM Business AI] Training Cost Variance Predictor...');

        const model = new PRISM_NEURAL_NETWORK.Sequential('CostVariancePredictor');
        model.add(new PRISM_NN_LAYERS.Dense(5, 10, 'relu'));
        model.add(new PRISM_NN_LAYERS.Dense(10, 1, 'linear'));
        model.compile({ loss: 'mse', learningRate: 0.005 });

        const { X, y } = this._generateCostVarianceData(300);
        model.fit(X, y, { epochs: 40, verbose: false });

        this.costVariancePredictor = model;
        console.log('[PRISM Business AI] Cost Variance Predictor ready');
        return model;
    },
    _generateCostVarianceData: function(n) {
        const X = [], y = [];
        for (let i = 0; i < n; i++) {
            const complexity = Math.random();
            const newCustomer = Math.random() > 0.7 ? 1 : 0;
            const newMaterial = Math.random() > 0.8 ? 1 : 0;
            const histAccuracy = 0.8 + Math.random() * 0.2; // Historical estimate accuracy
            const setupChanges = Math.random();

            X.push([complexity, newCustomer, newMaterial, histAccuracy, setupChanges]);

            // Variance: positive = over budget, negative = under budget
            const variance = (complexity * 0.2 + newCustomer * 0.1 + newMaterial * 0.15 +
                            setupChanges * 0.1 - histAccuracy * 0.3) * 0.5;
            y.push([variance]);
        }
        return { X, y };
    },
    /**
     * Predict job delay
     */
    predictDelay: function(input) {
        if (!this.jobDelayPredictor) this.createJobDelayModel();
        if (!this.jobDelayPredictor) return { error: 'Model not available' };

        const output = this.jobDelayPredictor.predict(input);
        return {
            onTime: output[0],
            delayed: output[1],
            prediction: output[0] > output[1] ? 'On Time' : 'At Risk',
            confidence: Math.max(output[0], output[1]),
            recommendation: output[1] > 0.5 ?
                'Consider expediting material or adding capacity' :
                'Job is on track for on-time delivery'
        };
    },
    /**
     * Predict cost variance
     */
    predictCostVariance: function(input) {
        if (!this.costVariancePredictor) this.createCostVarianceModel();
        if (!this.costVariancePredictor) return { error: 'Model not available' };

        const output = this.costVariancePredictor.predict(input);
        const variance = output[0];

        return {
            expectedVariance: (variance * 100).toFixed(1) + '%',
            direction: variance > 0.05 ? 'Over Budget' : variance < -0.05 ? 'Under Budget' : 'On Budget',
            recommendation: variance > 0.1 ?
                'High risk of cost overrun - review estimate assumptions' :
                'Cost estimate appears reasonable'
        };
    }
}