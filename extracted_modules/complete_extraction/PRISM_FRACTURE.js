const PRISM_FRACTURE = {
    
    /**
     * Stress intensity factor calculation
     * @param {Object} params - Crack and loading parameters
     * @returns {Object} SIF analysis
     */
    stressIntensityFactor: function(params) {
        const {
            stress_MPa,
            crackLength_mm,
            geometry = 'center_crack',  // 'center_crack', 'edge_crack', 'surface_crack'
            width_mm = null,            // Plate width for finite geometry
            thickness_mm = null
        } = params;
        
        const a = crackLength_mm / 1000; // Convert to meters for calculation
        let Y = 1; // Geometry factor
        
        switch (geometry) {
            case 'center_crack':
                if (width_mm) {
                    const W = width_mm / 1000;
                    // Secant correction
                    Y = Math.sqrt(1 / Math.cos(Math.PI * a / W));
                } else {
                    Y = 1; // Infinite plate
                }
                break;
                
            case 'edge_crack':
                if (width_mm) {
                    const W = width_mm / 1000;
                    const ratio = a / W;
                    Y = 1.12 - 0.231 * ratio + 10.55 * Math.pow(ratio, 2) - 
                        21.72 * Math.pow(ratio, 3) + 30.39 * Math.pow(ratio, 4);
                } else {
                    Y = 1.12; // Semi-infinite plate
                }
                break;
                
            case 'surface_crack':
                Y = 1.12; // Simplified
                break;
                
            default:
                Y = 1;
        }
        
        // K = Y × σ × √(πa)
        const K = Y * stress_MPa * Math.sqrt(Math.PI * a);
        
        return {
            geometry,
            stress_MPa,
            crackLength_mm,
            geometryFactor: Y,
            K_MPa_sqrt_m: K,
            K_MPa_sqrt_mm: K * Math.sqrt(1000),
            formula: 'K = Y × σ × √(πa)'
        };
    },
    
    /**
     * Paris law fatigue crack growth
     * @param {Object} params - Crack growth parameters
     * @returns {Object} Crack growth analysis
     */
    parisLaw: function(params) {
        const {
            deltaK_MPa_sqrt_m,        // Stress intensity range
            C = 1e-11,                // Paris constant (m/cycle)
            m = 3,                    // Paris exponent
            initialCrack_mm = 1,
            finalCrack_mm = 10,
            stress_MPa = 100,
            geometry = 'center_crack'
        } = params;
        
        // da/dN = C × (ΔK)^m
        const dadN = C * Math.pow(deltaK_MPa_sqrt_m, m);
        
        // Integrate for cycles (simplified for constant ΔK)
        // For variable ΔK, would need numerical integration
        const da = (finalCrack_mm - initialCrack_mm) / 1000; // meters
        const N_approx = da / dadN;
        
        // More accurate integration for center crack
        // N = ∫ da / (C × (Y×σ×√πa)^m)
        let N_integrated = 0;
        const steps = 1000;
        const da_step = (finalCrack_mm - initialCrack_mm) / steps;
        
        for (let i = 0; i < steps; i++) {
            const a = (initialCrack_mm + i * da_step) / 1000;
            const K = stress_MPa * Math.sqrt(Math.PI * a);
            const dN = (da_step / 1000) / (C * Math.pow(K, m));
            N_integrated += dN;
        }
        
        return {
            C,
            m,
            deltaK_MPa_sqrt_m,
            crackGrowthRate_m_per_cycle: dadN,
            crackGrowthRate_mm_per_cycle: dadN * 1000,
            initialCrack_mm,
            finalCrack_mm,
            estimatedCycles: Math.round(N_integrated),
            warning: m < 2 || m > 5 ? 'Unusual Paris exponent' : null
        };
    },
    
    /**
     * Fracture toughness assessment
     * @param {Object} params - Assessment parameters
     * @returns {Object} Fracture assessment
     */
    fractureToughness: function(params) {
        const {
            K_applied_MPa_sqrt_m,
            K_IC_MPa_sqrt_m,          // Plane strain fracture toughness
            yield_MPa
        } = params;
        
        // Safety factor
        const safetyFactor = K_IC_MPa_sqrt_m / K_applied_MPa_sqrt_m;
        
        // Plastic zone size (plane strain)
        const r_p = (1 / (6 * Math.PI)) * Math.pow(K_applied_MPa_sqrt_m / yield_MPa, 2);
        
        // Critical crack length
        const a_critical = Math.pow(K_IC_MPa_sqrt_m, 2) / (Math.PI * Math.pow(yield_MPa, 2));
        
        return {
            K_applied_MPa_sqrt_m,
            K_IC_MPa_sqrt_m,
            safetyFactor: safetyFactor.toFixed(2),
            plasticZoneSize_mm: r_p * 1000,
            criticalCrackLength_mm: a_critical * 1000,
            prediction: safetyFactor < 1 ? 'FRACTURE PREDICTED' :
                        safetyFactor < 1.5 ? 'Critical - take action' :
                        safetyFactor < 2 ? 'Acceptable with monitoring' : 'Safe'
        };
    }
}