// PRISM_NORMALIZATION_COMPLETE - Lines 907309-907372 (64 lines) - Normalization complete\n\nconst PRISM_NORMALIZATION_COMPLETE = {
    name: 'PRISM Normalization Complete',
    version: '1.0.0',
    
    InstanceNorm: {
        create: function(numFeatures, epsilon = 1e-5, affine = true) {
            return { numFeatures, epsilon, affine, gamma: affine ? Array(numFeatures).fill(1) : null, beta: affine ? Array(numFeatures).fill(0) : null };
        },
        forward: function(params, x) {
            return { output: x.map(sample => {
                const mean = sample.reduce((a, v) => a + v, 0) / sample.length;
                const variance = sample.reduce((a, v) => a + (v - mean) ** 2, 0) / sample.length;
                return sample.map((v, i) => {
                    const norm = (v - mean) / Math.sqrt(variance + params.epsilon);
                    return params.affine ? params.gamma[i % params.numFeatures] * norm + params.beta[i % params.numFeatures] : norm;
                });
            }), cache: { x } };
        }
    },
    
    GroupNorm: {
        create: function(numGroups, numChannels, epsilon = 1e-5) {
            if (numChannels % numGroups !== 0) throw new Error('numChannels must be divisible by numGroups');
            return { numGroups, numChannels, channelsPerGroup: numChannels / numGroups, epsilon, gamma: Array(numChannels).fill(1), beta: Array(numChannels).fill(0) };
        },
        forward: function(params, x) {
            return { output: x.map(sample => {
                const normalized = Array(params.numChannels).fill(0);
                for (let g = 0; g < params.numGroups; g++) {
                    const startIdx = g * params.channelsPerGroup;
                    const endIdx = startIdx + params.channelsPerGroup;
                    const groupValues = sample.slice(startIdx, endIdx);
                    const mean = groupValues.reduce((a, v) => a + v, 0) / params.channelsPerGroup;
                    const variance = groupValues.reduce((a, v) => a + (v - mean) ** 2, 0) / params.channelsPerGroup;
                    for (let c = startIdx; c < endIdx; c++) {
                        const norm = (sample[c] - mean) / Math.sqrt(variance + params.epsilon);
                        normalized[c] = params.gamma[c] * norm + params.beta[c];
                    }
                }
                return normalized;
            }), cache: { x } };
        }
    },
    
    RMSNorm: {
        create: function(dim, epsilon = 1e-6) { return { dim, epsilon, gamma: Array(dim).fill(1) }; },
        forward: function(params, x) {
            return { output: x.map(sample => {
                const rms = Math.sqrt(sample.reduce((a, v) => a + v * v, 0) / sample.length + params.epsilon);
                return sample.map((v, i) => (v / rms) * params.gamma[i]);
            }), cache: { x } };
        }
    },
    
    WeightStandardization: {
        standardize: function(W, epsilon = 1e-5) {
            return W.map(row => {
                const mean = row.reduce((a, v) => a + v, 0) / row.length;
                const variance = row.reduce((a, v) => a + (v - mean) ** 2, 0) / row.length;
                return row.map(v => (v - mean) / Math.sqrt(variance + epsilon));
            });
        }
    }
};
