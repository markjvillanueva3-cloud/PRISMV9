const PRISM_PHASE2_ADVANCED_SIGNAL = {
    name: 'Phase 2 Advanced Signal Processing',
    version: '1.0.0',
    source: 'MIT 18.086',
    
    /**
     * Spectrogram (STFT-based)
     * Source: MIT 18.086
     */
    spectrogram: function(signal, sampleRate, options = {}) {
        const config = {
            windowSize: options.windowSize || 256,
            hopSize: options.hopSize || 128,
            windowType: options.windowType || 'hann'
        };
        
        const n = signal.length;
        const numFrames = Math.floor((n - config.windowSize) / config.hopSize) + 1;
        const numBins = Math.floor(config.windowSize / 2) + 1;
        
        // Generate window
        const window = this._generateWindow(config.windowSize, config.windowType);
        
        const spectrogram = [];
        const times = [];
        const frequencies = [];
        
        // Calculate frequency bins
        for (let i = 0; i < numBins; i++) {
            frequencies.push(i * sampleRate / config.windowSize);
        }
        
        for (let frame = 0; frame < numFrames; frame++) {
            const start = frame * config.hopSize;
            times.push(start / sampleRate);
            
            // Extract and window frame
            const frameData = [];
            for (let i = 0; i < config.windowSize; i++) {
                frameData.push((signal[start + i] || 0) * window[i]);
            }
            
            // FFT
            const fft = this._fft(frameData);
            
            // Magnitude spectrum
            const magnitudes = [];
            for (let i = 0; i < numBins; i++) {
                const re = fft[2 * i];
                const im = fft[2 * i + 1];
                magnitudes.push(Math.sqrt(re * re + im * im));
            }
            
            spectrogram.push(magnitudes);
        }
        
        return {
            spectrogram,
            times,
            frequencies,
            sampleRate,
            windowSize: config.windowSize,
            hopSize: config.hopSize,
            source: 'MIT 18.086 - Spectrogram'
        };
    },
    
    /**
     * Short-Time Fourier Transform
     */
    stft: function(signal, sampleRate, windowSize = 256, hopSize = 128) {
        return this.spectrogram(signal, sampleRate, { windowSize, hopSize });
    },
    
    /**
     * Hilbert Transform
     * Source: MIT 18.086
     */
    hilbertTransform: function(signal) {
        const n = signal.length;
        
        // FFT
        const fft = this._fft(signal);
        
        // Apply Hilbert transform in frequency domain
        const hilbertFft = new Array(n * 2).fill(0);
        
        // DC and Nyquist
        hilbertFft[0] = fft[0];
        hilbertFft[1] = fft[1];
        if (n % 2 === 0) {
            hilbertFft[n] = fft[n];
            hilbertFft[n + 1] = fft[n + 1];
        }
        
        // Positive frequencies × 2
        for (let i = 1; i < n / 2; i++) {
            hilbertFft[2 * i] = 2 * fft[2 * i];
            hilbertFft[2 * i + 1] = 2 * fft[2 * i + 1];
        }
        
        // IFFT
        const analytic = this._ifft(hilbertFft);
        
        // Extract real and imaginary parts
        const real = [];
        const imag = [];
        for (let i = 0; i < n; i++) {
            real.push(analytic[2 * i]);
            imag.push(analytic[2 * i + 1]);
        }
        
        return {
            real,
            imaginary: imag,
            source: 'MIT 18.086 - Hilbert Transform'
        };
    },
    
    /**
     * Envelope Detection
     * Source: MIT 18.086
     */
    envelopeDetection: function(signal) {
        const hilbert = this.hilbertTransform(signal);
        
        // Envelope = |analytic signal| = sqrt(real² + imag²)
        const envelope = [];
        for (let i = 0; i < signal.length; i++) {
            envelope.push(Math.sqrt(
                hilbert.real[i] * hilbert.real[i] + 
                hilbert.imaginary[i] * hilbert.imaginary[i]
            ));
        }
        
        // Instantaneous phase
        const phase = [];
        for (let i = 0; i < signal.length; i++) {
            phase.push(Math.atan2(hilbert.imaginary[i], hilbert.real[i]));
        }
        
        // Instantaneous frequency
        const instFreq = [];
        for (let i = 1; i < phase.length; i++) {
            let dPhase = phase[i] - phase[i - 1];
            // Unwrap
            while (dPhase > Math.PI) dPhase -= 2 * Math.PI;
            while (dPhase < -Math.PI) dPhase += 2 * Math.PI;
            instFreq.push(dPhase / (2 * Math.PI));
        }
        
        return {
            envelope,
            phase,
            instantaneousFrequency: instFreq,
            source: 'MIT 18.086 - Envelope Detection'
        };
    },
    
    /**
     * Wavelet Transform (Haar wavelet)
     * Source: MIT 18.086
     */
    waveletTransform: function(signal, levels = 4) {
        let data = [...signal];
        
        // Pad to power of 2
        const n = Math.pow(2, Math.ceil(Math.log2(data.length)));
        while (data.length < n) data.push(0);
        
        const coefficients = [];
        const details = [];
        
        for (let level = 0; level < levels && data.length >= 2; level++) {
            const len = data.length;
            const approx = [];
            const detail = [];
            
            for (let i = 0; i < len / 2; i++) {
                // Haar wavelet
                approx.push((data[2 * i] + data[2 * i + 1]) / Math.sqrt(2));
                detail.push((data[2 * i] - data[2 * i + 1]) / Math.sqrt(2));
            }
            
            details.push(detail);
            data = approx;
        }
        
        coefficients.push(data); // Final approximation
        
        return {
            approximation: data,
            details,
            levels,
            source: 'MIT 18.086 - Wavelet Transform'
        };
    },
    
    /**
     * Cepstrum Analysis
     * Source: MIT 18.086
     */
    cepstrum: function(signal) {
        // FFT
        const fft = this._fft(signal);
        
        // Log magnitude
        const n = signal.length;
        const logMag = [];
        for (let i = 0; i < n; i++) {
            const re = fft[2 * i];
            const im = fft[2 * i + 1];
            logMag.push(Math.log(Math.sqrt(re * re + im * im) + 1e-10));
        }
        
        // IFFT of log magnitude
        const cepstrum = this._ifft(this._fft(logMag));
        
        // Extract real part
        const realCepstrum = [];
        for (let i = 0; i < n; i++) {
            realCepstrum.push(cepstrum[2 * i]);
        }
        
        return {
            cepstrum: realCepstrum,
            source: 'MIT 18.086 - Cepstrum'
        };
    },
    
    _generateWindow: function(size, type) {
        const window = new Array(size);
        
        switch (type) {
            case 'hann':
                for (let i = 0; i < size; i++) {
                    window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
                }
                break;
            case 'hamming':
                for (let i = 0; i < size; i++) {
                    window[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (size - 1));
                }
                break;
            case 'blackman':
                for (let i = 0; i < size; i++) {
                    window[i] = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (size - 1)) + 
                               0.08 * Math.cos(4 * Math.PI * i / (size - 1));
                }
                break;
            default: // rectangular
                window.fill(1);
        }
        
        return window;
    },
    
    _fft: function(samples) {
        const N = samples.length;
        
        if (N <= 1) {
            return [samples[0] || 0, 0];
        }
        
        const even = [];
        const odd = [];
        for (let i = 0; i < N; i += 2) {
            even.push(samples[i]);
            odd.push(samples[i + 1] || 0);
        }
        
        const fftEven = this._fft(even);
        const fftOdd = this._fft(odd);
        
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
    
    _ifft: function(spectrum) {
        const N = spectrum.length / 2;
        
        // Conjugate
        const conjugate = [];
        for (let i = 0; i < N; i++) {
            conjugate.push(spectrum[2 * i]);
            conjugate.push(-spectrum[2 * i + 1]);
        }
        
        // FFT
        const fft = this._fft(conjugate.filter((_, i) => i % 2 === 0));
        
        // Conjugate and scale
        const result = [];
        for (let i = 0; i < N; i++) {
            result.push(fft[2 * i] / N);
            result.push(-fft[2 * i + 1] / N);
        }
        
        return result;
    }
}