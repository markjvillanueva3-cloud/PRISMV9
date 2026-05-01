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
}