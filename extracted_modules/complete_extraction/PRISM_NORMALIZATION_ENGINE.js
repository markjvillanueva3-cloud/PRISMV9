const PRISM_NORMALIZATION_ENGINE = {
    name: 'PRISM_NORMALIZATION_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Stanford CS 231N',

    /**
     * Batch Normalization
     * Normalize over batch dimension
     */
    batchNorm: function(batch, params = {}) {
        const { gamma = null, beta = null, epsilon = 1e-5, momentum = 0.1, training = true } = params;
        const batchSize = batch.length;
        const featureDim = batch[0].length;

        // Compute batch mean and variance
        const mean = Array(featureDim).fill(0);
        const variance = Array(featureDim).fill(0);

        for (const sample of batch) {
            for (let j = 0; j < featureDim; j++) {
                mean[j] += sample[j];
            }
        }
        for (let j = 0; j < featureDim; j++) {
            mean[j] /= batchSize;
        }

        for (const sample of batch) {
            for (let j = 0; j < featureDim; j++) {
                variance[j] += (sample[j] - mean[j]) ** 2;
            }
        }
        for (let j = 0; j < featureDim; j++) {
            variance[j] /= batchSize;
        }

        // Normalize
        const normalized = batch.map(sample =>
            sample.map((x, j) => {
                const xHat = (x - mean[j]) / Math.sqrt(variance[j] + epsilon);
                const g = gamma ? gamma[j] : 1;
                const b = beta ? beta[j] : 0;
                return g * xHat + b;
            })
        );

        return { output: normalized, mean, variance };
    },

    /**
     * Layer Normalization
     * Normalize over feature dimension (per sample)
     */
    layerNorm: function(x, params = {}) {
        const { gamma = null, beta = null, epsilon = 1e-5 } = params;

        const mean = x.reduce((s, v) => s + v, 0) / x.length;
        const variance = x.reduce((s, v) => s + (v - mean) ** 2, 0) / x.length;

        return x.map((v, i) => {
            const xHat = (v - mean) / Math.sqrt(variance + epsilon);
            const g = gamma ? gamma[i] : 1;
            const b = beta ? beta[i] : 0;
            return g * xHat + b;
        });
    },

    /**
     * Instance Normalization
     * For style transfer, normalize each channel per instance
     */
    instanceNorm: function(x, channels, params = {}) {
        const { gamma = null, beta = null, epsilon = 1e-5 } = params;
        const channelSize = x.length / channels;
        const output = [];

        for (let c = 0; c < channels; c++) {
            const start = c * channelSize;
            const end = start + channelSize;
            const channelData = x.slice(start, end);

            const mean = channelData.reduce((s, v) => s + v, 0) / channelSize;
            const variance = channelData.reduce((s, v) => s + (v - mean) ** 2, 0) / channelSize;

            for (let i = 0; i < channelSize; i++) {
                const xHat = (channelData[i] - mean) / Math.sqrt(variance + epsilon);
                const g = gamma ? gamma[c] : 1;
                const b = beta ? beta[c] : 0;
                output.push(g * xHat + b);
            }
        }

        return output;
    },

    /**
     * Group Normalization
     * Compromise between batch and layer norm
     */
    groupNorm: function(x, numGroups, channels, params = {}) {
        const { gamma = null, beta = null, epsilon = 1e-5 } = params;
        const channelsPerGroup = channels / numGroups;
        const spatialSize = x.length / channels;
        const output = new Array(x.length);

        for (let g = 0; g < numGroups; g++) {
            // Collect all elements in this group
            const groupElements = [];
            for (let c = g * channelsPerGroup; c < (g + 1) * channelsPerGroup; c++) {
                for (let s = 0; s < spatialSize; s++) {
                    groupElements.push(x[c * spatialSize + s]);
                }
            }

            const mean = groupElements.reduce((s, v) => s + v, 0) / groupElements.length;
            const variance = groupElements.reduce((s, v) => s + (v - mean) ** 2, 0) / groupElements.length;

            let idx = 0;
            for (let c = g * channelsPerGroup; c < (g + 1) * channelsPerGroup; c++) {
                for (let s = 0; s < spatialSize; s++) {
                    const i = c * spatialSize + s;
                    const xHat = (x[i] - mean) / Math.sqrt(variance + epsilon);
                    const gc = gamma ? gamma[c] : 1;
                    const bc = beta ? beta[c] : 0;
                    output[i] = gc * xHat + bc;
                    idx++;
                }
            }
        }

        return output;
    },

    /**
     * RMS Normalization (used in LLaMA, T5)
     */
    rmsNorm: function(x, params = {}) {
        const { gamma = null, epsilon = 1e-6 } = params;
        const rms = Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length + epsilon);
        
        return x.map((v, i) => {
            const g = gamma ? gamma[i] : 1;
            return g * v / rms;
        });
    }
}