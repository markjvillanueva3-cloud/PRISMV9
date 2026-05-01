const PRISM_SIGNALS = {
    
    /**
     * Compute FFT for spectrum analysis
     * @param {Array} x - Time domain signal
     * @returns {Object} Frequency domain representation
     */
    fftSpectrum: function(x) {
        const N = x.length;
        
        // Ensure power of 2 (pad if necessary)
        const N2 = Math.pow(2, Math.ceil(Math.log2(N)));
        const padded = [...x, ...Array(N2 - N).fill(0)];
        
        // Cooley-Tukey FFT
        const fft = this._fft(padded);
        
        // Compute magnitude and phase
        const magnitude = fft.map(c => Math.sqrt(c.real * c.real + c.imag * c.imag));
        const phase = fft.map(c => Math.atan2(c.imag, c.real));
        
        // Power spectral density (one-sided for real signals)
        const psd = magnitude.slice(0, N2 / 2 + 1).map(m => m * m / N2);
        psd[0] /= 2;  // DC component
        for (let i = 1; i < psd.length - 1; i++) psd[i] *= 2;
        
        return {
            fft,
            magnitude: magnitude.slice(0, N2 / 2 + 1),
            phase: phase.slice(0, N2 / 2 + 1),
            psd,
            N: N2,
            freqBins: N2 / 2 + 1
        };
    },
    
    /**
     * Cooley-Tukey FFT implementation
     * @private
     */
    _fft: function(x) {
        const N = x.length;
        if (N <= 1) return x.map(v => ({ real: v, imag: 0 }));
        
        // Bit-reversal permutation
        const bits = Math.log2(N);
        const reversed = new Array(N);
        for (let i = 0; i < N; i++) {
            let j = 0;
            for (let k = 0; k < bits; k++) {
                j = (j << 1) | ((i >> k) & 1);
            }
            reversed[j] = { real: x[i], imag: 0 };
        }
        
        // Cooley-Tukey iterative FFT
        for (let size = 2; size <= N; size *= 2) {
            const halfSize = size / 2;
            const tableStep = N / size;
            
            for (let i = 0; i < N; i += size) {
                for (let j = 0; j < halfSize; j++) {
                    const angle = -2 * Math.PI * j / size;
                    const twiddle = { real: Math.cos(angle), imag: Math.sin(angle) };
                    
                    const even = reversed[i + j];
                    const odd = reversed[i + j + halfSize];
                    
                    const t = {
                        real: twiddle.real * odd.real - twiddle.imag * odd.imag,
                        imag: twiddle.real * odd.imag + twiddle.imag * odd.real
                    };
                    
                    reversed[i + j] = {
                        real: even.real + t.real,
                        imag: even.imag + t.imag
                    };
                    reversed[i + j + halfSize] = {
                        real: even.real - t.real,
                        imag: even.imag - t.imag
                    };
                }
            }
        }
        
        return reversed;
    },
    
    /**
     * AM modulation
     * @param {Object} params - Modulation parameters
     * @returns {Object} Modulated signal info
     */
    amModulation: function(params) {
        const { 
            messageFreq,    // Message frequency
            carrierFreq,    // Carrier frequency
            modulationIndex = 1,  // Modulation index μ
            sampleRate = null,
            duration = null
        } = params;
        
        const result = {
            type: modulationIndex === 1 ? 'DSB-SC' : 'AM',
            messageFrequency: messageFreq,
            carrierFrequency: carrierFreq,
            modulationIndex,
            bandwidth: 2 * messageFreq,
            sidebands: {
                upper: carrierFreq + messageFreq,
                lower: carrierFreq - messageFreq
            }
        };
        
        // Generate waveform if sample rate provided
        if (sampleRate && duration) {
            const N = Math.floor(sampleRate * duration);
            const t = Array(N).fill(0).map((_, i) => i / sampleRate);
            const message = t.map(ti => Math.cos(2 * Math.PI * messageFreq * ti));
            
            if (modulationIndex === 1) {
                // DSB-SC
                result.signal = t.map((ti, i) => message[i] * Math.cos(2 * Math.PI * carrierFreq * ti));
            } else {
                // Conventional AM
                result.signal = t.map((ti, i) => 
                    (1 + modulationIndex * message[i]) * Math.cos(2 * Math.PI * carrierFreq * ti));
            }
            result.time = t;
        }
        
        return result;
    },
    
    /**
     * Nyquist sampling analysis
     * @param {Object} params - Signal parameters
     * @returns {Object} Sampling requirements
     */
    nyquistAnalysis: function(params) {
        const { maxFrequency, actualSampleRate = null } = params;
        
        const nyquistRate = 2 * maxFrequency;
        
        const result = {
            maxSignalFrequency: maxFrequency,
            nyquistRate,
            minimumSampleRate: nyquistRate,
            recommendedSampleRate: 2.5 * maxFrequency  // Some margin
        };
        
        if (actualSampleRate) {
            result.actualSampleRate = actualSampleRate;
            result.meetsNyquist = actualSampleRate >= nyquistRate;
            result.aliasingRisk = actualSampleRate < nyquistRate;
            result.maxRecoverableFreq = actualSampleRate / 2;
            
            if (result.aliasingRisk) {
                result.aliasedFrequencies = this._findAliases(maxFrequency, actualSampleRate);
            }
        }
        
        return result;
    },
    
    _findAliases: function(freq, sampleRate) {
        const aliases = [];
        const fs = sampleRate;
        
        // Find where freq folds back into [0, fs/2]
        let f = freq;
        while (f > fs / 2) {
            f = Math.abs(f - fs);
            if (f <= fs / 2) aliases.push(f);
        }
        
        return aliases;
    }
}