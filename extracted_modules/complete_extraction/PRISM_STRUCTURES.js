const PRISM_STRUCTURES = {
    
    /**
     * Calculate beam bending stress
     * @param {Object} params - Beam parameters
     * @returns {Object} Stress analysis results
     */
    beamBendingStress: function(params) {
        const {
            moment,      // Bending moment [N·mm or lb·in]
            I,           // Second moment of area [mm⁴ or in⁴]
            y,           // Distance from neutral axis [mm or in]
            yMax = null  // Maximum distance (for max stress)
        } = params;
        
        const stress = moment * y / I;
        const maxStress = yMax ? moment * yMax / I : null;
        
        return {
            stress,
            maxStress,
            formula: 'σ = My/I',
            units: 'Same as M/I·y (typically MPa or psi)'
        };
    },
    
    /**
     * Calculate second moment of area for common sections
     * @param {string} type - Section type
     * @param {Object} dims - Dimensions
     * @returns {Object} Section properties
     */
    sectionProperties: function(type, dims) {
        let I, A, yMax, Z;
        
        switch (type.toLowerCase()) {
            case 'rectangle':
                // dims: {b: width, h: height}
                A = dims.b * dims.h;
                I = dims.b * Math.pow(dims.h, 3) / 12;
                yMax = dims.h / 2;
                Z = I / yMax;  // Section modulus
                break;
                
            case 'circle':
                // dims: {r: radius} or {d: diameter}
                const r = dims.r || dims.d / 2;
                A = Math.PI * r * r;
                I = Math.PI * Math.pow(r, 4) / 4;
                yMax = r;
                Z = I / yMax;
                break;
                
            case 'hollow_circle':
            case 'tube':
                // dims: {ro: outer radius, ri: inner radius}
                A = Math.PI * (dims.ro * dims.ro - dims.ri * dims.ri);
                I = Math.PI * (Math.pow(dims.ro, 4) - Math.pow(dims.ri, 4)) / 4;
                yMax = dims.ro;
                Z = I / yMax;
                break;
                
            case 'i_beam':
                // dims: {w: flange width, h: total height, tf: flange thickness, tw: web thickness}
                const hw = dims.h - 2 * dims.tf;  // Web height
                A = 2 * dims.w * dims.tf + hw * dims.tw;
                I = (dims.w * Math.pow(dims.h, 3) - (dims.w - dims.tw) * Math.pow(hw, 3)) / 12;
                yMax = dims.h / 2;
                Z = I / yMax;
                break;
                
            default:
                throw new Error(`Unknown section type: ${type}`);
        }
        
        return {
            type,
            area: A,
            momentOfInertia: I,
            yMax,
            sectionModulus: Z,
            radiusOfGyration: Math.sqrt(I / A)
        };
    },
    
    /**
     * Calculate beam deflection for standard cases
     * @param {Object} params - Beam and loading parameters
     * @returns {Object} Deflection results
     */
    beamDeflection: function(params) {
        const {
            type,        // 'cantilever_point', 'cantilever_uniform', 'simply_point', 'simply_uniform'
            L,           // Length
            E,           // Young's modulus
            I,           // Moment of inertia
            P = 0,       // Point load
            w = 0,       // Distributed load (per unit length)
            a = null     // Load position for point loads (from left support)
        } = params;
        
        let maxDeflection, maxSlope, deflectionAt;
        
        switch (type) {
            case 'cantilever_point':
                // Point load P at free end
                maxDeflection = P * Math.pow(L, 3) / (3 * E * I);
                maxSlope = P * Math.pow(L, 2) / (2 * E * I);
                deflectionAt = (x) => P * Math.pow(x, 2) * (3 * L - x) / (6 * E * I);
                break;
                
            case 'cantilever_uniform':
                // Uniform load w over entire length
                maxDeflection = w * Math.pow(L, 4) / (8 * E * I);
                maxSlope = w * Math.pow(L, 3) / (6 * E * I);
                deflectionAt = (x) => w * Math.pow(x, 2) * (6 * L * L - 4 * L * x + x * x) / (24 * E * I);
                break;
                
            case 'simply_point':
                // Point load P at center of simply supported beam
                maxDeflection = P * Math.pow(L, 3) / (48 * E * I);
                maxSlope = P * Math.pow(L, 2) / (16 * E * I);
                deflectionAt = (x) => {
                    if (x <= L/2) {
                        return P * x * (3 * L * L - 4 * x * x) / (48 * E * I);
                    } else {
                        return P * (L - x) * (3 * L * L - 4 * Math.pow(L - x, 2)) / (48 * E * I);
                    }
                };
                break;
                
            case 'simply_uniform':
                // Uniform load w on simply supported beam
                maxDeflection = 5 * w * Math.pow(L, 4) / (384 * E * I);
                maxSlope = w * Math.pow(L, 3) / (24 * E * I);
                deflectionAt = (x) => w * x * (L - x) * (L * L + x * (L - x)) / (24 * E * I);
                break;
                
            default:
                throw new Error(`Unknown beam type: ${type}`);
        }
        
        return {
            type,
            maxDeflection,
            maxSlope,
            deflectionAt,
            stiffness: type.includes('point') ? P / maxDeflection : w * L / maxDeflection
        };
    },
    
    /**
     * Euler buckling analysis
     * @param {Object} params - Column parameters
     * @returns {Object} Buckling results
     */
    eulerBuckling: function(params) {
        const {
            E,           // Young's modulus
            I,           // Minimum moment of inertia
            L,           // Length
            endCondition = 'pinned-pinned',  // End condition
            A = null,    // Cross-sectional area (for stress calc)
            sigmaY = null // Yield stress (for applicability check)
        } = params;
        
        // Effective length factors
        const K_factors = {
            'fixed-fixed': 0.5,
            'fixed-pinned': 0.7,
            'pinned-pinned': 1.0,
            'fixed-free': 2.0
        };
        
        const K = K_factors[endCondition] || 1.0;
        const Le = K * L;  // Effective length
        
        // Critical load
        const Pcr = Math.PI * Math.PI * E * I / (Le * Le);
        
        // Results object
        const result = {
            criticalLoad: Pcr,
            effectiveLength: Le,
            effectiveLengthFactor: K,
            endCondition
        };
        
        // Additional calculations if area provided
        if (A) {
            const r = Math.sqrt(I / A);  // Radius of gyration
            const slenderness = Le / r;
            const criticalStress = Pcr / A;
            
            result.radiusOfGyration = r;
            result.slendernessRatio = slenderness;
            result.criticalStress = criticalStress;
            
            // Check applicability (Euler valid for long columns)
            if (sigmaY) {
                const transitionSlenderness = Math.PI * Math.sqrt(E / sigmaY);
                result.transitionSlenderness = transitionSlenderness;
                result.eulerValid = slenderness > transitionSlenderness;
                result.safetyFactor = sigmaY / criticalStress;
            }
        }
        
        return result;
    },
    
    /**
     * Shaft torsion analysis
     * @param {Object} params - Shaft parameters
     * @returns {Object} Torsion results
     */
    shaftTorsion: function(params) {
        const {
            T,           // Torque
            L,           // Length
            G,           // Shear modulus
            type = 'solid',
            ro,          // Outer radius
            ri = 0       // Inner radius (for hollow)
        } = params;
        
        // Polar moment of inertia
        const J = type === 'hollow' 
            ? Math.PI * (Math.pow(ro, 4) - Math.pow(ri, 4)) / 2
            : Math.PI * Math.pow(ro, 4) / 2;
        
        // Maximum shear stress (at outer surface)
        const tauMax = T * ro / J;
        
        // Angle of twist
        const phi = T * L / (G * J);
        
        return {
            polarMomentOfInertia: J,
            maxShearStress: tauMax,
            angleOfTwist: phi,
            angleOfTwistDegrees: phi * 180 / Math.PI,
            torsionalStiffness: G * J / L
        };
    }
}