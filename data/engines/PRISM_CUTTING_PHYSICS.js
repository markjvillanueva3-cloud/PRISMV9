// PRISM_CUTTING_PHYSICS - Lines 797414-797627 (214 lines) - Cutting physics\n\nconst PRISM_CUTTING_PHYSICS = {
    
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
    },
    
    /**
     * Taylor tool life equation
     * @param {number} speed_mpm - Cutting speed in m/min
     * @param {Object} material - Tool/workpiece material properties
     * @returns {Object} Tool life prediction
     */
    taylorToolLife: function(speed_mpm, material = {}) {
        const {
            n = 0.25,           // Taylor exponent
            C = 300,            // Taylor constant
            feed_mm = 0.2,      // Feed per rev
            doc_mm = 2,         // Depth of cut
            m = 0.15,           // Feed exponent
            p = 0.08            // DOC exponent
        } = material;
        
        // Extended Taylor: V × T^n × f^m × d^p = C
        // Solving for T: T = (C / (V × f^m × d^p))^(1/n)
        const T = Math.pow(C / (speed_mpm * Math.pow(feed_mm, m) * Math.pow(doc_mm, p)), 1/n);
        
        return {
            speed_mpm,
            toolLife_min: T,
            taylorN: n,
            taylorC: C,
            feed_mm,
            doc_mm,
            // Additional analytics
            doublingSpeedReduction: (1 - Math.pow(0.5, 1/n)) * 100, // % life lost if speed doubles
            optimalSpeed: C * Math.pow(T / 60, -n) // For 1-hour tool life
        };
    },
    
    /**
     * Cutting temperature estimation
     * @param {Object} params - Process parameters
     * @returns {Object} Temperature analysis
     */
    cuttingTemperature: function(params) {
        const {
            speed_mpm = 100,
            feed_mm = 0.2,
            specificEnergy_J_mm3 = 3.5,
            conductivity_W_mK = 50,    // Workpiece thermal conductivity
            density_kg_m3 = 7850,       // Workpiece density
            specificHeat_J_kgK = 500    // Workpiece specific heat
        } = params;
        
        // Thermal diffusivity
        const alpha = conductivity_W_mK / (density_kg_m3 * specificHeat_J_kgK);
        
        // Characteristic length (feed)
        const L = feed_mm / 1000; // m
        
        // Chip temperature rise (Trigger equation simplified)
        const V = speed_mpm / 60; // m/s
        const deltaT = (0.4 * specificEnergy_J_mm3 * 1e9 * V) / 
                       (density_kg_m3 * specificHeat_J_kgK * Math.sqrt(alpha * L));
        
        // Approximate temperatures
        const ambientTemp = 25;
        const chipTemp = ambientTemp + deltaT;
        const toolTemp = ambientTemp + deltaT * 0.7; // Tool sees ~70% of chip temp
        const workpieceTemp = ambientTemp + deltaT * 0.1; // Workpiece sees ~10%
        
        return {
            speed_mpm,
            chipTemperature_C: Math.round(chipTemp),
            toolTemperature_C: Math.round(toolTemp),
            workpieceTemperature_C: Math.round(workpieceTemp),
            temperatureRise_C: Math.round(deltaT),
            heatPartition: {
                chip_percent: 70,
                tool_percent: 20,
                workpiece_percent: 10
            }
        };
    },
    
    /**
     * Stability lobe diagram calculation
     * @param {Object} machineParams - Machine dynamic parameters
     * @param {Object} cuttingParams - Cutting parameters
     * @returns {Object} Stability analysis
     */
    stabilityLobes: function(machineParams, cuttingParams) {
        const {
            naturalFreq_Hz = 500,
            damping = 0.03,
            stiffness_N_um = 50
        } = machineParams;
        
        const {
            specificForce_N_mm2 = 2000,
            numTeeth = 4
        } = cuttingParams;
        
        const omega_n = 2 * Math.PI * naturalFreq_Hz;
        const Ks = specificForce_N_um * 1000; // N/m per mm DOC
        
        // Calculate stability lobes
        const lobes = [];
        for (let k = 0; k < 5; k++) { // First 5 lobes
            const points = [];
            for (let ratio = 0.5; ratio <= 1.5; ratio += 0.01) {
                const omega = omega_n * ratio;
                
                // Transfer function real part
                const G_real = -omega_n * omega_n * (omega_n * omega_n - omega * omega) /
                    (Math.pow(omega_n * omega_n - omega * omega, 2) + 
                     Math.pow(2 * damping * omega_n * omega, 2));
                
                // Critical depth of cut
                const b_lim = -1 / (2 * Ks * G_real);
                
                if (b_lim > 0 && b_lim < 20) {
                    // Spindle speed for this frequency
                    const epsilon = Math.atan2(2 * damping * omega_n * omega, 
                                               omega_n * omega_n - omega * omega);
                    const N = 60 * omega / (2 * Math.PI * (k + epsilon / (2 * Math.PI)));
                    
                    if (N > 0 && N < 50000) {
                        points.push({ rpm: N, doc_mm: b_lim });
                    }
                }
            }
            if (points.length > 0) {
                lobes.push({ lobe: k, points });
            }
        }
        
        // Find sweet spots (local maxima)
        const sweetSpots = lobes.flatMap(l => {
            const maxPoint = l.points.reduce((max, p) => 
                p.doc_mm > max.doc_mm ? p : max, l.points[0]);
            return { lobe: l.lobe, rpm: Math.round(maxPoint.rpm), doc_mm: maxPoint.doc_mm.toFixed(2) };
        });
        
        return {
            naturalFrequency_Hz: naturalFreq_Hz,
            damping,
            stiffness_N_um,
            lobes,
            sweetSpots,
            recommendation: sweetSpots.length > 0 ? 
                `Optimal spindle speeds: ${sweetSpots.map(s => s.rpm + ' RPM').join(', ')}` :
                'Consider reducing speed or depth of cut'
        };
    }
};
