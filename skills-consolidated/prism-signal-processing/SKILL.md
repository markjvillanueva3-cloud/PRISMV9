---
name: prism-signal-processing
description: |
  Signal processing algorithms for PRISM Manufacturing Intelligence.
  Covers FFT, digital filters, wavelets, and chatter detection.
  
  Modules Covered:
  - PRISM_SIGNAL_ALGORITHMS (60+ functions)
  - PRISM_PHASE1_SIGNAL (FFT, Butterworth, Stability)
  - PRISM_FFT_PREDICTIVE_CHATTER (Chatter prediction)
  - PRISM_WAVELET_CHATTER (Wavelet analysis)
  
  Total: 4 modules, ~800 lines
  Gateway Routes: signal.*, physics.chatter.*
  MIT Foundation: 6.003, 6.341, 2.14
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "signal", "processing", "algorithms", "manufacturing", "intelligence", "digital", "filters"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-signal-processing")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-signal-processing") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What signal parameters for 316 stainless?"
→ Load skill: skill_content("prism-signal-processing") → Extract relevant signal data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot processing issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM SIGNAL PROCESSING
## FFT, Filters, Wavelets, and Chatter Detection
# 1. FFT - FAST FOURIER TRANSFORM

## 1.1 Cooley-Tukey FFT (Radix-2)

```javascript
/**
 * Fast Fourier Transform - Cooley-Tukey radix-2 algorithm
 * Complexity: O(N log N)
 * Manufacturing Use: Vibration analysis, chatter detection
 * Gateway: signal.fft
 */
function fft(signal) {
  const N = signal.length;
  
  // Ensure power of 2
  if (N & (N - 1)) {
    throw new Error('FFT requires power of 2 length');
  }
  
  if (N <= 1) return signal.map(x => ({ re: x, im: 0 }));
  
  // Convert to complex if needed
  const x = signal.map(s => 
    typeof s === 'number' ? { re: s, im: 0 } : s
  );
  
  // Bit-reversal permutation
  const bits = Math.log2(N);
  for (let i = 0; i < N; i++) {
    const j = reverseBits(i, bits);
    if (j > i) {
      [x[i], x[j]] = [x[j], x[i]];
    }
  }
  
  // Butterfly operations
  for (let size = 2; size <= N; size *= 2) {
    const halfSize = size / 2;
    const angleStep = -2 * Math.PI / size;
    
    for (let i = 0; i < N; i += size) {
      for (let j = 0; j < halfSize; j++) {
        const angle = angleStep * j;
        const twiddle = {
          re: Math.cos(angle),
          im: Math.sin(angle)
        };
        
        const a = x[i + j];
        const b = x[i + j + halfSize];
        
        // Complex multiplication: b * twiddle
        const t = {
          re: b.re * twiddle.re - b.im * twiddle.im,
          im: b.re * twiddle.im + b.im * twiddle.re
        };
        
        // Butterfly
        x[i + j] = { re: a.re + t.re, im: a.im + t.im };
        x[i + j + halfSize] = { re: a.re - t.re, im: a.im - t.im };
      }
    }
  }
  
  return x;
}

function reverseBits(n, bits) {
  let result = 0;
  for (let i = 0; i < bits; i++) {
    result = (result << 1) | (n & 1);
    n >>= 1;
  }
  return result;
}

/**
 * Inverse FFT
 */
function ifft(spectrum) {
  const N = spectrum.length;
  
  // Conjugate
  const conj = spectrum.map(c => ({ re: c.re, im: -c.im }));
  
  // Forward FFT
  const result = fft(conj);
  
  // Conjugate and scale
  return result.map(c => ({
    re: c.re / N,
    im: -c.im / N
  }));
}
```

## 1.2 Magnitude and Phase Spectrum

```javascript
/**
 * Compute magnitude spectrum (amplitude)
 */
function magnitude(fftResult) {
  return fftResult.map(c => 
    Math.sqrt(c.re * c.re + c.im * c.im)
  );
}

/**
 * Compute phase spectrum (radians)
 */
function phase(fftResult) {
  return fftResult.map(c => Math.atan2(c.im, c.re));
}

/**
 * Power spectral density (PSD)
 */
function psd(fftResult, sampleRate) {
  const N = fftResult.length;
  const df = sampleRate / N;
  
  return fftResult.map((c, i) => ({
    frequency: i < N/2 ? i * df : (i - N) * df,
    power: (c.re * c.re + c.im * c.im) / N
  }));
}
```

