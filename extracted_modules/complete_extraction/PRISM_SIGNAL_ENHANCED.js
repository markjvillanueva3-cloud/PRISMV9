const PRISM_SIGNAL_ENHANCED = {
    name: 'PRISM Signal Processing Enhanced',
    version: '1.0.0',
    
    /**
     * Cross-correlation of two signals
     * (f ⋆ g)(τ) = ∫f*(t)g(t+τ)dt
     */
    crossCorrelation: function(x, y) {
        const n = x.length;
        const m = y.length;
        const result = new Array(n + m - 1).fill(0);
        
        for (let lag = -(m - 1); lag < n; lag++) {
            let sum = 0;
            for (let i = 0; i < m; i++) {
                const xi = lag + i;
                if (xi >= 0 && xi < n) {
                    sum += x[xi] * y[i];
                }
            }
            result[lag + (m - 1)] = sum;
        }
        return result;
    },
    
    /**
     * Auto-correlation
     * R_xx(τ) = (x ⋆ x)(τ)
     */
    autoCorrelation: function(x) {
        return this.crossCorrelation(x, x);
    },
    
    /**
     * Normalized cross-correlation (useful for pattern matching)
     */
    normalizedCrossCorrelation: function(x, y) {
        const xcorr = this.crossCorrelation(x, y);
        const normX = Math.sqrt(x.reduce((sum, v) => sum + v * v, 0));
        const normY = Math.sqrt(y.reduce((sum, v) => sum + v * v, 0));
        const norm = normX * normY;
        return xcorr.map(v => v / norm);
    },
    
    /**
     * MCMC Metropolis-Hastings Sampling
     * @param {Function} logProbability - Log of target distribution
     * @param {Array} initial - Initial state
     * @param {number} numSamples - Number of samples
     * @param {number} proposalStd - Standard deviation of proposal
     */
    metropolisHastings: function(logProbability, initial, numSamples, proposalStd = 1.0) {
        const samples = [initial];
        let current = initial;
        let currentLogProb = logProbability(current);
        let accepted = 0;
        
        for (let i = 1; i < numSamples; i++) {
            // Propose new state (Gaussian proposal)
            const proposed = current.map(x => x + proposalStd * this._randn());
            const proposedLogProb = logProbability(proposed);
            
            // Accept with probability min(1, p(x')/p(x))
            const logAcceptRatio = proposedLogProb - currentLogProb;
            
            if (Math.log(Math.random()) < logAcceptRatio) {
                current = proposed;
                currentLogProb = proposedLogProb;
                accepted++;
            }
            
            samples.push([...current]);
        }
        
        return {
            samples,
            acceptanceRate: accepted / (numSamples - 1)
        };
    },
    
    /**
     * Standard normal random number (Box-Muller)
     */
    _randn: function() {
        const u1 = Math.random();
        const u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }
};