const PRISM_TOOL_WEAR_MODELS = {
    name: 'PRISM_TOOL_WEAR_MODELS',
    version: '1.0.0',
    source: 'MIT 2.008 - Tool Wear Theory',
    
    /**
     * Extended Taylor Tool Life
     * V * T^n * f^m * d^p = C
     */
    extendedTaylor: function(params) {
        const {
            cuttingSpeed,    // m/min
            feed,            // mm/rev
            depthOfCut,      // mm
            C,               // Taylor constant
            n,               // Speed exponent (0.1-0.4)
            m = 0.1,         // Feed exponent
            p = 0.1          // Depth exponent
        } = params;
        
        // T = (C / (V * f^m * d^p))^(1/n)
        const T = Math.pow(C / (cuttingSpeed * Math.pow(feed, m) * Math.pow(depthOfCut, p)), 1/n);
        
        // Sensitivity analysis
        const speedSensitivity = -1/n;   // %T / %V
        const feedSensitivity = -m/n;    // %T / %f
        const depthSensitivity = -p/n;   // %T / %d
        
        return {
            toolLife: T,           // minutes
            toolLifeHours: T / 60,
            speedSensitivity,
            feedSensitivity,
            depthSensitivity,
            dominantFactor: Math.abs(speedSensitivity) > Math.abs(feedSensitivity) ? 'speed' : 'feed'
        };
    },
    
    /**
     * Usui's Diffusion Wear Model
     * For crater wear at high temperatures
     */
    usuiWearModel: function(params) {
        const {
            normalStress,     // MPa (on rake face)
            slidingVelocity,  // m/min
            temperature,      // °C (tool-chip interface)
            wearCoefficient = 1e-12, // A (material dependent)
            activationEnergy = 80000, // Q (J/mol)
            gasConstant = 8.314      // R (J/(mol·K))
        } = params;
        
        const T_kelvin = temperature + 273.15;
        const V = slidingVelocity / 60; // m/s
        
        // Usui equation: dW/dt = A * σ * V * exp(-Q/(R*T))
        const wearRate = wearCoefficient * normalStress * V * 
                        Math.exp(-activationEnergy / (gasConstant * T_kelvin));
        
        // Convert to μm/min
        const wearRateMicrons = wearRate * 1e6 * 60;
        
        return {
            wearRate: wearRate,            // m/s
            wearRateMicrons: wearRateMicrons, // μm/min
            temperatureSensitivity: activationEnergy / (gasConstant * T_kelvin * T_kelvin),
            criticalTemp: activationEnergy / (gasConstant * Math.log(wearCoefficient * normalStress * V / 1e-7)) - 273.15
        };
    },
    
    /**
     * Archard Abrasive Wear Model
     * For flank wear
     */
    archardWearModel: function(params) {
        const {
            normalLoad,       // N
            slidingDistance,  // m
            hardness,         // MPa (workpiece hardness)
            wearCoefficient = 1e-4 // K (dimensionless, 1e-4 to 1e-7 typical)
        } = params;
        
        // Archard equation: V = K * F * s / H
        // V = wear volume, K = coefficient, F = load, s = distance, H = hardness
        const wearVolume = wearCoefficient * normalLoad * slidingDistance / hardness;
        
        // Convert to linear wear (assuming wear area)
        const wearArea = 1; // mm² (assumed contact area)
        const linearWear = wearVolume / wearArea;
        
        return {
            wearVolume: wearVolume,      // mm³
            linearWear: linearWear,      // mm
            linearWearMicrons: linearWear * 1000, // μm
            specificWearRate: wearCoefficient / hardness
        };
    },
    
    /**
     * Combined Flank Wear Prediction
     * VB = f(time, speed, feed, material)
     */
    predictFlankWear: function(params) {
        const {
            cuttingTime,      // minutes
            cuttingSpeed,     // m/min
            feed,             // mm/rev
            materialHardness, // HRC or HB
            toolGrade = 'carbide', // 'hss', 'carbide', 'ceramic', 'cbn'
            coolant = true
        } = params;
        
        // Empirical wear coefficients by tool grade
        const coefficients = {
            hss:     { a: 0.001, b: 1.5, c: 0.3 },
            carbide: { a: 0.0003, b: 1.2, c: 0.2 },
            ceramic: { a: 0.0001, b: 0.9, c: 0.15 },
            cbn:     { a: 0.00005, b: 0.7, c: 0.1 }
        };
        
        const { a, b, c } = coefficients[toolGrade] || coefficients.carbide;
        
        // VB = a * t^0.5 * V^b * f^c * (HB/200)
        const hardnessFactor = materialHardness / 200;
        const coolantFactor = coolant ? 0.7 : 1.0;
        
        const VB = a * Math.sqrt(cuttingTime) * Math.pow(cuttingSpeed / 100, b) * 
                   Math.pow(feed / 0.1, c) * hardnessFactor * coolantFactor;
        
        // Typical limits
        const limits = {
            roughing: 0.6,    // mm
            finishing: 0.3,   // mm
            precision: 0.15   // mm
        };
        
        return {
            flankWear: VB,    // mm
            flankWearMicrons: VB * 1000, // μm
            roughingLife: Math.pow(limits.roughing / (a * coolantFactor * hardnessFactor * 
                          Math.pow(cuttingSpeed/100, b) * Math.pow(feed/0.1, c)), 2),
            finishingLife: Math.pow(limits.finishing / (a * coolantFactor * hardnessFactor * 
                           Math.pow(cuttingSpeed/100, b) * Math.pow(feed/0.1, c)), 2),
            status: VB < 0.15 ? 'good' : VB < 0.3 ? 'monitor' : VB < 0.6 ? 'replace_soon' : 'replace_now'
        };
    },
    
    /**
     * Crater Wear Depth
     */
    predictCraterWear: function(params) {
        const {
            cuttingTime,
            temperature,
            normalStress,
            toolMaterial = 'carbide'
        } = params;
        
        // Temperature-dependent crater wear
        const T_kelvin = temperature + 273.15;
        const Q = 80000; // Activation energy J/mol
        const R = 8.314;
        
        // KT = C * t * exp(-Q/RT)
        const C = toolMaterial === 'carbide' ? 1e-5 : 
                  toolMaterial === 'ceramic' ? 5e-6 : 2e-6;
        
        const KT = C * cuttingTime * Math.exp(-Q / (R * T_kelvin)) * normalStress / 1000;
        
        return {
            craterDepth: KT,         // mm
            craterDepthMicrons: KT * 1000, // μm
            criticalDepth: 0.1,      // mm
            remainingLife: KT < 0.1 ? (0.1 - KT) / (KT / cuttingTime) : 0
        };
    }
}