## 1.3 Windowing Functions

```javascript
/**
 * Window functions to reduce spectral leakage
 * Gateway: signal.window.*
 */
const WINDOWS = {
  // Rectangular (no window)
  rectangular: (n, N) => 1,
  
  // Hanning window - good general purpose
  hanning: (n, N) => 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1))),
  
  // Hamming window - reduced sidelobes
  hamming: (n, N) => 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1)),
  
  // Blackman window - excellent sidelobe suppression
  blackman: (n, N) => 
    0.42 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1)) 
         + 0.08 * Math.cos(4 * Math.PI * n / (N - 1)),
  
  // Flat-top window - accurate amplitude
  flattop: (n, N) => {
    const a0 = 0.21557895, a1 = 0.41663158, a2 = 0.277263158;
    const a3 = 0.083578947, a4 = 0.006947368;
    const x = 2 * Math.PI * n / (N - 1);
    return a0 - a1*Math.cos(x) + a2*Math.cos(2*x) 
             - a3*Math.cos(3*x) + a4*Math.cos(4*x);
  },
  
  // Kaiser window - adjustable beta parameter
  kaiser: (n, N, beta = 5) => {
    const alpha = (N - 1) / 2;
    const arg = beta * Math.sqrt(1 - Math.pow((n - alpha) / alpha, 2));
    return bessel_I0(arg) / bessel_I0(beta);
  }
};

function applyWindow(signal, windowType = 'hanning') {
  const N = signal.length;
  const windowFunc = WINDOWS[windowType] || WINDOWS.hanning;
  return signal.map((x, n) => x * windowFunc(n, N));
}

// Bessel function I0 for Kaiser window
function bessel_I0(x) {
  let sum = 1, term = 1;
  for (let k = 1; k <= 25; k++) {
    term *= (x / 2) * (x / 2) / (k * k);
    sum += term;
    if (term < 1e-10) break;
  }
  return sum;
}
```
# 2. DIGITAL FILTERS

## 2.1 Butterworth Filter

```javascript
/**
 * Butterworth low-pass filter coefficients
 * Maximally flat passband response
 * Gateway: signal.filter.butterworth
 */
function butterworthCoefficients(order, cutoffFreq, sampleRate) {
  const wc = Math.tan(Math.PI * cutoffFreq / sampleRate);
  const k = wc;
  const k2 = k * k;
  
  // For order 2 (biquad)
  if (order === 2) {
    const sqrt2 = Math.SQRT2;
    const norm = 1 / (1 + sqrt2 * k + k2);
    
    return {
      b: [k2 * norm, 2 * k2 * norm, k2 * norm],
      a: [1, 2 * (k2 - 1) * norm, (1 - sqrt2 * k + k2) * norm]
    };
  }
  
  // For higher orders, cascade biquads
  const sections = [];
  for (let i = 0; i < Math.floor(order / 2); i++) {
    const theta = Math.PI * (2 * i + 1) / (2 * order);
    const pole_re = -Math.sin(theta);
    const pole_im = Math.cos(theta);
    
    const norm = 1 / (1 - 2 * pole_re * k + k2);
    sections.push({
      b: [k2 * norm, 2 * k2 * norm, k2 * norm],
      a: [1, 2 * (k2 - 1) * norm, (1 - 2 * pole_re * k + k2) * norm]
    });
  }
  
  return sections;
}

/**
 * Apply IIR filter (direct form II)
 */
function applyIIRFilter(signal, coeffs) {
  const { b, a } = coeffs;
  const N = signal.length;
  const output = new Array(N).fill(0);
  
  // State variables
  let z1 = 0, z2 = 0;
  
  for (let n = 0; n < N; n++) {
    const x = signal[n];
    const y = b[0] * x + z1;
    z1 = b[1] * x - a[1] * y + z2;
    z2 = b[2] * x - a[2] * y;
    output[n] = y;
  }
  
  return output;
}
```

## 2.2 High-Pass and Band-Pass Filters

