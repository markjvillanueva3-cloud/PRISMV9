/**
 * PRISM_PHASE3_ADVANCED_SIGNAL
 * Extracted from PRISM v8.89.002 monolith
 * References: 41
 * Lines: 434
 * Session: R2.1.1 Ralph Iteration 2
 */

const PRISM_PHASE3_ADVANCED_SIGNAL = {
    /**
     * Discrete Wavelet Transform
     */
    discreteWavelet: function(signal, wavelet = 'daubechies4') {
        const N = signal.length;
        let coeffs = [...signal];
        let levels = [];
        
        while (coeffs.length >= 2) {
            const { approximation, detail } = this.waveletDecompose(coeffs, wavelet);
            levels.push(detail);
            coeffs = approximation;
        }
        
        levels.push(coeffs);
        
        return {
            levels: levels.reverse(),
            reconstruct: () => this.waveletReconstruct(levels, wavelet)
        };
    },

    /**
     * Continuous Wavelet Transform
     */
    continuousWavelet: function(signal, scales, wavelet = 'morlet') {
        const N = signal.length;
        const result = [];
        
        for (let scale of scales) {
            const row = [];
            for (let pos = 0; pos < N; pos++) {
                let sum = 0;
                for (let i = 0; i < N; i++) {
                    const t = (i - pos) / scale;
                    sum += signal[i] * this.waveletFunction(t, wavelet);
                }
                row.push(sum / Math.sqrt(scale));
            }
            result.push(row);
        }
        
        return {
            coefficients: result,
            scales: scales,
            timeFreq: this.computeTimeFreq(result, scales)
        };
    },

    /**
     * Wavelet Transform with multiple mother wavelets
     */
    waveletTransform: function(signal, type = 'dwt', options = {}) {
        const { wavelet = 'daubechies4', levels = 5, scales = null } = options;
        
        if (type === 'dwt') {
            return this.discreteWavelet(signal, wavelet);
        } else if (type === 'cwt') {
            const defaultScales = scales || Array.from({length: 32}, (_, i) => Math.pow(2, i/4));
            return this.continuousWavelet(signal, defaultScales, wavelet);
        }
        
        throw new Error(`Unknown wavelet transform type: ${type}`);
    },

    /**
     * Inverse Wavelet Transform
     */
    waveletInverse: function(coefficients, wavelet = 'daubechies4') {
        return this.waveletReconstruct(coefficients.levels, wavelet);
    },

    /**
     * Hilbert Transform for analytic signal
     */
    hilbertTransform: function(signal) {
        const N = signal.length;
        const fft = this.fft(signal);
        
        // Create Hilbert multiplier
        const multiplier = new Array(N).fill(0).map((_, i) => {
            if (i === 0 || i === N/2) return 1;
            if (i < N/2) return 2;
            return 0;
        });
        
        // Apply multiplier
        for (let i = 0; i < N; i++) {
            fft[i] *= multiplier[i];
        }
        
        const analytic = this.ifft(fft);
        
        return {
            analytic: analytic,
            amplitude: analytic.map(c => Math.sqrt(c.real*c.real + c.imag*c.imag)),
            phase: analytic.map(c => Math.atan2(c.imag, c.real)),
            instantaneousFreq: this.computeInstFreq(analytic)
        };
    },

    /**
     * Empirical Mode Decomposition
     */
    empiricalModeDecomp: function(signal, maxIMFs = 8) {
        let residue = [...signal];
        const imfs = [];
        
        for (let i = 0; i < maxIMFs; i++) {
            const imf = this.extractIMF(residue);
            if (!imf) break;
            
            imfs.push(imf);
            residue = residue.map((val, idx) => val - imf[idx]);
            
            if (this.isMonotonic(residue)) break;
        }
        
        imfs.push(residue); // Final residue
        
        return {
            imfs: imfs,
            reconstruct: () => this.reconstructEMD(imfs)
        };
    },

    /**
     * Hilbert-Huang Transform
     */
    hilbertHuang: function(signal) {
        const emd = this.empiricalModeDecomp(signal);
        const hilbertSpectrum = [];
        
        for (const imf of emd.imfs) {
            const hilbert = this.hilbertTransform(imf);
            hilbertSpectrum.push({
                amplitude: hilbert.amplitude,
                phase: hilbert.phase,
                instantaneousFreq: hilbert.instantaneousFreq
            });
        }
        
        return {
            imfs: emd.imfs,
            hilbertSpectrum: hilbertSpectrum,
            marginalSpectrum: this.computeMarginalSpectrum(hilbertSpectrum)
        };
    },

    /**
     * Coherence between two signals
     */
    coherence: function(signal1, signal2, windowSize = 256, overlap = 0.5) {
        const windows = this.createWindows(signal1, windowSize, overlap);
        const windows2 = this.createWindows(signal2, windowSize, overlap);
        
        let Pxx = new Array(windowSize/2).fill(0);
        let Pyy = new Array(windowSize/2).fill(0);
        let Pxy = new Array(windowSize/2).fill(0);
        
        for (let i = 0; i < windows.length; i++) {
            const fft1 = this.fft(windows[i]);
            const fft2 = this.fft(windows2[i]);
            
            for (let f = 0; f < windowSize/2; f++) {
                Pxx[f] += fft1[f].real*fft1[f].real + fft1[f].imag*fft1[f].imag;
                Pyy[f] += fft2[f].real*fft2[f].real + fft2[f].imag*fft2[f].imag;
                Pxy[f] += fft1[f].real*fft2[f].real + fft1[f].imag*fft2[f].imag;
            }
        }
        
        const coherence = Pxy.map((pxy, i) => (pxy*pxy) / (Pxx[i] * Pyy[i]));
        
        return {
            coherence: coherence,
            frequencies: Array.from({length: windowSize/2}, (_, i) => i / windowSize),
            meanCoherence: coherence.reduce((a, b) => a + b) / coherence.length
        };
    },

    /**
     * Cross-spectrum analysis
     */
    crossSpectrum: function(signal1, signal2, windowSize = 256) {
        const fft1 = this.fft(signal1.slice(0, windowSize));
        const fft2 = this.fft(signal2.slice(0, windowSize));
        
        const crossSpectrum = [];
        const phase = [];
        
        for (let i = 0; i < windowSize/2; i++) {
            const real = fft1[i].real * fft2[i].real + fft1[i].imag * fft2[i].imag;
            const imag = fft1[i].imag * fft2[i].real - fft1[i].real * fft2[i].imag;
            
            crossSpectrum.push(Math.sqrt(real*real + imag*imag));
            phase.push(Math.atan2(imag, real));
        }
        
        return {
            magnitude: crossSpectrum,
            phase: phase,
            frequencies: Array.from({length: windowSize/2}, (_, i) => i / windowSize)
        };
    },

    /**
     * Welch Power Spectral Density
     */
    welchPSD: function(signal, windowSize = 256, overlap = 0.5, windowType = 'hanning') {
        const windows = this.createWindows(signal, windowSize, overlap);
        const windowFunc = this.getWindow(windowType, windowSize);
        
        let psd = new Array(windowSize/2).fill(0);
        
        for (const window of windows) {
            // Apply window function
            const windowed = window.map((val, i) => val * windowFunc[i]);
            const fft = this.fft(windowed);
            
            for (let i = 0; i < windowSize/2; i++) {
                psd[i] += fft[i].real*fft[i].real + fft[i].imag*fft[i].imag;
            }
        }
        
        // Normalize
        psd = psd.map(val => val / windows.length);
        
        return {
            psd: psd,
            frequencies: Array.from({length: windowSize/2}, (_, i) => i / windowSize),
            totalPower: psd.reduce((a, b) => a + b)
        };
    },

    /**
     * Short-Time Fourier Transform
     */
    stft: function(signal, windowSize = 256, hopSize = 128, windowType = 'hanning') {
        const windowFunc = this.getWindow(windowType, windowSize);
        const spectrogram = [];
        
        for (let i = 0; i <= signal.length - windowSize; i += hopSize) {
            const window = signal.slice(i, i + windowSize);
            const windowed = window.map((val, j) => val * windowFunc[j]);
            const fft = this.fft(windowed);
            
            const magnitude = fft.slice(0, windowSize/2).map(c => 
                Math.sqrt(c.real*c.real + c.imag*c.imag)
            );
            
            spectrogram.push(magnitude);
        }
        
        return {
            spectrogram: spectrogram,
            timeAxis: Array.from({length: spectrogram.length}, (_, i) => i * hopSize),
            freqAxis: Array.from({length: windowSize/2}, (_, i) => i / windowSize)
        };
    },

    /**
     * Cepstrum analysis
     */
    cepstrum: function(signal) {
        const fft = this.fft(signal);
        const logMagnitude = fft.map(c => 
            Math.log(Math.sqrt(c.real*c.real + c.imag*c.imag) + 1e-10)
        );
        const cepstrum = this.ifft(logMagnitude.map(val => ({real: val, imag: 0})));
        
        return {
            cepstrum: cepstrum.map(c => c.real),
            quefrency: Array.from({length: signal.length}, (_, i) => i),
            fundamentalPeriod: this.findFundamentalPeriod(cepstrum)
        };
    },

    /**
     * Mel-frequency spectrogram
     */
    melSpectrogram: function(signal, sampleRate = 1000, nMels = 40) {
        const stft = this.stft(signal);
        const melFilters = this.createMelFilterBank(stft.freqAxis.length, nMels, sampleRate);
        
        const melSpec = [];
        for (const frame of stft.spectrogram) {
            const melFrame = new Array(nMels).fill(0);
            for (let m = 0; m < nMels; m++) {
                for (let f = 0; f < frame.length; f++) {
                    melFrame[m] += frame[f] * melFilters[m][f];
                }
            }
            melSpec.push(melFrame);
        }
        
        return {
            melSpectrogram: melSpec,
            timeAxis: stft.timeAxis,
            melAxis: Array.from({length: nMels}, (_, i) => i)
        };
    },

    /**
     * Chatter envelope detection for machining
     */
    chatterEnvelope: function(vibrationSignal, sampleRate = 1000) {
        // High-pass filter to remove low frequency components
        const filtered = this.butterworth(vibrationSignal, 'high', 500, sampleRate);
        
        // Hilbert transform for envelope
        const hilbert = this.hilbertTransform(filtered);
        
        // Envelope extraction
        const envelope = hilbert.amplitude;
        
        // Detect chatter frequency
        const envelopeFFT = this.fft(envelope);
        const powerSpectrum = envelopeFFT.map(c => c.real*c.real + c.imag*c.imag);
        const chatterFreq = this.findPeakFrequency(powerSpectrum, sampleRate);
        
        return {
            envelope: envelope,
            chatterFrequency: chatterFreq,
            chatterIndex: this.computeChatterIndex(envelope),
            stability: chatterFreq < 100 ? 'STABLE' : 'UNSTABLE'
        };
    },

    /**
     * Bearing fault detection
     */
    bearingFaultDetect: function(vibrationSignal, shaftSpeed, bearingGeometry) {
        const { innerRace, outerRace, ballPass, cage } = this.computeBearingFreqs(shaftSpeed, bearingGeometry);
        
        const envelope = this.chatterEnvelope(vibrationSignal);
        const spectrum = this.welchPSD(envelope.envelope);
        
        // Check for fault frequencies
        const faults = {
            innerRace: this.detectFrequencyPeak(spectrum, innerRace),
            outerRace: this.detectFrequencyPeak(spectrum, outerRace),
            ballPass: this.detectFrequencyPeak(spectrum, ballPass),
            cage: this.detectFrequencyPeak(spectrum, cage)
        };
        
        return {
            faultFrequencies: { innerRace, outerRace, ballPass, cage },
            detectedFaults: faults,
            overallCondition: this.assessBearingCondition(faults),
            spectrum: spectrum
        };
    },

    // Helper methods
    waveletFunction: function(t, type) {
        switch (type) {
            case 'morlet':
                return Math.exp(-t*t/2) * Math.cos(5*t);
            case 'mexican_hat':
                return (2/Math.sqrt(3)) * Math.pow(Math.PI, -0.25) * (1 - t*t) * Math.exp(-t*t/2);
            default:
                return Math.exp(-t*t/2) * Math.cos(5*t);
        }
    },

    waveletDecompose: function(signal, wavelet) {
        const N = signal.length;
        const half = Math.floor(N/2);
        const approximation = new Array(half);
        const detail = new Array(half);
        
        for (let i = 0; i < half; i++) {
            approximation[i] = (signal[2*i] + signal[2*i + 1]) / Math.sqrt(2);
            detail[i] = (signal[2*i] - signal[2*i + 1]) / Math.sqrt(2);
        }
        
        return { approximation, detail };
    },

    waveletReconstruct: function(levels, wavelet) {
        let signal = levels[0];
        
        for (let i = 1; i < levels.length; i++) {
            const detail = levels[i];
            const newSignal = new Array(signal.length * 2);
            
            for (let j = 0; j < signal.length; j++) {
                newSignal[2*j] = (signal[j] + detail[j]) / Math.sqrt(2);
                newSignal[2*j + 1] = (signal[j] - detail[j]) / Math.sqrt(2);
            }
            
            signal = newSignal;
        }
        
        return signal;
    },

    fft: function(signal) {
        // Simple FFT implementation
        const N = signal.length;
        if (N <= 1) return signal.map(x => ({real: x, imag: 0}));
        
        const even = this.fft(signal.filter((_, i) => i % 2 === 0));
        const odd = this.fft(signal.filter((_, i) => i % 2 === 1));
        
        const result = new Array(N);
        for (let i = 0; i < N/2; i++) {
            const t = {
                real: Math.cos(-2 * Math.PI * i / N) * odd[i].real - Math.sin(-2 * Math.PI * i / N) * odd[i].imag,
                imag: Math.sin(-2 * Math.PI * i / N) * odd[i].real + Math.cos(-2 * Math.PI * i / N) * odd[i].imag
            };
            
            result[i] = {
                real: even[i].real + t.real,
                imag: even[i].imag + t.imag
            };
            
            result[i + N/2] = {
                real: even[i].real - t.real,
                imag: even[i].imag - t.imag
            };
        }
        
        return result;
    },

    ifft: function(spectrum) {
        // Conjugate, FFT, conjugate, scale
        const conjugated = spectrum.map(c => ({real: c.real, imag: -c.imag}));
        const result = this.fft(conjugated);
        return result.map(c => ({real: c.real/spectrum.length, imag: -c.imag/spectrum.length}));
    }
};