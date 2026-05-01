// PRISM_CUTTING_MECHANICS_ENGINE - Lines 953734-954010 (277 lines) - Cutting mechanics\n\nconst PRISM_CUTTING_MECHANICS_ENGINE = {
    name: 'PRISM_CUTTING_MECHANICS_ENGINE',
    version: '1.0.0',
    source: 'MIT 2.008, Merchant 1945, Shaw Metal Cutting',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MERCHANT'S CUTTING ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Merchant's orthogonal cutting model
     * @param {Object} params - Cutting parameters
     * @returns {Object} Complete force analysis
     */
    merchantAnalysis: function(params) {
        const {
            chipThickness: h,      // Uncut chip thickness (mm)
            width: b,              // Width of cut (mm)
            rakeAngle: alpha,      // Rake angle (radians)
            shearStrength: tau_s,  // Shear strength of workpiece (MPa)
            frictionCoeff: mu = 0.5 // Coefficient of friction
        } = params;
        
        // Friction angle
        const beta = Math.atan(mu);
        
        // Merchant's minimum energy criterion for shear angle
        // φ = π/4 - (β - α)/2
        const phi = Math.PI / 4 - (beta - alpha) / 2;
        
        // Alternative: Lee-Shaffer solution
        // φ = π/4 - β + α
        const phi_leeShaffer = Math.PI / 4 - beta + alpha;
        
        // Chip ratio (cutting ratio)
        const r_c = Math.cos(phi - alpha) / Math.cos(alpha);
        
        // Chip thickness
        const h_c = h / r_c;
        
        // Shear plane area
        const A_s = (b * h) / Math.sin(phi);
        
        // Shear velocity
        // V_s = V_c * cos(α) / cos(φ - α)
        
        // Shear force
        const F_s = tau_s * A_s;
        
        // Resultant force
        const R = F_s / Math.cos(phi + beta - alpha);
        
        // Cutting force (tangential)
        const F_c = R * Math.cos(beta - alpha);
        
        // Thrust force (feed direction)
        const F_t = R * Math.sin(beta - alpha);
        
        // Friction force (on rake face)
        const F_f = R * Math.sin(beta);
        
        // Normal force (on rake face)
        const F_n = R * Math.cos(beta);
        
        // Power consumption
        // P = F_c * V_c (need cutting speed)
        
        // Specific cutting energy (energy per unit volume)
        const u_c = F_c / (b * h); // J/mm³ = N/mm² = MPa
        
        return {
            shearAngle_rad: phi,
            shearAngle_deg: phi * 180 / Math.PI,
            frictionAngle_rad: beta,
            frictionAngle_deg: beta * 180 / Math.PI,
            chipRatio: r_c,
            chipThickness_mm: h_c,
            chipCompressionRatio: 1 / r_c,
            shearPlaneArea_mm2: A_s,
            forces: {
                shear_N: F_s,
                resultant_N: R,
                cutting_N: F_c,
                thrust_N: F_t,
                friction_N: F_f,
                normal_N: F_n
            },
            specificCuttingEnergy_MPa: u_c,
            coefficientOfFriction: mu,
            leeShaffer_phi_deg: phi_leeShaffer * 180 / Math.PI
        };
    },
    
    /**
     * Kienzle cutting force model
     * Fc = Kc × b × h
     * Kc = Kc1.1 × h^(-mc)
     */
    kienzleForce: function(params) {
        const {
            chipThickness: h,     // mm
            width: b,             // mm
            Kc1_1,               // Specific cutting force at h=1mm, b=1mm (N/mm²)
            mc = 0.25            // Material constant
        } = params;
        
        // Size effect: specific cutting force depends on chip thickness
        const Kc = Kc1_1 * Math.pow(h, -mc);
        
        // Main cutting force
        const Fc = Kc * b * h;
        
        // Corrected chip area
        const chipArea = b * h;
        
        return {
            specificCuttingForce_N_mm2: Kc,
            cuttingForce_N: Fc,
            chipArea_mm2: chipArea,
            Kc1_1,
            exponent_mc: mc,
            sizeEffectFactor: Math.pow(h, -mc)
        };
    },
    
    /**
     * Complete milling force model with tooth engagement
     * @param {Object} tool - Tool geometry
     * @param {Object} params - Cutting conditions
     * @returns {Object} Time-varying forces
     */
    millingForces: function(tool, params) {
        const {
            diameter: D,
            teeth: z,
            helixAngle: helix = 30,
            rakeAngle: alpha_r = 10
        } = tool;
        
        const {
            rpm,
            feed: f_z,           // Feed per tooth (mm)
            axialDepth: a_p,     // mm
            radialDepth: a_e,    // mm
            Ktc,                 // Tangential specific force (N/mm²)
            Krc = 0.3 * Ktc,     // Radial specific force
            Kac = 0.1 * Ktc      // Axial specific force
        } = params;
        
        const R = D / 2;
        const radialImmersion = a_e / D;
        
        // Entry and exit angles
        const phi_st = this._entryAngle(radialImmersion, 'down');
        const phi_ex = this._exitAngle(radialImmersion, 'down');
        
        // Generate force profile over one revolution
        const points = 360;
        const forces = [];
        
        for (let i = 0; i < points; i++) {
            const phi = (i / points) * 2 * Math.PI;
            
            let Fx = 0, Fy = 0, Fz = 0;
            
            // Sum contributions from each tooth
            for (let tooth = 0; tooth < z; tooth++) {
                const phi_tooth = phi + tooth * (2 * Math.PI / z);
                const phi_tooth_mod = phi_tooth % (2 * Math.PI);
                
                // Check if tooth is engaged
                if (phi_tooth_mod >= phi_st && phi_tooth_mod <= phi_ex) {
                    // Instantaneous chip thickness
                    const h = f_z * Math.sin(phi_tooth_mod);
                    
                    if (h > 0) {
                        // Tangential force
                        const Ft = Ktc * a_p * h;
                        // Radial force
                        const Fr = Krc * a_p * h;
                        // Axial force
                        const Fa = Kac * a_p * h;
                        
                        // Transform to XYZ (workpiece coordinates)
                        Fx += -Ft * Math.cos(phi_tooth_mod) - Fr * Math.sin(phi_tooth_mod);
                        Fy += Ft * Math.sin(phi_tooth_mod) - Fr * Math.cos(phi_tooth_mod);
                        Fz += Fa;
                    }
                }
            }
            
            forces.push({
                angle_deg: i,
                Fx, Fy, Fz,
                F_magnitude: Math.sqrt(Fx*Fx + Fy*Fy + Fz*Fz)
            });
        }
        
        // Calculate statistics
        const Fx_max = Math.max(...forces.map(f => Math.abs(f.Fx)));
        const Fy_max = Math.max(...forces.map(f => Math.abs(f.Fy)));
        const Fz_max = Math.max(...forces.map(f => Math.abs(f.Fz)));
        const Fx_avg = forces.reduce((s, f) => s + Math.abs(f.Fx), 0) / points;
        const Fy_avg = forces.reduce((s, f) => s + Math.abs(f.Fy), 0) / points;
        
        // Average cutting power
        const V_c = Math.PI * D * rpm / 1000; // m/min
        const P_avg = (Fx_avg * V_c / 60) / 1000; // kW
        
        return {
            forceProfile: forces,
            maxForces: { Fx: Fx_max, Fy: Fy_max, Fz: Fz_max },
            avgForces: { Fx: Fx_avg, Fy: Fy_avg },
            engagementAngles: {
                entry_deg: phi_st * 180 / Math.PI,
                exit_deg: phi_ex * 180 / Math.PI
            },
            power_kW: P_avg,
            torque_Nm: (P_avg * 1000 * 60) / (2 * Math.PI * rpm)
        };
    },
    
    _entryAngle: function(radialImmersion, direction) {
        if (direction === 'down') {
            return Math.acos(1 - 2 * radialImmersion);
        }
        return 0;
    },
    
    _exitAngle: function(radialImmersion, direction) {
        if (direction === 'down') {
            return Math.PI;
        }
        return Math.acos(1 - 2 * radialImmersion);
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SPECIFIC CUTTING ENERGY DATABASE
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Get specific cutting force for material
     * @param {string} material - Material name or code
     * @returns {Object} Cutting force constants
     */
    getMaterialCuttingData: function(material) {
        const database = {
            'aluminum_6061': { Kc1_1: 700, mc: 0.25, tau_s: 150 },
            'aluminum_7075': { Kc1_1: 900, mc: 0.25, tau_s: 220 },
            'steel_1018': { Kc1_1: 1800, mc: 0.25, tau_s: 350 },
            'steel_1045': { Kc1_1: 2200, mc: 0.26, tau_s: 450 },
            'steel_4140': { Kc1_1: 2500, mc: 0.27, tau_s: 520 },
            'steel_4340': { Kc1_1: 2800, mc: 0.28, tau_s: 580 },
            'stainless_304': { Kc1_1: 2400, mc: 0.23, tau_s: 480 },
            'stainless_316': { Kc1_1: 2600, mc: 0.24, tau_s: 510 },
            'titanium_ti6al4v': { Kc1_1: 1800, mc: 0.22, tau_s: 600 },
            'inconel_718': { Kc1_1: 3200, mc: 0.20, tau_s: 700 },
            'cast_iron_gray': { Kc1_1: 1200, mc: 0.28, tau_s: 280 },
            'brass': { Kc1_1: 800, mc: 0.20, tau_s: 180 },
            'copper': { Kc1_1: 1000, mc: 0.22, tau_s: 200 }
        };
        
        const key = material.toLowerCase().replace(/[\s-]/g, '_');
        return database[key] || { Kc1_1: 2000, mc: 0.25, tau_s: 400 };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('cutting.merchant', 'PRISM_CUTTING_MECHANICS_ENGINE.merchantAnalysis');
            PRISM_GATEWAY.register('cutting.kienzle', 'PRISM_CUTTING_MECHANICS_ENGINE.kienzleForce');
            PRISM_GATEWAY.register('cutting.milling', 'PRISM_CUTTING_MECHANICS_ENGINE.millingForces');
            PRISM_GATEWAY.register('cutting.materialData', 'PRISM_CUTTING_MECHANICS_ENGINE.getMaterialCuttingData');
            console.log('[PRISM] PRISM_CUTTING_MECHANICS_ENGINE registered: 4 routes');
        }
    }
};
