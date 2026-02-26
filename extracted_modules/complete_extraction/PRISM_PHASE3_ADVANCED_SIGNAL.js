const PRISM_PHASE3_ADVANCED_SIGNAL = {
    name: 'Phase 3 Advanced Signal Processing',
    version: '1.0.0',
    sources: ['MIT 18.086', 'Berkeley EE123', 'Stanford EE263'],
    algorithmCount: 15,
    
    /**
     * Discrete Wavelet Transform (DWT)
     * Source: MIT 18.086 - Computational Science
     * Usage: Multi-resolution analysis of vibration signals
     */
    discreteWavelet: function(signal, wavelet = 'haar', levels = 4) {
        const n = signal.length;
        
        // Haar wavelet coefficients
        const wavelets = {
            haar: { lowpass: [1/Math.sqrt(2), 1/Math.sqrt(2)], highpass: [1/Math.sqrt(2), -1/Math.sqrt(2)] },
            db2: { lowpass: [0.4830, 0.8365, 0.2241, -0.1294], highpass: [0.1294, 0.2241, -0.8365, 0.4830] }
        };
        
        const { lowpass, highpass } = wavelets[wavelet] || wavelets.haar;
        
        const approximations = [];
        const details = [];
        let current = [...signal];
        
        for (let level = 0; level < levels; level++) {
            const m = current.length;
            const approx = [];
            const detail = [];
            
            for (let i = 0; i < Math.floor(m / 2); i++) {
                let a = 0, d = 0;
                for (let j = 0; j < lowpass.length; j++) {
                    const idx = (2 * i + j) % m;
                    a += lowpass[j] * current[idx];
                    d += highpass[j] * current[idx];
                }
                approx.push(a);
                detail.push(d);
            }
            
            approximations.push(approx);
            details.push(detail);
            current = approx;
        }
        
        return {
            approximations,
            details,
            finalApproximation: approximations[approximations.length - 1],
            levels,
            source: 'MIT 18.086 - Discrete Wavelet Transform'
        };
    },
    
    /**
     * Continuous Wavelet Transform (CWT)
     * Source: MIT 18.086
     * Usage: Time-frequency analysis of machining signals
     */
    continuousWavelet: function(signal, scales, dt = 1) {
        const n = signal.length;
        const numScales = scales.length;
        
        // Morlet wavelet
        const morlet = (t, scale) => {
            const omega0 = 6;
            const normFactor = Math.pow(Math.PI, -0.25);
            const x = t / scale;
            return normFactor * Math.exp(-0.5 * x * x) * Math.cos(omega0 * x);
        };
        
        const coefficients = [];
        
        for (let s = 0; s < numScales; s++) {
            const scale = scales[s];
            const row = [];
            
            for (let t = 0; t < n; t++) {
                let sum = 0;
                for (let tau = 0; tau < n; tau++) {
                    const waveletVal = morlet((tau - t) * dt, scale);
                    sum += signal[tau] * waveletVal;
                }
                row.push(sum / Math.sqrt(scale));
            }
            
            coefficients.push(row);
        }
        
        return {
            coefficients,
            scales,
            frequencies: scales.map(s => 1 / (s * dt)),
            source: 'MIT 18.086 - Continuous Wavelet Transform'
        };
    },
    
    /**
     * Wavelet Transform (general entry point)
     */
    waveletTransform: function(signal, type = 'dwt', options = {}) {
        if (type === 'dwt') {
            return this.discreteWavelet(signal, options.wavelet, options.levels);
        } else {
            const scales = options.scales || Array.from({length: 32}, (_, i) => Math.pow(2, i / 4));
            return this.continuousWavelet(signal, scales, options.dt);
        }
    },
    
    /**
     * Inverse Wavelet Transform
     */
    waveletInverse: function(approximation, details, wavelet = 'haar') {
        const wavelets = {
            haar: { lowpass: [1/Math.sqrt(2), 1/Math.sqrt(2)], highpass: [1/Math.sqrt(2), -1/Math.sqrt(2)] }
        };
        
        const { lowpass, highpass } = wavelets[wavelet] || wavelets.haar;
        let current = [...approximation];
        
        for (let level = details.length - 1; level >= 0; level--) {
            const detail = details[level];
            const reconstructed = new Array(current.length * 2).fill(0);
            
            for (let i = 0; i < current.length; i++) {
                for (let j = 0; j < lowpass.length; j++) {
                    const idx = (2 * i + j) % reconstructed.length;
                    reconstructed[idx] += lowpass[j] * current[i] + highpass[j] * detail[i];
                }
            }
            
            current = reconstructed;
        }
        
        return { signal: current, source: 'MIT 18.086 - Inverse Wavelet Transform' };
    },
    
    /**
     * Hilbert Transform
     * Source: MIT 18.086
     * Usage: Envelope detection for vibration analysis
     */
    hilbertTransform: function(signal) {
        const n = signal.length;
        
        // FFT
        const fft = this._fft(signal);
        
        // Apply Hilbert transform in frequency domain
        const hilbert = fft.map((f, k) => {
            if (k === 0 || k === n / 2) {
                return f;
            } else if (k < n / 2) {
                return { re: f.re * 2, im: f.im * 2 };
            } else {
                return { re: 0, im: 0 };
            }
        });
        
        // IFFT
        const analytic = this._ifft(hilbert);
        
        // Envelope and instantaneous phase
        const envelope = analytic.map(c => Math.sqrt(c.re * c.re + c.im * c.im));
        const phase = analytic.map(c => Math.atan2(c.im, c.re));
        
        return {
            envelope,
            phase,
            analytic,
            source: 'MIT 18.086 - Hilbert Transform'
        };
    },
    
    /**
     * Empirical Mode Decomposition (EMD)
     * Source: MIT 18.086
     * Usage: Decompose non-stationary signals into intrinsic mode functions
     */
    empiricalModeDecomp: function(signal, maxIMFs = 10, maxSiftIter = 100) {
        const imfs = [];
        let residual = [...signal];
        
        for (let imfNum = 0; imfNum < maxIMFs; imfNum++) {
            let h = [...residual];
            
            // Sifting process
            for (let iter = 0; iter < maxSiftIter; iter++) {
                const { upper, lower } = this._findEnvelopes(h);
                const mean = upper.map((u, i) => (u + lower[i]) / 2);
                
                const newH = h.map((v, i) => v - mean[i]);
                
                // Check if it's an IMF (should have same number of extrema and zero crossings)
                const extrema = this._countExtrema(newH);
                const zeroCrossings = this._countZeroCrossings(newH);
                
                if (Math.abs(extrema - zeroCrossings) <= 1) {
                    h = newH;
                    break;
                }
                
                h = newH;
            }
            
            imfs.push(h);
            residual = residual.map((r, i) => r - h[i]);
            
            // Check if residual is monotonic
            if (this._isMonotonic(residual)) {
                break;
            }
        }
        
        return {
            imfs,
            residual,
            numIMFs: imfs.length,
            source: 'MIT 18.086 - Empirical Mode Decomposition'
        };
    },
    
    /**
     * Hilbert-Huang Transform
     * Source: MIT 18.086
     * Usage: Time-frequency analysis of non-stationary signals
     */
    hilbertHuang: function(signal) {
        // First apply EMD
        const { imfs, residual } = this.empiricalModeDecomp(signal);
        
        // Apply Hilbert transform to each IMF
        const instantaneousFrequencies = [];
        const amplitudes = [];
        
        for (const imf of imfs) {
            const { envelope, phase } = this.hilbertTransform(imf);
            
            // Instantaneous frequency = d(phase)/dt
            const freq = [];
            for (let i = 1; i < phase.length; i++) {
                let dPhase = phase[i] - phase[i - 1];
                if (dPhase < -Math.PI) dPhase += 2 * Math.PI;
                if (dPhase > Math.PI) dPhase -= 2 * Math.PI;
                freq.push(dPhase / (2 * Math.PI));
            }
            freq.push(freq[freq.length - 1]);
            
            instantaneousFrequencies.push(freq);
            amplitudes.push(envelope);
        }
        
        return {
            imfs,
            instantaneousFrequencies,
            amplitudes,
            residual,
            source: 'MIT 18.086 - Hilbert-Huang Transform'
        };
    },
    
    /**
     * Coherence Analysis
     * Source: Berkeley EE123
     * Usage: Measure correlation between two signals in frequency domain
     */
    coherence: function(signal1, signal2, windowSize = 256, overlap = 0.5) {
        const hopSize = Math.floor(windowSize * (1 - overlap));
        const numSegments = Math.floor((Math.min(signal1.length, signal2.length) - windowSize) / hopSize) + 1;
        
        const Pxx = new Array(windowSize).fill(0);
        const Pyy = new Array(windowSize).fill(0);
        const Pxy = new Array(windowSize).fill(0).map(() => ({ re: 0, im: 0 }));
        
        for (let seg = 0; seg < numSegments; seg++) {
            const start = seg * hopSize;
            const x = signal1.slice(start, start + windowSize);
            const y = signal2.slice(start, start + windowSize);
            
            const fftX = this._fft(x);
            const fftY = this._fft(y);
            
            for (let k = 0; k < windowSize; k++) {
                Pxx[k] += fftX[k].re * fftX[k].re + fftX[k].im * fftX[k].im;
                Pyy[k] += fftY[k].re * fftY[k].re + fftY[k].im * fftY[k].im;
                
                // Cross-spectral density (X* * Y)
                Pxy[k].re += fftX[k].re * fftY[k].re + fftX[k].im * fftY[k].im;
                Pxy[k].im += fftX[k].im * fftY[k].re - fftX[k].re * fftY[k].im;
            }
        }
        
        // Coherence = |Pxy|^2 / (Pxx * Pyy)
        const coh = Pxy.map((pxy, k) => {
            const pxyMag2 = pxy.re * pxy.re + pxy.im * pxy.im;
            return pxyMag2 / (Pxx[k] * Pyy[k] + 1e-10);
        });
        
        return {
            coherence: coh.slice(0, Math.floor(windowSize / 2)),
            crossSpectrum: Pxy.slice(0, Math.floor(windowSize / 2)),
            source: 'Berkeley EE123 - Coherence Analysis'
        };
    },
    
    /**
     * Cross-Spectrum Analysis
     * Source: Berkeley EE123
     */
    crossSpectrum: function(signal1, signal2) {
        const fft1 = this._fft(signal1);
        const fft2 = this._fft(signal2);
        
        const crossSpectrum = fft1.map((f1, k) => ({
            re: f1.re * fft2[k].re + f1.im * fft2[k].im,
            im: f1.im * fft2[k].re - f1.re * fft2[k].im
        }));
        
        const magnitude = crossSpectrum.map(c => Math.sqrt(c.re * c.re + c.im * c.im));
        const phase = crossSpectrum.map(c => Math.atan2(c.im, c.re));
        
        return {
            crossSpectrum,
            magnitude,
            phase,
            source: 'Berkeley EE123 - Cross-Spectrum'
        };
    },
    
    /**
     * Welch's PSD Estimation
     * Source: Berkeley EE123
     * Usage: Power spectral density estimation with reduced variance
     */
    welchPSD: function(signal, windowSize = 256, overlap = 0.5, windowType = 'hann') {
        const hopSize = Math.floor(windowSize * (1 - overlap));
        const numSegments = Math.floor((signal.length - windowSize) / hopSize) + 1;
        
        // Window function
        const window = this._getWindow(windowSize, windowType);
        const windowPower = window.reduce((sum, w) => sum + w * w, 0) / windowSize;
        
        const psd = new Array(windowSize).fill(0);
        
        for (let seg = 0; seg < numSegments; seg++) {
            const start = seg * hopSize;
            const segment = signal.slice(start, start + windowSize);
            
            // Apply window
            const windowed = segment.map((s, i) => s * window[i]);
            
            // FFT
            const fft = this._fft(windowed);
            
            // Accumulate power
            for (let k = 0; k < windowSize; k++) {
                psd[k] += (fft[k].re * fft[k].re + fft[k].im * fft[k].im);
            }
        }
        
        // Average and normalize
        const scale = 1 / (numSegments * windowSize * windowPower);
        const psdNormalized = psd.map(p => p * scale);
        
        return {
            psd: psdNormalized.slice(0, Math.floor(windowSize / 2)),
            frequencies: Array.from({ length: Math.floor(windowSize / 2) }, (_, k) => k / windowSize),
            numSegments,
            source: 'Berkeley EE123 - Welch PSD'
        };
    },
    
    /**
     * Short-Time Fourier Transform (STFT)
     * Source: MIT 18.086
     * Usage: Time-frequency representation
     */
    stft: function(signal, windowSize = 256, hopSize = 64, windowType = 'hann') {
        const window = this._getWindow(windowSize, windowType);
        const numFrames = Math.floor((signal.length - windowSize) / hopSize) + 1;
        
        const stft = [];
        
        for (let frame = 0; frame < numFrames; frame++) {
            const start = frame * hopSize;
            const segment = signal.slice(start, start + windowSize);
            const windowed = segment.map((s, i) => s * (window[i] || 0));
            const fft = this._fft(windowed);
            stft.push(fft.slice(0, Math.floor(windowSize / 2) + 1));
        }
        
        return {
            stft,
            numFrames,
            frequencyBins: Math.floor(windowSize / 2) + 1,
            source: 'MIT 18.086 - STFT'
        };
    },
    
    /**
     * Cepstrum Analysis
     * Source: MIT 18.086
     * Usage: Detect periodicities in frequency domain (gear fault detection)
     */
    cepstrum: function(signal) {
        const fft = this._fft(signal);
        const logSpectrum = fft.map(f => {
            const mag = Math.sqrt(f.re * f.re + f.im * f.im);
            return { re: Math.log(mag + 1e-10), im: 0 };
        });
        
        const cepstrum = this._ifft(logSpectrum);
        const realCepstrum = cepstrum.map(c => c.re);
        
        return {
            cepstrum: realCepstrum,
            source: 'MIT 18.086 - Cepstrum Analysis'
        };
    },
    
    /**
     * Mel Spectrogram
     * Source: MIT 18.086
     */
    melSpectrogram: function(signal, sampleRate = 44100, numMelBands = 40) {
        const { stft: stftResult } = this.stft(signal);
        
        // Mel filter bank
        const melFilters = this._getMelFilters(stftResult[0].length, sampleRate, numMelBands);
        
        const melSpec = stftResult.map(frame => {
            const power = frame.map(f => f.re * f.re + f.im * f.im);