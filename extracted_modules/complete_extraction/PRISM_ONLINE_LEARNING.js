const PRISM_ONLINE_LEARNING = {

    learningRateSchedulers: {
        constant: (baseLR, step) => baseLR,
        stepDecay: (baseLR, step, decayRate = 0.9, decaySteps = 100) =>
            baseLR * Math.pow(decayRate, Math.floor(step / decaySteps)),
        exponential: (baseLR, step, decayRate = 0.995) =>
            baseLR * Math.pow(decayRate, step),
        cosineAnnealing: (baseLR, step, totalSteps = 1000, minLR = 0.0001) =>
            minLR + (baseLR - minLR) * (1 + Math.cos(Math.PI * step / totalSteps)) / 2
    },
    /**
     * Incremental fit - update model with single sample
     */
    incrementalFit: function(model, input, target, learningRate = 0.001) {
        // Forward pass
        let current = input;
        for (const layer of model.layers) {
            current = layer.forward(current);
        }
        // Compute loss gradient
        const output = current;
        const gradOutput = output.map((o, i) => o - target[i]);

        // Backward pass
        let grad = gradOutput;
        for (let i = model.layers.length - 1; i >= 0; i--) {
            grad = model.layers[i].backward(grad, learningRate);
        }
        // Compute loss for reporting
        const loss = output.reduce((sum, o, i) => sum + Math.pow(o - target[i], 2), 0) / output.length;

        return { loss, prediction: output };
    },
    /**
     * Online learning with experience replay
     */
    onlineLearnWithReplay: function(model, newSample, replayBuffer, config = {}) {
        const {
            bufferSize = 1000,
            batchSize = 32,
            replayRatio = 0.5,
            learningRate = 0.001
        } = config;

        // Add new sample to buffer
        replayBuffer.push(newSample);
        if (replayBuffer.length > bufferSize) {
            replayBuffer.shift();
        }
        // Learn from new sample
        let totalLoss = this.incrementalFit(model, newSample.input, newSample.target, learningRate).loss;
        let count = 1;

        // Replay from buffer
        const replayCount = Math.floor(batchSize * replayRatio);
        for (let i = 0; i < replayCount && replayBuffer.length > 1; i++) {
            const idx = Math.floor(Math.random() * replayBuffer.length);
            const sample = replayBuffer[idx];
            totalLoss += this.incrementalFit(model, sample.input, sample.target, learningRate * 0.5).loss;
            count++;
        }
        return { avgLoss: totalLoss / count, bufferSize: replayBuffer.length };
    },
    /**
     * Elastic Weight Consolidation (EWC) for catastrophic forgetting prevention
     */
    elasticWeightConsolidation: function(model, fisherMatrix, lambda = 1000) {
        // Fisher matrix approximates importance of each weight
        // Penalize changes to important weights

        const ewcLoss = (currentWeights, originalWeights) => {
            let loss = 0;
            for (let i = 0; i < currentWeights.length; i++) {
                const diff = currentWeights[i] - originalWeights[i];
                loss += fisherMatrix[i] * diff * diff;
            }
            return lambda * loss / 2;
        };
        return ewcLoss;
    },
    /**
     * Compute Fisher Information Matrix (diagonal approximation)
     */
    computeFisherMatrix: function(model, dataset, samples = 100) {
        const fisher = [];

        // Initialize fisher values
        for (const layer of model.layers) {
            if (layer.weights) {
                const flat = PRISM_TENSOR_ENHANCED.flatten(layer.weights);
                fisher.push(...Array(flat.length).fill(0));
            }
        }
        // Compute empirical Fisher
        const sampleCount = Math.min(samples, dataset.length);
        for (let s = 0; s < sampleCount; s++) {
            const idx = Math.floor(Math.random() * dataset.length);
            const { input, target } = dataset[idx];

            // Forward pass
            let current = input;
            for (const layer of model.layers) {
                current = layer.forward(current);
            }
            // Backward pass to get gradients
            const gradOutput = current.map((o, i) => o - target[i]);
            let grad = gradOutput;

            let fisherIdx = 0;
            for (let i = model.layers.length - 1; i >= 0; i--) {
                const layer = model.layers[i];
                grad = layer.backward(grad, 0); // LR=0 to just compute gradients

                // Accumulate squared gradients
                if (layer.weights) {
                    const flat = PRISM_TENSOR_ENHANCED.flatten(layer.weights);
                    for (let j = 0; j < flat.length; j++) {
                        // Use gradient from Adam state if available
                        const g = layer.mW ? PRISM_TENSOR_ENHANCED.flatten(layer.mW)[j] : 0;
                        fisher[fisherIdx + j] += g * g;
                    }
                    fisherIdx += flat.length;
                }
            }
        }
        // Normalize
        return fisher.map(f => f / sampleCount);
    }
}