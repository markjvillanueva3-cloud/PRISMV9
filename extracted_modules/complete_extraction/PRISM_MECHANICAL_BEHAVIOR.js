const PRISM_MECHANICAL_BEHAVIOR = {
    
    /**
     * Power law (Hollomon) hardening model
     * @param {number} strain - True plastic strain
     * @param {Object} material - Material parameters
     * @returns {Object} Flow stress analysis
     */
    hollomonHardening: function(strain, material = {}) {
        const {
            K_MPa = 500,              // Strength coefficient
            n = 0.2,                  // Strain hardening exponent
            name = 'Custom'
        } = material;
        
        // σ = K × ε^n
        const stress = K_MPa * Math.pow(Math.max(strain, 1e-10), n);
        
        // Necking onset at ε = n
        const neckingStrain = n;
        const neckingStress = K_MPa * Math.pow(n, n);
        
        // Work hardening rate
        const dSigma_dEpsilon = n * stress / Math.max(strain, 1e-10);
        
        return {
            material: name,
            trueStrain: strain,
            trueStress_MPa: stress,
            workHardeningRate_MPa: dSigma_dEpsilon,
            instabilityPoint: {
                strain: neckingStrain,
                stress_MPa: neckingStress
            },
            parameters: { K_MPa, n }
        };
    },
    
    /**
     * Steady-state creep rate calculation
     * @param {Object} params - Creep parameters
     * @returns {Object} Creep rate analysis
     */
    creepRate: function(params) {
        const {
            stress_MPa = 100,
            temperature_C = 500,
            A = 1e10,                 // Pre-exponential factor
            n = 4,                    // Stress exponent
            Q_kJ_mol = 250,           // Activation energy
            mechanism = 'dislocation' // 'dislocation', 'nabarro_herring', 'coble'
        } = params;
        
        const T_K = temperature_C + 273.15;
        const R = 8.314;
        const Q = Q_kJ_mol * 1000;
        
        // ε̇ = A × σⁿ × exp(-Q/RT)
        let creepRate = A * Math.pow(stress_MPa, n) * Math.exp(-Q / (R * T_K));
        
        // For diffusion creep, adjust for grain size if provided
        let mechanismDescription;
        switch (mechanism) {
            case 'dislocation':
                mechanismDescription = 'Power-law dislocation creep (n = 3-8)';
                break;
            case 'nabarro_herring':
                mechanismDescription = 'Nabarro-Herring diffusion creep (n = 1)';
                break;
            case 'coble':
                mechanismDescription = 'Coble grain boundary diffusion (n = 1)';
                break;
            default:
                mechanismDescription = 'Custom mechanism';
        }
        
        // Time to 1% strain
        const timeTo1Percent = 0.01 / creepRate;
        
        return {
            stress_MPa,
            temperature_C,
            creepRate_per_s: creepRate,
            creepRate_per_hour: creepRate * 3600,
            timeTo1Percent_hours: timeTo1Percent / 3600,
            mechanism: mechanismDescription,
            parameters: { A, n, Q_kJ_mol }
        };
    },
    
    /**
     * Larson-Miller parameter for creep life prediction
     * @param {Object} params - LMP parameters
     * @returns {Object} Creep life prediction
     */
    larsonMiller: function(params) {
        const {
            temperature_C = 500,
            stress_MPa = 100,
            LMP = null,               // If known LMP for this stress
            C = 20,                   // LMP constant (typically 20)
            ruptureTime_hr = null     // If calculating LMP from test data
        } = params;
        
        const T_K = temperature_C + 273.15;
        
        if (ruptureTime_hr !== null) {
            // Calculate LMP from test data
            const calculatedLMP = T_K * (C + Math.log10(ruptureTime_hr));
            return {
                temperature_C,
                ruptureTime_hr,
                LMP: calculatedLMP,
                C,
                mode: 'Calculate LMP from test'
            };
        } else if (LMP !== null) {
            // Predict rupture time from known LMP
            const predictedTime = Math.pow(10, LMP / T_K - C);
            return {
                temperature_C,
                stress_MPa,
                LMP,
                predictedRuptureTime_hr: predictedTime,
                predictedRuptureTime_days: predictedTime / 24,
                predictedRuptureTime_years: predictedTime / 8760,
                C,
                mode: 'Predict life from LMP'
            };
        } else {
            throw new Error('Provide either LMP or ruptureTime_hr');
        }
    },
    
    /**
     * Basquin equation for high-cycle fatigue (S-N curve)
     * @param {Object} params - Fatigue parameters
     * @returns {Object} Fatigue life prediction
     */
    basquinFatigue: function(params) {
        const {
            stressAmplitude_MPa = null,
            cycles = null,
            sigma_f_MPa = 1000,       // Fatigue strength coefficient
            b = -0.1                  // Fatigue strength exponent
        } = params;
        
        if (stressAmplitude_MPa !== null) {
            // Calculate cycles to failure from stress
            // σ_a = σ'_f × (2N_f)^b
            // 2N_f = (σ_a / σ'_f)^(1/b)
            const twoNf = Math.pow(stressAmplitude_MPa / sigma_f_MPa, 1/b);
            const Nf = twoNf / 2;
            
            return {
                stressAmplitude_MPa,
                cyclesToFailure: Nf,
                reversals: twoNf,
                mode: 'Life from stress',
                parameters: { sigma_f_MPa, b }
            };
        } else if (cycles !== null) {
            // Calculate stress amplitude for given life
            const sigma_a = sigma_f_MPa * Math.pow(2 * cycles, b);
            
            return {
                targetCycles: cycles,
                stressAmplitude_MPa: sigma_a,
                mode: 'Stress from life',
                parameters: { sigma_f_MPa, b }
            };
        } else {
            throw new Error('Provide either stressAmplitude_MPa or cycles');
        }
    },
    
    /**
     * Coffin-Manson equation for low-cycle fatigue
     * @param {Object} params - Fatigue parameters
     * @returns {Object} Strain-life analysis
     */
    coffinManson: function(params) {
        const {
            strainAmplitude = null,   // Total strain amplitude
            cycles = null,
            E_MPa = 200000,           // Young's modulus
            sigma_f_MPa = 1000,       // Fatigue strength coefficient
            b = -0.1,                 // Fatigue strength exponent
            epsilon_f = 0.5,          // Fatigue ductility coefficient
            c = -0.6                  // Fatigue ductility exponent
        } = params;
        
        // Combined equation:
        // Δε/2 = (σ'_f/E)(2N_f)^b + ε'_f(2N_f)^c
        
        if (cycles !== null) {
            const twoNf = 2 * cycles;
            const elasticPart = (sigma_f_MPa / E_MPa) * Math.pow(twoNf, b);
            const plasticPart = epsilon_f * Math.pow(twoNf, c);
            const totalAmplitude = elasticPart + plasticPart;
            
            // Transition life (where elastic = plastic)
            const transitionLife = Math.pow(
                (epsilon_f * E_MPa / sigma_f_MPa), 
                1 / (b - c)
            ) / 2;
            
            return {
                targetCycles: cycles,
                strainAmplitude_total: totalAmplitude,
                strainAmplitude_elastic: elasticPart,
                strainAmplitude_plastic: plasticPart,
                transitionLife_cycles: transitionLife,
                regime: cycles < transitionLife ? 'Low-cycle (plastic)' : 'High-cycle (elastic)',
                parameters: { sigma_f_MPa, b, epsilon_f, c }
            };
        } else if (strainAmplitude !== null) {
            // Iteratively solve for Nf
            let Nf = 1000; // Initial guess
            for (let i = 0; i < 50; i++) {
                const twoNf = 2 * Nf;
                const calculated = (sigma_f_MPa / E_MPa) * Math.pow(twoNf, b) + 
                                  epsilon_f * Math.pow(twoNf, c);
                const ratio = strainAmplitude / calculated;
                Nf = Nf * Math.pow(ratio, 1 / Math.min(b, c));
                if (Math.abs(calculated - strainAmplitude) / strainAmplitude < 0.001) break;
            }
            
            return {
                strainAmplitude,
                cyclesToFailure: Nf,
                mode: 'Life from strain',
                parameters: { sigma_f_MPa, b, epsilon_f, c }
            };
        } else {
            throw new Error('Provide either strainAmplitude or cycles');
        }
    },
    
    /**
     * Miner's rule for cumulative fatigue damage
     * @param {Array} loadHistory - Array of {stress_MPa, cycles}
     * @param {Object} snParams - S-N curve parameters
     * @returns {Object} Damage analysis
     */
    minerDamage: function(loadHistory, snParams = {}) {
        const { sigma_f_MPa = 1000, b = -0.1 } = snParams;
        
        let totalDamage = 0;
        const details = loadHistory.map(load => {
            // Calculate Nf for this stress level
            const twoNf = Math.pow(load.stress_MPa / sigma_f_MPa, 1/b);
            const Nf = twoNf / 2;
            
            // Damage from this block
            const damage = load.cycles / Nf;
            totalDamage += damage;
            
            return {
                stress_MPa: load.stress_MPa,
                appliedCycles: load.cycles,
                allowableCycles: Nf,
                damage: damage,
                damagePercent: (damage * 100).toFixed(2)
            };
        });
        
        // Remaining life
        const damageFraction = totalDamage;
        const remainingLife = 1 - totalDamage;
        
        return {
            loadBlocks: details,
            totalDamage: totalDamage,
            damagePercent: (totalDamage * 100).toFixed(2),
            remainingLifeFraction: Math.max(0, remainingLife),
            prediction: totalDamage >= 1 ? 'FAILURE PREDICTED' : 
                        totalDamage >= 0.8 ? 'Critical - replace soon' :
                        totalDamage >= 0.5 ? 'Moderate damage' : 'Acceptable'
        };
    }
}