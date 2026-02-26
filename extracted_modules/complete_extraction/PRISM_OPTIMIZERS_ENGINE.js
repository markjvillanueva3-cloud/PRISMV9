const PRISM_OPTIMIZERS_ENGINE = {
    name: 'PRISM_OPTIMIZERS_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Stanford CS 231N',

    /**
     * SGD with Momentum
     */
    createSGD: function(params = {}) {
        const { lr = 0.01, momentum = 0.9, nesterov = false, weightDecay = 0 } = params;
        const velocity = new Map();

        return {
            lr, momentum, nesterov, weightDecay,
            step: function(weights, gradients, paramId = 'default') {
                if (!velocity.has(paramId)) {
                    velocity.set(paramId, gradients.map(row => 
                        Array.isArray(row) ? row.map(() => 0) : 0));
                }

                const v = velocity.get(paramId);

                for (let i = 0; i < weights.length; i++) {
                    if (Array.isArray(weights[i])) {
                        for (let j = 0; j < weights[i].length; j++) {
                            const grad = gradients[i][j] + weightDecay * weights[i][j];
                            v[i][j] = momentum * v[i][j] - lr * grad;
                            if (nesterov) {
                                weights[i][j] += momentum * v[i][j] - lr * grad;
                            } else {
                                weights[i][j] += v[i][j];
                            }
                        }
                    } else {
                        const grad = gradients[i] + weightDecay * weights[i];
                        v[i] = momentum * v[i] - lr * grad;
                        weights[i] += nesterov ? momentum * v[i] - lr * grad : v[i];
                    }
                }
                return weights;
            }
        };
    },

    /**
     * Adam: Adaptive Moment Estimation
     */
    createAdam: function(params = {}) {
        const { lr = 0.001, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8, weightDecay = 0 } = params;
        const state = new Map();

        return {
            lr, beta1, beta2, epsilon, weightDecay, t: 0,
            step: function(weights, gradients, paramId = 'default') {
                this.t++;
                
                if (!state.has(paramId)) {
                    state.set(paramId, {
                        m: gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0),
                        v: gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0)
                    });
                }

                const { m, v } = state.get(paramId);
                const biasCorrect1 = 1 - Math.pow(beta1, this.t);
                const biasCorrect2 = 1 - Math.pow(beta2, this.t);

                for (let i = 0; i < weights.length; i++) {
                    if (Array.isArray(weights[i])) {
                        for (let j = 0; j < weights[i].length; j++) {
                            const grad = gradients[i][j] + weightDecay * weights[i][j];
                            m[i][j] = beta1 * m[i][j] + (1 - beta1) * grad;
                            v[i][j] = beta2 * v[i][j] + (1 - beta2) * grad * grad;
                            const mHat = m[i][j] / biasCorrect1;
                            const vHat = v[i][j] / biasCorrect2;
                            weights[i][j] -= lr * mHat / (Math.sqrt(vHat) + epsilon);
                        }
                    } else {
                        const grad = gradients[i] + weightDecay * weights[i];
                        m[i] = beta1 * m[i] + (1 - beta1) * grad;
                        v[i] = beta2 * v[i] + (1 - beta2) * grad * grad;
                        const mHat = m[i] / biasCorrect1;
                        const vHat = v[i] / biasCorrect2;
                        weights[i] -= lr * mHat / (Math.sqrt(vHat) + epsilon);
                    }
                }
                return weights;
            }
        };
    },

    /**
     * AdamW: Adam with Decoupled Weight Decay
     */
    createAdamW: function(params = {}) {
        const { lr = 0.001, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8, weightDecay = 0.01 } = params;
        const state = new Map();

        return {
            lr, beta1, beta2, epsilon, weightDecay, t: 0,
            step: function(weights, gradients, paramId = 'default') {
                this.t++;

                if (!state.has(paramId)) {
                    state.set(paramId, {
                        m: gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0),
                        v: gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0)
                    });
                }

                const { m, v } = state.get(paramId);
                const biasCorrect1 = 1 - Math.pow(beta1, this.t);
                const biasCorrect2 = 1 - Math.pow(beta2, this.t);

                for (let i = 0; i < weights.length; i++) {
                    if (Array.isArray(weights[i])) {
                        for (let j = 0; j < weights[i].length; j++) {
                            // Decoupled weight decay
                            weights[i][j] -= lr * weightDecay * weights[i][j];
                            
                            const grad = gradients[i][j];
                            m[i][j] = beta1 * m[i][j] + (1 - beta1) * grad;
                            v[i][j] = beta2 * v[i][j] + (1 - beta2) * grad * grad;
                            const mHat = m[i][j] / biasCorrect1;
                            const vHat = v[i][j] / biasCorrect2;
                            weights[i][j] -= lr * mHat / (Math.sqrt(vHat) + epsilon);
                        }
                    } else {
                        weights[i] -= lr * weightDecay * weights[i];
                        const grad = gradients[i];
                        m[i] = beta1 * m[i] + (1 - beta1) * grad;
                        v[i] = beta2 * v[i] + (1 - beta2) * grad * grad;
                        const mHat = m[i] / biasCorrect1;
                        const vHat = v[i] / biasCorrect2;
                        weights[i] -= lr * mHat / (Math.sqrt(vHat) + epsilon);
                    }
                }
                return weights;
            }
        };
    },

    /**
     * NAdam: Nesterov-accelerated Adam
     */
    createNAdam: function(params = {}) {
        const { lr = 0.001, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8 } = params;
        const state = new Map();

        return {
            lr, beta1, beta2, epsilon, t: 0,
            step: function(weights, gradients, paramId = 'default') {
                this.t++;

                if (!state.has(paramId)) {
                    state.set(paramId, {
                        m: gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0),
                        v: gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0)
                    });
                }

                const { m, v } = state.get(paramId);
                const biasCorrect1 = 1 - Math.pow(beta1, this.t);
                const biasCorrect2 = 1 - Math.pow(beta2, this.t);

                for (let i = 0; i < weights.length; i++) {
                    if (Array.isArray(weights[i])) {
                        for (let j = 0; j < weights[i].length; j++) {
                            const grad = gradients[i][j];
                            m[i][j] = beta1 * m[i][j] + (1 - beta1) * grad;
                            v[i][j] = beta2 * v[i][j] + (1 - beta2) * grad * grad;
                            
                            const mHat = m[i][j] / biasCorrect1;
                            const vHat = v[i][j] / biasCorrect2;
                            
                            // Nesterov momentum
                            const mNesterov = beta1 * mHat + (1 - beta1) * grad / biasCorrect1;
                            weights[i][j] -= lr * mNesterov / (Math.sqrt(vHat) + epsilon);
                        }
                    } else {
                        const grad = gradients[i];
                        m[i] = beta1 * m[i] + (1 - beta1) * grad;
                        v[i] = beta2 * v[i] + (1 - beta2) * grad * grad;
                        const mHat = m[i] / biasCorrect1;
                        const vHat = v[i] / biasCorrect2;
                        const mNesterov = beta1 * mHat + (1 - beta1) * grad / biasCorrect1;
                        weights[i] -= lr * mNesterov / (Math.sqrt(vHat) + epsilon);
                    }
                }
                return weights;
            }
        };
    },

    /**
     * RMSprop
     */
    createRMSprop: function(params = {}) {
        const { lr = 0.01, alpha = 0.99, epsilon = 1e-8, momentum = 0, centered = false } = params;
        const state = new Map();

        return {
            lr, alpha, epsilon, momentum, centered,
            step: function(weights, gradients, paramId = 'default') {
                if (!state.has(paramId)) {
                    state.set(paramId, {
                        v: gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0),
                        g: centered ? gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0) : null,
                        buf: momentum > 0 ? gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0) : null
                    });
                }

                const s = state.get(paramId);

                for (let i = 0; i < weights.length; i++) {
                    if (Array.isArray(weights[i])) {
                        for (let j = 0; j < weights[i].length; j++) {
                            const grad = gradients[i][j];
                            s.v[i][j] = alpha * s.v[i][j] + (1 - alpha) * grad * grad;
                            
                            let avg = s.v[i][j];
                            if (centered) {
                                s.g[i][j] = alpha * s.g[i][j] + (1 - alpha) * grad;
                                avg = s.v[i][j] - s.g[i][j] * s.g[i][j];
                            }
                            
                            if (momentum > 0) {
                                s.buf[i][j] = momentum * s.buf[i][j] + grad / (Math.sqrt(avg) + epsilon);
                                weights[i][j] -= lr * s.buf[i][j];
                            } else {
                                weights[i][j] -= lr * grad / (Math.sqrt(avg) + epsilon);
                            }
                        }
                    }
                }
                return weights;
            }
        };
    },

    /**
     * AdaGrad
     */
    createAdaGrad: function(params = {}) {
        const { lr = 0.01, epsilon = 1e-10 } = params;
        const state = new Map();

        return {
            lr, epsilon,
            step: function(weights, gradients, paramId = 'default') {
                if (!state.has(paramId)) {
                    state.set(paramId, {
                        sum: gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0)
                    });
                }

                const { sum } = state.get(paramId);

                for (let i = 0; i < weights.length; i++) {
                    if (Array.isArray(weights[i])) {
                        for (let j = 0; j < weights[i].length; j++) {
                            const grad = gradients[i][j];
                            sum[i][j] += grad * grad;
                            weights[i][j] -= lr * grad / (Math.sqrt(sum[i][j]) + epsilon);
                        }
                    } else {
                        const grad = gradients[i];
                        sum[i] += grad * grad;
                        weights[i] -= lr * grad / (Math.sqrt(sum[i]) + epsilon);
                    }
                }
                return weights;
            }
        };
    },

    /**
     * AdaDelta
     */
    createAdaDelta: function(params = {}) {
        const { rho = 0.9, epsilon = 1e-6 } = params;
        const state = new Map();

        return {
            rho, epsilon,
            step: function(weights, gradients, paramId = 'default') {
                if (!state.has(paramId)) {
                    state.set(paramId, {
                        accGrad: gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0),
                        accDelta: gradients.map(row => Array.isArray(row) ? row.map(() => 0) : 0)
                    });
                }

                const { accGrad, accDelta } = state.get(paramId);

                for (let i = 0; i < weights.length; i++) {
                    if (Array.isArray(weights[i])) {
                        for (let j = 0; j < weights[i].length; j++) {
                            const grad = gradients[i][j];
                            accGrad[i][j] = rho * accGrad[i][j] + (1 - rho) * grad * grad;
                            
                            const delta = -Math.sqrt(accDelta[i][j] + epsilon) / 
                                          Math.sqrt(accGrad[i][j] + epsilon) * grad;
                            
                            accDelta[i][j] = rho * accDelta[i][j] + (1 - rho) * delta * delta;
                            weights[i][j] += delta;
                        }
                    }
                }
                return weights;
            }
        };
    }
}