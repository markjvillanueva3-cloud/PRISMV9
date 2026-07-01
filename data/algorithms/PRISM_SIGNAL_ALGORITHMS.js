/**
 * PRISM_SIGNAL_ALGORITHMS
 * Extracted from PRISM v8.89.002 monolith
 * References: 38
 * Category: signal
 * Lines: 367
 * Session: R2.3.2 Algorithm Extraction
 */

const PRISM_SIGNAL_ALGORITHMS = {
    name: 'PRISM Signal Processing Algorithms',
    version: '1.0.0',
    sources: ['MIT 18.086', 'Berkeley EE120', 'Berkeley EE123', 'Stanford EE263'],
    algorithmCount: 60,

    /**
     * Fast Fourier Transform (Cooley-Tukey)
     * Source: MIT 18.086 Computational Science
     */
    fft: function(x) {
        const n = x.length;
        
        // Base case
        if (n === 1) {
            return [{ re: x[0], im: 0 }];
        }
        
        // Ensure power of 2
        if (n & (n - 1)) {
            // Pad to next power of 2
            const nextPow2 = Math.pow(2, Math.ceil(Math.log2(n)));
            const padded = [...x, ...new Array(nextPow2 - n).fill(0)];
            return this.fft(padded);
        }
        
        // Split into even and odd
        const even = [];
        const odd = [];
        for (let i = 0; i < n; i++) {
            if (i % 2 === 0) even.push(x[i]);
            else odd.push(x[i]);
        }
        
        // Recursive FFT
        const evenFFT = this.fft(even);
        const oddFFT = this.fft(odd);
        
        // Combine
        const result = new Array(n);
        for (let k = 0; k < n / 2; k++) {
            const angle = -2 * Math.PI * k / n;
            const twiddle = { re: Math.cos(angle), im: Math.sin(angle) };
            
            const t = this._complexMult(twiddle, oddFFT[k]);
            
            result[k] = {
                re: evenFFT[k].re + t.re,
                im: evenFFT[k].im + t.im
            };
            result[k + n / 2] = {
                re: evenFFT[k].re - t.re,
                im: evenFFT[k].im - t.im
            };
        }
        
        return result;
    },

    /**
     * Inverse FFT
     * Source: MIT 18.086
     */
    ifft: function(X) {
        const n = X.length;
        
        // Conjugate
        const conjX = X.map(x => ({ re: x.re, im: -x.im }));
        
        // Convert to real array for FFT
        const realArray = conjX.map(x => x.re);
        
        // FFT of conjugate
        const fftResult = this.fft(realArray);
        
        // Conjugate and scale
        return fftResult.map(x => ({
            re: x.re / n,
            im: -x.im / n
        }));
    },

    /**
     * Power Spectral Density
     * Source: Berkeley EE123
     */
    psd: function(x, fs = 1) {
        const X = this.fft(x);
        const n = X.length;
        const psd = [];
        
        for (let k = 0; k < n / 2; k++) {
            const mag = X[k].re * X[k].re + X[k].im * X[k].im;
            psd.push({
                frequency: k * fs / n,
                power: mag / n
            });
        }
        
        return psd;
    },

    /**
     * FIR Filter Design (Window method)
     * Source: Berkeley EE123
     */
    designFIR: function(type, cutoff, order, options = {}) {
        const window = options.window || 'hamming';
        const fs = options.fs || 1;
        
        const N = order + 1;
        const wc = 2 * Math.PI * cutoff / fs;
        const h = new Array(N);
        
        // Ideal impulse response
        for (let n = 0; n < N; n++) {
            const m = n - order / 2;
            if (m === 0) {
                if (type === 'lowpass') h[n] = wc / Math.PI;
                else if (type === 'highpass') h[n] = 1 - wc / Math.PI;
            } else {
                if (type === 'lowpass') {
                    h[n] = Math.sin(wc * m) / (Math.PI * m);
                } else if (type === 'highpass') {
                    h[n] = -Math.sin(wc * m) / (Math.PI * m);
                }
            }
        }
        
        // Apply window
        const w = this._getWindow(window, N);
        for (let n = 0; n < N; n++) {
            h[n] *= w[n];
        }
        
        return {
            coefficients: h,
            apply: (x) => this.convolve(x, h)
        };
    },

    /**
     * IIR Filter (Butterworth)
     * Source: Berkeley EE123, MIT 18.086
     */
    butterworth: function(order, cutoff, type = 'lowpass', fs = 1) {
        const wc = Math.tan(Math.PI * cutoff / fs);
        
        // Analog prototype poles
        const poles = [];
        for (let k = 0; k < order; k++) {
            const angle = Math.PI * (2 * k + order + 1) / (2 * order);
            poles.push({
                re: wc * Math.cos(angle),
                im: wc * Math.sin(angle)
            });
        }
        
        // Bilinear transform
        const digitalPoles = poles.map(p => {
            const denom = Math.pow(1 - p.re, 2) + p.im * p.im;
            return {
                re: (1 - p.re * p.re - p.im * p.im) / denom,
                im: 2 * p.im / denom
            };
        });
        
        // Generate filter coefficients (simplified for demonstration)
        const a = [1];
        const b = [1];
        
        // First-order approximation for demo
        const alpha = Math.sin(Math.PI * cutoff / fs) / Math.cos(Math.PI * cutoff / fs);
        
        if (type === 'lowpass') {
            b[0] = alpha / (1 + alpha);
            b[1] = alpha / (1 + alpha);
            a[1] = (alpha - 1) / (1 + alpha);
        } else {
            b[0] = 1 / (1 + alpha);
            b[1] = -1 / (1 + alpha);
            a[1] = (alpha - 1) / (1 + alpha);
        }
        
        return {
            b,
            a,
            apply: (x) => this.iirFilter(x, b, a)
        };
    },

    /**
     * Apply IIR Filter (Direct Form II)
     * Source: Berkeley EE123
     */
    iirFilter: function(x, b, a) {
        const n = x.length;
        const y = new Array(n).fill(0);
        const nb = b.length;
        const na = a.length;
        
        for (let i = 0; i < n; i++) {
            // Feedforward
            for (let j = 0; j < nb; j++) {
                if (i - j >= 0) {
                    y[i] += b[j] * x[i - j];
                }
            }
            // Feedback
            for (let j = 1; j < na; j++) {
                if (i - j >= 0) {
                    y[i] -= a[j] * y[i - j];
                }
            }
        }
        
        return y;
    },

    /**
     * Convolution
     * Source: MIT 18.086, Berkeley EE120
     */
    convolve: function(x, h) {
        const nx = x.length;
        const nh = h.length;
        const ny = nx + nh - 1;
        const y = new Array(ny).fill(0);
        
        for (let n = 0; n < ny; n++) {
            for (let k = 0; k < nh; k++) {
                if (n - k >= 0 && n - k < nx) {
                    y[n] += h[k] * x[n - k];
                }
            }
        }
        
        return y;
    },

    /**
     * Cross-Correlation
     * Source: Berkeley EE120
     */
    crossCorrelation: function(x, y) {
        const nx = x.length;
        const ny = y.length;
        const n = nx + ny - 1;
        const result = new Array(n).fill(0);
        
        for (let lag = -(ny - 1); lag < nx; lag++) {
            let sum = 0;
            for (let i = 0; i < ny; i++) {
                const j = i + lag;
                if (j >= 0 && j < nx) {
                    sum += x[j] * y[i];
                }
            }
            result[lag + ny - 1] = sum;
        }
        
        return result;
    },

    /**
     * Autocorrelation
     * Source: Berkeley EE120
     */
    autocorrelation: function(x) {
        return this.crossCorrelation(x, x);
    },

    /**
     * Spectrogram
     * Source: MIT 18.086
     */
    spectrogram: function(x, windowSize, hopSize, options = {}) {
        const window = options.window || 'hamming';
        const fs = options.fs || 1;
        
        const w = this._getWindow(window, windowSize);
        const numFrames = Math.floor((x.length - windowSize) / hopSize) + 1;
        const spectrogram = [];
        
        for (let frame = 0; frame < numFrames; frame++) {
            const start = frame * hopSize;
            const segment = x.slice(start, start + windowSize).map((xi, i) => xi * w[i]);
            const fftResult = this.fft(segment);
            
            // Take magnitude of first half (positive frequencies)
            const magnitudes = [];
            for (let k = 0; k < windowSize / 2; k++) {
                const mag = Math.sqrt(fftResult[k].re * fftResult[k].re + fftResult[k].im * fftResult[k].im);
                magnitudes.push(mag);
            }
            
            spectrogram.push({
                time: start / fs,
                frequencies: magnitudes.map((m, k) => ({
                    frequency: k * fs / windowSize,
                    magnitude: m
                }))
            });
        }
        
        return spectrogram;
    },

    /**
     * Hilbert Transform
     * Source: MIT 18.086
     */
    hilbert: function(x) {
        const n = x.length;
        const X = this.fft(x);
        
        // Create analytic signal
        const H = new Array(n);
        H[0] = X[0];
        for (let k = 1; k < n / 2; k++) {
            H[k] = { re: 2 * X[k].re, im: 2 * X[k].im };
        }
        if (n % 2 === 0) {
            H[n / 2] = X[n / 2];
        }
        for (let k = Math.ceil(n / 2) + 1; k < n; k++) {
            H[k] = { re: 0, im: 0 };
        }
        
        // IFFT
        const analytic = this.ifft(H);
        
        return {
            envelope: analytic.map(a => Math.sqrt(a.re * a.re + a.im * a.im)),
            instantPhase: analytic.map(a => Math.atan2(a.im, a.re)),
            analytic
        };
    },

    // Helper methods
    _complexMult: function(a, b) {
        return {
            re: a.re * b.re - a.im * b.im,
            im: a.re * b.im + a.im * b.re
        };
    },

    _getWindow: function(type, N) {
        const w = new Array(N);
        for (let n = 0; n < N; n++) {
            switch (type) {
                case 'hamming':
                    w[n] = 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1));
                    break;
                case 'hanning':
                    w[n] = 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1)));
                    break;
                case 'blackman':
                    w[n] = 0.42 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1)) + 0.08 * Math.cos(4 * Math.PI * n / (N - 1));
                    break;
                default:
                    w[n] = 1;
            }
        }
        return w;
    }
}