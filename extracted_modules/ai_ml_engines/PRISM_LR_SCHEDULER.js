const PRISM_LR_SCHEDULER = {
    // Step decay
    stepDecay(baseLR, step, decayRate = 0.1, decaySteps = 1000) {
        return baseLR * Math.pow(decayRate, Math.floor(step / decaySteps));
    },
    
    // Exponential decay
    exponentialDecay(baseLR, step, decayRate = 0.96, decaySteps = 1000) {
        return baseLR * Math.pow(decayRate, step / decaySteps);
    },
    
    // Cosine annealing
    cosineAnnealing(baseLR, step, totalSteps, minLR = 0) {
        return minLR + 0.5 * (baseLR - minLR) * (1 + Math.cos(Math.PI * step / totalSteps));
    },
    
    // Cosine annealing with warm restarts
    cosineAnnealingWarmRestarts(baseLR, step, T0 = 1000, Tmult = 2, minLR = 0) {
        let T = T0;
        let stepInCycle = step;
        
        while (stepInCycle >= T) {
            stepInCycle -= T;
            T *= Tmult;
        }
        
        return minLR + 0.5 * (baseLR - minLR) * (1 + Math.cos(Math.PI * stepInCycle / T));
    },
    
    // Linear warmup
    linearWarmup(baseLR, step, warmupSteps) {
        if (step < warmupSteps) {
            return baseLR * step / warmupSteps;
        }
        return baseLR;
    },
    
    // Linear warmup + cosine decay (common in transformers)
    warmupCosineDecay(baseLR, step, warmupSteps, totalSteps, minLR = 0) {
        if (step < warmupSteps) {
            return baseLR * step / warmupSteps;
        }
        
        const decaySteps = totalSteps - warmupSteps;
        const decayStep = step - warmupSteps;
        return minLR + 0.5 * (baseLR - minLR) * (1 + Math.cos(Math.PI * decayStep / decaySteps));
    },
    
    // One-cycle policy (super-convergence)
    oneCycle(baseLR, step, totalSteps, maxLR = null, divFactor = 25, finalDivFactor = 1e4) {
        maxLR = maxLR || baseLR * 10;
        const initialLR = maxLR / divFactor;
        const minLR = initialLR / finalDivFactor;
        
        const pctStart = 0.3; // Warmup for 30% of training
        const warmupSteps = Math.floor(totalSteps * pctStart);
        
        if (step < warmupSteps) {
            // Linear warmup to maxLR
            return initialLR + (maxLR - initialLR) * step / warmupSteps;
        } else {
            // Cosine annealing to minLR
            const decayStep = step - warmupSteps;
            const decaySteps = totalSteps - warmupSteps;
            return minLR + 0.5 * (maxLR - minLR) * (1 + Math.cos(Math.PI * decayStep / decaySteps));
        }
    },
    
    // Polynomial decay
    polynomialDecay(baseLR, step, totalSteps, endLR = 0.0001, power = 1.0) {
        const decaySteps = totalSteps;
        const clippedStep = Math.min(step, decaySteps);
        return (baseLR - endLR) * Math.pow(1 - clippedStep / decaySteps, power) + endLR;
    },
    
    // Reduce on plateau (adaptive)
    createReduceOnPlateau(options = {}) {
        const {
            factor = 0.1,
            patience = 10,
            minLR = 1e-6,
            threshold = 1e-4,
            mode = 'min' // 'min' or 'max'
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
            
            step(metric, currentLR) {
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
                    console.log(`[LR Scheduler] Reducing LR to ${newLR}`);
                    return newLR;
                }
                
                return currentLR;
            },
            
            getState() {
                return {
                    bestMetric: this.bestMetric,
                    badEpochs: this.badEpochs,
                    currentLR: this.currentLR
                };
            }
        };
    },
    
    // Cyclic LR (triangular)
    cyclicLR(baseLR, step, maxLR, stepSize = 2000, mode = 'triangular') {
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
    
    // Create a scheduler that combines warmup with any decay
    createScheduler(config) {
        const {
            baseLR,
            warmupSteps = 0,
            totalSteps,
            decay = 'cosine', // 'cosine', 'linear', 'exponential', 'constant'
            minLR = 0,
            decayRate = 0.96
        } = config;
        
        return {
            config,
            
            getLR(step) {
                // Warmup phase
                if (step < warmupSteps) {
                    return baseLR * step / warmupSteps;
                }
                
                const decayStep = step - warmupSteps;
                const decaySteps = totalSteps - warmupSteps;
                
                switch (decay) {
                    case 'cosine':
                        return minLR + 0.5 * (baseLR - minLR) * (1 + Math.cos(Math.PI * decayStep / decaySteps));
                    case 'linear':
                        return baseLR - (baseLR - minLR) * decayStep / decaySteps;
                    case 'exponential':
                        return baseLR * Math.pow(decayRate, decayStep / 1000);
                    case 'constant':
                    default:
                        return baseLR;
                }
            }
        };
    }
}