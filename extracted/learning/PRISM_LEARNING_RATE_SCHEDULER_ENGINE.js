// PRISM_LEARNING_RATE_SCHEDULER_ENGINE - Lines 943805-943973 (169 lines) - Learning rate scheduler\n\nconst PRISM_LEARNING_RATE_SCHEDULER_ENGINE = {
    name: 'PRISM_LEARNING_RATE_SCHEDULER_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Stanford CS 231N',

    /**
     * Step Decay
     */
    createStepDecay: function(initialLR, decayFactor = 0.1, decayEvery = 30) {
        return {
            getLR: function(epoch) {
                return initialLR * Math.pow(decayFactor, Math.floor(epoch / decayEvery));
            }
        };
    },

    /**
     * Exponential Decay
     */
    createExponentialDecay: function(initialLR, decayRate = 0.96) {
        return {
            getLR: function(step) {
                return initialLR * Math.pow(decayRate, step / 1000);
            }
        };
    },

    /**
     * Cosine Annealing
     */
    createCosineAnnealing: function(initialLR, minLR = 0, totalSteps = 1000) {
        return {
            getLR: function(step) {
                return minLR + 0.5 * (initialLR - minLR) * 
                       (1 + Math.cos(Math.PI * step / totalSteps));
            }
        };
    },

    /**
     * Cosine Annealing with Warm Restarts
     */
    createCosineWarmRestarts: function(initialLR, minLR = 0, T_0 = 10, T_mult = 2) {
        return {
            T_0, T_mult,
            getLR: function(epoch) {
                let T_i = T_0;
                let T_cur = epoch;
                
                while (T_cur >= T_i) {
                    T_cur -= T_i;
                    T_i *= T_mult;
                }
                
                return minLR + 0.5 * (initialLR - minLR) *
                       (1 + Math.cos(Math.PI * T_cur / T_i));
            }
        };
    },

    /**
     * Linear Warmup + Decay
     */
    createWarmupScheduler: function(initialLR, warmupSteps, totalSteps, decayType = 'linear') {
        return {
            getLR: function(step) {
                if (step < warmupSteps) {
                    return initialLR * step / warmupSteps;
                }
                
                const decaySteps = totalSteps - warmupSteps;
                const currentDecayStep = step - warmupSteps;
                
                if (decayType === 'linear') {
                    return initialLR * (1 - currentDecayStep / decaySteps);
                } else if (decayType === 'cosine') {
                    return 0.5 * initialLR * (1 + Math.cos(Math.PI * currentDecayStep / decaySteps));
                }
                return initialLR;
            }
        };
    },

    /**
     * Polynomial Decay
     */
    createPolynomialDecay: function(initialLR, endLR, totalSteps, power = 1.0) {
        return {
            getLR: function(step) {
                const decaySteps = Math.min(step, totalSteps);
                return (initialLR - endLR) * Math.pow(1 - decaySteps / totalSteps, power) + endLR;
            }
        };
    },

    /**
     * One Cycle Learning Rate
     */
    createOneCycle: function(maxLR, totalSteps, pctStart = 0.3, divFactor = 25, finalDivFactor = 1e4) {
        const initialLR = maxLR / divFactor;
        const minLR = initialLR / finalDivFactor;
        const upSteps = Math.floor(totalSteps * pctStart);
        const downSteps = totalSteps - upSteps;

        return {
            getLR: function(step) {
                if (step < upSteps) {
                    // Linear increase
                    return initialLR + (maxLR - initialLR) * step / upSteps;
                } else {
                    // Cosine decrease
                    const decayStep = step - upSteps;
                    return minLR + 0.5 * (maxLR - minLR) * 
                           (1 + Math.cos(Math.PI * decayStep / downSteps));
                }
            }
        };
    },

    /**
     * Reduce on Plateau
     */
    createReduceOnPlateau: function(initialLR, factor = 0.1, patience = 10, minLR = 1e-7) {
        return {
            lr: initialLR,
            bestMetric: Infinity,
            patienceCounter: 0,
            
            step: function(metric) {
                if (metric < this.bestMetric) {
                    this.bestMetric = metric;
                    this.patienceCounter = 0;
                } else {
                    this.patienceCounter++;
                    if (this.patienceCounter >= patience) {
                        this.lr = Math.max(minLR, this.lr * factor);
                        this.patienceCounter = 0;
                    }
                }
                return this.lr;
            },
            
            getLR: function() {
                return this.lr;
            }
        };
    },

    /**
     * Cyclic Learning Rate (triangular)
     */
    createCyclicLR: function(baseLR, maxLR, stepSize = 2000, mode = 'triangular') {
        return {
            getLR: function(step) {
                const cycle = Math.floor(1 + step / (2 * stepSize));
                const x = Math.abs(step / stepSize - 2 * cycle + 1);
                
                if (mode === 'triangular') {
                    return baseLR + (maxLR - baseLR) * Math.max(0, 1 - x);
                } else if (mode === 'triangular2') {
                    return baseLR + (maxLR - baseLR) * Math.max(0, 1 - x) / Math.pow(2, cycle - 1);
                } else if (mode === 'exp_range') {
                    return baseLR + (maxLR - baseLR) * Math.max(0, 1 - x) * Math.pow(0.99994, step);
                }
                return baseLR;
            }
        };
    }
};
