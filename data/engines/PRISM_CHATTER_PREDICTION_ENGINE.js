// PRISM_CHATTER_PREDICTION_ENGINE - Lines 953303-953699 (397 lines) - Stability lobe prediction\n\nconst PRISM_CHATTER_PREDICTION_ENGINE = {
    name: 'PRISM_CHATTER_PREDICTION_ENGINE',
    version: '1.0.0',
    source: 'Altintas, Tlusty, MIT 2.830',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STABILITY LOBE DIAGRAM
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Generate stability lobe diagram for milling
     * @param {Object} toolDynamics - {mass, stiffness, damping} or FRF
     * @param {Object} cuttingParams - {Kt, radialImmersion, numTeeth}
     * @param {Object} rpmRange - {min, max, points}
     * @returns {Object} Stability lobes data
     */
    generateStabilityLobes: function(toolDynamics, cuttingParams, rpmRange) {
        const { Kt, radialImmersion = 1, numTeeth = 4 } = cuttingParams;
        const { min: rpmMin, max: rpmMax, points = 100 } = rpmRange;
        
        // Get system FRF parameters
        let omega_n, zeta, k;
        if (toolDynamics.mass) {
            const { mass: m, stiffness, damping = 0 } = toolDynamics;
            k = stiffness;
            omega_n = Math.sqrt(k / m);
            zeta = damping / (2 * Math.sqrt(k * m));
        } else {
            // Assume FRF data provided
            omega_n = toolDynamics.naturalFreq * 2 * Math.PI;
            zeta = toolDynamics.dampingRatio;
            k = toolDynamics.stiffness;
        }
        
        // Average directional factor for milling
        const alphaxx = this._directionalFactor(radialImmersion, 'milling');
        
        const lobes = [];
        const numLobes = 5;
        
        // Generate lobes for different lobe numbers
        for (let lobeNum = 0; lobeNum < numLobes; lobeNum++) {
            const lobePoints = [];
            
            // Sweep through phase (0 to π)
            for (let i = 0; i <= points; i++) {
                const epsilon = Math.PI * i / points;
                
                // Chatter frequency
                const omega_c = omega_n * Math.sqrt(1 - zeta * zeta + 
                    Math.sqrt(Math.pow(1 - zeta * zeta, 2) + Math.pow(Math.tan(epsilon), 2)));
                
                // Real part of oriented FRF
                const G_real = -1 / (2 * k * zeta * Math.sqrt(1 - zeta * zeta));
                
                // Critical depth of cut (Altintas equation)
                const a_lim = -1 / (2 * Kt * alphaxx * G_real * Math.cos(epsilon));
                
                // Spindle speed
                const f_c = omega_c / (2 * Math.PI);
                const T = (2 * lobeNum * Math.PI + epsilon) / omega_c;
                const N = 60 / (numTeeth * T);
                
                if (N >= rpmMin && N <= rpmMax && a_lim > 0) {
                    lobePoints.push({
                        rpm: N,
                        depthLimit_mm: a_lim * 1000, // Convert to mm
                        chatterFrequency_Hz: f_c,
                        lobeNumber: lobeNum
                    });
                }
            }
            
            if (lobePoints.length > 0) {
                lobes.push({
                    lobeNumber: lobeNum,
                    points: lobePoints.sort((a, b) => a.rpm - b.rpm)
                });
            }
        }
        
        // Find optimal stable pockets
        const stablePockets = this._findStablePockets(lobes, rpmMin, rpmMax);
        
        return {
            lobes,
            stablePockets,
            toolDynamics: { naturalFreq_Hz: omega_n / (2 * Math.PI), dampingRatio: zeta, stiffness: k },
            cuttingParams,
            rpmRange: { min: rpmMin, max: rpmMax }
        };
    },
    
    _directionalFactor: function(radialImmersion, operation) {
        // Average directional factor for different operations
        if (operation === 'milling') {
            // Simplified - depends on engagement angle
            const phi_st = Math.acos(1 - 2 * radialImmersion);
            const phi_ex = Math.PI;
            return (1 / (2 * Math.PI)) * (Math.cos(2 * phi_st) - Math.cos(2 * phi_ex) + 2 * (phi_ex - phi_st));
        }
        return 1; // For turning
    },
    
    _findStablePockets: function(lobes, rpmMin, rpmMax) {
        const pockets = [];
        const stepSize = 100;
        
        for (let rpm = rpmMin; rpm <= rpmMax; rpm += stepSize) {
            let maxStableDepth = Infinity;
            
            for (const lobe of lobes) {
                for (let i = 0; i < lobe.points.length - 1; i++) {
                    const p1 = lobe.points[i];
                    const p2 = lobe.points[i + 1];
                    
                    if (rpm >= Math.min(p1.rpm, p2.rpm) && rpm <= Math.max(p1.rpm, p2.rpm)) {
                        const t = (rpm - p1.rpm) / (p2.rpm - p1.rpm);
                        const depth = p1.depthLimit_mm + t * (p2.depthLimit_mm - p1.depthLimit_mm);
                        maxStableDepth = Math.min(maxStableDepth, depth);
                    }
                }
            }
            
            if (maxStableDepth > 0 && maxStableDepth < Infinity) {
                pockets.push({ rpm, maxStableDepth_mm: maxStableDepth });
            }
        }
        
        // Find peaks in stable pockets
        const peaks = [];
        for (let i = 1; i < pockets.length - 1; i++) {
            if (pockets[i].maxStableDepth_mm > pockets[i-1].maxStableDepth_mm &&
                pockets[i].maxStableDepth_mm > pockets[i+1].maxStableDepth_mm) {
                peaks.push(pockets[i]);
            }
        }
        
        return {
            all: pockets,
            peaks: peaks.sort((a, b) => b.maxStableDepth_mm - a.maxStableDepth_mm)
        };
    },
    
    /**
     * Check stability for given parameters
     * @param {number} rpm - Spindle speed
     * @param {number} axialDepth - Depth of cut in mm
     * @param {Object} lobes - Stability lobe data
     * @returns {Object} Stability assessment
     */
    checkStability: function(rpm, axialDepth, lobes) {
        let minStableDepth = Infinity;
        let criticalLobe = null;
        
        for (const lobe of lobes.lobes) {
            for (let i = 0; i < lobe.points.length - 1; i++) {
                const p1 = lobe.points[i];
                const p2 = lobe.points[i + 1];
                
                if (rpm >= Math.min(p1.rpm, p2.rpm) && rpm <= Math.max(p1.rpm, p2.rpm)) {
                    const t = (rpm - p1.rpm) / (p2.rpm - p1.rpm);
                    const depth = p1.depthLimit_mm + t * (p2.depthLimit_mm - p1.depthLimit_mm);
                    if (depth < minStableDepth) {
                        minStableDepth = depth;
                        criticalLobe = lobe.lobeNumber;
                    }
                }
            }
        }
        
        const stable = axialDepth < minStableDepth;
        const margin = minStableDepth - axialDepth;
        const marginPercent = (margin / minStableDepth) * 100;
        
        return {
            stable,
            axialDepth_mm: axialDepth,
            criticalDepth_mm: minStableDepth,
            margin_mm: margin,
            marginPercent,
            criticalLobe,
            recommendation: stable ? 
                (marginPercent > 20 ? 'Good - adequate stability margin' : 'Caution - near stability limit') :
                'Unstable - reduce depth of cut or change RPM'
        };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CHATTER DETECTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Detect chatter from vibration signal
     * @param {Array} signal - Time-domain vibration signal
     * @param {Object} config - {sampleRate, teeth, rpm}
     * @returns {Object} Chatter detection results
     */
    detectChatter: function(signal, config) {
        const { sampleRate, teeth, rpm } = config;
        
        // Compute FFT
        const spectrum = this._fft(signal);
        const N = signal.length;
        const freqs = spectrum.map((_, i) => i * sampleRate / N);
        
        // Tooth passing frequency and harmonics
        const toothFreq = rpm * teeth / 60;
        const harmonics = [1, 2, 3, 4, 5].map(n => n * toothFreq);
        
        // Find spectral peaks
        const peaks = this._findPeaks(spectrum, freqs, sampleRate);
        
        // Classify peaks as harmonic or non-harmonic (potential chatter)
        const harmonicPeaks = [];
        const nonHarmonicPeaks = [];
        
        for (const peak of peaks) {
            const isHarmonic = harmonics.some(h => Math.abs(peak.frequency - h) < toothFreq * 0.1);
            if (isHarmonic) {
                harmonicPeaks.push(peak);
            } else {
                nonHarmonicPeaks.push(peak);
            }
        }
        
        // Chatter detection criteria
        let chatterDetected = false;
        let chatterFrequency = null;
        let chatterSeverity = 0;
        
        if (nonHarmonicPeaks.length > 0 && harmonicPeaks.length > 0) {
            const dominantNonHarmonic = nonHarmonicPeaks[0];
            const dominantHarmonic = harmonicPeaks[0];
            
            // Chatter if non-harmonic peak is significant relative to tooth passing
            const ratio = dominantNonHarmonic.magnitude / dominantHarmonic.magnitude;
            if (ratio > 0.3) {
                chatterDetected = true;
                chatterFrequency = dominantNonHarmonic.frequency;
                chatterSeverity = Math.min(1, ratio);
            }
        }
        
        return {
            chatterDetected,
            chatterFrequency_Hz: chatterFrequency,
            chatterSeverity, // 0-1 scale
            toothPassingFrequency_Hz: toothFreq,
            harmonicPeaks,
            nonHarmonicPeaks,
            spectrum: spectrum.slice(0, N / 2),
            frequencies: freqs.slice(0, N / 2),
            recommendation: chatterDetected ? 
                `Chatter detected at ${chatterFrequency?.toFixed(1)} Hz. Adjust RPM or reduce depth.` :
                'No chatter detected'
        };
    },
    
    _fft: function(signal) {
        const N = signal.length;
        const spectrum = [];
        
        // Radix-2 FFT (requires power of 2 length)
        const n = Math.pow(2, Math.ceil(Math.log2(N)));
        const padded = [...signal, ...Array(n - N).fill(0)];
        
        // DFT (use FFT algorithm for large signals in production)
        for (let k = 0; k < n; k++) {
            let real = 0, imag = 0;
            for (let t = 0; t < n; t++) {
                const angle = -2 * Math.PI * k * t / n;
                real += padded[t] * Math.cos(angle);
                imag += padded[t] * Math.sin(angle);
            }
            spectrum.push(Math.sqrt(real * real + imag * imag) / n);
        }
        
        return spectrum;
    },
    
    _findPeaks: function(spectrum, freqs, sampleRate) {
        const peaks = [];
        const minHeight = Math.max(...spectrum) * 0.05; // 5% of max
        
        // Only look at first half (positive frequencies)
        const halfN = Math.floor(spectrum.length / 2);
        
        for (let i = 2; i < halfN - 2; i++) {
            if (spectrum[i] > minHeight &&
                spectrum[i] > spectrum[i-1] && spectrum[i] > spectrum[i-2] &&
                spectrum[i] > spectrum[i+1] && spectrum[i] > spectrum[i+2]) {
                peaks.push({
                    frequency: freqs[i],
                    magnitude: spectrum[i],
                    index: i
                });
            }
        }
        
        return peaks.sort((a, b) => b.magnitude - a.magnitude);
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CRITICAL SPEED ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Calculate critical speeds for rotating shaft
     * @param {Object} shaft - {length, diameter, E, density}
     * @param {Array} supports - [{position, type}] 
     * @returns {Object} Critical speeds
     */
    criticalSpeeds: function(shaft, supports = []) {
        const { length: L, diameter: d, E, density: rho } = shaft;
        
        // Cross-section properties
        const A = Math.PI * d * d / 4;
        const I = Math.PI * Math.pow(d, 4) / 64;
        
        // Mass per unit length
        const m_bar = rho * A;
        
        // Bending rigidity
        const EI = E * I;
        
        // Calculate first few critical speeds based on support conditions
        const supportType = supports.length === 0 ? 'simply-supported' : 
            supports.every(s => s.type === 'fixed') ? 'fixed-fixed' : 'simply-supported';
        
        const criticalSpeeds = [];
        const lambda_n = {
            'simply-supported': [Math.PI, 2 * Math.PI, 3 * Math.PI],
            'fixed-fixed': [4.730, 7.853, 10.996],
            'cantilever': [1.875, 4.694, 7.855]
        };
        
        const lambdas = lambda_n[supportType] || lambda_n['simply-supported'];
        
        for (let i = 0; i < lambdas.length; i++) {
            const lambda = lambdas[i];
            
            // Natural frequency: ω_n = (λ/L)² * sqrt(EI / (m_bar))
            const omega_n = Math.pow(lambda / L, 2) * Math.sqrt(EI / m_bar);
            const f_n = omega_n / (2 * Math.PI);
            const rpm_critical = f_n * 60;
            
            criticalSpeeds.push({
                mode: i + 1,
                frequency_Hz: f_n,
                criticalRPM: rpm_critical,
                wavelength: L / lambda
            });
        }
        
        return {
            shaft: { length: L, diameter: d, E, density: rho },
            supportType,
            criticalSpeeds,
            recommendedMaxRPM: criticalSpeeds[0].criticalRPM * 0.8,
            safeOperatingRanges: this._findSafeRanges(criticalSpeeds)
        };
    },
    
    _findSafeRanges: function(criticalSpeeds) {
        const ranges = [];
        const margin = 0.15; // 15% margin from critical
        
        let prevUpper = 0;
        for (const cs of criticalSpeeds) {
            const lower = cs.criticalRPM * (1 - margin);
            const upper = cs.criticalRPM * (1 + margin);
            
            if (lower > prevUpper) {
                ranges.push({
                    min: prevUpper,
                    max: lower,
                    description: `Safe range below critical speed ${cs.mode}`
                });
            }
            prevUpper = upper;
        }
        
        return ranges;
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('chatter.stabilityLobes', 'PRISM_CHATTER_PREDICTION_ENGINE.generateStabilityLobes');
            PRISM_GATEWAY.register('chatter.checkStability', 'PRISM_CHATTER_PREDICTION_ENGINE.checkStability');
            PRISM_GATEWAY.register('chatter.detect', 'PRISM_CHATTER_PREDICTION_ENGINE.detectChatter');
            PRISM_GATEWAY.register('chatter.criticalSpeeds', 'PRISM_CHATTER_PREDICTION_ENGINE.criticalSpeeds');
            console.log('[PRISM] PRISM_CHATTER_PREDICTION_ENGINE registered: 4 routes');
        }
    }
};
