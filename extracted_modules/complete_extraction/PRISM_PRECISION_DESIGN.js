const PRISM_PRECISION_DESIGN = {
    
    /**
     * Calculate Abbe error from angular error and offset distance
     * @param {number} offset_mm - Abbe offset distance in mm
     * @param {number} angularError_arcsec - Angular error in arcseconds
     * @returns {Object} Error analysis with positioning error
     */
    abbeError: function(offset_mm, angularError_arcsec) {
        // Convert arcseconds to radians
        const theta_rad = angularError_arcsec * (Math.PI / 180) / 3600;
        
        // Abbe error: δ = L × sin(θ) ≈ L × θ for small angles
        const error_mm = offset_mm * Math.sin(theta_rad);
        const error_um = error_mm * 1000;
        
        return {
            offset_mm,
            angularError_arcsec,
            angularError_rad: theta_rad,
            positionError_mm: error_mm,
            positionError_um: error_um,
            recommendation: error_um > 1 ? 
                'Consider reducing Abbe offset or improving angular accuracy' : 
                'Acceptable for precision applications'
        };
    },
    
    /**
     * Thermal expansion calculator
     * @param {number} length_mm - Original length in mm
     * @param {number} deltaT_C - Temperature change in °C
     * @param {string} material - Material type
     * @returns {Object} Expansion analysis
     */
    thermalExpansion: function(length_mm, deltaT_C, material = 'steel') {
        // Coefficient of thermal expansion (CTE) × 10⁻⁶/°C
        const CTE = {
            'invar': 1.2,
            'super_invar': 0.3,
            'zerodur': 0.05,
            'granite': 6,
            'cast_iron': 11,
            'steel': 12,
            'stainless_steel': 16,
            'aluminum': 23,
            'brass': 19,
            'copper': 17,
            'titanium': 8.6
        };
        
        const alpha = CTE[material.toLowerCase()] || CTE['steel'];
        
        // ΔL = α × L × ΔT
        const deltaL_mm = alpha * 1e-6 * length_mm * deltaT_C;
        const deltaL_um = deltaL_mm * 1000;
        
        return {
            material,
            originalLength_mm: length_mm,
            temperatureChange_C: deltaT_C,
            cte_per_C: alpha * 1e-6,
            expansion_mm: deltaL_mm,
            expansion_um: deltaL_um,
            strainPPM: alpha * deltaT_C,
            recommendation: this._thermalRecommendation(deltaL_um, material)
        };
    },
    
    _thermalRecommendation: function(error_um, material) {
        if (error_um < 0.1) return 'Excellent thermal stability';
        if (error_um < 1) return 'Good for precision work';
        if (error_um < 10) return 'Consider temperature control or low-CTE material';
        return 'Significant thermal error - use Invar, active cooling, or compensation';
    },
    
    /**
     * Error budget calculation using RSS method
     * @param {Array} errors - Array of {name, value_um, type: 'systematic'|'random'}
     * @returns {Object} Combined error budget
     */
    errorBudget: function(errors) {
        const systematic = errors.filter(e => e.type === 'systematic');
        const random = errors.filter(e => e.type === 'random');
        
        // Systematic errors add algebraically (worst case)
        const systematicTotal = systematic.reduce((sum, e) => sum + Math.abs(e.value_um), 0);
        
        // Random errors combine RSS
        const randomRSS = Math.sqrt(random.reduce((sum, e) => sum + e.value_um ** 2, 0));
        
        // Total error (systematic + random RSS combined)
        const totalError = Math.sqrt(systematicTotal ** 2 + randomRSS ** 2);
        
        return {
            systematicErrors: systematic,
            randomErrors: random,
            systematicTotal_um: systematicTotal,
            randomRSS_um: randomRSS,
            totalError_um: totalError,
            breakdown: {
                systematic_percent: (systematicTotal / totalError * 100).toFixed(1),
                random_percent: (randomRSS / totalError * 100).toFixed(1)
            },
            largestContributors: [...errors].sort((a, b) => 
                Math.abs(b.value_um) - Math.abs(a.value_um)).slice(0, 3)
        };
    },
    
    /**
     * Kinematic coupling analysis (3-groove type)
     * @param {number} ballDiameter_mm - Ball diameter
     * @param {number} grooveAngle_deg - V-groove angle (typically 90°)
     * @param {number} preload_N - Applied preload force
     * @returns {Object} Coupling analysis
     */
    kinematicCoupling: function(ballDiameter_mm, grooveAngle_deg = 90, preload_N = 100) {
        const R = ballDiameter_mm / 2;
        const theta = grooveAngle_deg * Math.PI / 180 / 2; // Half angle
        
        // Contact force per ball (3 balls, 2 contacts each)
        const F_contact = preload_N / (6 * Math.sin(theta));
        
        // Hertzian contact radius (simplified for steel on steel)
        const E_star = 115000; // MPa for steel
        const contactRadius = Math.pow(3 * F_contact * R / (4 * E_star), 1/3);
        
        // Stiffness estimate
        const K_contact = 3 * F_contact / (2 * contactRadius);
        const K_total = 6 * K_contact; // 6 contact points
        
        return {
            ballDiameter_mm,
            grooveAngle_deg,
            preload_N,
            contactForce_N: F_contact,
            contactRadius_mm: contactRadius,
            stiffness_N_per_um: K_total / 1000,
            repeatability_um: 0.1 * R / Math.sqrt(K_total), // Empirical estimate
            constraints: 6,
            type: '3-groove kinematic coupling'
        };
    },
    
    /**
     * Hydrostatic bearing design
     * @param {Object} params - Bearing parameters
     * @returns {Object} Bearing analysis
     */
    hydrostaticBearing: function(params) {
        const {
            supplyPressure_MPa = 3,
            pocketArea_mm2 = 500,
            filmThickness_um = 20,
            viscosity_cP = 30,
            innerRadius_mm = 20,
            outerRadius_mm = 40
        } = params;
        
        const h0 = filmThickness_um / 1000; // mm
        const mu = viscosity_cP * 1e-9; // MPa·s
        
        // Load capacity (simplified)
        const loadCapacity_N = supplyPressure_MPa * pocketArea_mm2 * 0.5;
        
        // Stiffness (approximate)
        const stiffness_N_per_um = 3 * loadCapacity_N / filmThickness_um;
        
        // Flow rate (circular pad)
        const Q = Math.PI * Math.pow(h0, 3) * supplyPressure_MPa / 
                  (6 * mu * Math.log(outerRadius_mm / innerRadius_mm));
        
        // Power loss (pumping)
        const pumpPower_W = Q * supplyPressure_MPa * 1000;
        
        return {
            loadCapacity_N,
            stiffness_N_per_um,
            flowRate_cc_per_min: Q * 60000,
            pumpPower_W,
            filmThickness_um,
            supplyPressure_MPa,
            advantages: ['Zero friction', 'High stiffness', 'High damping'],
            disadvantages: ['Requires pump', 'Oil management', 'Temperature sensitive']
        };
    },
    
    /**
     * Leadscrew critical speed calculation
     * @param {number} diameter_mm - Screw diameter
     * @param {number} length_mm - Unsupported length
     * @param {string} endConditions - 'fixed-fixed', 'fixed-free', 'fixed-supported'
     * @returns {Object} Critical speed analysis
     */
    leadscrewCriticalSpeed: function(diameter_mm, length_mm, endConditions = 'fixed-supported') {
        const d = diameter_mm;
        const L = length_mm;
        
        // End condition factors
        const factors = {
            'fixed-free': 0.56,
            'fixed-supported': 1.25,
            'fixed-fixed': 2.23,
            'supported-supported': 1.0
        };
        
        const K = factors[endConditions] || 1.25;
        
        // Critical speed for steel (E = 207 GPa, ρ = 7850 kg/m³)
        // N_c = K × (d/L²) × 4.76×10⁶  [RPM]
        const Nc = K * (d / (L * L)) * 4.76e6;
        
        // Safe operating speed (70% of critical)
        const safeSpeed = Nc * 0.7;
        
        return {
            diameter_mm: d,
            length_mm: L,
            endConditions,
            endFactor: K,
            criticalSpeed_RPM: Math.round(Nc),
            safeOperatingSpeed_RPM: Math.round(safeSpeed),
            recommendation: safeSpeed < 1000 ? 
                'Consider shorter screw, larger diameter, or linear motor' :
                'Acceptable for typical machine tool applications'
        };
    }
}