```javascript
/**
 * High-pass Butterworth filter
 * Gateway: signal.filter.highpass
 */
function butterworthHighpass(order, cutoffFreq, sampleRate) {
  const lp = butterworthCoefficients(order, cutoffFreq, sampleRate);
  
  // Transform low-pass to high-pass
  return {
    b: [lp.b[0], -2 * lp.b[0], lp.b[0]],
    a: lp.a
  };
}

/**
 * Band-pass filter (cascade of HP and LP)
 * Gateway: signal.filter.bandpass
 */
function butterworthBandpass(order, lowCutoff, highCutoff, sampleRate) {
  const hp = butterworthHighpass(order, lowCutoff, sampleRate);
  const lp = butterworthCoefficients(order, highCutoff, sampleRate);
  
  return { highpass: hp, lowpass: lp };
}

function applyBandpass(signal, bpCoeffs) {
  const hp = applyIIRFilter(signal, bpCoeffs.highpass);
  return applyIIRFilter(hp, bpCoeffs.lowpass);
}
```

## 2.3 Moving Average Filter

```javascript
/**
 * Simple moving average filter (FIR)
 * Gateway: signal.filter.ma
 */
function movingAverage(signal, windowSize) {
  const N = signal.length;
  const output = new Array(N).fill(0);
  
  let sum = 0;
  for (let i = 0; i < windowSize && i < N; i++) {
    sum += signal[i];
    output[i] = sum / (i + 1);
  }
  
  for (let i = windowSize; i < N; i++) {
    sum += signal[i] - signal[i - windowSize];
    output[i] = sum / windowSize;
  }
  
  return output;
}

/**
 * Exponential moving average
 */
function exponentialMA(signal, alpha) {
  const N = signal.length;
  const output = new Array(N);
  output[0] = signal[0];
  
  for (let i = 1; i < N; i++) {
    output[i] = alpha * signal[i] + (1 - alpha) * output[i - 1];
  }
  
  return output;
}
```
# 3. WAVELET TRANSFORM

## 3.1 Discrete Wavelet Transform (DWT)

```javascript
/**
 * Discrete Wavelet Transform using Haar wavelet
 * Gateway: signal.wavelet.dwt
 */
function dwtHaar(signal) {
  const N = signal.length;
  if (N < 2) return { approx: signal, detail: [] };
  
  const approx = [];
  const detail = [];
  
  for (let i = 0; i < N - 1; i += 2) {
    approx.push((signal[i] + signal[i + 1]) / Math.SQRT2);
    detail.push((signal[i] - signal[i + 1]) / Math.SQRT2);
  }
  
  return { approx, detail };
}

/**
 * Multi-level DWT decomposition
 */
function multiLevelDWT(signal, levels) {
  const details = [];
  let approx = [...signal];
  
  for (let level = 0; level < levels; level++) {
    const result = dwtHaar(approx);
    details.push(result.detail);
    approx = result.approx;
  }
  
  return { approx, details };
}

/**
 * Inverse DWT (reconstruction)
 */
function idwtHaar(approx, detail) {
  const N = approx.length;
  const signal = new Array(N * 2);
  
  for (let i = 0; i < N; i++) {
    signal[2 * i] = (approx[i] + detail[i]) / Math.SQRT2;
    signal[2 * i + 1] = (approx[i] - detail[i]) / Math.SQRT2;
  }
  
  return signal;
}
```

## 3.2 Daubechies Wavelets

```javascript
/**
 * Daubechies D4 wavelet coefficients
 */
const DAUB4 = {
  h: [
    (1 + Math.sqrt(3)) / (4 * Math.SQRT2),
    (3 + Math.sqrt(3)) / (4 * Math.SQRT2),
    (3 - Math.sqrt(3)) / (4 * Math.SQRT2),
    (1 - Math.sqrt(3)) / (4 * Math.SQRT2)
  ],
  g: [
    (1 - Math.sqrt(3)) / (4 * Math.SQRT2),
    -(3 - Math.sqrt(3)) / (4 * Math.SQRT2),
    (3 + Math.sqrt(3)) / (4 * Math.SQRT2),
    -(1 + Math.sqrt(3)) / (4 * Math.SQRT2)
  ]
};

/**
 * DWT with Daubechies wavelet
 */
function dwtDaub4(signal) {
  const N = signal.length;
  const approx = new Array(N / 2);
  const detail = new Array(N / 2);
  
  for (let i = 0; i < N / 2; i++) {
    let a = 0, d = 0;
    for (let j = 0; j < 4; j++) {
      const idx = (2 * i + j) % N;
      a += DAUB4.h[j] * signal[idx];
      d += DAUB4.g[j] * signal[idx];
    }
    approx[i] = a;
    detail[i] = d;
  }
  
  return { approx, detail };
}
```
# 4. CHATTER DETECTION

