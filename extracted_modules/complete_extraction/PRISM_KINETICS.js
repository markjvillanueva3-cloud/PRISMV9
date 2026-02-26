const PRISM_KINETICS = {
    
    /**
     * Calculate diffusion coefficient using Arrhenius equation
     * @param {number} temperature_C - Temperature in Celsius
     * @param {Object} material - Diffusion parameters
     * @returns {Object} Diffusion coefficient and analysis
     */
    diffusionCoefficient: function(temperature_C, material = {}) {
        const {
            D0_m2_s = 1e-4,           // Pre-exponential factor
            Q_kJ_mol = 150,           // Activation energy
            name = 'Custom'
        } = material;
        
        const T_K = temperature_C + 273.15;
        const R = 8.314; // J/(mol·K)
        const Q = Q_kJ_mol * 1000; // Convert to J/mol
        
        // D = D0 × exp(-Q/RT)
        const D = D0_m2_s * Math.exp(-Q / (R * T_K));
        
        // Characteristic diffusion distance in 1 hour
        const x_1hr = Math.sqrt(D * 3600) * 1000; // mm
        
        return {
            material: name,
            temperature_C,
            temperature_K: T_K,
            D_m2_s: D,
            D_cm2_s: D * 1e4,
            diffusionLength_1hr_mm: x_1hr,
            diffusionLength_1hr_um: x_1hr * 1000,
            parameters: { D0_m2_s, Q_kJ_mol }
        };
    },
    
    /**
     * Diffusion profile for semi-infinite solid
     * @param {Object} params - Diffusion parameters
     * @returns {Object} Concentration profile
     */
    diffusionProfile: function(params) {
        const {
            C0 = 0,                   // Initial concentration
            Cs = 1,                   // Surface concentration
            D_m2_s,                   // Diffusion coefficient
            time_s,                   // Time in seconds
            depths_mm = [0, 0.1, 0.2, 0.5, 1, 2, 5] // Depths to calculate
        } = params;
        
        const profile = depths_mm.map(x_mm => {
            const x = x_mm / 1000; // Convert to meters
            const argument = x / (2 * Math.sqrt(D_m2_s * time_s));
            const erf_val = this._erf(argument);
            const C = C0 + (Cs - C0) * (1 - erf_val);
            
            return {
                depth_mm: x_mm,
                depth_um: x_mm * 1000,
                concentration: C,
                normalized: (C - C0) / (Cs - C0)
            };
        });
        
        // Characteristic diffusion length
        const diffLength = Math.sqrt(D_m2_s * time_s) * 1000; // mm
        
        return {
            C0,
            Cs,
            D_m2_s,
            time_s,
            time_hours: time_s / 3600,
            characteristicLength_mm: diffLength,
            profile
        };
    },
    
    // Error function approximation
    _erf: function(x) {
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;
        
        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x);
        
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        
        return sign * y;
    },
    
    /**
     * Calculate critical nucleus size for phase transformation
     * @param {Object} params - Nucleation parameters
     * @returns {Object} Critical nucleus analysis
     */
    criticalNucleus: function(params) {
        const {
            gamma_J_m2 = 0.5,         // Surface energy
            deltaGv_J_m3 = -1e8,      // Volume free energy change (negative for transformation)
            temperature_C = 500
        } = params;
        
        const T_K = temperature_C + 273.15;
        
        // Critical radius: r* = -2γ/ΔGv
        const r_star = -2 * gamma_J_m2 / deltaGv_J_m3;
        
        // Critical free energy: ΔG* = (16πγ³)/(3ΔGv²)
        const deltaG_star = (16 * Math.PI * Math.pow(gamma_J_m2, 3)) / 
                           (3 * Math.pow(deltaGv_J_m3, 2));
        
        // Number of atoms in critical nucleus (approximate for metallic system)
        const atomVolume = 2e-29; // m³ typical
        const n_star = (4/3) * Math.PI * Math.pow(r_star, 3) / atomVolume;
        
        // Boltzmann factor
        const kB = 1.38e-23;
        const nucleationBarrier = deltaG_star / (kB * T_K);
        
        return {
            criticalRadius_m: r_star,
            criticalRadius_nm: r_star * 1e9,
            criticalFreeEnergy_J: deltaG_star,
            criticalFreeEnergy_kT: nucleationBarrier,
            atomsInNucleus: Math.round(n_star),
            temperature_C,
            parameters: { gamma_J_m2, deltaGv_J_m3 }
        };
    },
    
    /**
     * Avrami equation for transformation kinetics
     * @param {Object} params - Transformation parameters
     * @returns {Object} Transformation fraction over time
     */
    avramiTransformation: function(params) {
        const {
            k = 0.01,                 // Rate constant (s^-n)
            n = 3,                    // Avrami exponent
            times_s = [0, 60, 120, 300, 600, 1200, 3600] // Times to calculate
        } = params;
        
        const profile = times_s.map(t => {
            // f = 1 - exp(-kt^n)
            const f = 1 - Math.exp(-k * Math.pow(t, n));
            return {
                time_s: t,
                time_min: t / 60,
                fractionTransformed: f,
                fractionRemaining: 1 - f
            };
        });
        
        // Time for 50% transformation
        const t_half = Math.pow(Math.log(2) / k, 1/n);
        
        // Interpretation of n
        let interpretation;
        if (n <= 1) interpretation = '1D growth, site saturation';
        else if (n <= 2) interpretation = '2D growth or 1D + continuous nucleation';
        else if (n <= 3) interpretation = '3D growth, site saturation';
        else interpretation = '3D growth with continuous nucleation';
        
        return {
            k,
            n,
            interpretation,
            halfTime_s: t_half,
            halfTime_min: t_half / 60,
            profile
        };
    }
}