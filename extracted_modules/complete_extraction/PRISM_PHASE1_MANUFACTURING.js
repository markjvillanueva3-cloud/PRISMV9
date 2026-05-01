const PRISM_PHASE1_MANUFACTURING = {
    name: 'Phase 1 Manufacturing Algorithms',
    version: '1.0.0',
    source: 'MIT 2.008, MIT 2.830',
    
    /**
     * Taylor Tool Life Equation
     * Source: MIT 2.008 - Manufacturing Processes and Systems
     * VT^n = C
     */
    taylorToolLife: function(speed, material) {
        // Protocol E: Use PRISM_CONSTANTS if available
        const defaults = {
            steel: { n: 0.25, C: 300 },
            aluminum: { n: 0.35, C: 800 },
            titanium: { n: 0.2, C: 150 },
            stainless: { n: 0.22, C: 200 },
            cast_iron: { n: 0.28, C: 250 }
        };
        
        let n, C;
        
        if (typeof material === 'object') {
            n = material.taylorN || material.n || 0.25;
            C = material.taylorC || material.C || 300;
        } else if (typeof material === 'string' && defaults[material.toLowerCase()]) {
            const matDefaults = defaults[material.toLowerCase()];
            n = matDefaults.n;
            C = matDefaults.C;
        } else {
            n = 0.25;
            C = 300;
        }
        
        // T = (C/V)^(1/n)
        const toolLife = Math.pow(C / speed, 1 / n);
        
        return {
            toolLife,
            speed,
            n,
            C,
            unit: 'minutes',
            formula: 'VT^n = C (Taylor)',
            source: 'MIT 2.008 - Taylor Tool Life'
        };
    },
    
    /**
     * Extended Taylor Equation
     * VT^n * f^a * d^b = C
     */
    extendedTaylor: function(speed, feed, doc, material) {
        const { n, C } = this._getTaylorConstants(material);
        const a = 0.2;  // Feed exponent
        const b = 0.1;  // DOC exponent
        
        const toolLife = Math.pow(C / (speed * Math.pow(feed, a) * Math.pow(doc, b)), 1 / n);
        
        return {
            toolLife,
            speed,
            feed,
            doc,
            exponents: { n, a, b },
            C,
            unit: 'minutes',
            formula: 'VT^n * f^a * d^b = C (Extended Taylor)',
            source: 'MIT 2.008 - Extended Taylor'
        };
    },
    
    _getTaylorConstants: function(material) {
        const defaults = {
            steel: { n: 0.25, C: 300 },
            aluminum: { n: 0.35, C: 800 },
            titanium: { n: 0.2, C: 150 }
        };
        
        if (typeof material === 'object') {
            return { n: material.taylorN || 0.25, C: material.taylorC || 300 };
        }
        
        return defaults[material?.toLowerCase()] || { n: 0.25, C: 300 };
    },
    
    /**
     * Merchant Cutting Force Model
     * Source: MIT 2.008
     */
    merchantForce: function(params) {
        const {
            shearStrength,      // MPa
            chipThickness,      // mm (uncut)
            width,              // mm (width of cut)
            rakeAngle = 10,     // degrees
            frictionAngle = 30  // degrees
        } = params;
        
        // Convert angles to radians
        const alpha = rakeAngle * Math.PI / 180;
        const beta = frictionAngle * Math.PI / 180;
        
        // Shear plane angle (Merchant's equation)
        const phi = Math.PI / 4 - beta / 2 + alpha / 2;
        
        // Shear force
        const As = (chipThickness * width) / Math.sin(phi);
        const Fs = shearStrength * As;
        
        // Cutting force (tangential)
        const Fc = Fs * Math.cos(beta - alpha) / Math.cos(phi + beta - alpha);
        
        // Thrust force (normal to machined surface)
        const Ft = Fs * Math.sin(beta - alpha) / Math.cos(phi + beta - alpha);
        
        // Friction force
        const F = Fc * Math.sin(alpha) + Ft * Math.cos(alpha);
        
        // Normal force on rake face
        const N = Fc * Math.cos(alpha) - Ft * Math.sin(alpha);
        
        // Chip ratio
        const r = Math.sin(phi) / Math.cos(phi - alpha);
        
        return {
            cuttingForce: Fc,       // N
            thrustForce: Ft,        // N
            frictionForce: F,       // N
            normalForce: N,         // N
            shearAngle: phi * 180 / Math.PI,  // degrees
            chipRatio: r,
            shearArea: As,          // mm²
            unit: 'N',
            formula: 'Merchant Cutting Force Model',
            source: 'MIT 2.008 - Merchant Force'
        };
    },
    
    /**
     * Kienzle Specific Cutting Force
     */
    kienzleForce: function(params) {
        const {
            chipThickness,       // mm
            width,               // mm
            specificCuttingForce = 1800,  // N/mm² (kc1.1)
            exponent = 0.26      // mc
        } = params;
        
        // kc = kc1.1 * h^(-mc)
        const kc = specificCuttingForce * Math.pow(chipThickness, -exponent);
        
        // Fc = kc * A = kc * b * h
        const Fc = kc * width * chipThickness;
        
        return {
            specificCuttingForce: kc,   // N/mm²
            cuttingForce: Fc,           // N
            kc1_1: specificCuttingForce,
            mc: exponent,
            source: 'MIT 2.008 - Kienzle Force'
        };
    },
    
    /**
     * Material Removal Rate
     */
    materialRemovalRate: function(params) {
        const { speed, feed, doc, width } = params;
        
        // MRR = V * f * ap * ae (for milling)
        // or MRR = V * f * d (for turning)
        
        const mrr = width ? 
            speed * feed * doc * width :  // Milling
            speed * feed * doc;           // Turning
        
        return {
            mrr,
            unit: 'mm³/min',
            parameters: { speed, feed, doc, width },
            source: 'MIT 2.008 - MRR'
        };
    },
    
    /**
     * Theoretical Surface Finish
     */
    surfaceFinish: function(params) {
        const { feed, noseRadius, operation = 'turning' } = params;
        
        let Ra;
        
        if (operation === 'turning' || operation === 'facing') {
            // Ra = f² / (32 * r) - theoretical for turning
            Ra = (feed * feed) / (32 * noseRadius) * 1000;  // Convert to μm
        } else if (operation === 'milling') {
            // Ra ≈ f² / (8 * D) for end milling
            const diameter = params.toolDiameter || 10;
            Ra = (feed * feed) / (8 * diameter) * 1000;
        } else {
            Ra = (feed * feed) / (32 * (noseRadius || 0.8)) * 1000;
        }
        
        return {
            Ra,
            unit: 'μm',
            formula: operation === 'turning' ? 'Ra = f²/(32r)' : 'Ra = f²/(8D)',
            parameters: { feed, noseRadius, operation },
            source: 'MIT 2.008 - Surface Finish'
        };
    },
    
    /**
     * Cutting Temperature Estimation
     */
    cuttingTemperature: function(params) {
        const {
            speed,              // m/min
            feed,               // mm/rev or mm/tooth
            doc,                // mm
            specificCuttingForce = 2000,  // N/mm²
            thermalConductivity = 50,     // W/m·K
            ambientTemp = 20              // °C
        } = params;
        
        // Power = Fc * V
        const A = feed * doc;  // Cross-section area
        const Fc = specificCuttingForce * A;  // Cutting force
        const power = Fc * speed / 60;  // Watts
        
        // Temperature rise estimation (simplified)
        const tempRise = power / (thermalConductivity * 100);  // Simplified model
        const temperature = ambientTemp + tempRise;
        
        return {
            temperature,
            tempRise,
            power,
            cuttingForce: Fc,
            unit: '°C',
            source: 'MIT 2.008 - Cutting Temperature'
        };
    }
}