const PRISM_SPC = {
    
    // Control chart constants
    CONSTANTS: {
        2: { A2: 1.880, D3: 0, D4: 3.267, d2: 1.128 },
        3: { A2: 1.023, D3: 0, D4: 2.574, d2: 1.693 },
        4: { A2: 0.729, D3: 0, D4: 2.282, d2: 2.059 },
        5: { A2: 0.577, D3: 0, D4: 2.114, d2: 2.326 },
        6: { A2: 0.483, D3: 0, D4: 2.004, d2: 2.534 },
        7: { A2: 0.419, D3: 0.076, D4: 1.924, d2: 2.704 },
        8: { A2: 0.373, D3: 0.136, D4: 1.864, d2: 2.847 },
        9: { A2: 0.337, D3: 0.184, D4: 1.816, d2: 2.970 },
        10: { A2: 0.308, D3: 0.223, D4: 1.777, d2: 3.078 }
    },
    
    /**
     * Calculate X-bar and R control chart limits
     * @param {Array} subgroups - Array of subgroup arrays
     * @returns {Object} Control chart limits and analysis
     */
    controlChartXbarR: function(subgroups) {
        const n = subgroups[0].length; // Subgroup size
        const k = subgroups.length; // Number of subgroups
        
        if (!this.CONSTANTS[n]) {
            throw new Error(`Subgroup size ${n} not supported (use 2-10)`);
        }
        
        const { A2, D3, D4, d2 } = this.CONSTANTS[n];
        
        // Calculate means and ranges for each subgroup
        const means = subgroups.map(sg => sg.reduce((a, b) => a + b, 0) / n);
        const ranges = subgroups.map(sg => Math.max(...sg) - Math.min(...sg));
        
        // Grand mean and average range
        const xBar = means.reduce((a, b) => a + b, 0) / k;
        const rBar = ranges.reduce((a, b) => a + b, 0) / k;
        
        // Estimate sigma
        const sigma = rBar / d2;
        
        // Control limits
        const xBar_UCL = xBar + A2 * rBar;
        const xBar_LCL = xBar - A2 * rBar;
        const R_UCL = D4 * rBar;
        const R_LCL = D3 * rBar;
        
        // Check for out of control points
        const xBarOOC = means.filter((m, i) => m > xBar_UCL || m < xBar_LCL);
        const rangeOOC = ranges.filter(r => r > R_UCL || r < R_LCL);
        
        return {
            subgroupSize: n,
            numSubgroups: k,
            grandMean: xBar,
            averageRange: rBar,
            estimatedSigma: sigma,
            xBarChart: {
                centerLine: xBar,
                UCL: xBar_UCL,
                LCL: xBar_LCL,
                outOfControl: xBarOOC.length
            },
            rangeChart: {
                centerLine: rBar,
                UCL: R_UCL,
                LCL: R_LCL,
                outOfControl: rangeOOC.length
            },
            inControl: xBarOOC.length === 0 && rangeOOC.length === 0,
            data: { means, ranges }
        };
    },
    
    /**
     * Calculate process capability indices
     * @param {number} USL - Upper specification limit
     * @param {number} LSL - Lower specification limit
     * @param {number} mean - Process mean
     * @param {number} sigma - Process standard deviation
     * @returns {Object} Capability analysis
     */
    processCapability: function(USL, LSL, mean, sigma) {
        // Cp - potential capability (ignores centering)
        const Cp = (USL - LSL) / (6 * sigma);
        
        // Cpk - actual capability (accounts for centering)
        const Cpu = (USL - mean) / (3 * sigma);
        const Cpl = (mean - LSL) / (3 * sigma);
        const Cpk = Math.min(Cpu, Cpl);
        
        // Cpm - Taguchi capability (includes target)
        const target = (USL + LSL) / 2;
        const Cpm = Cp / Math.sqrt(1 + Math.pow((mean - target) / sigma, 2));
        
        // PPM out of spec (assuming normal distribution)
        const ppmLower = this._normalCDF((LSL - mean) / sigma) * 1e6;
        const ppmUpper = (1 - this._normalCDF((USL - mean) / sigma)) * 1e6;
        const ppmTotal = ppmLower + ppmUpper;
        
        // Sigma level
        const sigmaLevel = this._sigmaLevel(Cpk);
        
        return {
            Cp,
            Cpk,
            Cpu,
            Cpl,
            Cpm,
            sigmaLevel,
            ppm: {
                lower: Math.round(ppmLower),
                upper: Math.round(ppmUpper),
                total: Math.round(ppmTotal)
            },
            rating: this._capabilityRating(Cpk),
            centered: Math.abs(mean - target) < sigma * 0.5
        };
    },
    
    _normalCDF: function(z) {
        // Approximation of standard normal CDF
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;
        
        const sign = z < 0 ? -1 : 1;
        z = Math.abs(z) / Math.sqrt(2);
        
        const t = 1.0 / (1.0 + p * z);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
        
        return 0.5 * (1.0 + sign * y);
    },
    
    _sigmaLevel: function(Cpk) {
        return Cpk * 3;
    },
    
    _capabilityRating: function(Cpk) {
        if (Cpk >= 2.0) return 'World Class (Six Sigma)';
        if (Cpk >= 1.67) return 'Excellent';
        if (Cpk >= 1.33) return 'Good';
        if (Cpk >= 1.0) return 'Marginal';
        if (Cpk >= 0.67) return 'Poor';
        return 'Incapable';
    }
}