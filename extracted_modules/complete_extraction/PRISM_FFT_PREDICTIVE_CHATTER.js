const PRISM_FFT_PREDICTIVE_CHATTER = {
    name: 'FFT-Predictive Chatter',
    sources: ['MIT 18.086', 'MIT 2.830'],
    patentClaim: 'Real-time chatter prediction using FFT analysis combined with stability lobe diagrams for proactive avoidance',
    
    /**
     * Analyze vibration signal for chatter indicators
     */
    analyzeVibration: function(signal, sampleRate, spindleRPM) {
        const n = signal.length;
        
        // Compute FFT
        const fft = this._fft(signal);
        const magnitude = fft.map(c => Math.sqrt(c.re * c.re + c.im * c.im) / n);
        const freqResolution = sampleRate / n;
        
        // Find dominant frequencies
        const peaks = this._findPeaks(magnitude, 0.1);
        const dominantFreqs = peaks.map(idx => ({
            frequency: idx * freqResolution,
            magnitude: magnitude[idx],
            index: idx
        })).sort((a, b) => b.magnitude - a.magnitude).slice(0, 5);
        
        // Calculate tooth passing frequency
        const teethCount = 4; // Default, should be configurable
        const toothPassFreq = spindleRPM / 60 * teethCount;
        
        // Check for chatter indicators
        const chatterIndicators = [];
        
        for (const peak of dominantFreqs) {
            // Chatter typically occurs between tooth passing harmonics
            const isHarmonic = this._isNearHarmonic(peak.frequency, toothPassFreq, 0.05);
            
            if (!isHarmonic && peak.frequency > 100 && peak.frequency < 5000) {
                chatterIndicators.push({
                    frequency: peak.frequency,
                    magnitude: peak.magnitude,
                    type: 'potential_chatter',
                    severity: peak.magnitude > 0.5 ? 'HIGH' : peak.magnitude > 0.2 ? 'MEDIUM' : 'LOW'
                });
            }
        }
        
        // Calculate chatter risk score
        const riskScore = this._calculateChatterRisk(chatterIndicators, magnitude);
        
        return {
            dominantFrequencies: dominantFreqs,
            toothPassingFrequency: toothPassFreq,
            chatterIndicators: chatterIndicators,
            riskScore: riskScore,
            riskLevel: riskScore > 0.7 ? 'HIGH' : riskScore > 0.4 ? 'MEDIUM' : 'LOW',
            recommendation: this._getRecommendation(riskScore, spindleRPM)
        };
    },
    
    /**
     * Generate stability lobe diagram
     */
    generateStabilityLobes: function(params) {
        const {
            naturalFreq = 1000,      // Hz
            dampingRatio = 0.05,
            stiffness = 1e7,         // N/m
            cuttingCoeff = 2000,     // N/mm²
            radialImmersion = 0.5,
            teethCount = 4,
            rpmRange = [1000, 15000],
            docRange = [0.1, 10],
            resolution = 100
        } = params;
        
        const lobes = [];
        
        // Calculate for each spindle speed
        for (let rpm = rpmRange[0]; rpm <= rpmRange[1]; rpm += (rpmRange[1] - rpmRange[0]) / resolution) {
            const toothFreq = rpm / 60 * teethCount;
            
            // Critical depth calculation (simplified)
            // a_lim = -1 / (2 * Ks * Re(G))
            // where G is the transfer function at chatter frequency
            
            for (let lobe = 0; lobe < 10; lobe++) {
                const chatterFreq = naturalFreq * (1 + lobe * 0.1);
                const omega = 2 * Math.PI * chatterFreq;
                const omegaN = 2 * Math.PI * naturalFreq;
                
                // Transfer function magnitude
                const r = omega / omegaN;
                const G_mag = 1 / (stiffness * Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * dampingRatio * r, 2)));
                
                // Phase
                const G_phase = -Math.atan2(2 * dampingRatio * r, 1 - r * r);
                
                // Critical depth
                const Ks = cuttingCoeff * radialImmersion;
                const a_lim = -1 / (2 * Ks * G_mag * Math.cos(G_phase));
                
                if (a_lim > 0 && a_lim < docRange[1]) {
                    lobes.push({
                        rpm: rpm,
                        criticalDoc: a_lim,
                        lobeNumber: lobe,
                        chatterFreq: chatterFreq
                    });
                }
            }
        }
        
        // Group into stable/unstable regions
        const stableRegions = this._computeStableRegions(lobes, rpmRange, docRange);
        
        return {
            lobes: lobes,
            stableRegions: stableRegions,
            parameters: params,
            recommendation: this._findOptimalOperatingPoint(stableRegions)
        };
    },
    
    /**
     * Predict chatter before it occurs
     */
    predictChatter: function(currentState, stabilityData) {
        const { rpm, doc, vibrationTrend } = currentState;
        
        // Find current position in stability map
        const nearestLobes = stabilityData.lobes.filter(l => 
            Math.abs(l.rpm - rpm) < 500
        ).sort((a, b) => a.criticalDoc - b.criticalDoc);
        
        if (nearestLobes.length === 0) {
            return { prediction: 'STABLE', confidence: 0.5, margin: null };
        }
        
        const criticalDoc = nearestLobes[0].criticalDoc;
        const margin = criticalDoc - doc;
        const marginPercent = margin / criticalDoc * 100;
        
        // Analyze vibration trend
        const trendSlope = this._calculateTrendSlope(vibrationTrend);
        
        // Predict time to chatter onset
        let prediction = 'STABLE';
        let confidence = 0.9;
        let timeToChatter = null;
        
        if (margin < 0) {
            prediction = 'CHATTER_ACTIVE';
            confidence = 0.95;
        } else if (marginPercent < 10 && trendSlope > 0.1) {
            prediction = 'CHATTER_IMMINENT';
            confidence = 0.85;
            timeToChatter = margin / (trendSlope * 10); // seconds
        } else if (marginPercent < 20) {
            prediction = 'CHATTER_WARNING';
            confidence = 0.75;
        }
        
        return {
            prediction: prediction,
            confidence: confidence,
            marginToChatter: margin,
            marginPercent: marginPercent.toFixed(1) + '%',
            timeToChatter: timeToChatter,
            recommendedAction: this._getChatterAction(prediction, rpm, doc, criticalDoc)
        };
    },
    
    _fft: function(signal) {
        const n = signal.length;
        if (n <= 1) return signal.map(x => ({ re: x, im: 0 }));
        
        // Ensure power of 2
        const m = Math.pow(2, Math.ceil(Math.log2(n)));
        const padded = [...signal, ...Array(m - n).fill(0)];
        
        return this._fftRecursive(padded.map(x => ({ re: x, im: 0 })));
    },
    
    _fftRecursive: function(x) {
        const n = x.length;
        if (n <= 1) return x;
        
        const even = this._fftRecursive(x.filter((_, i) => i % 2 === 0));
        const odd = this._fftRecursive(x.filter((_, i) => i % 2 === 1));
        
        const result = Array(n);
        for (let k = 0; k < n / 2; k++) {
            const angle = -2 * Math.PI * k / n;
            const t = {
                re: Math.cos(angle) * odd[k].re - Math.sin(angle) * odd[k].im,
                im: Math.cos(angle) * odd[k].im + Math.sin(angle) * odd[k].re
            };
            result[k] = { re: even[k].re + t.re, im: even[k].im + t.im };
            result[k + n / 2] = { re: even[k].re - t.re, im: even[k].im - t.im };
        }
        return result;
    },
    
    _findPeaks: function(data, threshold) {
        const peaks = [];
        for (let i = 1; i < data.length / 2 - 1; i++) {
            if (data[i] > data[i - 1] && data[i] > data[i + 1] && data[i] > threshold) {
                peaks.push(i);
            }
        }
        return peaks;
    },
    
    _isNearHarmonic: function(freq, fundamental, tolerance) {
        for (let h = 1; h <= 10; h++) {
            if (Math.abs(freq - h * fundamental) / fundamental < tolerance) {
                return true;
            }
        }
        return false;
    },
    
    _calculateChatterRisk: function(indicators, spectrum) {
        if (indicators.length === 0) return 0;
        
        let risk = 0;
        for (const ind of indicators) {
            const severityWeight = ind.severity === 'HIGH' ? 0.5 : ind.severity === 'MEDIUM' ? 0.3 : 0.1;
            risk += severityWeight * ind.magnitude;
        }
        
        return Math.min(1, risk);
    },
    
    _getRecommendation: function(riskScore, rpm) {
        if (riskScore > 0.7) {
            return {
                action: 'REDUCE_PARAMETERS',
                speedChange: -rpm * 0.15,
                docChange: -0.2,
                urgency: 'IMMEDIATE'
            };
        } else if (riskScore > 0.4) {
            return {
                action: 'MONITOR_CLOSELY',
                speedChange: -rpm * 0.05,
                docChange: 0,
                urgency: 'SOON'
            };
        }
        return { action: 'CONTINUE', urgency: 'NONE' };
    },
    
    _computeStableRegions: function(lobes, rpmRange, docRange) {
        // Simplified: return regions below lobe boundaries
        const regions = [];
        
        // Group lobes by RPM windows
        const rpmStep = (rpmRange[1] - rpmRange[0]) / 20;
        for (let rpm = rpmRange[0]; rpm < rpmRange[1]; rpm += rpmStep) {
            const relevantLobes = lobes.filter(l => l.rpm >= rpm && l.rpm < rpm + rpmStep);
            if (relevantLobes.length > 0) {
                const minDoc = Math.min(...relevantLobes.map(l => l.criticalDoc));
                regions.push({
                    rpmMin: rpm,
                    rpmMax: rpm + rpmStep,
                    maxStableDoc: minDoc,
                    isStable: true
                });
            }
        }
        
        return regions;
    },
    
    _findOptimalOperatingPoint: function(regions) {
        // Find region with highest stable DOC
        const best = regions.reduce((a, b) => a.maxStableDoc > b.maxStableDoc ? a : b, { maxStableDoc: 0 });
        return {
            recommendedRPM: (best.rpmMin + best.rpmMax) / 2,
            maxStableDoc: best.maxStableDoc * 0.9, // 10% safety margin
            region: best
        };
    },
    
    _calculateTrendSlope: function(trend) {
        if (!trend || trend.length < 2) return 0;
        const n = trend.length;
        const xMean = (n - 1) / 2;
        const yMean = trend.reduce((a, b) => a + b, 0) / n;
        
        let num = 0, den = 0;
        for (let i = 0; i < n; i++) {
            num += (i - xMean) * (trend[i] - yMean);
            den += (i - xMean) * (i - xMean);
        }
        
        return den > 0 ? num / den : 0;
    },
    
    _getChatterAction: function(prediction, rpm, doc, criticalDoc) {
        if (prediction === 'CHATTER_ACTIVE') {
            return {
                action: 'EMERGENCY_REDUCE',
                newRPM: rpm * 0.7,
                newDoc: doc * 0.5
            };
        } else if (prediction === 'CHATTER_IMMINENT') {
            return {
                action: 'REDUCE_DOC',
                newRPM: rpm,
                newDoc: criticalDoc * 0.8
            };
        } else if (prediction === 'CHATTER_WARNING') {
            return {
                action: 'INCREASE_MONITORING',
                newRPM: rpm,
                newDoc: doc
            };
        }
        return { action: 'CONTINUE' };
    }
}