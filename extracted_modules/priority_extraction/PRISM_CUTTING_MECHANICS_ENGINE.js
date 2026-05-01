const PRISM_CUTTING_MECHANICS_ENGINE = {
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


/**
 * PRISM_TOOL_LIFE_ENGINE
 * Tool wear and life prediction models
 * Source: Taylor (1907), Extended Taylor, Usui, MIT 2.008
 */
const PRISM_TOOL_LIFE_ENGINE = {
    name: 'PRISM_TOOL_LIFE_ENGINE',
    version: '1.0.0',
    source: 'Taylor 1907, MIT 2.008, Usui Wear Model',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // TAYLOR TOOL LIFE EQUATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Taylor tool life equation: V × T^n = C
     * Extended: V × T^n × f^m × d^p = C
     * @param {Object} params - Cutting parameters
     * @returns {Object} Tool life prediction
     */
    taylorToolLife: function(params) {
        const {
            cuttingSpeed: V,      // m/min
            feed: f = 0.2,        // mm/rev or mm/tooth
            depthOfCut: d = 2,    // mm
            C = 300,              // Taylor constant
            n = 0.25,             // Speed exponent
            m = 0.15,             // Feed exponent (optional)
            p = 0.08              // Depth exponent (optional)
        } = params;
        
        // Basic Taylor: T = (C/V)^(1/n)
        const T_basic = Math.pow(C / V, 1 / n);
        
        // Extended Taylor: T = (C / (V × f^m × d^p))^(1/n)
        const T_extended = Math.pow(C / (V * Math.pow(f, m) * Math.pow(d, p)), 1 / n);
        
        // Sensitivity analysis
        const dT_dV = -T_extended / (n * V); // Tool life sensitivity to speed
        const dT_df = -m * T_extended / (n * f);
        const dT_dd = -p * T_extended / (n * d);
        
        return {
            toolLife_min: T_extended,
            toolLife_basic_min: T_basic,
            constants: { C, n, m, p },
            inputs: { cuttingSpeed: V, feed: f, depthOfCut: d },
            sensitivity: {
                speed: dT_dV,
                feed: dT_df,
                depth: dT_dd
            },
            // Tool life if speed doubled
            lifeAtDoubleSpeed: T_extended * Math.pow(0.5, 1/n),
            // Speed for 60 min tool life
            speedFor60minLife: C * Math.pow(60, -n) / (Math.pow(f, m) * Math.pow(d, p)),
            // Economic tool life (simplified)
            economicToolLife_min: (1/n - 1) * 5, // Assuming 5 min tool change time
            // Maximum productivity speed
            maxProductivitySpeed: C * Math.pow(5 * (1/n - 1), -n)
        };
    },
    
    /**
     * Get Taylor constants for tool-material combination
     */
    getTaylorConstants: function(toolMaterial, workMaterial) {
        const database = {
            'hss': {
                'aluminum': { C: 600, n: 0.15 },
                'steel_mild': { C: 70, n: 0.125 },
                'steel_medium': { C: 50, n: 0.12 },
                'cast_iron': { C: 40, n: 0.14 }
            },
            'carbide_uncoated': {
                'aluminum': { C: 1200, n: 0.30 },
                'steel_mild': { C: 400, n: 0.25 },
                'steel_medium': { C: 300, n: 0.25 },
                'steel_hard': { C: 200, n: 0.22 },
                'cast_iron': { C: 250, n: 0.27 },
                'stainless': { C: 200, n: 0.20 }
            },
            'carbide_coated': {
                'aluminum': { C: 1500, n: 0.35 },
                'steel_mild': { C: 600, n: 0.30 },
                'steel_medium': { C: 450, n: 0.28 },
                'steel_hard': { C: 300, n: 0.25 },
                'stainless': { C: 300, n: 0.22 },
                'titanium': { C: 150, n: 0.20 }
            },
            'ceramic': {
                'steel_hard': { C: 800, n: 0.45 },
                'cast_iron': { C: 600, n: 0.40 }
            },
            'cbn': {
                'steel_hardened': { C: 400, n: 0.50 },
                'cast_iron': { C: 500, n: 0.45 }
            }
        };
        
        const toolKey = toolMaterial.toLowerCase().replace(/[\s-]/g, '_');
        const workKey = workMaterial.toLowerCase().replace(/[\s-]/g, '_');
        
        return database[toolKey]?.[workKey] || { C: 300, n: 0.25 };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // TOOL WEAR MODELS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Tool wear progression model
     * VB = f(time, speed, feed, material)
     */
    wearProgression: function(params) {
        const {
            cuttingTime: t,       // minutes
            cuttingSpeed: V,      // m/min
            feed: f,              // mm/rev
            toolMaterial = 'carbide_coated',
            workMaterial = 'steel_medium'
        } = params;
        
        // Get Taylor constants
        const { C, n } = this.getTaylorConstants(toolMaterial, workMaterial);
        
        // Tool life at current conditions
        const T = Math.pow(C / V, 1 / n);
        
        // Wear fraction
        const wearFraction = t / T;
        
        // Three-stage wear model
        let VB; // Flank wear (mm)
        const VB_max = 0.3; // Typical max allowable flank wear
        
        if (wearFraction < 0.1) {
            // Initial wear (rapid)
            VB = VB_max * 0.1 * (wearFraction / 0.1) * 1.5;
        } else if (wearFraction < 0.9) {
            // Steady state (linear)
            VB = VB_max * 0.1 + VB_max * 0.6 * ((wearFraction - 0.1) / 0.8);
        } else {
            // Accelerated wear (rapid)
            const fraction_accel = (wearFraction - 0.9) / 0.1;
            VB = VB_max * 0.7 + VB_max * 0.3 * Math.pow(fraction_accel, 1.5);
        }
        
        return {
            flankWear_mm: Math.min(VB, VB_max * 1.5),
            wearFraction,
            remainingLife_min: Math.max(0, T - t),
            remainingLife_percent: Math.max(0, (1 - wearFraction) * 100),
            wearStage: wearFraction < 0.1 ? 'initial' : wearFraction < 0.9 ? 'steady_state' : 'accelerated',
            shouldReplace: VB >= VB_max,
            wearRate_mm_per_min: VB / t
        };
    },
    
    /**
     * Crater wear model (Usui-based)
     */
    craterWear: function(params) {
        const {
            cuttingSpeed: V,
            interfaceTemp: T_i,    // Interface temperature (°C)
            contactPressure: sigma, // MPa
            cuttingTime: t          // minutes
        } = params;
        
        // Usui wear equation: dw/dt = A × σ × V × exp(-B/T)
        const A = 1e-8;  // Wear constant
        const B = 5000;  // Activation energy / R
        const T_K = T_i + 273; // Kelvin
        
        const wearRate = A * sigma * V * Math.exp(-B / T_K);
        const craterDepth = wearRate * t;
        
        return {
            craterDepth_mm: craterDepth,
            wearRate_mm_per_min: wearRate,
            wearMechanism: T_i > 800 ? 'diffusion' : 'abrasion',
            criticalDepth_mm: 0.1
        };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('toollife.taylor', 'PRISM_TOOL_LIFE_ENGINE.taylorToolLife');
            PRISM_GATEWAY.register('toollife.constants', 'PRISM_TOOL_LIFE_ENGINE.getTaylorConstants');
            PRISM_GATEWAY.register('toollife.wear', 'PRISM_TOOL_LIFE_ENGINE.wearProgression');
            PRISM_GATEWAY.register('toollife.crater', 'PRISM_TOOL_LIFE_ENGINE.craterWear');
            console.log('[PRISM] PRISM_TOOL_LIFE_ENGINE registered: 4 routes');
        }
    }
};


/**
 * PRISM_SURFACE_FINISH_ENGINE
 * Surface roughness prediction models
 * Source: MIT 2.008, Machining Data Handbook
 */
const PRISM_SURFACE_FINISH_ENGINE = {
    name: 'PRISM_SURFACE_FINISH_ENGINE',
    version: '1.0.0',
    source: 'MIT 2.008, Machining Data Handbook',
    
    /**
     * Theoretical surface roughness for turning
     * Ra = f² / (32 × r)
     */
    turningRoughness: function(params) {
        const {
            feed: f,           // mm/rev
            noseRadius: r,     // mm
            cuttingSpeed: V = 100,
            toolWear: VB = 0   // mm
        } = params;
        
        // Ideal (theoretical) roughness
        const Ra_ideal = (f * f) / (32 * r) * 1000; // Convert to μm
        
        // Peak-to-valley height
        const Rt_ideal = (f * f) / (8 * r) * 1000; // μm
        
        // Correction factors
        const f_speed = 1 + 0.1 * Math.log10(V / 100); // Speed effect
        const f_wear = 1 + 5 * VB; // Tool wear effect
        const f_BUE = V < 30 ? 1.5 : 1.0; // Built-up edge at low speed
        
        const Ra_actual = Ra_ideal * f_speed * f_wear * f_BUE;
        
        return {
            Ra_ideal_um: Ra_ideal,
            Ra_actual_um: Ra_actual,
            Rt_ideal_um: Rt_ideal,
            Rz_approx_um: Rt_ideal * 0.8,
            factors: { speed: f_speed, wear: f_wear, BUE: f_BUE },
            inputs: { feed: f, noseRadius: r, cuttingSpeed: V },
            recommendation: Ra_actual > 3.2 ? 'Reduce feed or use larger nose radius' : 'Acceptable'
        };
    },
    
    /**
     * Milling surface roughness
     * Ra depends on feed per tooth, cutter geometry, and scallop height
     */
    millingRoughness: function(params) {
        const {
            feedPerTooth: fz,   // mm
            diameter: D,        // mm
            stepover: ae,       // mm (radial)
            ballNose = false,
            ballRadius: R = D/2
        } = params;
        
        let Ra, scallop;
        
        if (ballNose) {
            // Ball nose end mill: scallop height from stepover
            // h = R - sqrt(R² - (ae/2)²)
            scallop = R - Math.sqrt(R * R - (ae/2) * (ae/2));
            Ra = scallop * 1000 * 0.25; // Approximate Ra from scallop
        } else {
            // Flat end mill: feed marks
            Ra = (fz * fz) / (32 * (D/2)) * 1000 * 0.5;
            scallop = fz * fz / (4 * D) * 1000;
        }
        
        // Cusp height from lead angle (for 5-axis)
        const cuspFromLead = (params.leadAngle || 0) * ae / (2 * R) * 1000;
        
        return {
            Ra_um: Ra,
            scallop_um: scallop * 1000,
            cuspHeight_um: cuspFromLead,
            recommendedStepover: Math.sqrt(8 * R * 0.001 * (params.targetRa || 0.8)), // For target Ra
            surfaceQuality: Ra < 0.8 ? 'Fine' : Ra < 3.2 ? 'Medium' : 'Rough'
        };
    },
    
    /**
     * Surface roughness from chatter
     */
    chatterRoughness: function(params) {
        const {
            chatterAmplitude: A,  // mm
            chatterFrequency: f,  // Hz
            cuttingSpeed: V,      // m/min
            baseRa                // μm without chatter
        } = params;
        
        // Wavelength of chatter marks
        const wavelength = V * 1000 / (60 * f); // mm
        
        // Additional roughness from chatter
        const Ra_chatter = A * 1000 * 0.5; // μm (approximate)
        
        // Combined roughness (RMS)
        const Ra_total = Math.sqrt(baseRa * baseRa + Ra_chatter * Ra_chatter);
        
        return {
            Ra_base_um: baseRa,
            Ra_chatter_um: Ra_chatter,
            Ra_total_um: Ra_total,
            wavelength_mm: wavelength,
            increase_percent: (Ra_total / baseRa - 1) * 100
        };
    },
    
    /**
     * Convert between roughness parameters
     * Ra, Rz, Rt, Rq relationships
     */
    convertRoughness: function(value, fromParam, toParam) {
        // Approximate conversion factors (material dependent)
        const conversions = {
            'Ra_to_Rz': 4.0,
            'Ra_to_Rt': 6.0,
            'Ra_to_Rq': 1.25,
            'Rz_to_Ra': 0.25,
            'Rz_to_Rt': 1.5,
            'Rt_to_Ra': 0.167,
            'Rq_to_Ra': 0.8
        };
        
        const key = `${fromParam}_to_${toParam}`;
        const factor = conversions[key] || 1;
        
        return {
            original: { parameter: fromParam, value },
            converted: { parameter: toParam, value: value * factor },
            factor,
            note: 'Approximate conversion - actual ratio depends on surface profile'
        };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('surface.turning', 'PRISM_SURFACE_FINISH_ENGINE.turningRoughness');
            PRISM_GATEWAY.register('surface.milling', 'PRISM_SURFACE_FINISH_ENGINE.millingRoughness');
            PRISM_GATEWAY.register('surface.chatter', 'PRISM_SURFACE_FINISH_ENGINE.chatterRoughness');
            PRISM_GATEWAY.register('surface.convert', 'PRISM_SURFACE_FINISH_ENGINE.convertRoughness');
            console.log('[PRISM] PRISM_SURFACE_FINISH_ENGINE registered: 4 routes');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// REGISTRATION AND EXPORT
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerSession4Part3() {
    PRISM_CUTTING_MECHANICS_ENGINE.register();
    PRISM_TOOL_LIFE_ENGINE.register();
    PRISM_SURFACE_FINISH_ENGINE.register();
    
    console.log('[Session 4 Part 3] Registered 3 modules, 12 gateway routes');
    console.log('  - PRISM_CUTTING_MECHANICS_ENGINE: Merchant, Kienzle, Milling forces');
    console.log('  - PRISM_TOOL_LIFE_ENGINE: Taylor, Wear progression');
    console.log('  - PRISM_SURFACE_FINISH_ENGINE: Turning, Milling, Chatter roughness');
}

// Auto-register
if (typeof window !== 'undefined') {
    window.PRISM_CUTTING_MECHANICS_ENGINE = PRISM_CUTTING_MECHANICS_ENGINE;
    window.PRISM_TOOL_LIFE_ENGINE = PRISM_TOOL_LIFE_ENGINE;
    window.PRISM_SURFACE_FINISH_ENGINE = PRISM_SURFACE_FINISH_ENGINE;
    registerSession4Part3();
}

console.log('[Session 4 Part 3] Cutting Physics & Force Models loaded - 3 modules');
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PRISM SESSION 4 PART 4: THERMAL ANALYSIS & HEAT TRANSFER
// Source: MIT 16.050 (Thermal Energy), MIT 2.51 (Heat Transfer), Trigger-Chao Model
// Algorithms: Cutting Temperature, Heat Partition, Conduction, Convection, Thermal Expansion
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * PRISM_CUTTING_THERMAL_ENGINE
 * Cutting temperature and heat partition models
 * Source: MIT 16.050, Trigger-Chao, Loewen-Shaw
 */
const PRISM_CUTTING_THERMAL_ENGINE = {
    name: 'PRISM_CUTTING_THERMAL_ENGINE',
    version: '1.0.0',
    source: 'MIT 16.050, Trigger-Chao, Loewen-Shaw',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SHEAR PLANE TEMPERATURE
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Shear plane temperature rise (Trigger-Chao model)
     * @param {Object} params - Cutting parameters
     * @returns {Object} Temperature analysis
     */
    shearPlaneTemperature: function(params) {
        const {
            cuttingSpeed: V,      // m/min
            feed: f,              // mm/rev
            shearStrength: tau_s, // MPa
            shearAngle: phi,      // radians
            rakeAngle: alpha = 0.1, // radians
            material              // Material properties object
        } = params;
        
        const {
            density: rho = 7850,           // kg/m³
            specificHeat: c = 500,         // J/(kg·K)
            thermalConductivity: k = 50,   // W/(m·K)
            ambientTemp: T_0 = 25          // °C
        } = material || {};
        
        // Thermal diffusivity
        const alpha_th = k / (rho * c); // m²/s
        
        // Cutting velocity in m/s
        const V_ms = V / 60;
        
        // Shear velocity
        const V_s = V_ms * Math.cos(alpha) / Math.cos(phi - alpha);
        
        // Heat generated per unit volume in shear zone
        const q_shear = tau_s * 1e6 * V_s; // W/m³
        
        // Chip thickness
        const t_1 = f / 1000; // m
        
        // Shear zone thickness (approximate)
        const delta_s = t_1 * 0.1;
        
        // Temperature rise in shear zone (simplified Trigger model)
        const L = t_1 / Math.sin(phi); // Shear plane length
        const R_t = V_s * L / alpha_th; // Thermal number
        
        let theta_s;
        if (R_t > 10) {
            // High speed: most heat goes to chip
            theta_s = 0.4 * tau_s * 1e6 / (rho * c);
        } else {
            // Low speed: heat shared
            theta_s = (tau_s * 1e6 / (rho * c)) * (1 / (1 + Math.sqrt(1 / R_t)));
        }
        
        return {
            temperatureRise_C: theta_s,
            shearZoneTemp_C: T_0 + theta_s,
            thermalNumber: R_t,
            shearVelocity_mps: V_s,
            heatRegime: R_t > 10 ? 'high_speed' : 'low_speed'
        };
    },
    
    /**
     * Tool-chip interface temperature (more accurate model)
     * @param {Object} params - Process and material parameters
     * @returns {Object} Interface temperature analysis
     */
    toolChipInterfaceTemp: function(params) {
        const {
            cuttingSpeed: V,      // m/min
            feed: f,              // mm/rev
            depthOfCut: d,        // mm
            specificCuttingEnergy: u_c, // J/mm³
            material,             // Workpiece material
            tool                  // Tool material
        } = params;
        
        // Material properties
        const rho_w = material?.density || 7850;
        const c_w = material?.specificHeat || 500;
        const k_w = material?.thermalConductivity || 50;
        const T_0 = material?.ambientTemp || 25;
        
        // Tool properties
        const k_t = tool?.thermalConductivity || 80; // Carbide
        
        // Thermal diffusivity of workpiece
        const alpha_w = k_w / (rho_w * c_w);
        
        // Cutting velocity in m/s
        const V_ms = V / 60;
        
        // Contact length (approximate)
        const L_c = f * 2; // mm (Zorev approximation)
        
        // Heat flux
        const MRR = V * f * d / 60000; // m³/s
        const P_cut = u_c * 1e9 * MRR; // W
        const A_contact = L_c * d / 1e6; // m²
        const q_flux = P_cut / A_contact; // W/m²
        
        // Jaeger moving heat source solution (simplified)
        const L = L_c / 1000; // m
        const Pe = V_ms * L / (2 * alpha_w); // Peclet number
        
        let T_interface;
        if (Pe > 5) {
            // High Peclet (high speed): chip carries most heat
            T_interface = T_0 + 0.754 * q_flux * Math.sqrt(L / (k_w * rho_w * c_w * V_ms));
        } else {
            // Low Peclet: more to tool
            T_interface = T_0 + q_flux * L / k_w * 0.5;
        }
        
        // Heat partition (Shaw's approximation)
        const beta = Math.sqrt(k_w * rho_w * c_w);
        const beta_t = Math.sqrt(k_t * (tool?.density || 14000) * (tool?.specificHeat || 300));
        const R_tool = beta / (beta + beta_t);
        
        // Tool bulk temperature
        const T_tool_avg = T_0 + (q_flux * R_tool) * Math.sqrt(L / (k_t * (tool?.density || 14000) * (tool?.specificHeat || 300) * V_ms));
        
        return {
            interfaceTemperature_C: T_interface,
            toolAverageTemp_C: T_tool_avg,
            heatPartitionToTool: R_tool,
            heatPartitionToChip: 1 - R_tool,
            pecletNumber: Pe,
            contactLength_mm: L_c,
            heatFlux_W_m2: q_flux,
            cuttingPower_W: P_cut
        };
    },
    
    /**
     * Heat partition model (simplified)
     */
    heatPartition: function(params) {
        const {
            cuttingSpeed: V,
            workMaterial,
            toolMaterial
        } = params;
        
        // Material thermal properties
        const materials = {
            'steel': { k: 50, rho: 7850, c: 500 },
            'aluminum': { k: 205, rho: 2700, c: 900 },
            'titanium': { k: 7.2, rho: 4500, c: 520 },
            'carbide': { k: 80, rho: 14000, c: 300 },
            'ceramic': { k: 30, rho: 3900, c: 800 },
            'hss': { k: 27, rho: 8100, c: 460 }
        };
        
        const work = materials[workMaterial?.toLowerCase()] || materials.steel;
        const tool = materials[toolMaterial?.toLowerCase()] || materials.carbide;
        
        // Effusivity ratio (Shaw)
        const e_work = Math.sqrt(work.k * work.rho * work.c);
        const e_tool = Math.sqrt(tool.k * tool.rho * tool.c);
        
        // Speed factor (more heat to chip at high speed)
        const V_ref = 100; // m/min reference
        const speed_factor = 1 - 0.3 * Math.log10(V / V_ref);
        
        // Partition ratios
        const R_chip = 0.6 + 0.2 * speed_factor;
        const R_tool = (1 - R_chip) * e_work / (e_work + e_tool);
        const R_work = 1 - R_chip - R_tool;
        
        return {
            toChip_percent: R_chip * 100,
            toTool_percent: R_tool * 100,
            toWorkpiece_percent: R_work * 100,
            effusivityWork: e_work,
            effusivityTool: e_tool,
            speedFactor: speed_factor
        };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('thermal.shearPlane', 'PRISM_CUTTING_THERMAL_ENGINE.shearPlaneTemperature');
            PRISM_GATEWAY.register('thermal.interface', 'PRISM_CUTTING_THERMAL_ENGINE.toolChipInterfaceTemp');
            PRISM_GATEWAY.register('thermal.partition', 'PRISM_CUTTING_THERMAL_ENGINE.heatPartition');
            console.log('[PRISM] PRISM_CUTTING_THERMAL_ENGINE registered: 3 routes');
        }
    }
}