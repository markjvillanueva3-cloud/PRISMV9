// PRISM_HYPEROPT_COMPLETE - Lines 905794-906120 (327 lines) - Hyperopt complete\n\nconst PRISM_HYPEROPT_COMPLETE = {
    name: 'PRISM Hyperparameter Optimization Complete',
    version: '1.0.0',
    
    // Search space definitions
    searchSpace: {
        uniform: (low, high) => ({ type: 'uniform', low, high }),
        logUniform: (low, high) => ({ type: 'logUniform', low, high }),
        choice: (options) => ({ type: 'choice', options }),
        intUniform: (low, high) => ({ type: 'intUniform', low, high }),
        qUniform: (low, high, q) => ({ type: 'qUniform', low, high, q })
    },
    
    /**
     * Sample from search space
     */
    sampleSpace: function(space) {
        const sample = {};
        for (const [name, config] of Object.entries(space)) {
            sample[name] = this._sampleParam(config);
        }
        return sample;
    },
    
    _sampleParam: function(config) {
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
    
    /**
     * Grid Search
     */
    gridSearch: function(space, objective, options = {}) {
        const { maxTrials = 1000 } = options;
        
        const grid = this._generateGrid(space);
        const results = [];
        
        for (let i = 0; i < Math.min(grid.length, maxTrials); i++) {
            const params = grid[i];
            const score = objective(params);
            results.push({ params, score, trial: i });
        }
        
        results.sort((a, b) => a.score - b.score);
        
        return {
            bestParams: results[0].params,
            bestScore: results[0].score,
            allResults: results,
            numTrials: results.length
        };
    },
    
    _generateGrid: function(space, gridPoints = 5) {
        const params = Object.entries(space);
        let grid = [{}];
        
        for (const [name, config] of params) {
            const values = this._getGridValues(config, gridPoints);
            const newGrid = [];
            
            for (const point of grid) {
                for (const value of values) {
                    newGrid.push({ ...point, [name]: value });
                }
            }
            
            grid = newGrid;
        }
        
        return grid;
    },
    
    _getGridValues: function(config, numPoints) {
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
    
    /**
     * Random Search
     */
    randomSearch: function(space, objective, options = {}) {
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
            allResults: results,
            numTrials: maxTrials
        };
    },
    
    /**
     * Bayesian Optimization using Gaussian Process
     */
    bayesianOptimization: function(space, objective, options = {}) {
        const {
            maxTrials = 50,
            initPoints = 5,
            acquisitionFunction = 'ei', // 'ei', 'ucb', 'poi'
            xi = 0.01,
            kappa = 2.0
        } = options;
        
        const paramNames = Object.keys(space);
        const results = [];
        
        // Initial random points
        for (let i = 0; i < initPoints; i++) {
            const params = this.sampleSpace(space);
            const score = objective(params);
            results.push({ params, score, trial: i });
        }
        
        // Bayesian optimization loop
        for (let i = initPoints; i < maxTrials; i++) {
            // Fit GP to current observations
            const X = results.map(r => this._paramsToVector(r.params, space));
            const y = results.map(r => r.score);
            
            // Find next point by optimizing acquisition function
            const nextParams = this._optimizeAcquisition(
                space, X, y, acquisitionFunction, { xi, kappa }
            );
            
            const score = objective(nextParams);
            results.push({ params: nextParams, score, trial: i });
        }
        
        results.sort((a, b) => a.score - b.score);
        
        return {
            bestParams: results[0].params,
            bestScore: results[0].score,
            allResults: results,
            numTrials: maxTrials
        };
    },
    
    _paramsToVector: function(params, space) {
        const vector = [];
        for (const [name, config] of Object.entries(space)) {
            const value = params[name];
            switch (config.type) {
                case 'uniform':
                case 'qUniform':
                    vector.push((value - config.low) / (config.high - config.low));
                    break;
                case 'logUniform':
                    const logLow = Math.log(config.low);
                    const logHigh = Math.log(config.high);
                    vector.push((Math.log(value) - logLow) / (logHigh - logLow));
                    break;
                case 'intUniform':
                    vector.push((value - config.low) / (config.high - config.low));
                    break;
                case 'choice':
                    vector.push(config.options.indexOf(value) / (config.options.length - 1));
                    break;
            }
        }
        return vector;
    },
    
    _vectorToParams: function(vector, space) {
        const params = {};
        let idx = 0;
        for (const [name, config] of Object.entries(space)) {
            const v = Math.max(0, Math.min(1, vector[idx++]));
            switch (config.type) {
                case 'uniform':
                    params[name] = config.low + v * (config.high - config.low);
                    break;
                case 'qUniform':
                    const raw = config.low + v * (config.high - config.low);
                    params[name] = Math.round(raw / config.q) * config.q;
                    break;
                case 'logUniform':
                    const logLow = Math.log(config.low);
                    const logHigh = Math.log(config.high);
                    params[name] = Math.exp(logLow + v * (logHigh - logLow));
                    break;
                case 'intUniform':
                    params[name] = Math.round(config.low + v * (config.high - config.low));
                    break;
                case 'choice':
                    params[name] = config.options[Math.round(v * (config.options.length - 1))];
                    break;
            }
        }
        return params;
    },
    
    _optimizeAcquisition: function(space, X, y, acqFunc, opts) {
        // Simple random search for acquisition optimization
        const numCandidates = 100;
        let bestCandidate = null;
        let bestAcq = -Infinity;
        
        const yMin = Math.min(...y);
        const yMean = y.reduce((a, b) => a + b, 0) / y.length;
        const yStd = Math.sqrt(y.reduce((s, v) => s + Math.pow(v - yMean, 2), 0) / y.length);
        
        for (let c = 0; c < numCandidates; c++) {
            const candidate = this.sampleSpace(space);
            const candidateVec = this._paramsToVector(candidate, space);
            
            // Simple GP prediction (using kernel average)
            const { mean, std } = this._gpPredict(candidateVec, X, y);
            
            // Compute acquisition
            let acq;
            switch (acqFunc) {
                case 'ei': // Expected Improvement
                    const z = (yMin - mean - opts.xi) / (std + 1e-10);
                    acq = (yMin - mean - opts.xi) * this._normalCDF(z) + std * this._normalPDF(z);
                    break;
                case 'ucb': // Upper Confidence Bound (negated for minimization)
                    acq = -mean - opts.kappa * std;
                    break;
                case 'poi': // Probability of Improvement
                    acq = this._normalCDF((yMin - mean - opts.xi) / (std + 1e-10));
                    break;
            }
            
            if (acq > bestAcq) {
                bestAcq = acq;
                bestCandidate = candidate;
            }
        }
        
        return bestCandidate;
    },
    
    _gpPredict: function(x, X, y) {
        // Simplified GP: weighted average based on RBF kernel
        const lengthScale = 0.5;
        let weightSum = 0;
        let mean = 0;
        
        for (let i = 0; i < X.length; i++) {
            const dist = Math.sqrt(x.reduce((s, v, j) => s + Math.pow(v - X[i][j], 2), 0));
            const weight = Math.exp(-0.5 * Math.pow(dist / lengthScale, 2));
            mean += weight * y[i];
            weightSum += weight;
        }
        
        mean = weightSum > 0 ? mean / weightSum : 0;
        
        // Estimate variance from distances to observations
        const minDist = Math.min(...X.map(xi => 
            Math.sqrt(x.reduce((s, v, j) => s + Math.pow(v - xi[j], 2), 0))
        ));
        const std = Math.max(0.01, minDist * 0.5);
        
        return { mean, std };
    },
    
    _normalCDF: function(x) {
        const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
        const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
        
        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x) / Math.sqrt(2);
        
        const t = 1 / (1 + p * x);
        const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        
        return 0.5 * (1 + sign * y);
    },
    
    _normalPDF: function(x) {
        return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    }
};