## 4.1 FFT-Based Chatter Detection

```javascript
/**
 * Detect chatter from vibration signal using FFT
 * Gateway: physics.chatter.detect
 * 
 * Manufacturing Use: Real-time chatter monitoring during machining
 */
function detectChatterFFT(vibrationSignal, sampleRate, config = {}) {
  const {
    spindleRPM,
    numTeeth = 4,
    chatterThreshold = 3.0,    // Standard deviations above baseline
    frequencyBands = null       // Optional: specific bands to monitor
  } = config;
  
  // Apply window and compute FFT
  const windowed = applyWindow(vibrationSignal, 'hanning');
  const spectrum = fft(windowed);
  const mag = magnitude(spectrum);
  
  // Compute frequency axis
  const N = vibrationSignal.length;
  const df = sampleRate / N;
  const frequencies = Array(N).fill(0).map((_, i) => i * df);
  
  // Calculate tooth passing frequency
  const toothPassingFreq = (spindleRPM / 60) * numTeeth;
  
  // Find peaks
  const peaks = findSpectralPeaks(mag, frequencies, {
    minProminence: 0.1,
    minDistance: df * 5
  });
  
  // Identify chatter frequencies (not harmonics of tooth passing)
  const chatterPeaks = peaks.filter(peak => {
    // Check if it's a harmonic of tooth passing
    const ratio = peak.frequency / toothPassingFreq;
    const isHarmonic = Math.abs(ratio - Math.round(ratio)) < 0.05;
    
    // Check if amplitude is significant
    const isSignificant = peak.amplitude > chatterThreshold * baseline(mag);
    
    return !isHarmonic && isSignificant && 
           peak.frequency > 100 && peak.frequency < sampleRate / 2;
  });
  
  return {
    hasChatter: chatterPeaks.length > 0,
    chatterFrequencies: chatterPeaks.map(p => p.frequency),
    severity: chatterPeaks.length > 0 ? 
      Math.max(...chatterPeaks.map(p => p.amplitude)) / baseline(mag) : 0,
    toothPassingFreq,
    spectrum: { frequencies, magnitudes: mag }
  };
}

function findSpectralPeaks(mag, freq, config) {
  const { minProminence, minDistance } = config;
  const peaks = [];
  
  for (let i = 1; i < mag.length - 1; i++) {
    if (mag[i] > mag[i-1] && mag[i] > mag[i+1] && mag[i] > minProminence) {
      peaks.push({ frequency: freq[i], amplitude: mag[i], index: i });
    }
  }
  
  // Filter by minimum distance
  return peaks.filter((p, i, arr) => {
    if (i === 0) return true;
    return (p.frequency - arr[i-1].frequency) >= minDistance;
  });
}

function baseline(mag) {
  // Median absolute deviation as robust baseline
  const sorted = [...mag].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
```

## 4.2 Wavelet-Based Chatter Detection

```javascript
/**
 * Chatter detection using wavelet decomposition
 * Better for non-stationary signals
 * Gateway: physics.chatter.wavelet
 */
function detectChatterWavelet(signal, sampleRate, config = {}) {
  const {
    levels = 5,
    chatterThreshold = 2.5
  } = config;
  
  // Multi-level wavelet decomposition
  const { approx, details } = multiLevelDWT(signal, levels);
  
  // Analyze energy in each detail level
  const energies = details.map((d, level) => {
    const energy = d.reduce((sum, x) => sum + x * x, 0);
    const freqRange = [
      sampleRate / Math.pow(2, level + 2),
      sampleRate / Math.pow(2, level + 1)
    ];
    return { level, energy, freqRange };
  });
  
  // Baseline energy (from lowest frequency band)
  const baselineEnergy = energies[energies.length - 1].energy;
  
  // Detect anomalous energy concentrations
  const chatterBands = energies.filter(e => 
    e.energy > chatterThreshold * baselineEnergy
  );
  
  return {
    hasChatter: chatterBands.length > 0,
    affectedBands: chatterBands.map(b => ({
      frequencyRange: b.freqRange,
      energyRatio: b.energy / baselineEnergy
    })),
    energyDistribution: energies
  };
}
```

## 4.3 Real-Time Chatter Monitoring

