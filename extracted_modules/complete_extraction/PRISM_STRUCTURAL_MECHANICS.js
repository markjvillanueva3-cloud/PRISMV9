const PRISM_STRUCTURAL_MECHANICS = {
    name: 'PRISM_STRUCTURAL_MECHANICS',
    version: '1.0.0',
    source: 'MIT 2.001, 2.72 - Mechanics of Materials',
    
    /**
     * Hertz Contact Mechanics
     * Sphere-on-flat and cylinder-on-flat
     */
    hertzContact: function(params) {
        const {
            type = 'sphere_flat', // 'sphere_flat', 'cylinder_flat', 'sphere_sphere'
            load,                 // N
            radius1,              // mm (sphere or cylinder radius)
            radius2 = Infinity,   // mm (second body radius, Infinity for flat)
            E1,                   // MPa (Young's modulus body 1)
            E2,                   // MPa (Young's modulus body 2)
            nu1 = 0.3,           // Poisson's ratio body 1
            nu2 = 0.3,           // Poisson's ratio body 2
            length = 1           // mm (for cylinder contact)
        } = params;
        
        // Effective modulus
        const E_star = 1 / ((1 - nu1*nu1) / E1 + (1 - nu2*nu2) / E2);
        
        // Effective radius
        const R_eff = 1 / (1/radius1 + (radius2 === Infinity ? 0 : 1/radius2));
        
        let contactRadius, maxPressure, maxShearStress, approach;
        
        if (type === 'sphere_flat' || type === 'sphere_sphere') {
            // Hertz sphere contact
            contactRadius = Math.pow((3 * load * R_eff) / (4 * E_star), 1/3);
            maxPressure = (3 * load) / (2 * Math.PI * contactRadius * contactRadius);
            maxShearStress = 0.31 * maxPressure; // At depth z = 0.48a
            approach = Math.pow(contactRadius, 2) / R_eff;
            
        } else if (type === 'cylinder_flat') {
            // Hertz cylinder contact
            const halfWidth = Math.sqrt((4 * load * R_eff) / (Math.PI * E_star * length));
            contactRadius = halfWidth;
            maxPressure = (2 * load) / (Math.PI * halfWidth * length);
            maxShearStress = 0.30 * maxPressure;
            approach = (load / (Math.PI * E_star * length)) * (Math.log(4 * R_eff / halfWidth) + 0.5);
        }
        
        return {
            contactRadius: contactRadius,     // mm
            contactArea: Math.PI * contactRadius * contactRadius, // mm²
            maxPressure: maxPressure,         // MPa
            meanPressure: maxPressure * 2/3,  // MPa
            maxShearStress: maxShearStress,   // MPa
            approach: approach,               // mm (elastic deformation)
            effectiveModulus: E_star,
            effectiveRadius: R_eff
        };
    },
    
    /**
     * Stress Concentration Factors
     */
    stressConcentration: function(params) {
        const {
            type,    // 'hole', 'fillet', 'groove', 'shoulder'
            geometry // Type-specific parameters
        } = params;
        
        let Kt;
        
        switch (type) {
            case 'hole':
                // Circular hole in infinite plate
                Kt = 3.0;
                break;
                
            case 'fillet':
                // Shoulder fillet
                const { D, d, r } = geometry; // Major diameter, minor diameter, fillet radius
                const ratio_D_d = D / d;
                const ratio_r_d = r / d;
                // Peterson's formula approximation
                Kt = 1 + (ratio_D_d - 1) * (0.27 + 1.57 * Math.sqrt(ratio_D_d - 1)) / 
                     (1 + 0.775 * Math.pow(ratio_r_d, 0.5));
                Kt = Math.min(Kt, 3.5); // Cap at reasonable value
                break;
                
            case 'groove':
                // U-groove in shaft
                const { D_g, d_g, r_g } = geometry;
                Kt = 1 + 2 * Math.sqrt((D_g - d_g) / (2 * r_g));
                break;
                
            case 'shoulder':
                // Sharp shoulder
                Kt = 2.5;
                break;
                
            default:
                Kt = 1.5;
        }
        
        return {
            Kt: Kt,
            stressMultiplier: Kt,
            recommendation: Kt > 2 ? 'Add fillet radius to reduce concentration' : 'Acceptable'
        };
    },
    
    /**
     * Goodman Fatigue Analysis
     * Modified Goodman diagram for fatigue life
     */
    goodmanFatigue: function(params) {
        const {
            meanStress,        // MPa
            alternatingStress, // MPa
            ultimateStrength,  // MPa
            yieldStrength,     // MPa
            enduranceLimit,    // MPa (Se' = 0.5*Sut for steel)
            Kt = 1,           // Stress concentration
            Kf = null,        // Fatigue stress concentration (calculated if null)
            surfaceFactor = 0.9,   // ka
            sizeFactor = 0.85,     // kb
            loadFactor = 1.0,      // kc
            tempFactor = 1.0,      // kd
            reliabilityFactor = 0.814 // ke (99% reliability)
        } = params;
        
        // Modified endurance limit
        const Se = surfaceFactor * sizeFactor * loadFactor * tempFactor * reliabilityFactor * enduranceLimit;
        
        // Fatigue stress concentration (notch sensitivity)
        let Kf_calc;
        if (Kf === null) {
            // Peterson's equation: Kf = 1 + q*(Kt - 1)
            // q depends on material and notch radius, assume q = 0.8
            const q = 0.8;
            Kf_calc = 1 + q * (Kt - 1);
        } else {
            Kf_calc = Kf;
        }
        
        // Corrected stresses
        const sigma_a = Kf_calc * alternatingStress;
        const sigma_m = Kf_calc * meanStress;
        
        // Modified Goodman criterion
        // σa/Se + σm/Sut = 1/n
        const goodmanFactor = sigma_a / Se + sigma_m / ultimateStrength;
        const safetyFactor = 1 / goodmanFactor;
        
        // Yield criterion (Langer)
        const yieldFactor = (sigma_a + sigma_m) / yieldStrength;
        const yieldSafety = 1 / yieldFactor;
        
        // Determine failure mode
        const failureMode = safetyFactor < yieldSafety ? 'fatigue' : 'yield';
        const criticalSafety = Math.min(safetyFactor, yieldSafety);
        
        return {
            modifiedEnduranceLimit: Se,
            fatigueConcentration: Kf_calc,
            correctedAlternatingStress: sigma_a,
            correctedMeanStress: sigma_m,
            goodmanSafetyFactor: safetyFactor,
            yieldSafetyFactor: yieldSafety,
            criticalSafetyFactor: criticalSafety,
            failureMode,
            safe: criticalSafety > 1.5,
            recommendation: criticalSafety < 1 ? 'FAILURE PREDICTED - Redesign required' :
                           criticalSafety < 1.5 ? 'Marginal safety - Consider redesign' :
                           criticalSafety < 2 ? 'Acceptable for non-critical applications' :
                           'Safe design'
        };
    },
    
    /**
     * Euler Buckling Analysis
     */
    eulerBuckling: function(params) {
        const {
            length,           // mm
            momentOfInertia,  // mm⁴
            youngsModulus,    // MPa
            endCondition = 'pinned_pinned', // 'fixed_fixed', 'fixed_free', 'fixed_pinned', 'pinned_pinned'
            crossSectionArea, // mm²
            appliedLoad       // N (optional, for safety factor)
        } = params;
        
        // Effective length factor (K)
        const K = {
            'fixed_fixed': 0.5,
            'fixed_pinned': 0.7,
            'pinned_pinned': 1.0,
            'fixed_free': 2.0
        }[endCondition] || 1.0;
        
        // Effective length
        const Le = K * length;
        
        // Critical buckling load
        const Pcr = Math.PI * Math.PI * youngsModulus * momentOfInertia / (Le * Le);
        
        // Slenderness ratio
        const radiusOfGyration = Math.sqrt(momentOfInertia / crossSectionArea);
        const slenderness = Le / radiusOfGyration;
        
        // Critical stress
        const sigmaCr = Pcr / crossSectionArea;
        
        // Safety factor if load given
        let safetyFactor = null;
        if (appliedLoad) {
            safetyFactor = Pcr / appliedLoad;
        }
        
        return {
            criticalLoad: Pcr,        // N
            criticalStress: sigmaCr,  // MPa
            effectiveLength: Le,      // mm
            slendernessRatio: slenderness,
            radiusOfGyration: radiusOfGyration,
            safetyFactor,
            recommendation: slenderness > 120 ? 'Long column - Euler valid' :
                           slenderness > 60 ? 'Intermediate - Use Johnson formula' :
                           'Short column - Yielding governs'
        };
    }
}