/**
 * PRISM_STRESS_ANALYSIS
 * Extracted from PRISM v8.89.002 monolith
 * References: 15
 * Category: mechanics
 * Lines: 246
 * Session: R2.3.4 Formula Extraction
 */

const PRISM_STRESS_ANALYSIS = {
    
    /**
     * Calculate Von Mises equivalent stress
     * @param {Object} stress - Stress tensor components
     * @returns {Object} Von Mises stress and analysis
     */
    vonMises: function(stress) {
        const {
            sigma_x = 0, sigma_y = 0, sigma_z = 0,
            tau_xy = 0, tau_yz = 0, tau_xz = 0
        } = stress;
        
        // Von Mises formula
        const vm = Math.sqrt(
            0.5 * (
                Math.pow(sigma_x - sigma_y, 2) +
                Math.pow(sigma_y - sigma_z, 2) +
                Math.pow(sigma_z - sigma_x, 2) +
                6 * (tau_xy * tau_xy + tau_yz * tau_yz + tau_xz * tau_xz)
            )
        );
        
        // Hydrostatic stress
        const hydrostatic = (sigma_x + sigma_y + sigma_z) / 3;
        
        // Deviatoric stresses
        const s_x = sigma_x - hydrostatic;
        const s_y = sigma_y - hydrostatic;
        const s_z = sigma_z - hydrostatic;
        
        return {
            vonMises_MPa: vm,
            hydrostatic_MPa: hydrostatic,
            deviatoric: { s_x, s_y, s_z },
            triaxiality: hydrostatic / (vm || 1),
            inputStress: stress
        };
    },
    
    /**
     * Calculate principal stresses from stress tensor
     * @param {Object} stress - Stress tensor components
     * @returns {Object} Principal stresses and directions
     */
    principalStresses: function(stress) {
        const {
            sigma_x = 0, sigma_y = 0, sigma_z = 0,
            tau_xy = 0, tau_yz = 0, tau_xz = 0
        } = stress;
        
        // Stress invariants
        const I1 = sigma_x + sigma_y + sigma_z;
        const I2 = sigma_x * sigma_y + sigma_y * sigma_z + sigma_z * sigma_x
                   - tau_xy * tau_xy - tau_yz * tau_yz - tau_xz * tau_xz;
        const I3 = sigma_x * sigma_y * sigma_z 
                   + 2 * tau_xy * tau_yz * tau_xz
                   - sigma_x * tau_yz * tau_yz 
                   - sigma_y * tau_xz * tau_xz 
                   - sigma_z * tau_xy * tau_xy;
        
        // Solve cubic equation: σ³ - I1σ² + I2σ - I3 = 0
        // Using trigonometric solution for real roots
        const p = I2 - I1 * I1 / 3;
        const q = 2 * Math.pow(I1 / 3, 3) - I1 * I2 / 3 + I3;
        
        let sigma1, sigma2, sigma3;
        
        if (Math.abs(p) < 1e-10) {
            // Special case: nearly hydrostatic
            sigma1 = sigma2 = sigma3 = I1 / 3;
        } else {
            const phi = Math.acos(Math.max(-1, Math.min(1, 
                3 * q / (2 * p) * Math.sqrt(-3 / p)))) / 3;
            const t = 2 * Math.sqrt(-p / 3);
            
            sigma1 = t * Math.cos(phi) + I1 / 3;
            sigma2 = t * Math.cos(phi - 2 * Math.PI / 3) + I1 / 3;
            sigma3 = t * Math.cos(phi - 4 * Math.PI / 3) + I1 / 3;
        }
        
        // Sort: σ1 > σ2 > σ3
        const principals = [sigma1, sigma2, sigma3].sort((a, b) => b - a);
        
        // Maximum shear stress (Tresca)
        const tau_max = (principals[0] - principals[2]) / 2;
        
        return {
            sigma1: principals[0],
            sigma2: principals[1],
            sigma3: principals[2],
            maxShear_MPa: tau_max,
            invariants: { I1, I2, I3 },
            meanStress: I1 / 3
        };
    },
    
    /**
     * Convert engineering strain to true strain
     * @param {number} engStrain - Engineering strain (decimal, e.g., 0.1 for 10%)
     * @returns {Object} Strain conversions
     */
    trueStrain: function(engStrain) {
        const trueStrain = Math.log(1 + engStrain);
        const stretchRatio = 1 + engStrain;
        
        return {
            engineeringStrain: engStrain,
            engineeringStrain_percent: engStrain * 100,
            trueStrain: trueStrain,
            trueStrain_percent: trueStrain * 100,
            stretchRatio: stretchRatio,
            // For constant volume plasticity
            trueStress_factor: stretchRatio // σ_true = σ_eng × (1 + ε_eng)
        };
    },
    
    /**
     * Convert between elastic constants
     * @param {Object} known - Known elastic constants
     * @returns {Object} All elastic constants
     */
    elasticConstants: function(known) {
        let E, G, K, nu, lambda;
        
        if (known.E && known.nu) {
            E = known.E;
            nu = known.nu;
            G = E / (2 * (1 + nu));
            K = E / (3 * (1 - 2 * nu));
            lambda = E * nu / ((1 + nu) * (1 - 2 * nu));
        } else if (known.E && known.G) {
            E = known.E;
            G = known.G;
            nu = E / (2 * G) - 1;
            K = E / (3 * (1 - 2 * nu));
            lambda = G * (E - 2 * G) / (3 * G - E);
        } else if (known.K && known.G) {
            K = known.K;
            G = known.G;
            E = 9 * K * G / (3 * K + G);
            nu = (3 * K - 2 * G) / (2 * (3 * K + G));
            lambda = K - 2 * G / 3;
        } else if (known.lambda && known.G) {
            lambda = known.lambda;
            G = known.G;
            E = G * (3 * lambda + 2 * G) / (lambda + G);
            nu = lambda / (2 * (lambda + G));
            K = lambda + 2 * G / 3;
        } else {
            throw new Error('Provide (E, nu), (E, G), (K, G), or (lambda, G)');
        }
        
        // Verify relationships
        const verification = {
            E_check: 9 * K * G / (3 * K + G),
            nu_check: (3 * K - 2 * G) / (2 * (3 * K + G))
        };
        
        return {
            E_MPa: E,
            G_MPa: G,
            K_MPa: K,
            nu: nu,
            lambda_MPa: lambda,
            description: {
                E: "Young's modulus (tension/compression)",
                G: "Shear modulus",
                K: "Bulk modulus (volumetric)",
                nu: "Poisson's ratio",
                lambda: "Lamé's first parameter"
            }
        };
    },
    
    /**
     * Beam deflection calculations
     * @param {Object} params - Beam parameters
     * @returns {Object} Deflection analysis
     */
    beamDeflection: function(params) {
        const {
            type = 'cantilever_point',
            length_mm,
            E_MPa,
            I_mm4,
            load_N,
            loadPosition_mm = null
        } = params;
        
        const L = length_mm;
        const EI = E_MPa * I_mm4;
        const P = load_N;
        
        let maxDeflection, maxLocation, formula;
        
        switch (type) {
            case 'cantilever_point':
                // Point load at end
                maxDeflection = P * Math.pow(L, 3) / (3 * EI);
                maxLocation = L;
                formula = 'δ = PL³/(3EI)';
                break;
                
            case 'cantilever_uniform':
                // Uniform load
                maxDeflection = P * Math.pow(L, 4) / (8 * EI);
                maxLocation = L;
                formula = 'δ = wL⁴/(8EI)';
                break;
                
            case 'simply_supported_center':
                // Point load at center
                maxDeflection = P * Math.pow(L, 3) / (48 * EI);
                maxLocation = L / 2;
                formula = 'δ = PL³/(48EI)';
                break;
                
            case 'simply_supported_uniform':
                // Uniform load
                maxDeflection = 5 * P * Math.pow(L, 4) / (384 * EI);
                maxLocation = L / 2;
                formula = 'δ = 5wL⁴/(384EI)';
                break;
                
            case 'fixed_fixed_center':
                // Fixed-fixed, point load at center
                maxDeflection = P * Math.pow(L, 3) / (192 * EI);
                maxLocation = L / 2;
                formula = 'δ = PL³/(192EI)';
                break;
                
            default:
                throw new Error(`Unknown beam type: ${type}`);
        }
        
        return {
            type,
            maxDeflection_mm: maxDeflection,
            maxLocation_mm: maxLocation,
            formula,
            stiffness_N_per_mm: P / maxDeflection,
            inputs: { length_mm, E_MPa, I_mm4, load_N }
        };
    }
}