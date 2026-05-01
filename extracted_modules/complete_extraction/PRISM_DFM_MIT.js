const PRISM_DFM_MIT = {
    /**
     * Tolerance stackup analysis
     * @param {Array} tolerances - Array of individual tolerances
     * @param {string} method - 'worst' or 'rss' (root sum square)
     * @returns {Object} Stackup analysis
     */
    toleranceStackup: function(tolerances, method = 'rss') {
        const worstCase = tolerances.reduce((sum, t) => sum + Math.abs(t), 0);
        const rss = Math.sqrt(tolerances.reduce((sum, t) => sum + t * t, 0));
        
        return {
            worstCase: worstCase,
            rss: rss,
            recommended: method === 'worst' ? worstCase : rss,
            method: method,
            individual: tolerances,
            count: tolerances.length,
            reductionFactor: worstCase / rss // How much RSS saves
        };
    },

    /**
     * Process capability indices
     * @param {number} USL - Upper specification limit
     * @param {number} LSL - Lower specification limit
     * @param {number} mean - Process mean
     * @param {number} sigma - Process standard deviation
     * @returns {Object} Capability indices
     */
    processCapability: function(USL, LSL, mean, sigma) {
        const Cp = (USL - LSL) / (6 * sigma);
        const Cpk_upper = (USL - mean) / (3 * sigma);
        const Cpk_lower = (mean - LSL) / (3 * sigma);
        const Cpk = Math.min(Cpk_upper, Cpk_lower);
        
        // Cpm (Taguchi capability)
        const T = (USL + LSL) / 2; // Target
        const Cpm = (USL - LSL) / (6 * Math.sqrt(sigma * sigma + (mean - T) * (mean - T)));
        
        let rating;
        if (Cpk >= 2.0) rating = 'World Class (Six Sigma)';
        else if (Cpk >= 1.67) rating = 'Excellent';
        else if (Cpk >= 1.33) rating = 'Good';
        else if (Cpk >= 1.0) rating = 'Marginal';
        else rating = 'Poor - Process improvement needed';
        
        return {
            Cp: Cp,
            Cpk: Cpk,
            Cpk_upper: Cpk_upper,
            Cpk_lower: Cpk_lower,
            Cpm: Cpm,
            rating: rating,
            centered: Math.abs(Cpk_upper - Cpk_lower) < 0.1,
            defectRate: this._estimateDefectRate(Cpk)
        };
    },

    _estimateDefectRate: function(Cpk) {
        // Approximate defect rate based on Cpk
        if (Cpk >= 2.0) return '3.4 PPM (Six Sigma)';
        if (Cpk >= 1.67) return '~60 PPM';
        if (Cpk >= 1.33) return '~6,200 PPM';
        if (Cpk >= 1.0) return '~66,800 PPM';
        return '>66,800 PPM';
    }
}