```javascript
/**
 * Streaming chatter detector for real-time monitoring
 * Gateway: physics.chatter.realtime
 */
class RealtimeChatterDetector {
  constructor(config) {
    this.sampleRate = config.sampleRate || 10000;
    this.windowSize = config.windowSize || 1024;
    this.overlap = config.overlap || 0.5;
    this.spindleRPM = config.spindleRPM;
    this.numTeeth = config.numTeeth || 4;
    
    this.buffer = [];
    this.history = [];
    this.maxHistory = 10;
    this.chatterState = 'STABLE';
  }
  
  addSamples(samples) {
    this.buffer.push(...samples);
    const results = [];
    
    const hopSize = Math.floor(this.windowSize * (1 - this.overlap));
    
    while (this.buffer.length >= this.windowSize) {
      const window = this.buffer.slice(0, this.windowSize);
      this.buffer = this.buffer.slice(hopSize);
      
      const result = detectChatterFFT(window, this.sampleRate, {
        spindleRPM: this.spindleRPM,
        numTeeth: this.numTeeth
      });
      
      this.updateState(result);
      results.push({
        ...result,
        state: this.chatterState,
        timestamp: Date.now()
      });
    }
    
    return results;
  }
  
  updateState(result) {
    this.history.push(result.hasChatter);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    
    const chatterCount = this.history.filter(x => x).length;
    const ratio = chatterCount / this.history.length;
    
    if (ratio > 0.7) {
      this.chatterState = 'CHATTER';
    } else if (ratio > 0.3) {
      this.chatterState = 'WARNING';
    } else {
      this.chatterState = 'STABLE';
    }
  }
  
  setSpindleSpeed(rpm) {
    this.spindleRPM = rpm;
    this.history = []; // Reset on speed change
  }
}
```
# 5. MANUFACTURING APPLICATIONS

## 5.1 Application Matrix

| Application | Primary Technique | Frequency Range | Sample Rate |
|-------------|-------------------|-----------------|-------------|
| Chatter detection | FFT + peaks | 100-5000 Hz | 10-20 kHz |
| Tool wear monitoring | Wavelet | 1-100 Hz | 1-5 kHz |
| Spindle bearing | Envelope FFT | 500-10000 Hz | 25-50 kHz |
| Surface quality | FFT harmonics | 10-500 Hz | 2-5 kHz |
| Vibration isolation | Low-pass filter | 0-50 Hz | 500 Hz |

## 5.2 Recommended Filter Settings

| Application | Filter Type | Order | Cutoff |
|-------------|-------------|-------|--------|
| Anti-aliasing | Butterworth LP | 4 | 0.4 × Nyquist |
| DC removal | Butterworth HP | 2 | 1 Hz |
| Chatter band | Bandpass | 4 | 100-3000 Hz |
| Smoothing | Moving average | - | 5-20 samples |

## 5.3 Gateway Route Summary

| Route | Function | Parameters |
|-------|----------|------------|
| `signal.fft` | fft() | signal |
| `signal.ifft` | ifft() | spectrum |
| `signal.psd` | psd() | fftResult, sampleRate |
| `signal.window.*` | applyWindow() | signal, type |
| `signal.filter.butterworth` | butterworthCoefficients() | order, cutoff, sr |
| `signal.filter.highpass` | butterworthHighpass() | order, cutoff, sr |
| `signal.filter.bandpass` | butterworthBandpass() | order, low, high, sr |
| `signal.filter.ma` | movingAverage() | signal, windowSize |
| `signal.wavelet.dwt` | dwtHaar() | signal |
| `physics.chatter.detect` | detectChatterFFT() | signal, sr, config |
| `physics.chatter.wavelet` | detectChatterWavelet() | signal, sr, config |
| `physics.chatter.realtime` | RealtimeChatterDetector | config |
## ERROR CODES

| Code | Description | Resolution |
|------|-------------|------------|
| SIG-1001 | FFT input not power of 2 | Pad with zeros |
| SIG-1002 | Sample rate too low | Increase sample rate |
| SIG-1003 | Filter unstable | Reduce order or cutoff |
| SIG-1004 | Aliasing detected | Add anti-aliasing filter |
| CHT-2001 | No spindle speed | Provide RPM for detection |
| CHT-2002 | Buffer overflow | Reduce window size |
**END OF PRISM SIGNAL PROCESSING SKILL**
**Version 1.0 | Level 4 Reference | 4 Modules | ~600 Lines**
**MIT Foundation: 6.003, 6.341, 2.14**
