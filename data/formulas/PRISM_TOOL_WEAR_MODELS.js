/**
 * PRISM_TOOL_WEAR_MODELS
 * Extracted from PRISM v8.89.002 monolith
 * References: 14
 * Category: tool_life
 * Lines: 544
 * Session: R2.3.4 Formula Extraction
 */

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
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: VIBRATION & CHATTER (MIT 2.003, 2.14)
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_VIBRATION_ANALYSIS = {
    name: 'PRISM_VIBRATION_ANALYSIS',
    version: '1.0.0',
    source: 'MIT 2.003, 2.14 - Dynamics & Control',
    
    /**
     * Single DOF Vibration Analysis
     */
    singleDOF: function(params) {
        const {
            mass,           // kg
            stiffness,      // N/m
            damping         // N·s/m
        } = params;
        
        // Natural frequency
        const omega_n = Math.sqrt(stiffness / mass); // rad/s
        const f_n = omega_n / (2 * Math.PI);         // Hz
        
        // Damping ratio
        const zeta = damping / (2 * Math.sqrt(stiffness * mass));
        
        // Damped natural frequency
        const omega_d = omega_n * Math.sqrt(1 - zeta * zeta);
        const f_d = omega_d / (2 * Math.PI);
        
        // Quality factor
        const Q = 1 / (2 * zeta);
        
        // Critical damping
        const c_critical = 2 * Math.sqrt(stiffness * mass);
        
        return {
            naturalFrequency: f_n,       // Hz
            naturalFrequencyRad: omega_n, // rad/s
            dampedFrequency: f_d,        // Hz
            dampingRatio: zeta,
            qualityFactor: Q,
            criticalDamping: c_critical,
            dampingType: zeta < 1 ? 'underdamped' : zeta === 1 ? 'critically_damped' : 'overdamped'
        };
    },
    
    /**
     * Frequency Response Function (FRF)
     * Transfer function magnitude and phase
     */
    frequencyResponse: function(params) {
        const {
            mass,
            stiffness,
            damping,
            frequencyRange = [0, 500], // Hz
            numPoints = 200
        } = params;
        
        const omega_n = Math.sqrt(stiffness / mass);
        const zeta = damping / (2 * Math.sqrt(stiffness * mass));
        
        const frequencies = [];
        const magnitude = [];
        const phase = [];
        const realPart = [];
        const imagPart = [];
        
        for (let i = 0; i < numPoints; i++) {
            const f = frequencyRange[0] + (frequencyRange[1] - frequencyRange[0]) * i / (numPoints - 1);
            const omega = 2 * Math.PI * f;
            const r = omega / omega_n;
            
            // H(jω) = 1 / (k * (1 - r² + j*2*ζ*r))
            const denom_real = 1 - r * r;
            const denom_imag = 2 * zeta * r;
            const denom_mag_sq = denom_real * denom_real + denom_imag * denom_imag;
            
            const H_real = denom_real / (stiffness * denom_mag_sq);
            const H_imag = -denom_imag / (stiffness * denom_mag_sq);
            const H_mag = Math.sqrt(H_real * H_real + H_imag * H_imag);
            const H_phase = Math.atan2(H_imag, H_real) * 180 / Math.PI;
            
            frequencies.push(f);
            magnitude.push(H_mag);
            phase.push(H_phase);
            realPart.push(H_real);
            imagPart.push(H_imag);
        }
        
        // Find peak (resonance)
        const maxMag = Math.max(...magnitude);
        const peakIndex = magnitude.indexOf(maxMag);
        
        return {
            frequencies,
            magnitude,
            phase,
            realPart,
            imagPart,
            resonanceFrequency: frequencies[peakIndex],
            peakMagnitude: maxMag,
            staticCompliance: 1 / stiffness
        };
    },
    
    /**
     * Complete Stability Lobe Diagram Generator
     * For chatter prediction
     * Source: MIT 2.14
     */
    stabilityLobeDiagram: function(params) {
        const {
            naturalFrequency, // Hz
            dampingRatio,
            stiffness,        // N/m
            specificCuttingForce, // N/mm²
            numTeeth,         // Number of cutting teeth
            radialImmersion = 1.0, // ae/D ratio
            rpmRange = [1000, 20000],
            numPoints = 100
        } = params;
        
        const omega_n = 2 * Math.PI * naturalFrequency;
        const Ks = specificCuttingForce;
        
        // Average directional factor (depends on radial immersion)
        const phi_s = Math.acos(1 - 2 * radialImmersion);
        const alpha_xx = (1 / (2 * Math.PI)) * (phi_s - Math.sin(2 * phi_s) / 2);
        
        const lobes = [];
        
        // Generate multiple lobes
        for (let k = 0; k < 10; k++) {
            const lobe = { rpm: [], doc: [], lobeNumber: k };
            
            for (let i = 0; i < numPoints; i++) {
                // Phase angle
                const epsilon = -2 * Math.PI * i / numPoints;
                
                // Chatter frequency
                const omega_c = omega_n * Math.sqrt(1 - dampingRatio * dampingRatio);
                
                // Spindle speed for this lobe
                const N = (60 * omega_c) / (2 * Math.PI * (k + epsilon / (2 * Math.PI)) * numTeeth);
                
                if (N >= rpmRange[0] && N <= rpmRange[1]) {
                    // FRF at chatter frequency
                    const r = omega_c / omega_n;
                    const G_real = (1 - r * r) / ((1 - r * r) * (1 - r * r) + (2 * dampingRatio * r) * (2 * dampingRatio * r));
                    const G_imag = (-2 * dampingRatio * r) / ((1 - r * r) * (1 - r * r) + (2 * dampingRatio * r) * (2 * dampingRatio * r));
                    
                    // Stability limit
                    const b_lim = -1 / (2 * Ks * alpha_xx * numTeeth * G_real / stiffness);
                    
                    if (b_lim > 0 && b_lim < 50) { // Reasonable limits
                        lobe.rpm.push(N);
                        lobe.doc.push(b_lim);
                    }
                }
            }
            
            if (lobe.rpm.length > 0) {
                // Sort by RPM
                const sorted = lobe.rpm.map((rpm, i) => ({ rpm, doc: lobe.doc[i] }))
                                       .sort((a, b) => a.rpm - b.rpm);
                lobe.rpm = sorted.map(x => x.rpm);
                lobe.doc = sorted.map(x => x.doc);
                lobes.push(lobe);
            }
        }
        
        // Find sweet spots (local maxima in stability)
        const sweetSpots = [];
        for (const lobe of lobes) {
            for (let i = 1; i < lobe.doc.length - 1; i++) {
                if (lobe.doc[i] > lobe.doc[i-1] && lobe.doc[i] > lobe.doc[i+1]) {
                    sweetSpots.push({ rpm: lobe.rpm[i], maxDoc: lobe.doc[i] });
                }
            }
        }
        sweetSpots.sort((a, b) => b.maxDoc - a.maxDoc);
        
        return {
            lobes,
            sweetSpots: sweetSpots.slice(0, 5),
            parameters: {
                naturalFrequency,
                dampingRatio,
                stiffness,
                specificCuttingForce
            }
        };
    },
    
    /**
     * Chatter Detection from Measured Signal
     * Using FFT analysis
     */
    detectChatter: function(params) {
        const {
            signal,           // Time-domain signal array
            sampleRate,       // Hz
            spindleRPM,
            numTeeth,
            naturalFrequency  // Machine natural frequency
        } = params;
        
        const N = signal.length;
        
        // Simple DFT (for demonstration - use FFT in production)
        const spectrum = [];
        for (let k = 0; k < N / 2; k++) {
            let real = 0, imag = 0;
            for (let n = 0; n < N; n++) {
                const angle = 2 * Math.PI * k * n / N;
                real += signal[n] * Math.cos(angle);
                imag -= signal[n] * Math.sin(angle);
            }
            const magnitude = Math.sqrt(real * real + imag * imag) / N;
            const frequency = k * sampleRate / N;
            spectrum.push({ frequency, magnitude });
        }
        
        // Find peaks
        const peaks = [];
        for (let i = 1; i < spectrum.length - 1; i++) {
            if (spectrum[i].magnitude > spectrum[i-1].magnitude &&
                spectrum[i].magnitude > spectrum[i+1].magnitude &&
                spectrum[i].magnitude > 0.1 * Math.max(...spectrum.map(s => s.magnitude))) {
                peaks.push(spectrum[i]);
            }
        }
        
        // Tooth passing frequency
        const toothPassingFreq = spindleRPM * numTeeth / 60;
        
        // Check for chatter indicators
        const chatterIndicators = peaks.filter(p => {
            const nearNatural = Math.abs(p.frequency - naturalFrequency) < naturalFrequency * 0.1;
            const notHarmonic = peaks.every(h => 
                Math.abs(p.frequency - h.frequency * Math.round(p.frequency / h.frequency)) > 5
            );
            return nearNatural || (p.magnitude > 0.5 * Math.max(...peaks.map(x => x.magnitude)) && notHarmonic);
        });
        
        const chatterDetected = chatterIndicators.length > 0;
        
        return {
            chatterDetected,
            chatterFrequencies: chatterIndicators.map(p => p.frequency),
            dominantFrequency: peaks.length > 0 ? peaks.reduce((a, b) => a.magnitude > b.magnitude ? a : b).frequency : null,
            toothPassingFrequency: toothPassingFreq,
            spectrum: spectrum.filter((_, i) => i % 10 === 0), // Downsample for output
            recommendation: chatterDetected ? 
                `Reduce spindle speed to ${Math.round(spindleRPM * 0.85)} RPM or increase to ${Math.round(spindleRPM * 1.15)} RPM` :
                'Stable cutting conditions'
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: STRUCTURAL MECHANICS (MIT 2.001, 2.72)
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_STRUCTURAL_MECHANICS = {
    name: 'PRISM_STRUCTURAL_MECHANICS',
    version: '1.0.0',
    source: 'MIT 2.001, 2.72 - Mechanics of Materials',
    
    /**
     * Hertz Contact Mechanics
     * Sphere-on-flat and cylinder-on-flat
     */
    hertzContact: function(params) {
        const {
            type = 'sphere_flat', // 'sphere_flat', 'cylinder_flat', 'sphere_sphere'
            load,                 // N
            radius1,              // mm (sphere or cylinder radius)
            radius2 = Infinity,   // mm (second body radius, Infinity for flat)
            E1,                   // MPa (Young's modulus body 1)
            E2,                   // MPa (Young's modulus body 2)
            nu1 = 0.3,           // Poisson's ratio body 1
            nu2 = 0.3,           // Poisson's ratio body 2
            length = 1           // mm (for cylinder contact)
        } = params;
        
        // Effective modulus
        const E_star = 1 / ((1 - nu1*nu1) / E1 + (1 - nu2*nu2) / E2);
        
        // Effective radius
        const R_eff = 1 / (1/radius1 + (radius2 === Infinity ? 0 : 1/radius2));
        
        let contactRadius, maxPressure, maxShearStress, approach;
        
        if (type === 'sphere_flat' || type === 'sphere_sphere') {
            // Hertz sphere contact
            contactRadius = Math.pow((3 * load * R_eff) / (4 * E_star), 1/3);
            maxPressure = (3 * load) / (2 * Math.PI * contactRadius * contactRadius);
            maxShearStress = 0.31 * maxPressure; // At depth z = 0.48a
            approach = Math.pow(contactRadius, 2) / R_eff;
            
        } else if (type === 'cylinder_flat') {
            // Hertz cylinder contact
            const halfWidth = Math.sqrt((4 * load * R_eff) / (Math.PI * E_star * length));
            contactRadius = halfWidth;
            maxPressure = (2 * load) / (Math.PI * halfWidth * length);
            maxShearStress = 0.30 * maxPressure;
            approach = (load / (Math.PI * E_star * length)) * (Math.log(4 * R_eff / halfWidth) + 0.5);
        }
        
        return {
            contactRadius: contactRadius,     // mm
            contactArea: Math.PI * contactRadius * contactRadius, // mm²
            maxPressure: maxPressure,         // MPa
            meanPressure: maxPressure * 2/3,  // MPa
            maxShearStress: maxShearStress,   // MPa
            approach: approach,               // mm (elastic deformation)
            effectiveModulus: E_star,
            effectiveRadius: R_eff
        };
    },
    
    /**
     * Stress Concentration Factors
     */
    stressConcentration: function(params) {
        const {
            type,    // 'hole', 'fillet', 'groove', 'shoulder'
            geometry // Type-specific parameters
        } = params;
        
        let Kt;
        
        switch (type) {
            case 'hole':
                // Circular hole in infinite plate
                Kt = 3.0;
                break;
                
            case 'fillet':
                // Shoulder fillet
                const { D, d, r } = geometry; // Major diameter, minor diameter, fillet radius
                const ratio_D_d = D / d;
                const ratio_r_d = r / d;
                // Peterson's formula approximation
                Kt = 1 + (ratio_D_d - 1) * (0.27 + 1.57 * Math.sqrt(ratio_D_d - 1)) / 
                     (1 + 0.775 * Math.pow(ratio_r_d, 0.5));
                Kt = Math.min(Kt, 3.5); // Cap at reasonable value
                break;
                
            case 'groove':
                // U-groove in shaft
                const { D_g, d_g, r_g } = geometry;
                Kt = 1 + 2 * Math.sqrt((D_g - d_g) / (2 * r_g));
                break;
                
            case 'shoulder':
                // Sharp shoulder
                Kt = 2.5;
                break;
                
            default:
                Kt = 1.5;
        }