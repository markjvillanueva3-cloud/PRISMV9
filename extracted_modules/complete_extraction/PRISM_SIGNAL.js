const PRISM_SIGNAL = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FFT (Fast Fourier Transform)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Compute FFT using Cooley-Tukey algorithm
   */
  fft: function(signal) {
    const N = signal.length;
    
    // Pad to power of 2 if needed
    const n = Math.pow(2, Math.ceil(Math.log2(N)));
    const padded = [...signal, ...Array(n - N).fill(0)];
    
    // Convert to complex if not already
    const complex = padded.map(x => 
      typeof x === 'object' ? x : { re: x, im: 0 }
    );
    
    return this._fftRecursive(complex);
  },
  
  _fftRecursive: function(x) {
    const N = x.length;
    
    if (N <= 1) return x;
    
    // Split even and odd
    const even = x.filter((_, i) => i % 2 === 0);
    const odd = x.filter((_, i) => i % 2 === 1);
    
    // Recursive FFT
    const E = this._fftRecursive(even);
    const O = this._fftRecursive(odd);
    
    // Combine
    const result = new Array(N);
    for (let k = 0; k < N / 2; k++) {
      const angle = -2 * Math.PI * k / N;
      const twiddle = { re: Math.cos(angle), im: Math.sin(angle) };
      
      const to = this._complexMul(twiddle, O[k]);
      
      result[k] = {
        re: E[k].re + to.re,
        im: E[k].im + to.im
      };
      result[k + N / 2] = {
        re: E[k].re - to.re,
        im: E[k].im - to.im
      };
    }
    
    return result;
  },
  
  /**
   * Inverse FFT
   */
  ifft: function(spectrum) {
    const N = spectrum.length;
    
    // Conjugate, FFT, conjugate, scale
    const conjugated = spectrum.map(x => ({ re: x.re, im: -x.im }));
    const transformed = this.fft(conjugated);
    
    return transformed.map(x => ({
      re: x.re / N,
      im: -x.im / N
    }));
  },
  
  /**
   * Compute magnitude spectrum
   */
  magnitude: function(spectrum) {
    return spectrum.map(x => Math.sqrt(x.re * x.re + x.im * x.im));
  },
  
  /**
   * Compute phase spectrum
   */
  phase: function(spectrum) {
    return spectrum.map(x => Math.atan2(x.im, x.re));
  },
  
  /**
   * Power Spectral Density
   */
  powerSpectralDensity: function(signal, fs = 1, window = 'hanning') {
    const windowed = this.applyWindow(signal, window);
    const spectrum = this.fft(windowed);
    const mag = this.magnitude(spectrum);
    const N = signal.length;
    
    // One-sided PSD (positive frequencies only)
    const psd = [];
    const freqs = [];
    
    for (let k = 0; k <= N / 2; k++) {
      psd.push((mag[k] * mag[k]) / (N * fs));
      freqs.push(k * fs / N);
    }
    
    // Double for one-sided (except DC and Nyquist)
    for (let k = 1; k < psd.length - 1; k++) {
      psd[k] *= 2;
    }
    
    return { psd, frequencies: freqs };
  },
  
  _complexMul: function(a, b) {
    return {
      re: a.re * b.re - a.im * b.im,
      im: a.re * b.im + a.im * b.re
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WINDOW FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  hanningWindow: function(N) {
    const w = [];
    for (let n = 0; n < N; n++) {
      w.push(0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1))));
    }
    return w;
  },
  
  hammingWindow: function(N) {
    const w = [];
    for (let n = 0; n < N; n++) {
      w.push(0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1)));
    }
    return w;
  },
  
  blackmanWindow: function(N) {
    const w = [];
    for (let n = 0; n < N; n++) {
      w.push(0.42 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1)) 
             + 0.08 * Math.cos(4 * Math.PI * n / (N - 1)));
    }
    return w;
  },
  
  flatTopWindow: function(N) {
    const a0 = 0.21557895, a1 = 0.41663158, a2 = 0.277263158;
    const a3 = 0.083578947, a4 = 0.006947368;
    const w = [];
    for (let n = 0; n < N; n++) {
      const x = 2 * Math.PI * n / (N - 1);
      w.push(a0 - a1*Math.cos(x) + a2*Math.cos(2*x) - a3*Math.cos(3*x) + a4*Math.cos(4*x));
    }
    return w;
  },
  
  applyWindow: function(signal, windowType = 'hanning') {
    const N = signal.length;
    let window;
    
    switch (windowType.toLowerCase()) {
      case 'hanning': case 'hann':
        window = this.hanningWindow(N);
        break;
      case 'hamming':
        window = this.hammingWindow(N);
        break;
      case 'blackman':
        window = this.blackmanWindow(N);
        break;
      case 'flattop':
        window = this.flatTopWindow(N);
        break;
      case 'rectangular': case 'none':
        return [...signal];
      default:
        window = this.hanningWindow(N);
    }
    
    return signal.map((x, i) => x * window[i]);
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DIGITAL FILTERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Design Butterworth low-pass filter coefficients
   */
  lowpassFilter: function(config) {
    const { cutoff, fs, order = 2 } = config;
    const fc = cutoff / (fs / 2); // Normalized frequency
    
    // Simplified 2nd order Butterworth
    const wc = Math.tan(Math.PI * fc);
    const wc2 = wc * wc;
    const sqrt2 = Math.sqrt(2);
    
    const k1 = sqrt2 * wc;
    const k2 = wc2;
    const a0 = k2 / (1 + k1 + k2);
    const a1 = 2 * a0;
    const a2 = a0;
    const b1 = 2 * (k2 - 1) / (1 + k1 + k2);
    const b2 = (1 - k1 + k2) / (1 + k1 + k2);
    
    return {
      b: [a0, a1, a2],
      a: [1, b1, b2],
      type: 'lowpass',
      cutoff,
      fs,
      order
    };
  },
  
  /**
   * Design Butterworth high-pass filter coefficients
   */
  highpassFilter: function(config) {
    const { cutoff, fs, order = 2 } = config;
    const fc = cutoff / (fs / 2);
    
    const wc = Math.tan(Math.PI * fc);
    const wc2 = wc * wc;
    const sqrt2 = Math.sqrt(2);
    
    const k1 = sqrt2 * wc;
    const k2 = wc2;
    const a0 = 1 / (1 + k1 + k2);
    const a1 = -2 * a0;
    const a2 = a0;
    const b1 = 2 * (k2 - 1) / (1 + k1 + k2);
    const b2 = (1 - k1 + k2) / (1 + k1 + k2);
    
    return {
      b: [a0, a1, a2],
      a: [1, b1, b2],
      type: 'highpass',
      cutoff,
      fs,
      order
    };
  },
  
  /**
   * Design bandpass filter
   */
  bandpassFilter: function(config) {
    const { lowCutoff, highCutoff, fs, order = 2 } = config;
    
    // Combine low-pass and high-pass
    const lp = this.lowpassFilter({ cutoff: highCutoff, fs, order });
    const hp = this.highpassFilter({ cutoff: lowCutoff, fs, order });
    
    return {
      lowpass: lp,
      highpass: hp,
      type: 'bandpass',
      lowCutoff,
      highCutoff,
      fs
    };
  },
  
  /**
   * Design notch filter
   */
  notchFilter: function(config) {
    const { frequency, Q = 30, fs } = config;
    const w0 = 2 * Math.PI * frequency / fs;
    const bw = w0 / Q;
    
    const b0 = 1;
    const b1 = -2 * Math.cos(w0);
    const b2 = 1;
    const a0 = 1 + Math.sin(bw);
    const a1 = -2 * Math.cos(w0);
    const a2 = 1 - Math.sin(bw);
    
    return {
      b: [b0/a0, b1/a0, b2/a0],
      a: [1, a1/a0, a2/a0],
      type: 'notch',
      frequency,
      Q,
      fs
    };
  },
  
  /**
   * Apply IIR filter to signal
   */
  applyFilter: function(signal, filter) {
    const { b, a } = filter;
    const y = new Array(signal.length).fill(0);
    const x = signal;
    
    for (let n = 0; n < signal.length; n++) {
      // Feedforward
      for (let k = 0; k < b.length; k++) {
        if (n - k >= 0) {
          y[n] += b[k] * x[n - k];
        }
      }
      // Feedback
      for (let k = 1; k < a.length; k++) {
        if (n - k >= 0) {
          y[n] -= a[k] * y[n - k];
        }
      }
    }
    
    // For bandpass, cascade the two filters
    if (filter.type === 'bandpass') {
      const yLp = this.applyFilter(signal, filter.lowpass);
      return this.applyFilter(yLp, filter.highpass);
    }
    
    return y;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WAVELET TRANSFORM
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Discrete Wavelet Transform decomposition
   */
  dwtDecompose: function(signal, wavelet = 'haar', levels = 3) {
    const coeffs = { approximation: null, details: [] };
    let approx = [...signal];
    
    for (let level = 0; level < levels; level++) {
      const { cA, cD } = this._dwtStep(approx, wavelet);
      coeffs.details.unshift(cD);
      approx = cA;
    }
    
    coeffs.approximation = approx;
    return coeffs;
  },
  
  _dwtStep: function(signal, wavelet) {
    // Get wavelet filter coefficients
    const { lo, hi } = this._getWaveletFilters(wavelet);
    
    // Convolve and downsample
    const cA = this._convolveDownsample(signal, lo);
    const cD = this._convolveDownsample(signal, hi);
    
    return { cA, cD };
  },
  
  _getWaveletFilters: function(wavelet) {
    switch (wavelet.toLowerCase()) {
      case 'haar':
        const h = 1 / Math.sqrt(2);
        return { lo: [h, h], hi: [h, -h] };
      case 'db4':
        return {
          lo: [0.4829629131, 0.8365163037, 0.2241438680, -0.1294095226],
          hi: [-0.1294095226, -0.2241438680, 0.8365163037, -0.4829629131]
        };
      default:
        const hh = 1 / Math.sqrt(2);
        return { lo: [hh, hh], hi: [hh, -hh] };
    }
  },
  
  _convolveDownsample: function(signal, filter) {
    const result = [];
    const N = signal.length;
    const M = filter.length;
    
    for (let n = 0; n < N; n += 2) {
      let sum = 0;
      for (let k = 0; k < M; k++) {
        const idx = n - k;
        if (idx >= 0 && idx < N) {
          sum += filter[k] * signal[idx];
        }
      }
      result.push(sum);
    }
    
    return result;
  },
  
  /**
   * Inverse DWT reconstruction
   */
  dwtReconstruct: function(coeffs, wavelet = 'haar') {
    let approx = coeffs.approximation;
    
    for (const detail of coeffs.details) {
      approx = this._idwtStep(approx, detail, wavelet);
    }
    
    return approx;
  },
  
  _idwtStep: function(cA, cD, wavelet) {
    const { lo, hi } = this._getWaveletFilters(wavelet);
    const N = cA.length * 2;
    const result = new Array(N).fill(0);
    
    // Upsample and convolve
    for (let n = 0; n < cA.length; n++) {
      for (let k = 0; k < lo.length; k++) {
        const idx = 2 * n + k;
        if (idx < N) {
          result[idx] += lo[k] * cA[n] + hi[k] * cD[n];
        }
      }
    }
    
    return result;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SPECTRAL FEATURES
  // ═══════════════════════════════════════════════════════════════════════════
  
  spectralCentroid: function(magnitude, fs) {
    const N = magnitude.length;
    let num = 0, den = 0;
    
    for (let k = 0; k < N / 2; k++) {
      const freq = k * fs / N;
      num += freq * magnitude[k];
      den += magnitude[k];
    }
    
    return den > 0 ? num / den : 0;
  },
  
  spectralBandwidth: function(magnitude, fs, centroid = null) {
    const N = magnitude.length;
    const sc = centroid || this.spectralCentroid(magnitude, fs);
    
    let num = 0, den = 0;
    for (let k = 0; k < N / 2; k++) {
      const freq = k * fs / N;
      num += Math.pow(freq - sc, 2) * magnitude[k];
      den += magnitude[k];
    }
    
    return den > 0 ? Math.sqrt(num / den) : 0;
  },
  
  spectralRolloff: function(magnitude, threshold = 0.85) {
    const totalEnergy = magnitude.reduce((sum, m) => sum + m * m, 0);
    const targetEnergy = threshold * totalEnergy;
    
    let cumulativeEnergy = 0;
    for (let k = 0; k < magnitude.length; k++) {
      cumulativeEnergy += magnitude[k] * magnitude[k];
      if (cumulativeEnergy >= targetEnergy) {
        return k;
      }
    }
    
    return magnitude.length - 1;
  },
  
  rmsEnergy: function(signal) {
    const sumSquares = signal.reduce((sum, x) => sum + x * x, 0);
    return Math.sqrt(sumSquares / signal.length);
  },
  
  zeroCrossingRate: function(signal) {
    let crossings = 0;
    for (let n = 1; n < signal.length; n++) {
      if ((signal[n] >= 0 && signal[n - 1] < 0) || 
          (signal[n] < 0 && signal[n - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / signal.length;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TIME-FREQUENCY ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Short-Time Fourier Transform
   */
  stft: function(signal, windowSize, hopSize, windowType = 'hanning') {
    const spectrogram = [];
    const window = this[windowType + 'Window'](windowSize);
    
    for (let start = 0; start + windowSize <= signal.length; start += hopSize) {
      const segment = signal.slice(start, start + windowSize);
      const windowed = segment.map((x, i) => x * window[i]);
      const spectrum = this.fft(windowed);
      const mag = this.magnitude(spectrum);
      spectrogram.push(mag.slice(0, windowSize / 2 + 1));
    }
    
    return spectrogram;
  },
  
  /**
   * Hilbert Transform (simplified via FFT)
   */
  hilbertTransform: function(signal) {
    const N = signal.length;
    const spectrum = this.fft(signal);
    
    // Zero negative frequencies, double positive
    const analytic = spectrum.map((x, k) => {
      if (k === 0 || k === N / 2) return x;
      if (k < N / 2) return { re: 2 * x.re, im: 2 * x.im };
      return { re: 0, im: 0 };
    });
    
    const analyticSignal = this.ifft(analytic);
    
    return {
      real: analyticSignal.map(x => x.re),
      imag: analyticSignal.map(x => x.im)
    };
  },
  
  /**
   * Compute signal envelope
   */
  envelope: function(signal) {
    const { real, imag } = this.hilbertTransform(signal);
    return real.map((r, i) => Math.sqrt(r * r + imag[i] * imag[i]));
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CHATTER DETECTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Detect chatter in machining signal
   */
  detectChatter: function(signal, fs, config = {}) {
    const {
      chatterFreqMin = 500,
      chatterFreqMax = 5000,
      threshold = 0.3
    } = config;
    
    // Compute spectrum
    const windowed = this.applyWindow(signal, 'hanning');
    const spectrum = this.fft(windowed);
    const magnitude = this.magnitude(spectrum);
    
    const N = signal.length;
    const binMin = Math.floor(chatterFreqMin * N / fs);
    const binMax = Math.ceil(chatterFreqMax * N / fs);
    
    // Energy in chatter band
    let chatterEnergy = 0;
    let totalEnergy = 0;
    let peakBin = 0;
    let peakValue = 0;
    
    for (let k = 0; k < N / 2; k++) {
      const energy = magnitude[k] * magnitude[k];
      totalEnergy += energy;
      
      if (k >= binMin && k <= binMax) {
        chatterEnergy += energy;
        if (magnitude[k] > peakValue) {
          peakValue = magnitude[k];
          peakBin = k;
        }
      }
    }
    
    const chatterIndex = chatterEnergy / (totalEnergy + 1e-10);
    const peakFrequency = peakBin * fs / N;
    
    return {
      chatterDetected: chatterIndex > threshold,
      chatterIndex,
      peakFrequency,
      peakMagnitude: peakValue,
      severity: chatterIndex < 0.3 ? 'stable' : 
                chatterIndex < 0.5 ? 'warning' : 'chatter'
    };
  },
  
  /**
   * Compute chatter index
   */
  chatterIndex: function(magnitude, fs, chatterFreqMin, chatterFreqMax) {
    const N = magnitude.length * 2; // Assuming one-sided spectrum
    const binMin = Math.floor(chatterFreqMin * N / fs);
    const binMax = Math.ceil(chatterFreqMax * N / fs);
    
    let chatterEnergy = 0;
    let totalEnergy = 0;
    
    for (let k = 0; k < magnitude.length; k++) {
      const energy = magnitude[k] * magnitude[k];
      totalEnergy += energy;
      if (k >= binMin && k <= binMax) {
        chatterEnergy += energy;
      }
    }
    
    return totalEnergy > 0 ? chatterEnergy / totalEnergy : 0;
  }
}