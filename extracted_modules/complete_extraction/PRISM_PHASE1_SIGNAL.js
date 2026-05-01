const PRISM_PHASE1_SIGNAL = {
    name: 'Phase 1 Signal Processing Algorithms',
    version: '1.0.0',
    source: 'MIT 18.086, Berkeley EE123',
    
    /**
     * FFT Analysis (Cooley-Tukey)
     * Source: MIT 18.086 - Computational Science and Engineering
     */
    fftAnalyze: function(samples, sampleRate = 1000) {
        const N = samples.length;
        
        // Pad to power of 2 if needed
        const paddedLength = Math.pow(2, Math.ceil(Math.log2(N)));
        const padded = [...samples];
        while (padded.length < paddedLength) {
            padded.push(0);
        }
        
        // Compute FFT
        const fft = this._fft(padded);
        
        // Compute magnitude spectrum
        const magnitudes = [];
        const frequencies = [];
        const halfN = paddedLength / 2;
        
        for (let i = 0; i < halfN; i++) {
            const re = fft[2 * i];
            const im = fft[2 * i + 1];
            magnitudes.push(Math.sqrt(re * re + im * im) / N);
            frequencies.push(i * sampleRate / paddedLength);
        }
        
        // Find dominant frequency
        let maxMag = 0;
        let dominantFreq = 0;
        for (let i = 1; i < halfN; i++) {
            if (magnitudes[i] > maxMag) {
                maxMag = magnitudes[i];
                dominantFreq = frequencies[i];
            }
        }
        
        return {
            magnitudes,
            frequencies,
            dominantFrequency: dominantFreq,
            dominantMagnitude: maxMag,
            sampleRate,
            source: 'MIT 18.086 - FFT'
        };
    },
    
    /**
     * FFT Chatter Detection
     * Protocol J: Innovation-First - combines FFT with manufacturing knowledge
     */
    fftChatterDetect: function(vibrationData, params = {}) {
        const {
            sampleRate = 10000,
            spindleRpm = 10000,
            numFlutes = 4
        } = params;
        
        // Compute FFT
        const fftResult = this.fftAnalyze(vibrationData, sampleRate);
        
        // Calculate tooth passing frequency
        const toothPassingFreq = (spindleRpm / 60) * numFlutes;
        
        // Check for chatter characteristics
        const chatterIndicators = [];
        
        // Look for peaks not at harmonics of tooth passing frequency
        for (let i = 0; i < fftResult.magnitudes.length; i++) {
            const freq = fftResult.frequencies[i];
            const mag = fftResult.magnitudes[i];
            
            // Check if this is a harmonic of tooth passing
            const nearestHarmonic = Math.round(freq / toothPassingFreq);
            const harmonicFreq = nearestHarmonic * toothPassingFreq;
            const deviation = Math.abs(freq - harmonicFreq) / toothPassingFreq;
            
            // If significant peak not near harmonic, potential chatter
            if (mag > fftResult.dominantMagnitude * 0.3 && deviation > 0.1) {
                chatterIndicators.push({
                    frequency: freq,
                    magnitude: mag,
                    deviation: deviation
                });
            }
        }
        
        // Calculate chatter severity
        const chatterSeverity = chatterIndicators.length > 0 ?
            Math.min(1, chatterIndicators.reduce((sum, c) => sum + c.magnitude, 0) / 
                fftResult.dominantMagnitude) : 0;
        
        return {
            hasChatter: chatterSeverity > 0.2,
            chatterSeverity,
            chatterFrequencies: chatterIndicators.map(c => c.frequency),
            toothPassingFrequency: toothPassingFreq,
            dominantFrequency: fftResult.dominantFrequency,
            recommendation: chatterSeverity > 0.5 ? 'Reduce speed or DOC immediately' :
                chatterSeverity > 0.2 ? 'Monitor closely, consider parameter adjustment' :
                'Stable cutting conditions',
            source: 'MIT 18.086 + MIT 2.830 - FFT Chatter Detection'
        };
    },
    
    _fft: function(samples) {
        const N = samples.length;
        
        // Base case
        if (N <= 1) {
            return [samples[0] || 0, 0];
        }
        
        // Split even and odd
        const even = [];
        const odd = [];
        for (let i = 0; i < N; i += 2) {
            even.push(samples[i]);
            odd.push(samples[i + 1] || 0);
        }
        
        // Recursive FFT
        const fftEven = this._fft(even);
        const fftOdd = this._fft(odd);
        
        // Combine
        const result = new Array(N * 2).fill(0);
        for (let k = 0; k < N / 2; k++) {
            const angle = -2 * Math.PI * k / N;
            const wRe = Math.cos(angle);
            const wIm = Math.sin(angle);
            
            const oddRe = fftOdd[2 * k];
            const oddIm = fftOdd[2 * k + 1];
            
            const tRe = wRe * oddRe - wIm * oddIm;
            const tIm = wRe * oddIm + wIm * oddRe;
            
            result[2 * k] = fftEven[2 * k] + tRe;
            result[2 * k + 1] = fftEven[2 * k + 1] + tIm;
            result[2 * (k + N / 2)] = fftEven[2 * k] - tRe;
            result[2 * (k + N / 2) + 1] = fftEven[2 * k + 1] - tIm;
        }
        
        return result;
    },
    
    /**
     * Butterworth Low-Pass Filter
     * Source: Berkeley EE123 - Digital Signal Processing
     */
    butterworthFilter: function(data, cutoffFreq, sampleRate, order = 2) {
        const nyquist = sampleRate / 2;
        const normalizedCutoff = cutoffFreq / nyquist;
        
        // Calculate Butterworth coefficients
        const wc = Math.tan(Math.PI * normalizedCutoff);
        const k1 = Math.sqrt(2) * wc;
        const k2 = wc * wc;
        
        const a0 = k2 / (1 + k1 + k2);
        const a1 = 2 * a0;
        const a2 = a0;
        const b1 = 2 * a0 * (1 / k2 - 1);
        const b2 = 1 - (a0 + a1 + a2 + b1);
        
        // Apply filter (direct form II)
        const output = [];
        let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
        
        for (const x of data) {
            const y = a0 * x + a1 * x1 + a2 * x2 - b1 * y1 - b2 * y2;
            
            x2 = x1;
            x1 = x;
            y2 = y1;
            y1 = y;
            
            output.push(y);
        }
        
        return {
            filtered: output,
            cutoffFrequency: cutoffFreq,
            order,
            source: 'Berkeley EE123 - Butterworth Filter'
        };
    },
    
    /**
     * Stability Lobes Calculation
     * Source: MIT 2.830 - Manufacturing Processes & Systems
     */
    stabilityLobes: function(params) {
        const {
            naturalFrequency = 500,  // Hz
            dampingRatio = 0.03,
            stiffness = 1e7,         // N/m
            numFlutes = 4,
            specificCuttingForce = 2000,  // N/mm²
            radialImmersion = 1,     // Ratio (1 = full slot)
            rpmRange = { min: 1000, max: 20000 },
            numPoints = 100
        } = params;
        
        const lobes = [];
        const omega_n = 2 * Math.PI * naturalFrequency;
        
        // Calculate stability boundary for each lobe
        for (let lobe = 0; lobe < 10; lobe++) {
            const lobePoints = [];
            
            for (let i = 0; i < numPoints; i++) {
                // Phase angle from 0 to π
                const epsilon = Math.PI * i / numPoints;
                
                // Chatter frequency
                const omega_c = omega_n * Math.sqrt(1 - dampingRatio * dampingRatio);
                
                // FRF at chatter frequency
                const lambda = omega_c / omega_n;
                const G_re = (1 - lambda * lambda) / 
                    (Math.pow(1 - lambda * lambda, 2) + Math.pow(2 * dampingRatio * lambda, 2));
                const G_im = -2 * dampingRatio * lambda / 
                    (Math.pow(1 - lambda * lambda, 2) + Math.pow(2 * dampingRatio * lambda, 2));
                
                // Directional cutting coefficient
                const alpha = radialImmersion * Math.PI;
                const Kt = specificCuttingForce;
                
                // Critical depth of cut
                const a_lim = -1 / (2 * Kt * numFlutes * alpha * (G_re / stiffness));
                
                // Spindle speed for this lobe
                const N = 60 * omega_c / (2 * Math.PI * (lobe + epsilon / Math.PI) * numFlutes);
                
                if (N >= rpmRange.min && N <= rpmRange.max && a_lim > 0) {
                    lobePoints.push({
                        rpm: N,
                        depthLimit: a_lim * 1000  // Convert to mm
                    });
                }
            }
            
            if (lobePoints.length > 0) {
                lobes.push({
                    lobeNumber: lobe,
                    points: lobePoints.sort((a, b) => a.rpm - b.rpm)
                });
            }
        }
        
        // Find optimal stable pockets
        const stablePockets = [];
        for (const lobe of lobes) {
            if (lobe.points.length > 2) {
                const maxDepthPoint = lobe.points.reduce((max, p) => 
                    p.depthLimit > max.depthLimit ? p : max, lobe.points[0]);
                stablePockets.push({
                    rpm: maxDepthPoint.rpm,
                    maxDepth: maxDepthPoint.depthLimit,
                    lobeNumber: lobe.lobeNumber
                });
            }
        }
        
        return {
            lobes,
            stablePockets: stablePockets.sort((a, b) => b.maxDepth - a.maxDepth),
            optimalRpm: stablePockets.length > 0 ? stablePockets[0].rpm : rpmRange.min,
            maxStableDepth: stablePockets.length > 0 ? stablePockets[0].maxDepth : 1,
            parameters: {
                naturalFrequency,
                dampingRatio,
                stiffness,
                numFlutes
            },
            source: 'MIT 2.830 - Stability Lobes'
        };
    },
    
    /**
     * Power Spectral Density
     */
    spectralDensity: function(samples, sampleRate = 1000) {
        const fftResult = this.fftAnalyze(samples, sampleRate);
        
        // PSD = |FFT|² / N
        const psd = fftResult.magnitudes.map(mag => mag * mag * samples.length);
        
        return {
            psd,
            frequencies: fftResult.frequencies,
            totalPower: psd.reduce((sum, p) => sum + p, 0),
            source: 'MIT 18.086 - PSD'
        };
    }
}