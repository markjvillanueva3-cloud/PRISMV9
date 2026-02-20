const PRISM_CUTTING_PHYSICS = {
    
    /**
     * Merchant's Circle cutting force analysis
     * @param {Object} params - Cutting parameters
     * @returns {Object} Force analysis
     */
    merchantForces: function(params) {
        const {
            chipThickness_mm = 0.1,     // Uncut chip thickness t1
            chipWidth_mm = 2,            // Width of cut b
            rakeAngle_deg = 10,          // Tool rake angle α
            frictionAngle_deg = 35,      // Friction angle β
            shearStrength_MPa = 400      // Material shear strength τs
        } = params;
        
        const t1 = chipThickness_mm;
        const b = chipWidth_mm;
        const alpha = rakeAngle_deg * Math.PI / 180;
        const beta = frictionAngle_deg * Math.PI / 180;
        const tau_s = shearStrength_MPa;
        
        // Shear angle from Merchant's equation
        // 2φ + β - α = π/2
        const phi = (Math.PI / 4) - (beta - alpha) / 2;
        
        // Chip ratio
        const rc = Math.cos(phi - alpha) / Math.cos(alpha);
        
        // Shear area
        const As = (b * t1) / Math.sin(phi);
        
        // Shear force
        const Fs = tau_s * As;
        
        // Cutting force (tangential)
        const Fc = Fs * Math.cos(beta - alpha) / Math.cos(phi + beta - alpha);
        
        // Thrust force (normal)
        const Ft = Fs * Math.sin(beta - alpha) / Math.cos(phi + beta - alpha);
        
        // Friction force
        const Ff = Fc * Math.sin(beta) + Ft * Math.cos(beta);
        
        // Normal force on rake face
        const Fn = Fc * Math.cos(beta) - Ft * Math.sin(beta);
        
        // Coefficient of friction
        const mu = Math.tan(beta);
        
        return {
            shearAngle_deg: phi * 180 / Math.PI,
            chipRatio: rc,
            cuttingForce_N: Fc,
            thrustForce_N: Ft,
            shearForce_N: Fs,
            frictionForce_N: Ff,
            normalForce_N: Fn,
            coefficientOfFriction: mu,
            specificCuttingEnergy_J_mm3: Fc / (b * t1),
            shearArea_mm2: As
        };
    }