const PRISM_CUTTING_MECHANICS = {
    name: 'PRISM_CUTTING_MECHANICS',
    version: '1.0.0',
    source: 'MIT 2.008 - Manufacturing Process Technology',
    
    /**
     * Complete Merchant's Circle Analysis
     * Orthogonal cutting force model
     * Source: MIT 2.008
     */
    merchantCircle: function(params) {
        const {
            width,          // Width of cut (mm)
            depth,          // Uncut chip thickness (mm)
            rakeAngle,      // Tool rake angle (degrees)
            frictionCoef,   // Friction coefficient at tool-chip interface
            shearStrength,  // Material shear strength (MPa)
            chipRatio = null // Optional: measured chip ratio
        } = params;
        
        const alpha = rakeAngle * Math.PI / 180; // Rake angle in radians
        const beta = Math.atan(frictionCoef);    // Friction angle
        
        // Calculate shear angle using Merchant's equation (minimum energy)
        // φ = 45° + α/2 - β/2
        let phi;
        if (chipRatio !== null && chipRatio > 0) {
            // From measured chip ratio
            phi = Math.atan(chipRatio * Math.cos(alpha) / (1 - chipRatio * Math.sin(alpha)));
        } else {
            // Merchant's equation
            phi = Math.PI / 4 + alpha / 2 - beta / 2;
        }
        
        // Shear plane area
        const As = (width * depth) / Math.sin(phi);
        
        // Shear force
        const Fs = shearStrength * As;
        
        // Resultant force
        const R = Fs / Math.cos(phi + beta - alpha);
        
        // Cutting force (tangential)
        const Fc = R * Math.cos(beta - alpha);
        
        // Thrust force (radial)
        const Ft = R * Math.sin(beta - alpha);
        
        // Normal force on shear plane
        const Fn = Fs * Math.tan(phi + beta - alpha);
        
        // Friction force on rake face
        const F = R * Math.sin(beta);
        
        // Normal force on rake face
        const N = R * Math.cos(beta);
        
        // Calculated chip ratio
        const rc = Math.sin(phi) / Math.cos(phi - alpha);
        
        // Specific cutting energy
        const specificEnergy = Fc / (width * depth); // N/mm² or MPa
        
        return {
            shearAngle: phi * 180 / Math.PI,      // degrees
            shearAngleRad: phi,
            chipRatio: rc,
            chipThickness: depth / rc,             // mm
            shearForce: Fs,                        // N
            cuttingForce: Fc,                      // N
            thrustForce: Ft,                       // N
            resultantForce: R,                     // N
            frictionForce: F,                      // N
            normalForce: N,                        // N
            shearPlaneArea: As,                    // mm²
            specificCuttingEnergy: specificEnergy, // MPa
            frictionAngle: beta * 180 / Math.PI,
            powerRequired: null // Set when velocity known
        };
    },
    
    /**
     * Oblique Cutting Model
     * 3D cutting with inclination angle
     * Source: MIT 2.008
     */
    obliqueCutting: function(params) {
        const {
            width,
            depth,
            rakeAngle,      // Normal rake angle (degrees)
            inclinationAngle, // Inclination angle (degrees)
            frictionCoef,
            shearStrength,
            cuttingSpeed    // m/min
        } = params;
        
        const alpha_n = rakeAngle * Math.PI / 180;
        const i = inclinationAngle * Math.PI / 180;
        const beta = Math.atan(frictionCoef);
        
        // Effective rake angle
        const tanAlphaE = Math.tan(alpha_n) * Math.cos(i);
        const alpha_e = Math.atan(tanAlphaE);
        
        // Chip flow angle (Stabler's rule: η ≈ i)
        const eta = i;
        
        // Shear angle (modified for oblique)
        const phi = Math.PI / 4 + alpha_e / 2 - beta / 2;
        
        // Shear velocity direction
        const Vs = cuttingSpeed * Math.cos(i) / Math.cos(phi - alpha_n);
        
        // Shear plane area
        const As = (width * depth) / (Math.sin(phi) * Math.cos(i));
        
        // Shear force
        const Fs = shearStrength * As;
        
        // Force components
        const Fc = Fs * Math.cos(beta - alpha_e) / (Math.cos(phi + beta - alpha_e) * Math.cos(i));
        const Ft = Fs * Math.sin(beta - alpha_e) / (Math.cos(phi + beta - alpha_e) * Math.cos(eta));
        const Fr = Fc * Math.tan(i) - Ft * Math.tan(eta); // Radial force
        
        // Power
        const power = Fc * cuttingSpeed / 60000; // kW
        
        return {
            effectiveRakeAngle: alpha_e * 180 / Math.PI,
            chipFlowAngle: eta * 180 / Math.PI,
            shearAngle: phi * 180 / Math.PI,
            shearVelocity: Vs,
            cuttingForce: Fc,
            thrustForce: Ft,
            radialForce: Fr,
            resultantForce: Math.sqrt(Fc*Fc + Ft*Ft + Fr*Fr),
            power: power,
            specificEnergy: Fc / (width * depth)
        };
    },
    
    /**
     * Kienzle Cutting Force Model
     * Empirical model widely used in industry
     */
    kienzleForce: function(params) {
        const {
            width,          // mm
            depth,          // mm (chip thickness)
            kc1_1,          // Specific cutting force at h=1mm, b=1mm (N/mm²)
            mc,             // Kienzle exponent (typically 0.2-0.4)
            cuttingSpeed,   // m/min
            rakeAngle = 0,  // degrees
            wearCorrection = 1.0, // VB wear factor
            coolingCorrection = 1.0 // Coolant factor
        } = params;
        
        // Specific cutting force with chip thickness correction
        const kc = kc1_1 / Math.pow(depth, mc);
        
        // Rake angle correction
        const rakeCorrection = 1 - 0.01 * (rakeAngle - 6);
        
        // Final cutting force
        const Fc = kc * width * depth * rakeCorrection * wearCorrection * coolingCorrection;
        
        // Thrust force (typically 0.3-0.5 of Fc)
        const Ft = Fc * 0.4;
        
        // Power
        const power = Fc * cuttingSpeed / 60000; // kW
        
        return {
            specificCuttingForce: kc,
            cuttingForce: Fc,
            thrustForce: Ft,
            power: power,
            corrections: {
                rake: rakeCorrection,
                wear: wearCorrection,
                cooling: coolingCorrection
            }
        };
    },
    
    /**
     * Material Removal Rate
     */
    calculateMRR: function(params) {
        const { cuttingSpeed, feed, depthOfCut, efficiency = 0.9 } = params;
        
        // MRR in mm³/min
        const mrr = cuttingSpeed * 1000 * feed * depthOfCut;
        
        // Effective MRR accounting for air cuts
        const effectiveMRR = mrr * efficiency;
        
        // Convert to cm³/min
        const mrrCm3 = mrr / 1000;
        
        return {
            mrr: mrr,              // mm³/min
            mrrCm3: mrrCm3,        // cm³/min
            effectiveMRR: effectiveMRR,
            volumePerHour: mrr * 60 / 1000000 // liters/hour
        };
    }
}