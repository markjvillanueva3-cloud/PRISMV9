const PRISM_LR_SCHEDULER_COMPLETE = {
    name: 'PRISM Learning Rate Scheduler Complete',
    version: '1.0.0',
    
    /**
     * Step decay
     */
    stepDecay: function(baseLR, step, decayRate = 0.1, decaySteps = 1000) {
        return baseLR * Math.pow(decayRate, Math.floor(step / decaySteps));
    },
    
    /**
     * Exponential decay
     */
    exponentialDecay: function(baseLR, step, decayRate = 0.96, decaySteps = 1000) {
        return baseLR * Math.pow(decayRate, step / decaySteps);
    },
    
    /**
     * Cosine annealing
     */
    cosineAnnealing: function(baseLR, step, totalSteps, minLR = 0) {
        return minLR + 0.5 * (baseLR - minLR) * (1 + Math.cos(Math.PI * step / totalSteps));
    },
    
    /**
     * Cosine annealing with warm restarts
     */
    cosineAnnealingWarmRestarts: function(baseLR, step, T0 = 1000, Tmult = 2, minLR = 0) {
        let T = T0;
        let stepInCycle = step;
        
        while (stepInCycle >= T) {
            stepInCycle -= T;
            T = Math.floor(T * Tmult);
        }
        
        return minLR + 0.5 * (baseLR - minLR) * (1 + Math.cos(Math.PI * stepInCycle / T));
    },
    
    /**
     * Linear warmup
     */
    linearWarmup: function(baseLR, step, warmupSteps) {
        if (step < warmupSteps) {
            return baseLR * step / warmupSteps;
        }
        return baseLR;
    },
    
    /**
     * Linear warmup + cosine decay (Transformer standard)
     */
    warmupCosineDecay: function(baseLR, step, warmupSteps, totalSteps, minLR = 0) {
        if (step < warmupSteps) {
            return baseLR * step / warmupSteps;
        }
        
        const decayStep = step - warmupSteps;
        const decaySteps = totalSteps - warmupSteps;
        return minLR + 0.5 * (baseLR - minLR) * (1 + Math.cos(Math.PI * decayStep / decaySteps));
    },
    
    /**
     * One-cycle policy (super-convergence)
     */
    oneCycle: function(baseLR, step, totalSteps, maxLR = null, divFactor = 25, finalDivFactor = 1e4) {
        maxLR = maxLR || baseLR * 10;
        const initialLR = maxLR / divFactor;
        const minLR = initialLR / finalDivFactor;
        
        const pctStart = 0.3;
        const warmupSteps = Math.floor(totalSteps * pctStart);
        
        if (step < warmupSteps) {
            return initialLR + (maxLR - initialLR) * step / warmupSteps;
        } else {
            const decayStep = step - warmupSteps;
            const decaySteps = totalSteps - warmupSteps;
            return minLR + 0.5 * (maxLR - minLR) * (1 + Math.cos(Math.PI * decayStep / decaySteps));
        }
    },
    
    /**
     * Cyclic LR (triangular)
     */
    cyclicLR: function(baseLR, step, maxLR, stepSize = 2000, mode = 'triangular') {
        const cycle = Math.floor(1 + step / (2 * stepSize));
        const x = Math.abs(step / stepSize - 2 * cycle + 1);
        
        switch (mode) {
            case 'triangular':
                return baseLR + (maxLR - baseLR) * Math.max(0, 1 - x);
            case 'triangular2':
                return baseLR + (maxLR - baseLR) * Math.max(0, 1 - x) / Math.pow(2, cycle - 1);
            case 'exp_range':
                return baseLR + (maxLR - baseLR) * Math.max(0, 1 - x) * Math.pow(0.99994, step);
            default:
                return baseLR;
        }
    },
    
    /**
     * Polynomial decay
     */
    polynomialDecay: function(baseLR, step, totalSteps, endLR = 0.0001, power = 1.0) {
        const clippedStep = Math.min(step, totalSteps);
        return (baseLR - endLR) * Math.pow(1 - clippedStep / totalSteps, power) + endLR;
    },
    
    /**
     * Reduce on plateau (adaptive)
     */
    createReduceOnPlateau: function(options = {}) {
        const {
            factor = 0.1,
            patience = 10,
            minLR = 1e-6,
            threshold = 1e-4,
            mode = 'min'
        } = options;
        
        return {
            factor,
            patience,
            minLR,
            threshold,
            mode,
            bestMetric: mode === 'min' ? Infinity : -Infinity,
            badEpochs: 0,
            currentLR: null,
            
            step: function(metric, currentLR) {
                this.currentLR = currentLR;
                
                const improved = this.mode === 'min'
                    ? metric < this.bestMetric - this.threshold
                    : metric > this.bestMetric + this.threshold;
                
                if (improved) {
                    this.bestMetric = metric;
                    this.badEpochs = 0;
                } else {
                    this.badEpochs++;
                }
                
                if (this.badEpochs >= this.patience) {
                    const newLR = Math.max(currentLR * this.factor, this.minLR);
                    this.badEpochs = 0;
                    this.currentLR = newLR;
                    return newLR;
                }
                
                return currentLR;
            }
        };
    },
    
    /**
     * Create scheduler with configuration
     */
    createScheduler: function(config) {
        const {
            type = 'warmup_cosine',
            baseLR = 0.001,
            warmupSteps = 0,
            totalSteps = 10000,
            minLR = 0,
            ...extra
        } = config;
        
        const self = this;
        
        return {
            config,
            step: 0,
            
            getLR: function() {
                const s = this.step;
                
                switch (type) {
                    case 'step':
                        return self.stepDecay(baseLR, s, extra.decayRate, extra.decaySteps);
                    case 'exponential':
                        return self.exponentialDecay(baseLR, s, extra.decayRate, extra.decaySteps);
                    case 'cosine':
                        return self.cosineAnnealing(baseLR, s, totalSteps, minLR);
                    case 'warmup_cosine':
                        return self.warmupCosineDecay(baseLR, s, warmupSteps, totalSteps, minLR);
                    case 'one_cycle':
                        return self.oneCycle(baseLR, s, totalSteps, extra.maxLR);
                    case 'cyclic':
                        return self.cyclicLR(baseLR, s, extra.maxLR, extra.stepSize, extra.mode);
                    case 'polynomial':
                        return self.polynomialDecay(baseLR, s, totalSteps, minLR, extra.power);
                    default:
                        return baseLR;
                }
            },
            
            next: function() {
                this.step++;
                return this.getLR();
            },
            
            reset: function() {
                this.step = 0;
            }
        };
    }
}