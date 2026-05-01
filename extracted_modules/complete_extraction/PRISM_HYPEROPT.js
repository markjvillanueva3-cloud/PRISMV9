const PRISM_HYPEROPT = {
    // Search space definition
    searchSpace: {
        uniform(low, high) {
            return { type: 'uniform', low, high };
        },
        logUniform(low, high) {
            return { type: 'logUniform', low, high };
        },
        choice(options) {
            return { type: 'choice', options };
        },
        intUniform(low, high) {
            return { type: 'intUniform', low, high };
        },
        qUniform(low, high, q) {
            return { type: 'qUniform', low, high, q };
        }
    },
    
    // Sample from search space
    sampleSpace(space) {
        const sample = {};
        for (const [name, config] of Object.entries(space)) {
            sample[name] = this._sampleParam(config);
        }
        return sample;
    },
    
    _sampleParam(config) {
        switch (config.type) {
            case 'uniform':
                return config.low + Math.random() * (config.high - config.low);
            case 'logUniform':
                const logLow = Math.log(config.low);
                const logHigh = Math.log(config.high);
                return Math.exp(logLow + Math.random() * (logHigh - logLow));
            case 'choice':
                return config.options[Math.floor(Math.random() * config.options.length)];
            case 'intUniform':
                return Math.floor(config.low + Math.random() * (config.high - config.low + 1));
            case 'qUniform':
                const val = config.low + Math.random() * (config.high - config.low);
                return Math.round(val / config.q) * config.q;
            default:
                return null;
        }
    },
    
    // Grid Search
    gridSearch(space, objective, options = {}) {
        const { maxTrials = 100 } = options;
        
        // Generate grid
        const grid = this._generateGrid(space);
        const results = [];
        
        for (let i = 0; i < Math.min(grid.length, maxTrials); i++) {
            const params = grid[i];
            const score = objective(params);
            results.push({ params, score, trial: i });
        }
        
        // Sort by score
        results.sort((a, b) => a.score - b.score);
        
        return {
            bestParams: results[0].params,
            bestScore: results[0].score,
            allResults: results
        };
    },
    
    _generateGrid(space) {
        const params = Object.entries(space);
        const grid = [{}];
        
        for (const [name, config] of params) {
            const values = this._getGridValues(config);
            const newGrid = [];
            
            for (const point of grid) {
                for (const value of values) {
                    newGrid.push({ ...point, [name]: value });
                }
            }
            
            grid.length = 0;
            grid.push(...newGrid);
        }
        
        return grid;
    },
    
    _getGridValues(config, numPoints = 5) {
        switch (config.type) {
            case 'uniform':
            case 'qUniform':
                const values = [];
                for (let i = 0; i < numPoints; i++) {
                    values.push(config.low + i * (config.high - config.low) / (numPoints - 1));
                }
                return values;
            case 'logUniform':
                const logValues = [];
                const logLow = Math.log(config.low);
                const logHigh = Math.log(config.high);
                for (let i = 0; i < numPoints; i++) {
                    logValues.push(Math.exp(logLow + i * (logHigh - logLow) / (numPoints - 1)));
                }
                return logValues;
            case 'choice':
                return config.options;
            case 'intUniform':
                const intValues = [];
                const step = Math.max(1, Math.floor((config.high - config.low) / (numPoints - 1)));
                for (let v = config.low; v <= config.high; v += step) {
                    intValues.push(v);
                }
                return intValues;
            default:
                return [null];
        }
    },
    
    // Random Search
    randomSearch(space, objective, options = {}) {
        const { maxTrials = 100 } = options;
        const results = [];
        
        for (let i = 0; i < maxTrials; i++) {
            const params = this.sampleSpace(space);
            const score = objective(params);
            results.push({ params, score, trial: i });
        }
        
        results.sort((a, b) => a.score - b.score);
        
        return {
            bestParams: results[0].params,
            bestScore: results[0].score,
            allResults: results
        };
    },
    
    // Bayesian Optimization (TPE-like)
    createBayesianOptimizer(space, options = {}) {
        const { gamma = 0.25, nStartupTrials = 10 } = options;
        
        return {
            space,
            gamma,
            nStartupTrials,
            trials: [],
            
            suggest() {
                if (this.trials.length < this.nStartupTrials) {
                    // Random sampling for initial trials
                    return PRISM_HYPEROPT.sampleSpace(this.space);
                }
                
                // TPE-based suggestion
                return this._tpeSuggest();
            },
            
            report(params, score) {
                this.trials.push({ params, score });
            },
            
            _tpeSuggest() {
                // Sort trials by score
                const sorted = [...this.trials].sort((a, b) => a.score - b.score);
                const splitIdx = Math.floor(sorted.length * this.gamma);
                
                const good = sorted.slice(0, splitIdx);
                const bad = sorted.slice(splitIdx);
                
                const suggestion = {};
                
                for (const [name, config] of Object.entries(this.space)) {
                    if (config.type === 'choice') {
                        // For categorical: sample from good distribution
                        const goodVals = good.map(t => t.params[name]);
                        suggestion[name] = goodVals[Math.floor(Math.random() * goodVals.length)] || 
                                          config.options[Math.floor(Math.random() * config.options.length)];
                    } else {
                        // For continuous: fit KDE and sample
                        const goodVals = good.map(t => t.params[name]);
                        const badVals = bad.map(t => t.params[name]);
                        
                        // Simplified: sample near good values
                        if (goodVals.length > 0) {
                            const goodMean = goodVals.reduce((a, b) => a + b, 0) / goodVals.length;
                            const goodStd = Math.sqrt(goodVals.reduce((s, v) => s + Math.pow(v - goodMean, 2), 0) / goodVals.length) || 0.1;
                            
                            // Sample from truncated normal around good region
                            let value = goodMean + (Math.random() - 0.5) * 2 * goodStd;
                            value = Math.max(config.low, Math.min(config.high, value));
                            
                            if (config.type === 'intUniform') {
                                value = Math.round(value);
                            } else if (config.type === 'logUniform') {
                                // Handle log scale
                                const logVal = Math.log(goodMean) + (Math.random() - 0.5) * 0.5;
                                value = Math.exp(logVal);
                                value = Math.max(config.low, Math.min(config.high, value));
                            }
                            
                            suggestion[name] = value;
                        } else {
                            suggestion[name] = PRISM_HYPEROPT._sampleParam(config);
                        }
                    }
                }
                
                return suggestion;
            },
            
            getBest() {
                if (this.trials.length === 0) return null;
                return this.trials.reduce((best, t) => t.score < best.score ? t : best);
            }
        };
    },
    
    // Early stopping for trials
    createMedianPruner(options = {}) {
        const { nStartupTrials = 5, nWarmupSteps = 10, intervalSteps = 1 } = options;
        
        return {
            nStartupTrials,
            nWarmupSteps,
            intervalSteps,
            trialHistory: [],
            
            shouldPrune(trialId, step, value) {
                if (this.trialHistory.length < this.nStartupTrials) return false;
                if (step < this.nWarmupSteps) return false;
                if (step % this.intervalSteps !== 0) return false;
                
                // Get intermediate values at this step from completed trials
                const intermediateValues = this.trialHistory
                    .filter(t => t.intermediates[step] !== undefined)
                    .map(t => t.intermediates[step]);
                
                if (intermediateValues.length === 0) return false;
                
                // Prune if worse than median
                const median = this._median(intermediateValues);
                return value > median;
            },
            
            reportIntermediate(trialId, step, value) {
                if (!this.trialHistory[trialId]) {
                    this.trialHistory[trialId] = { intermediates: {} };
                }
                this.trialHistory[trialId].intermediates[step] = value;
            },
            
            _median(values) {
                const sorted = [...values].sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
            }
        };
    }
}