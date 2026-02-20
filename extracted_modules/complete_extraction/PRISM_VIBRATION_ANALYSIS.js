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
}