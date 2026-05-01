const PRISM_DESIGN = {
    
    /**
     * Bolted joint analysis
     * @param {Object} params - Joint parameters
     * @returns {Object} Joint analysis results
     */
    boltJoint: function(params) {
        const {
            At,          // Tensile stress area [mm²]
            E_bolt,      // Bolt modulus [MPa]
            E_member,    // Member modulus [MPa]
            L_grip,      // Grip length [mm]
            d,           // Nominal bolt diameter [mm]
            Fi,          // Preload [N]
            P            // External load [N]
        } = params;
        
        // Bolt stiffness
        const kb = At * E_bolt / L_grip;
        
        // Member stiffness (frustum approximation)
        const km = (Math.PI * E_member * d * Math.tan(30 * Math.PI / 180)) /
                   Math.log((L_grip + 0.5 * d) / (L_grip + 2.5 * d));
        
        // Joint constant
        const C = kb / (kb + km);
        
        // Bolt force under load
        const Fb = Fi + C * P;
        
        // Member force under load
        const Fm = Fi - (1 - C) * P;
        
        // Separation load
        const P_sep = Fi / (1 - C);
        
        // Safety factors
        const n_sep = P_sep / P;
        
        return {
            boltStiffness: kb,
            memberStiffness: km,
            jointConstant: C,
            boltForce: Fb,
            memberForce: Fm,
            separationLoad: P_sep,
            separationSafetyFactor: n_sep,
            jointSeparates: P >= P_sep
        };
    },
    
    /**
     * Shaft diameter calculation
     * @param {Object} params - Loading and material parameters
     * @returns {Object} Required shaft diameter
     */
    shaftDiameter: function(params) {
        const {
            M,           // Bending moment [N·mm]
            T,           // Torque [N·mm]
            Sy,          // Yield strength [MPa]
            n = 2        // Safety factor
        } = params;
        
        // DE-ASME (static, ductile materials)
        // d³ = (16n/π) × √[(M/Sy)² + (3/4)(T/Sy)²]
        const d_cubed = (16 * n / Math.PI) * 
            Math.sqrt(Math.pow(M / Sy, 2) + 0.75 * Math.pow(T / Sy, 2));
        
        const d = Math.pow(d_cubed, 1/3);
        
        // Round up to standard size
        const standardSizes = [6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 32, 35, 38, 40, 45, 50];
        const d_standard = standardSizes.find(s => s >= d) || Math.ceil(d);
        
        return {
            calculatedDiameter: d,
            recommendedDiameter: d_standard,
            safetyFactor: n,
            formula: 'd³ = (16n/π)√[(M/Sy)² + (3/4)(T/Sy)²]'
        };
    },
    
    /**
     * Ball bearing L10 life calculation
     * @param {Object} params - Bearing parameters
     * @returns {Object} Bearing life estimate
     */
    bearingLife: function(params) {
        const {
            C,           // Basic dynamic load rating [N]
            P,           // Equivalent dynamic load [N]
            n_rpm,       // Rotational speed [rpm]
            type = 'ball', // 'ball' or 'roller'
            a1 = 1,      // Reliability factor
            a2 = 1,      // Material factor
            a3 = 1       // Lubrication factor
        } = params;
        
        // Life exponent
        const p = type === 'ball' ? 3 : 10/3;
        
        // Basic L10 life (90% reliability)
        const L10_rev = Math.pow(C / P, p) * 1e6;  // Revolutions
        
        // L10 in hours
        const L10_hours = L10_rev / (60 * n_rpm);
        
        // Adjusted life
        const Lna = a1 * a2 * a3 * L10_hours;
        
        return {
            L10_revolutions: L10_rev,
            L10_hours,
            adjustedLife_hours: Lna,
            exponent: p,
            factors: { a1, a2, a3 },
            formula: 'L10 = (C/P)^p × 10⁶ revolutions'
        };
    },
    
    /**
     * Helical compression spring design
     * @param {Object} params - Spring parameters
     * @returns {Object} Spring characteristics
     */
    helicalSpring: function(params) {
        const {
            d,           // Wire diameter [mm]
            D,           // Mean coil diameter [mm]
            Na,          // Active coils
            G,           // Shear modulus [MPa]
            F = null     // Applied force [N] (optional)
        } = params;
        
        // Spring index
        const C_index = D / d;
        
        // Spring rate
        const k = G * Math.pow(d, 4) / (8 * Math.pow(D, 3) * Na);
        
        // Wahl factor (for fatigue)
        const Kw = (4 * C_index - 1) / (4 * C_index - 4) + 0.615 / C_index;
        
        // Shear stress correction (static)
        const Ks = 1 + 0.5 / C_index;
        
        const result = {
            springIndex: C_index,
            springRate: k,
            wahlFactor: Kw,
            staticFactor: Ks,
            indexValid: C_index >= 4 && C_index <= 12
        };
        
        if (F !== null) {
            // Shear stress under load
            const tau = Ks * 8 * F * D / (Math.PI * Math.pow(d, 3));
            const tau_fatigue = Kw * 8 * F * D / (Math.PI * Math.pow(d, 3));
            const deflection = F / k;
            
            result.shearStress = tau;
            result.fatigueStress = tau_fatigue;
            result.deflection = deflection;
        }
        
        return result;
    }
}