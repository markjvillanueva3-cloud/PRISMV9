const PRISM_FATIGUE = {
    
    /**
     * Modified Goodman fatigue analysis
     * @param {Object} params - Stress and material parameters
     * @returns {Object} Fatigue safety factor
     */
    goodman: function(params) {
        const {
            sigmaA,      // Alternating stress amplitude
            sigmaM,      // Mean stress
            Se,          // Endurance limit
            Sut,         // Ultimate tensile strength
            Kf = 1       // Fatigue stress concentration factor
        } = params;
        
        // Apply stress concentration to alternating stress
        const sigmaAeff = Kf * sigmaA;
        
        // Goodman line: σa/Se + σm/Sut = 1/n
        // Solve for n: n = 1 / (σa/Se + σm/Sut)
        const safetyFactor = 1 / (sigmaAeff / Se + sigmaM / Sut);
        
        // Also calculate by other criteria
        const soderberg = 1 / (sigmaAeff / Se + sigmaM / params.Sy);  // If Sy provided
        
        return {
            safetyFactor,
            criterion: 'Modified Goodman',
            effectiveAlternating: sigmaAeff,
            meanStress: sigmaM,
            infiniteLife: safetyFactor > 1,
            formula: 'σa/Se + σm/Sut = 1/n'
        };
    },
    
    /**
     * Miner's rule for cumulative damage
     * @param {Array} loadHistory - Array of {stress, cycles, Nf} objects
     * @returns {Object} Cumulative damage analysis
     */
    minerRule: function(loadHistory) {
        let totalDamage = 0;
        const damages = [];
        
        for (const load of loadHistory) {
            const { stress, cycles, Nf } = load;
            const damage = cycles / Nf;
            damages.push({
                stress,
                cycles,
                cyclesToFailure: Nf,
                damage
            });
            totalDamage += damage;
        }
        
        return {
            cumulativeDamage: totalDamage,
            damages,
            failed: totalDamage >= 1,
            remainingLife: totalDamage < 1 ? 1 - totalDamage : 0,
            formula: 'D = Σ(ni/Ni), failure when D ≥ 1'
        };
    },
    
    /**
     * Estimate endurance limit from ultimate strength (steel)
     * @param {number} Sut - Ultimate tensile strength [MPa]
     * @param {Object} factors - Modification factors
     * @returns {Object} Corrected endurance limit
     */
    enduranceLimit: function(Sut, factors = {}) {
        const {
            ka = 1,    // Surface factor
            kb = 1,    // Size factor
            kc = 1,    // Load factor (1 for bending, 0.85 for axial, 0.59 for torsion)
            kd = 1,    // Temperature factor
            ke = 1,    // Reliability factor
            kf = 1     // Miscellaneous factor
        } = factors;
        
        // Base endurance limit (rotating beam)
        let SeePrime;
        if (Sut <= 1400) {
            SeePrime = 0.5 * Sut;
        } else {
            SeePrime = 700;  // MPa, cap for high-strength steels
        }
        
        // Corrected endurance limit
        const Se = ka * kb * kc * kd * ke * kf * SeePrime;
        
        return {
            SeePrime,
            Se,
            factors: { ka, kb, kc, kd, ke, kf },
            formula: "Se = ka×kb×kc×kd×ke×kf×Se'"
        };
    }
};